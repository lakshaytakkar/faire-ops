# Prompt — Extract my real Life AI data from your memory

> Paste this entire prompt into Claude / ChatGPT / any AI assistant that has access to long-running conversation history with me. It will return SQL that I can run against my Supabase Postgres to seed `life.*` with my actual data instead of demo data.

---

## Who I am (give this to the AI exactly)

I'm Lakshay Suprans, founder of Suprans (parent of LegalNations, USDrop AI, EazyToSell, GoyoTours, ToysInBulk, B2B Ecommerce). I'm building **Life AI** — a personal operating system that lives inside my internal portal at `https://faire-ops-flax.vercel.app/life`. The schema is already live. I want **you** to scan whatever you remember about me from our past conversations / your stored memory and **emit SQL `INSERT` statements** populating the tables below with my **real** information.

## Hard rules

1. **Only insert facts you actually remember from our prior conversations or your persistent memory about me. Do not invent, guess, or extrapolate.** If a value is genuinely uncertain, omit the row.
2. For every row, put a comment line above it like `-- source: <where you remember this from, e.g. "March 2026 chat about Q1 review">` so I can verify.
3. Output **only SQL** in fenced code blocks, one block per table. No prose between blocks except a one-line table title.
4. Every `INSERT` must end with `WHERE NOT EXISTS (SELECT 1 FROM life.<table> WHERE <natural_key> = '<value>')` so I can run the script multiple times safely.
5. **Respect the CHECK constraints** listed in each schema — invalid enum values will fail.
6. If you can't fill a particular table because you have no real data for it, **say so explicitly** (`-- no data remembered for life.X`) and skip.
7. At the very end, give me a single sentence summary: "I emitted N inserts across M tables; please verify the rows marked with [VERIFY]."

## Output target

Postgres schema = `life`. All `id` columns are uuid with `default gen_random_uuid()` so omit them in the INSERT column list.

## Tables + columns + constraints

### `life.life_goals`
Columns: `title (NN), description, why, domain (NN), horizon (NN), status (NN), progress (0-100), milestones (jsonb), completed_at`
- domain ∈ free text, but use one of: `health, wealth, relationships, growth, career, mind, spiritual, other`
- horizon ∈ `today, 1_week, 1_month, 1_year, 3_years, 10_years, lifetime`
- status ∈ `active, on_hold, complete, dropped`

### `life.life_issues`
Columns: `title (NN), description, domain (NN), severity (NN), status (NN), target_date, linked_goal_id, notes, resolved_at`
- severity ∈ `low, medium, high, critical`
- status ∈ `open, in_progress, resolved, accepted`

### `life.journal_entries`
Columns: `date (NN, unique-ish), brain_dump, best_part, change_one_thing, grateful_for, worried_about, one_learning, mood (1-10), energy (1-10), day_rating (1-10), word_count`
- One row per calendar date. Use the WHERE NOT EXISTS gate on `date`.

### `life.thought_notes`
Columns: `title, content (NN), tags (text[]), linked_goal_id, linked_issue_id`

### `life.decision_logs`
Columns: `decision (NN), domain (NN), date (NN), options_considered, choice_made (NN), why, outcome, notes`

### `life.wins`
Columns: `title (NN), domain (NN), date (NN), notes`
- domain values same set as goals.

### `life.letters_to_self`
Columns: `written_on (NN), open_on (NN), subject, content (NN), status (sealed|opened)`

### `life.life_transactions`
Columns: `date (NN), type (NN income|expense|transfer), category (NN), sub_category, amount (NN), currency, account, narration, notes, receipt_url, tags (text[]), itr_relevant (bool)`

### `life.net_worth_snapshots`
Columns: `month (NN, format YYYY-MM), total_assets, total_liabilities, assets_breakdown (jsonb), liabilities_breakdown (jsonb), notes`
- **Do NOT insert net_worth** — it's a generated column.

### `life.investments`
Columns: `name (NN), type, platform, units, buy_price, invested_amount, current_value, last_updated, notes`

### `life.insurance_policies`
Columns: `type, provider, policy_number, insured_amount, premium, premium_frequency, next_due, status (active|lapsed|expired), document_url, notes`

### `life.blocked_money`
Columns: `scheme (NN), type, amount_invested, date_invested, lock_in_until, current_value, maturity_value, account, notes`

### `life.debtors` / `life.creditors`
Columns (both): `name (NN), amount, since, due_date or expected_return, status (outstanding|returned|written_off), priority (low|medium|high), notes`

### `life.emis`
Columns: `name (NN), type, monthly_amount, total_amount, start_date, end_date, paid_count, account, active (bool), notes`

### `life.monthly_budgets`
Columns: `month (NN, YYYY-MM), category (NN), budget_amount`

### `life.sleep_logs`
Columns: `date (NN), bedtime, wake_time, hours, quality (1-5), notes` — **quality 1-5 only.**

### `life.mood_logs`
Columns: `date (NN), mood (1-10 NN), energy (1-10 NN), tag, notes`

### `life.workout_logs`
Columns: `date (NN), type (NN), duration_mins (NN), muscles_worked (text[]), energy_level (1-10), notes`

### `life.vital_logs`
Columns: `date (NN), weight_kg, bp_systolic, bp_diastolic, heart_rate, blood_glucose, notes`

### `life.meditation_logs`
Columns: `date (NN), duration_mins, type, notes`

