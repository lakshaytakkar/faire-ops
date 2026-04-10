# Pre-b2b-refactor checkpoint — 2026-04-10

## Code
- Branch: `team-portal-restructure`
- Commit: `7f7f9a5` (`checkpoint: pre-b2b-schema-refactor`)
- Restore: `git reset --hard 7f7f9a5`

## Database state (b2b schema row counts)

| Table | Rows |
|---|---|
| collections | 136 |
| faire_application_followups | 0 |
| faire_application_links | 0 |
| faire_bank_transactions | 0 |
| faire_ledger_entries | 2 |
| faire_orders | 1816 |
| faire_products | 4487 |
| faire_retailers | 2230 |
| faire_seller_applications | 3 |
| faire_stores | 7 |
| faire_vendors | 2 |
| marketing_budgets | 3 |
| marketing_events | 15 |
| meta_ad_accounts | 1 |
| meta_ad_creatives | 9 |
| meta_ad_reports | 91 |
| meta_ad_sets | 8 |
| meta_ads | 16 |
| meta_campaigns | 4 |
| price_changes | 0 |
| product_images | 2 |
| scraped_products | 15 |
| shipment_tracking | 2 |
| stock_adjustments | 0 |
| store_assets | 5 |
| store_daily_views | 54 |
| sync_log | 118 |
| vendor_quotes | 50 |

## Schema state
- 28 base tables in `b2b` schema (source of truth)
- 28 corresponding **views** in `public` schema (compatibility shims, what the portal currently reads from)
- Foundation tables (users, tasks, tickets, chat_*, files, etc.) live natively in `public`

## Refactor plan
1. Add `supabaseB2B` client with `db: { schema: 'b2b' }`
2. Switch all `.from("<b2b table>")` calls to `supabaseB2B.from(...)`
3. Build + smoke test
4. Deploy to Vercel
5. After prod verified healthy → drop the `public.*` views

## Rollback
- Code: `git reset --hard 7f7f9a5`
- DB: nothing to rollback (no DDL run yet); after step 5, recreating views = re-running the original view definitions (capture them before dropping)
