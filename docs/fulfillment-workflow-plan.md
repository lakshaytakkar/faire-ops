# Supplier / Fulfillment Workflow — Implementation Plan

**Status:** Phase 1 migration shipped. Admin UI + vendor portal still to build.

This plan is the source of truth for turning the "everything on WhatsApp
between Krish and Charlie" workflow into a structured in-portal flow with
a separate vendor-facing deployment.

## Ground truth (verified against schema, not assumed)

| Thing | Where it lives today | Status |
|---|---|---|
| Order lifecycle state (Faire's) | `b2b.faire_orders.state` — `NEW`, `PROCESSING`, `PRE_TRANSIT`, `IN_TRANSIT`, `DELIVERED`, `CANCELED` | ✅ from Faire API, **do not modify** |
| Our sub-status (quote / payment / ship) | `b2b.faire_orders.quote_status` — free text, no CHECK | ✅ extend vocabulary additively |
| Assigned supplier | `b2b.faire_orders.assigned_vendor_id` → `b2b.faire_vendors.id` | ✅ already wired |
| Supplier roster | `b2b.faire_vendors` (33 rows, Charlie is `is_default=true`, has whatsapp, specialties, avg_lead_days, rating, completed_orders) | ✅ in place |
| Quote request / response | `b2b.vendor_quotes` (order_id, vendor_id, status, items jsonb, shipping_cost_cents, total_cost_cents, tracking_code, carrier, shipped_at) | ✅ exists, needs UI polish + Phase-2 vendor-facing screens |
| Outbound payments to supplier | `b2b.faire_ledger_entries` (entry_date, entry_type, amount_cents, status, order_id) | ✅ use this, don't build a parallel table |
| Fulfillment notes (color / variant) | `b2b.faire_orders.fulfillment_notes` | ✅ **Phase 1 migration — shipped** |
| Per-item substitutions | `b2b.order_substitutions` | ✅ **Phase 1 migration — shipped** |
| Supplier blackouts / holidays | `b2b.supplier_blackouts` | ✅ **Phase 1 migration — shipped** |
| Vendor portal auth tokens | `public.vendor_access_codes` (seeded `CHARLIE-DEV-2026` → Charlie) | ✅ **Phase 1 migration — shipped** |
| WhatsApp send infrastructure | `src/lib/twilio.ts` → `sendWhatsApp()`, `/api/sms/send`, `sms_logs`, `sms_templates`. Graceful `simulated` fallback. | ✅ live |
| Vendor portal scaffold | `src/app/vendor/page.tsx` (1 400 lines, Dashboard/Orders/Ship/History/Ledger tabs). No auth today. | ⏳ needs extraction + auth |
| Legal Nations standalone pattern | `external/legalnations/` — Vite SPA + pnpm workspace, `outputDirectory: artifacts/legal-nations/dist/public` | ✅ reference for Phase 2 |
| RLS on `b2b.*` tables | Fully permissive (`USING true / WITH CHECK true`) | ⚠️ **must scope for vendor portal in Phase 2** |

## Vocabulary (locked)

**Faire states (don't touch):** `NEW` → `PROCESSING` → `PRE_TRANSIT` → `IN_TRANSIT` → `DELIVERED` / `CANCELED`.

**Our `quote_status` sub-stages:**
```
none  (fresh order — nothing sent yet)
 ↓  admin clicks "Send quote request"
requested  (WhatsApp went out to supplier)
 ↓  supplier replies with prices
quoted  (vendor_quotes has items + totals populated)
 ↓  admin accepts the quote
approved
 ↓  admin marks we need to pay
payment_pending
 ↓  admin uploads bank slip → /api/sms/send to notify supplier
payment_sent
 ↓  supplier confirms receipt
payment_confirmed
 ↓  supplier marks goods ready
ready_to_ship
 ↓  supplier enters tracking code
shipped          ←  Faire.state flips to PROCESSING / PRE_TRANSIT concurrently
 (terminal)
```
Parallel branches:
- `substitution_needed` — any line item triggers `order_substitutions` entry; admin resolves → returns to previous stage.
- `rejected` — vendor declines the quote; order may route to another supplier.

## Phase 1 — Admin UI on faire-ops (this milestone)

**Migration:** `fulfillment_pipeline_v1` ✅ shipped (fulfillment_notes column, order_substitutions, supplier_blackouts, vendor_access_codes with Charlie seed).

**Still to build:**

1. **Order detail page** (`src/app/(portal)/orders/[id]/page.tsx`) — verify path first. Add four new cards:
   - Fulfillment notes (inline textarea, autosave to `fulfillment_notes`).
   - Supplier / Quote status (assigned vendor chip, `quote_status` pill, vendor_quotes summary, "Send quote request" CTA).
   - Supplier payment (sums ledger entries for this order, "Add payment" dialog).
   - Substitutions (list of `order_substitutions` rows, approve / reject buttons, add-new form).

2. **Quote request composer** — one-click WhatsApp send.
   - Auto-compose body: `Order ${display_id} — brand: ${store.name}\nShip-to: ${address.line1}, ${address.city}\nItems: N × SKUs\nNotes: ${fulfillment_notes}`
   - POST to `/api/sms/send` with `channel=whatsapp`, `to_number=vendor.whatsapp`, `body_override=...`.
   - Flip `quote_status` → `requested`. Toast.
   - Log sms_id to the order's `vendor_quotes` row in `notes` for audit.

3. **Dashboard blackout banner** — on `/overview` (or `/dashboard` if that's the main landing).
   - Query: `SELECT * FROM b2b.supplier_blackouts WHERE start_date <= CURRENT_DATE + 5 AND end_date >= CURRENT_DATE`.
   - Render an amber warning card linking to each affected vendor's detail.

4. **Vendors admin page** (`src/app/(portal)/workspace/vendors/page.tsx`) additions:
   - Inline blackout dates section per vendor (list + add).
   - "Default vendor" badge on the `is_default=true` row.
   - Vendor-access-code issue button (generates a code, stashes in clipboard, inserts into `vendor_access_codes`).

5. **Review-agent loop** (same rubric as chat pass — target ≥90). Two iterations max.

## Phase 2 — Standalone vendor portal (next milestone)

**Decision: Next.js, not Vite.** Charlie's portal needs server-side cookie auth; Vite/SPA makes that harder. Legal Nations's pattern (Vite) is fine for a marketing page but not for an auth'd tool.

**Stack:** Next.js 16 (same as faire-ops), Tailwind + tokens copied verbatim, `@supabase/supabase-js` anon client with a custom **server-side cookie that carries `vendor_id`**. No Supabase Auth account — we stay on vendor-access-codes. Simpler to hand over to Charlie and explicit about the scope.

**Repo location:** `external/vendor-portal/` (mirrors `external/legalnations/`, gitignored from faire-ops).

**Routes:**
- `/login` — paste access code → exchange for cookie via `/api/auth/exchange` server route.
- `/dashboard` — open orders count, orders awaiting my quote, orders I need to ship, revenue this month.
- `/orders` — list of orders where `assigned_vendor_id = me OR status = 'requested' AND vendor_id IS NULL`.
- `/orders/[id]` — details + actions: "Accept quote", "Mark item not found → substitute", "Confirm payment received", "Mark ready to ship", "Enter tracking code".
- `/history` — shipped orders.
- `/ledger` — my ledger_entries.
- `/logout`.

**Auth flow:**
1. Vendor lands on `/login`, types their access code.
2. `POST /api/auth/exchange` looks up `vendor_access_codes` → if active and matches → sets an **HTTP-only signed cookie** `vendor_session` = `{ vendor_id, exp }`.
3. All pages read the cookie server-side, build a supabase client that injects `vendor_id` into every query.
4. Logout clears cookie.

**RLS hardening (lands with Phase 2):**
```sql
-- Swap permissive policies for vendor-scoped ones. Admin (is_superadmin) still has full access.
ALTER POLICY vendor_quotes_all ON b2b.vendor_quotes
  FOR ALL USING (vendor_id = current_setting('request.jwt.claim.vendor_id', true)::uuid OR is_superadmin());

-- Similar for faire_orders (via assigned_vendor_id), faire_ledger_entries, order_substitutions.
```

OR — since we're not using Supabase Auth — keep RLS permissive and enforce at the Next.js route layer (every query hard-scoped by the cookie's vendor_id). Pragmatic path for the dev loop.

**Deployment:**
- Separate Vercel project `vendor-portal-charlie.vercel.app` (or custom domain).
- Same Supabase URL + anon key. Env vars in Vercel dashboard.
- Custom signing key (`VENDOR_SESSION_SECRET`) for the cookie HMAC.

**Handover checklist** (to Charlie):
- URL + bookmarked access code.
- 5-minute Loom explaining: accept quote → mark payment confirmed → mark ready → upload tracking.
- Fallback: if anything breaks, ping Krish in the chat channel wired for this.

## Phase 3 — Later

- **Batch dispatch** — multi-select in admin orders list → single grouped WhatsApp + single quote_request with multiple order_ids.
- **WhatsApp Business API** — replace Twilio WhatsApp (template-only, expensive per msg) with a proper WA Business setup so free-form messages work.
- **Substitution approval flow** — vendor proposes substitute with photo upload + auto-notify admin.
- **Cron job for holiday alerts** — nightly check `supplier_blackouts` and push a notification.
- **Supplier performance dashboard** — on-time rate, item-not-found rate, avg lead days rolling 30-day.

## What got dropped

Nothing the user asked for is cut — Phase 3 is explicitly "later", not "never". The prioritization matches the user's own P1/P2/P3 labeling.

## Verification (Phase 1 so far)

- `ALTER TABLE b2b.faire_orders ADD fulfillment_notes TEXT` ✅ live.
- `b2b.order_substitutions` ✅ live (check CHECK constraints + indexes).
- `b2b.supplier_blackouts` ✅ live.
- `public.vendor_access_codes` ✅ live, `CHARLIE-DEV-2026` seeded pointing at `faire_vendors.is_default=true` vendor.
- RLS enabled on all three new tables, permissive policies to match existing b2b style.

Next concrete work item: `src/app/(portal)/orders/[id]/page.tsx` additions. Admin UI build starts there.
