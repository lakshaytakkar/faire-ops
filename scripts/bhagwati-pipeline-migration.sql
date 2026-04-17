-- Bhagwati-China bulk product listing pipeline
-- Additive migration: new columns + new tables. No changes to existing column semantics.
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards).

-- =============================================================
-- 1. product_variants table (one-to-many under ets.products)
-- =============================================================
CREATE TABLE IF NOT EXISTS ets.product_variants (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  product_id uuid NOT NULL,
  sku text NOT NULL,
  variant_name text NOT NULL,           -- e.g. "Red / Large"
  attributes jsonb DEFAULT '{}'::jsonb,  -- {"color":"red","size":"L"}
  cost_price_cny numeric,
  cost_price_inr numeric,
  selling_price_inr numeric,
  stock_qty integer DEFAULT 0,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_variants_pkey PRIMARY KEY (id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id)
    REFERENCES ets.products(id) ON DELETE CASCADE,
  CONSTRAINT product_variants_product_name_uq UNIQUE (product_id, variant_name),
  CONSTRAINT product_variants_sku_uq UNIQUE (sku)
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx
  ON ets.product_variants(product_id);

-- =============================================================
-- 2. ets.products additions (publish pipeline)
-- =============================================================
ALTER TABLE ets.products
  ADD COLUMN IF NOT EXISTS cost_price_cny numeric,
  ADD COLUMN IF NOT EXISTS cost_price_inr numeric,
  ADD COLUMN IF NOT EXISTS selling_price_inr numeric,
  ADD COLUMN IF NOT EXISTS fx_rate_inr_cny numeric DEFAULT 13.8,
  ADD COLUMN IF NOT EXISTS margin_pct numeric DEFAULT 20,
  ADD COLUMN IF NOT EXISTS source_file text,                 -- filename of supplier xlsx (already exists in some rows via 'source_file', keep nullable)
  ADD COLUMN IF NOT EXISTS source_row_id text,               -- "<file-basename>:<row-number>" — idempotency key
  ADD COLUMN IF NOT EXISTS listing_status text DEFAULT 'draft', -- draft | ready | published | archived
  ADD COLUMN IF NOT EXISTS publish_checklist jsonb DEFAULT '{
    "image_polished": false,
    "name_normalized": false,
    "variants_modeled": false,
    "prices_inr": false,
    "categorized": false,
    "source_tagged": false
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS image_polish_status text DEFAULT 'pending', -- pending | skipped | done | failed
  ADD COLUMN IF NOT EXISTS image_polish_reason text,         -- why skipped (e.g. "already_good_quality") or failure reason
  ADD COLUMN IF NOT EXISTS image_raw_url text,               -- the un-polished extracted image (archive)
  ADD COLUMN IF NOT EXISTS carton_qty integer,               -- units per carton (Bhagwati provides this per-row)
  ADD COLUMN IF NOT EXISTS box_qty integer,                  -- units per box (if different)
  ADD COLUMN IF NOT EXISTS category_id uuid,                 -- FK to ets.categories (soft — may not exist for all rows)
  ADD COLUMN IF NOT EXISTS category_confidence numeric,      -- 0..1 if AI-assigned
  ADD COLUMN IF NOT EXISTS name_en_raw text,                 -- audit of original name
  ADD COLUMN IF NOT EXISTS name_quality text;                -- raw | ai_cleaned | human_verified

-- source_row_id must be unique per source to make imports idempotent
CREATE UNIQUE INDEX IF NOT EXISTS products_source_row_id_uq
  ON ets.products(source, source_row_id)
  WHERE source_row_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS products_listing_status_idx
  ON ets.products(listing_status);

CREATE INDEX IF NOT EXISTS products_source_idx
  ON ets.products(source);

-- FK to categories (nullable; uses existing ets.categories table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE ets.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES ets.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =============================================================
-- 3. import_batches — track each supplier upload run
-- =============================================================
CREATE TABLE IF NOT EXISTS ets.import_batches (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source text NOT NULL,                  -- e.g. "Bhagwati-China"
  source_file text NOT NULL,             -- filename
  sheet_name text,
  rows_total integer DEFAULT 0,
  rows_imported integer DEFAULT 0,
  rows_skipped integer DEFAULT 0,
  images_extracted integer DEFAULT 0,
  images_matched integer DEFAULT 0,
  notes text,
  status text DEFAULT 'pending',         -- pending | staged | imported | failed
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  created_by uuid,                       -- optional: user id
  CONSTRAINT import_batches_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS import_batches_source_idx
  ON ets.import_batches(source);

-- =============================================================
-- 4. Helper view — publish readiness
-- =============================================================
CREATE OR REPLACE VIEW ets.v_product_publish_readiness AS
SELECT
  p.id,
  p.name_en,
  p.source,
  p.listing_status,
  (p.publish_checklist ->> 'image_polished')::boolean  AS c_image,
  (p.publish_checklist ->> 'name_normalized')::boolean AS c_name,
  (p.publish_checklist ->> 'variants_modeled')::boolean AS c_variants,
  (p.publish_checklist ->> 'prices_inr')::boolean      AS c_prices,
  (p.publish_checklist ->> 'categorized')::boolean     AS c_category,
  (p.publish_checklist ->> 'source_tagged')::boolean   AS c_source,
  (
    (p.publish_checklist ->> 'image_polished')::boolean
    AND (p.publish_checklist ->> 'name_normalized')::boolean
    AND (p.publish_checklist ->> 'prices_inr')::boolean
    AND (p.publish_checklist ->> 'categorized')::boolean
    AND (p.publish_checklist ->> 'source_tagged')::boolean
  ) AS ready_to_publish
FROM ets.products p;
