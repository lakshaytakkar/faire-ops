# Banking Integration (Wise API) — PRD

## Overview

Integrate Wise (formerly TransferWise) banking data into the portal to automatically sync transactions, reconcile Faire payouts with bank deposits, track vendor payments, and provide a real-time financial dashboard. This closes the loop between "money earned on Faire" and "money received in the bank."

**Business Value:** Manual reconciliation of Faire payouts against bank statements is time-consuming and error-prone. Automated syncing and matching eliminates hours of bookkeeping per week and surfaces discrepancies immediately.

## User Stories

- As a **brand owner**, I want to see my Wise account balances in the portal, so that I have a single financial dashboard.
- As a **finance manager**, I want transactions auto-synced from Wise, so that I don't have to manually export and import bank data.
- As a **finance manager**, I want Faire payouts automatically matched to Wise deposits, so that I can verify every payout was received.
- As a **finance manager**, I want outgoing Wise payments matched to vendor invoices, so that I can track vendor payment status.
- As a **brand owner**, I want to see unmatched transactions highlighted, so that I can investigate discrepancies quickly.
- As a **finance manager**, I want a reconciliation dashboard showing matched vs. unmatched totals, so that I have a clear financial picture.
- As a **brand owner**, I want to filter transactions by date, type, and reconciliation status, so that I can drill into specific periods.
- As a **finance manager**, I want to manually match an unmatched transaction to an order or vendor, so that I can resolve edge cases.

## Technical Requirements

### Database Schema

```sql
CREATE TABLE wise_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wise_profile_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'USD',
  balance_cents BIGINT DEFAULT 0,
  account_name TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wise_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wise_id TEXT NOT NULL UNIQUE,
  account_id UUID REFERENCES wise_accounts(id),
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT')),
  description TEXT,
  reference TEXT,
  counterpart_name TEXT,
  date TIMESTAMPTZ NOT NULL,
  running_balance_cents BIGINT,
  is_reconciled BOOLEAN DEFAULT FALSE,
  reconciliation_type TEXT CHECK (reconciliation_type IN ('faire_payout', 'vendor_payment', 'manual', NULL)),
  matched_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  matched_payout_id UUID REFERENCES payouts(id) ON DELETE SET NULL,
  matched_vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  match_confidence REAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wise_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES wise_accounts(id),
  sync_type TEXT NOT NULL CHECK (sync_type IN ('balance', 'transactions', 'full')),
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_wise_tx_date ON wise_transactions (date);
CREATE INDEX idx_wise_tx_reconciled ON wise_transactions (is_reconciled);
CREATE INDEX idx_wise_tx_type ON wise_transactions (type);
CREATE INDEX idx_wise_tx_reference ON wise_transactions (reference);
```

### Wise API Integration

**Base URL:** `https://api.transferwise.com/v1/`

**Authentication:** API token stored in environment variable `WISE_API_TOKEN`. Pass as `Authorization: Bearer {token}`.

**Key Endpoints:**

| Wise Endpoint | Portal Usage |
|---------------|-------------|
| `GET /v1/profiles` | Fetch profile ID on setup |
| `GET /v1/borderless-accounts/{profileId}` | List accounts and balances |
| `GET /v1/borderless-accounts/{accountId}/statement` | Fetch transactions for date range |
| `GET /v3/profiles/{profileId}/transfers` | List transfers (outgoing payments) |

**Rate Limits:** Wise API allows ~50 requests/minute. Sync should be batched with delays.

**Sync Strategy:**
1. **Balance sync** — Every 15 minutes via cron or on-demand
2. **Transaction sync** — Every 1 hour, fetch last 24h of transactions (with overlap for safety)
3. **Full sync** — On-demand, fetch last 90 days

### Reconciliation Logic

**Matching Faire Payouts to Wise Credits:**
1. Parse Wise CREDIT transaction `description` and `reference` fields
2. Look for Faire payout reference patterns (e.g., `FAIRE-PAYOUT-XXXX`, payout IDs)
3. Match `amount_cents` of Wise credit against `amount_cents` of payout record
4. If reference + amount match: auto-reconcile with `match_confidence = 1.0`
5. If only amount matches (within same week): suggest match with `match_confidence = 0.7`
6. Unmatched credits older than 7 days: flag for manual review

**Matching Vendor Payments to Wise Debits:**
1. Parse Wise DEBIT transaction `counterpart_name` and `reference`
2. Fuzzy-match counterpart name against vendor names in `vendors` table
3. Match amount against outstanding vendor invoices
4. If name + amount match: auto-reconcile with `match_confidence = 0.9`
5. If only amount or name match: suggest with lower confidence

### API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/banking/accounts` | List Wise accounts with balances |
| POST | `/api/banking/sync` | Trigger manual sync (balance + transactions) |
| GET | `/api/banking/transactions` | List transactions with filters |
| GET | `/api/banking/transactions/[id]` | Single transaction detail |
| PUT | `/api/banking/transactions/[id]/reconcile` | Manually reconcile a transaction |
| PUT | `/api/banking/transactions/[id]/unmatch` | Remove reconciliation match |
| GET | `/api/banking/reconciliation/summary` | Reconciliation dashboard stats |
| GET | `/api/banking/reconciliation/unmatched` | List unmatched transactions |
| GET | `/api/banking/sync-log` | View sync history |
| POST | `/api/banking/setup` | Initial setup — store API token, fetch profile |

