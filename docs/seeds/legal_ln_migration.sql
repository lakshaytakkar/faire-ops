-- =============================================================================
-- LegalNations (LN) schema migration
-- Replaces the generic empty law-firm tables with real LN business tables.
-- Target: local Supabase (project ref: eeoesllyceegmzfqfbyu), schema: legal
-- =============================================================================

BEGIN;

-- ─── 1. Drop existing empty generic tables ──────────────────────────────────

DROP TABLE IF EXISTS legal.case_tasks CASCADE;
DROP TABLE IF EXISTS legal.case_notes CASCADE;
DROP TABLE IF EXISTS legal.cases CASCADE;
DROP TABLE IF EXISTS legal.documents CASCADE;
DROP TABLE IF EXISTS legal.payments CASCADE;
DROP TABLE IF EXISTS legal.compliance_items CASCADE;
DROP TABLE IF EXISTS legal.clients CASCADE;

-- ─── 2. Helper: updated_at trigger function (idempotent) ────────────────────

CREATE OR REPLACE FUNCTION legal.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 3. legal.clients (mirrors remote ln_clients) ──────────────────────────

CREATE TABLE IF NOT EXISTS legal.clients (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code                 text,
  client_name                 text        NOT NULL,
  email                       text,
  contact_number              text,
  country                     text        DEFAULT 'India',
  plan                        text,
  website_included            boolean     DEFAULT false,
  client_health               text        DEFAULT 'Healthy',
  llc_name                    text,
  llc_status                  text        DEFAULT 'Pending',
  llc_email                   text,
  ein                         text,
  llc_address                 text,
  website_url                 text,
  bank_name                   text,
  bank_account_number         text,
  bank_routing_number         text,
  date_of_payment             text,
  date_of_onboarding          text,
  date_of_onboarding_call     text,
  date_of_document_submission text,
  date_of_closing             text,
  amount_received             numeric     DEFAULT 0,
  remaining_payment           numeric     DEFAULT 0,
  notes                       text,
  created_at                  timestamptz DEFAULT now(),
  updated_at                  timestamptz DEFAULT now()
);

COMMENT ON TABLE legal.clients IS 'LegalNations client master — mirrors remote ln_clients';

-- ─── 4. legal.onboarding_checklist (mirrors remote ln_onboarding_checklist) ─

CREATE TABLE IF NOT EXISTS legal.onboarding_checklist (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid        NOT NULL REFERENCES legal.clients(id) ON DELETE CASCADE,
  phase         text        NOT NULL,
  step_name     text        NOT NULL,
  is_completed  boolean     DEFAULT false,
  completed_at  timestamptz,
  sort_order    integer     DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

COMMENT ON TABLE legal.onboarding_checklist IS 'Per-client onboarding steps — mirrors remote ln_onboarding_checklist';

-- ─── 5. legal.tax_filings (mirrors remote ln_tax_filings) ──────────────────

CREATE TABLE IF NOT EXISTS legal.tax_filings (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                 uuid        REFERENCES legal.clients(id) ON DELETE SET NULL,
  llc_name                  text,
  llc_type                  text,
  amount_received           numeric     DEFAULT 0,
  main_entity_name          text,
  contact_details           text,
  address                   text,
  email_address             text,
  status                    text        DEFAULT 'Pending',
  date_of_formation         text,
  notes                     text,
  bank_transactions_count   integer     DEFAULT 0,
  ein_number                text,
  naics                     text,
  principal_activity        text,
  personal_address          text,
  pan_aadhar_dl             text,
  filing_done               boolean     DEFAULT false,
  reference_number          text,
  fax_confirmation          text,
  tax_standing              text,
  annual_report_filed       boolean     DEFAULT false,
  state_annual_report_due   text,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now(),
  address_2                 text,
  country                   text        DEFAULT 'India',
  filled_1120               boolean     DEFAULT false,
  filled_5472               boolean     DEFAULT false,
  verified_ein_in_form      boolean     DEFAULT false,
  message                   text,
  subject                   text,
  recipient                 text,
  fax                       text,
  bank_statements_status    text        DEFAULT 'Pending',
  business_activity         text,
  date_copy                 text,
  send_mail_status          text        DEFAULT 'Not Sent',
  tax_standing_last_checked text,
  filing_search_url         text,
  additional_notes          text,
  filing_stage              text        DEFAULT 'Document Collection',
  mail_tracking_number      text,
  required_documents        text
);

COMMENT ON TABLE legal.tax_filings IS 'Tax filing records — mirrors remote ln_tax_filings';

-- ─── 6. Indexes on foreign keys ─────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_onboarding_checklist_client_id
  ON legal.onboarding_checklist (client_id);

CREATE INDEX IF NOT EXISTS idx_tax_filings_client_id
  ON legal.tax_filings (client_id);

-- ─── 7. updated_at triggers ─────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_clients_updated_at ON legal.clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON legal.clients
  FOR EACH ROW
  EXECUTE FUNCTION legal.set_updated_at();

DROP TRIGGER IF EXISTS trg_tax_filings_updated_at ON legal.tax_filings;
CREATE TRIGGER trg_tax_filings_updated_at
  BEFORE UPDATE ON legal.tax_filings
  FOR EACH ROW
  EXECUTE FUNCTION legal.set_updated_at();

-- ─── 8. Row-Level Security ──────────────────────────────────────────────────

ALTER TABLE legal.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON legal.clients;
CREATE POLICY "Allow all" ON legal.clients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE legal.onboarding_checklist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON legal.onboarding_checklist;
CREATE POLICY "Allow all" ON legal.onboarding_checklist FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE legal.tax_filings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON legal.tax_filings;
CREATE POLICY "Allow all" ON legal.tax_filings FOR ALL USING (true) WITH CHECK (true);

COMMIT;
