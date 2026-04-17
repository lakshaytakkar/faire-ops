# Bhagwati-China bulk product pipeline

Two-phase ingestion of the supplier's XLSX quotation files (~23 files,
embedded images, mixed CN/EN headers).

## Phase 1 — Stage (no DB, no uploads)

Reads each XLSX, extracts embedded images, autodetects headers, and writes
`staged.json` + a `preview.html` per file under
`tmp-images/bhagwati-staged/<file-slug>/`.

```bash
# Stage every xlsx in tmp-images/TransferNow-20260414cb0aJeTt/
node scripts/bhagwati-stage.mjs

# Stage one file (path or filename relative to the default dir)
node scripts/bhagwati-stage.mjs "Charms-QUOTATION(1).xlsx"
node scripts/bhagwati-stage.mjs "tmp-images/TransferNow-20260414cb0aJeTt/JEWELERY LIST.xlsx"
```

Open `tmp-images/bhagwati-staged/<file-slug>/preview.html` in a browser
to eyeball images, descriptions, MOQ, EXW (¥), cost (₹), selling (₹).

Files where header autodetect fails are reported with a warning and
produce an empty `staged.json` (no crash). `.xls` files are skipped —
re-save them as `.xlsx` and re-run.

## Phase 2 — Import (uploads + DB writes)

Reads each staged folder, uploads every image to `product-images/raw/bhagwati/...`,
and upserts one row per item into `ets.products` (idempotent via
`(source, source_row_id)` unique).

```bash
# Dry-run everything that's been staged
node scripts/bhagwati-import.mjs --dry-run

# Real run — all staged folders
node scripts/bhagwati-import.mjs

# Real run — single folder
node scripts/bhagwati-import.mjs charms-quotation-1
```

Env required (loaded from `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Re-running is safe: the unique index merges duplicates instead of
inserting twice.

## Pricing

Locked defaults (overridable per-product later in the Studio UI):
- `fx_rate_inr_cny = 13.8`
- `margin_pct = 20`
- `cost_inr = cny * 13.8`
- `selling_inr = cost_inr * 1.2`