### UI Components

1. **BankingDashboard** — Overview with account cards, balance totals, reconciliation summary
2. **AccountCard** — Shows account name, currency, balance, last synced time
3. **TransactionList** — Filterable, sortable table of all transactions
4. **TransactionRow** — Shows date, description, amount (green for credit, red for debit), reconciliation status icon, matched entity link
5. **ReconciliationDashboard** — Stats cards (total credits, matched, unmatched, match rate %), list of unmatched transactions with suggested matches
6. **MatchDialog** — When clicking an unmatched transaction, shows candidate orders/vendors/payouts to match against
7. **SyncButton** — Manual sync trigger with last-synced indicator and sync log
8. **SetupWizard** — First-time setup flow for entering API token and selecting profile/accounts

### Integration Points

- **Payouts:** Matches Wise credits to `payouts` table records
- **Orders:** Through payouts, traces back to individual delivered orders
- **Vendors:** Matches Wise debits to `vendors` table for payment tracking
- **Ledger:** Reconciliation data feeds into the financial ledger for accurate P&L
- **Finance section:** Lives alongside existing Ledger, Payouts, Vendors pages

## Page Structure

### Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/finance/banking` | `BankingDashboard` | Overview with balances and reconciliation summary |
| `/finance/banking/transactions` | `TransactionList` | Full transaction list with filters |
| `/finance/banking/reconciliation` | `ReconciliationDashboard` | Unmatched items and matching workflow |

### Navigation Changes

Add under the **Finance** section in the sidebar:

```
Finance
  ├── Ledger
  ├── Payouts
  ├── Vendors
  ├── Banking             ← NEW (parent)
  │   ├── Overview        ← /finance/banking
  │   ├── Transactions    ← /finance/banking/transactions
  │   └── Reconciliation  ← /finance/banking/reconciliation
  └── ...
```

Icon suggestion: `Landmark` from Lucide.

### UI Mockup Description

**Banking Overview (`/finance/banking`):**
- Top bar: "Banking" title, "Sync Now" button with spinner + last synced timestamp
- Account cards row: One card per Wise account showing currency flag, balance, account name
- Reconciliation summary: 4 stat cards — Total Credits (this month), Matched, Unmatched, Match Rate %
- Recent unmatched transactions: Table showing last 5 unmatched with "View All" link
- Sync log: Collapsible section showing recent sync history

**Transactions (`/finance/banking/transactions`):**
- Filters bar: Date range picker, type toggle (All | Credits | Debits), reconciliation status (All | Matched | Unmatched), search box
- Table columns: Date, Description, Reference, Amount (green/red), Type, Status (icon: checkmark=matched, warning=unmatched), Matched To (link to order/vendor/payout)
- Click row to open detail with match/unmatch actions
- Pagination

**Reconciliation (`/finance/banking/reconciliation`):**
- Summary stats at top
- Two-panel layout:
  - Left: Unmatched transactions list (sorted by date, newest first)
  - Right: When a transaction is selected, shows suggested matches (payouts/vendors) ranked by confidence with "Match" button
- Manual match: Search box to find orders/vendors/payouts by ID or reference

## Implementation Plan

### Phase 1: MVP
- Create database tables and migrations
- Build Wise API client (auth, fetch accounts, fetch transactions)
- Implement manual sync endpoint
- Basic transaction list page
- Banking overview with account balances
- Navigation integration

### Phase 2: Enhancements
- Auto-reconciliation engine (payout matching)
- Reconciliation dashboard with unmatched list
- Manual match workflow
- Vendor payment matching
- Sync log and error handling

### Phase 3: Polish
- Automated scheduled sync (cron every hour)
- Match confidence scoring and improvement
- Transaction search and advanced filters
- Export reconciliation report (CSV)
- Alerts for unmatched transactions older than 7 days
- Multi-currency support and conversion display

## Dependencies

- **External APIs:** Wise API v1 — requires API token from Wise business account
- **Existing features:** Payouts table, Orders table, Vendors table, Ledger
- **Data requirements:** Wise API token configured in environment
- **Libraries:** `node-fetch` or `axios` for API calls; consider `fuse.js` for fuzzy matching vendor names
- **Security:** API token stored encrypted in environment, never exposed to client

## Estimated Effort

| Area | Hours |
|------|-------|
| DB & Migration | 3 |
| Wise API Client | 8 |
| Sync Engine | 10 |
| Reconciliation Engine | 12 |
| API Endpoints | 8 |
| UI — Overview Dashboard | 6 |
| UI — Transaction List | 8 |
| UI — Reconciliation Dashboard | 10 |
| UI — Setup Wizard | 4 |
| Testing | 10 |
| **Total** | **79 hours** |

## Priority & Timeline

- **Priority:** High
- **Target start:** Sprint 2
- **Phase 1 delivery:** 2 weeks
- **Full delivery:** 6 weeks
- **Owner:** Backend team (API integration), Frontend team (dashboards)
- **Blocker:** Must have Wise API token provisioned before development can begin