### `life.gratitude_logs`
Columns: `date (NN), item_1, item_2, item_3`

### `life.supplements`
Columns: `name (NN), dosage, timing, purpose, brand, stock_qty, reorder_date, monthly_cost, active (bool)`

### `life.doctors`
Columns: `name (NN), speciality, hospital, phone, last_visit, next_appointment, notes`

### `life.books`
Columns: `title (NN), author, category, status (want_to_read|reading|finished|abandoned), rating (1-5), started_at, finished_at, key_takeaway, notes`

### `life.courses`
Columns: `title (NN), platform, category, instructor, url, status (wishlist|in_progress|complete|dropped), progress_pct (0-100), certificate_url, started_at, finished_at, notes`

### `life.skills`
Columns: `name (NN), category, current_level (1-5), target_level (1-5), last_practiced, notes` — **levels are 1-5 not 1-10.**

### `life.captures`
Columns: `content (NN), source, category, status (inbox|processed|archived), action_item`

### `life.queue_items`
Columns: `title (NN), creator, type, url, category, priority (low|medium|high), status (queued|in_progress|done|skipped)`

### `life.people`
Columns: `name (NN), category (NN), phone, email, birthday, location, how_we_met, frequency_target, last_contact, contact_health (great|good|needs_attention|drifting), notes, active (bool)` — **contact_health values are great/good/needs_attention/drifting (NOT excellent/fading/cold).**

### `life.interaction_logs`
Columns: `person_id (uuid → life.people.id), date (NN), mode, summary` — **use a CTE**: `with p as (select id, name from life.people) insert into life.interaction_logs (person_id, ...) select p.id, ... from p join (values ('Person Name', ...)) as t(name, ...) on t.name = p.name`.

### `life.relationship_events`
Columns: `title (NN), date, category, location, notes`

### `life.professional_network`
Columns: `name (NN), title, company, how_we_know, last_touchpoint, linkedin_url, email, phone, notes`

### `life.habits`
Columns: `name (NN), category, frequency (daily|weekdays|custom), custom_days (text[]), target_description, why, status (active|paused|retired), sort_order`

### `life.habit_logs`
Columns: `habit_id (uuid → life.habits.id), date (NN), status (done|skip|miss), note` — same CTE pattern as interactions.

### `life.routines`
Columns: `name (NN), time_of_day, duration_mins, active (bool), sort_order`

### `life.personal_projects`
Columns: `name (NN), category, description, status (planning|active|on_hold|complete|dropped), progress (0-100), start_date, target_date, next_action, notes`

### `life.project_milestones`
Columns: `project_id (uuid), title (NN), due_date, done (bool)` — same CTE pattern.

### `life.bucket_list`
Columns: `title (NN), category, priority (low|medium|high), status (dreaming|planning|in_progress|complete), completed_at, notes`

### `life.trips`
Columns: `destination (NN), type, departure_date, return_date, status (planned|booked|in_progress|complete|cancelled), budget, spent, notes`

### `life.vehicles`
Columns: `make (NN), model, year, reg_number, fuel_type, insurance_expiry, puc_expiry, service_due, loan_status, notes`

### `life.physical_assets`
Columns: `name (NN), category, purchase_date, purchase_price, current_value, condition, notes`

### `life.life_documents`
Columns: `name (NN), type, number, issued_by, issue_date, expiry_date, status, document_url, notes`

### `life.apps` (Digital Stack)
Columns: `name (NN), url, logo_url, category (NN one of productivity|communication|development|design|finance|infrastructure|entertainment|health|ai|marketing|shopping|travel|social|learning|utilities|other), purpose, usage_frequency (daily|weekly|monthly|rarely|archived), is_favorite (bool), is_paid (bool), tags (text[]), notes`

### `life.app_subscriptions`
Columns: `app_id (uuid), plan_name, billing_cycle (monthly|quarterly|annual|lifetime|trial), amount, currency, next_renewal, auto_renew (bool), payment_method, status (active|trial|cancelled|lapsed), started_on, notes` — same CTE pattern joining `life.apps` by name.

### `life.app_credentials`
Columns: `app_id (uuid), login_type (email|username|sso_google|sso_github|sso_apple|passkey|phone), identifier, password_manager, password_last_rotated, two_factor_method (totp|sms|email|hardware_key|none), recovery_email, recovery_phone, notes` — **never include actual passwords**, only metadata.

---

## Priority order (do these first if time-bound)

1. `apps` + `app_subscriptions` + `app_credentials` — software stack metadata is the most likely thing you remember about me.
2. `life_goals` + `life_issues` — strategic state.
3. `people` + `interaction_logs` + `professional_network` — relationships you've helped me reason about.
4. `books` + `skills` + `courses` + `captures` + `queue_items` — learning trail.
5. `decision_logs` + `wins` + `journal_entries` — reflection trail.
6. Everything else if you have remembered fragments.

## Format reminder

```sql
-- =============================================================
-- life.<table>
-- =============================================================
-- source: <evidence pointer>
insert into life.<table> (col1, col2, ...) 
select * from (values
  ('val1', 'val2', ...) -- [VERIFY] note any uncertainty
) as t(col1, col2, ...)
where not exists (select 1 from life.<table> where <natural_key> = 'val1');
```

If you have no real memory for a table, write:

```
-- life.<table> — no data remembered, skipping
```

End with: **"I emitted N inserts across M tables; please verify the rows marked with [VERIFY]."**
