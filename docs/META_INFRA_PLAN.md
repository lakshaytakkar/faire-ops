# faire-ops — Ops Restructure Master Plan

## Context

faire-ops is now hosting ~5 categories of in-flight projects (Admin Spaces, Plugins, Client Portals, Mobile Apps, Landing Pages) plus future external client work. Today there is:
- A `/development` space with `public.projects` + `public.deployment_events` (projects untyped).
- A Design/Space canon (`DESIGN_SYSTEM.md`, `SPACE_PATTERN.md`, `docs/SPACE_ARCHITECTURE.md`).
- 8 Claude agents, all focused on Suprans landing pages — none for generic space/plugin/landing-page/data/deploy work.
- No registry for domains, integrations (Sentry/Twilio/PostHog/Razorpay/Vercel/Supabase), AI tools, automations, UI kit locks, or credential pointers.
- Fake demo data that was just seeded into HQ People (57 payroll lines, 1710 attendance rows, 40 performance reviews, ₹30k default salaries). User wants **real data only** in dev.

Goal: build a **meta-infrastructure layer** inside the existing `/development` space so every new project (regardless of type) has: a typed entry, a checklist owned by its project type, a domain, a deploy history, integration health, and a place where Claude auto-logs major work. Then expand the agent roster so each project type has a dedicated builder agent that follows its checklist. Execute in ordered phases with explicit checkpoints — **no phase starts until the previous phase is verified clean**.

This plan intentionally defers feature work (the Bookings plugin, more HQ sub-modules, etc.) until the meta layer lands. Those features slot into the new pipeline afterwards.

---

## Ground rules (locked)

1. **Real data only.** No fake/demo rows in dev. Missing data → empty state + checklist item "pending real data", never fabricated numbers.
2. **Checks between phases.** Each phase ends with: `npx tsc --noEmit` + `npm run build` + manual smoke + DB-row-count verification vs. expected. Claude does NOT start the next phase until the previous one's checks pass.
3. **Multi-agent execution.** Specialized agents handle each project type. Claude (main thread) orchestrates, delegates to subagents for independent work, reviews their output, and gates the next phase.
4. **No hallucinations.** Every claim — file paths, table columns, row counts, domains — is verified against the live DB or filesystem before it's written as fact.
5. **Claude logs its own major work** into `public.tasks` with `assignee: 'Claude'`, `tags: ['automated','major-work']`, plus `dev_task_comments` with `is_system_log: true`. Minor edits (<30 LOC, single-file) are NOT logged.

---

## Phase 0 — Cleanup: purge fake data (15 min, main thread)

Remove the demo data seeded in the People stabilization session.

**SQL (applied via MCP):**
```sql
DELETE FROM hq.payroll_line_items;          -- 57 fake lines
DELETE FROM hq.payroll_runs WHERE month = '2026-03-01';  -- demo run
DELETE FROM hq.attendance_records;          -- 1710 fake records
DELETE FROM hq.performance_reviews;         -- 40 fake reviews
-- Keep the one performance_cycles row (just a container)
-- Keep hq.policies (8 real company policies)
UPDATE hq.employees SET salary_monthly = NULL;  -- revert ₹30k defaults
```

**Verify:**
- `SELECT count(*) FROM hq.{attendance_records,payroll_line_items,performance_reviews}` → 0 each.
- Visit `/hq/people/{attendance,payroll,performance}` → all show EmptyState (no crashes).
- `/hq/people/directory/[id]` still lists real attributes, no salary KPI noise.

**Also**: repo-wide grep for visible fake arrays (`demoData =`, `mockRows =`, `sampleItems =`) in `src/app/(portal)/hq/` and flag hits. If any exist, swap to empty `[]` with an "awaiting real data" empty state.

---

## Phase 1 — Meta-infrastructure DB (45 min, main thread via MCP)

Create canonical tables in `public` schema so any space can read them.

```sql
-- 1. Project types (5 rows seeded inline)
CREATE TABLE public.project_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,      -- 'admin-space'|'plugin'|'client-portal'|'mobile-app'|'landing-page'
  label text NOT NULL,
  description text,
  icon text,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.project_types (key, label, sort_order) VALUES
  ('admin-space','Admin Space',1),
  ('plugin','Plugin',2),
  ('client-portal','Client Portal',3),
  ('mobile-app','Mobile App',4),
  ('landing-page','Landing Page',5);

-- 2. Extend existing projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_type_id uuid REFERENCES public.project_types(id),
  ADD COLUMN IF NOT EXISTS owner_email text,
  ADD COLUMN IF NOT EXISTS repo_path text,       -- 'src/app/(portal)/hq' or 'websites/usdrop-landing'
  ADD COLUMN IF NOT EXISTS health_status text,   -- 'green'|'amber'|'red'|'unknown'
  ADD COLUMN IF NOT EXISTS last_major_update_at timestamptz;

-- 3. Checklist templates (one row per type, items as ordered JSONB)
CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type_id uuid NOT NULL REFERENCES public.project_types(id) ON DELETE CASCADE,
  version int NOT NULL DEFAULT 1,
  items jsonb NOT NULL,   -- [{key,label,description,required,guide_url}]
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_type_id, version)
);

-- 4. Per-project checklist instances
CREATE TABLE public.project_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id),
  items jsonb NOT NULL,    -- [{key,status,updated_at,updated_by,notes}]
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Domains
CREATE TABLE public.domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text UNIQUE NOT NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  venture_slug text,
  status text DEFAULT 'active',
  registrar text,
  expiry_date date,
  ssl_valid boolean,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Integrations
CREATE TABLE public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  status text DEFAULT 'active',
  account_email text,
  plan text,
  monthly_cost_usd numeric(10,2),
  vault_ref text,
  used_in_spaces text[],
  health_check_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7. AI tools directory
CREATE TABLE public.ai_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  provider text,
  model_id text,
  purpose text,
  used_in_spaces text[],
  vault_ref text,
  monthly_cost_usd numeric(10,2),
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Automations
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  trigger_type text NOT NULL,
  schedule text,
  target_path text,
  spaces text[],
  status text DEFAULT 'active',
  last_run_at timestamptz,
  last_success_at timestamptz,
  failure_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. UI kit locks
CREATE TABLE public.ui_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  version text NOT NULL,
  component_manifest_url text,
  locked_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- 10. Vault pointers (NEVER stores secrets; stores labels + vault service pointers)
CREATE TABLE public.vault_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  category text,
  vault_service text NOT NULL,
  vault_item_ref text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  integration_id uuid REFERENCES public.integrations(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Claude work log
CREATE TABLE public.claude_work_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  space_slug text NOT NULL,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  files_changed text[],
  commit_sha text,
  deploy_url text,
  minor boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_claude_work_date ON public.claude_work_log(work_date DESC);
CREATE INDEX idx_claude_work_space ON public.claude_work_log(space_slug);
```

**Verify:**
- `\dt public.*` lists all 11 new tables.
- `SELECT key FROM public.project_types ORDER BY sort_order;` → 5 rows in order.
- No PostgREST schema-cache errors when hitting each table via `supabase.from('<table>').select()`.

---

## Phase 2 — Backfill existing projects (30 min, main thread)

Categorize every in-flight project into the new registry.

**Admin Spaces (7):** retailers, ets, hq, goyo, life, legal, usdrop.
**Plugins (~15):** tasks, chat, calls-qa, calendar, files, ai-tools, gmail, inbox, knowledge, links, research, team, tickets, training, automations, analytics, ai-team, bookings (queued).
**Client Portals (2+):** ets-client-full, usdrop-client.
**Mobile Apps (0 today):** single placeholder row marked `status: not-started`.
**Landing Pages (4):** suprans (websites/suprans-landing-v1 + v2), usdrop-landing, ets-landing, legalnations-landing.

For each: insert/update in `public.projects` with `project_type_id`, `repo_path`, `owner_email`, `health_status` ('green' if deployed recently else 'unknown'). Create one `public.project_checklists` row per project with all items initialized to `status: 'pending'`.

**Verify:**
- `SELECT pt.label, count(*) FROM public.projects p JOIN public.project_types pt ON p.project_type_id=pt.id GROUP BY pt.label;` matches expected.
- Every project row has exactly one checklist entry.

---

## Phase 3 — Checklist templates per project type (1 hour, main thread)

**Landing Page (11 items, per user):**
1. Copywriting tone + AI guide
2. Complete copywriting
3. Reference websites
4. Sitemap
5. Design system
6. Animations guide AI md
7. Component / page / resource links
8. CTAs + forms + data storage
9. Images + assets
10. UI8 / Figma file for inspiration
11. Major prompts that help get it done

**Admin Space (10):**
1. SPACE_PATTERN compliance
2. Pass-through layout.tsx
3. page.tsx redirect
4. Every section has list + detail pages
5. Real data seeded (no fakes)
6. Right-dock plugins scoped via `space_plugin_settings`
7. Top-nav entry with deep-route coverage
8. Row click → detail route (no modals)
9. Typography pass
10. tsc + build clean

**Plugin (9):**
1. DB table(s) with `space_slug NOT NULL` indexed
2. `space_plugin_settings` row per space
3. `plugins-catalog.ts` entry
4. Universal page under `/workspace/<plugin>`
5. Optional native page per space via `SPACE_MODULE_OVERRIDES`
6. SECURITY DEFINER RPCs when cross-schema
7. Dock entry in `workspace-dock.tsx`
8. Canon compliance
9. Smoke test documented

**Client Portal (10):**
1. Separate Vercel project + alias
2. Auth flow tested
3. Schema isolation (RLS or RPC-scoped)
4. Deploy URL in `public.domains`
5. Sentry + PostHog attached
6. Portal shared primitives reused
7. useClientId robustness
8. Dev + prod entries in sync
9. Vault pointer present
10. Monitoring wired

**Mobile App (10):**
1. Platform decision (Expo/bare RN/native)
2. Supabase auth
3. Offline strategy
4. Design system ported
5. Push notifications
6. TestFlight / Play Internal
7. App icon + splash
8. Version strategy
9. Crash reporting
10. Release channel

Items stored as `jsonb` array with `{key,label,description,required,guide_url}`.

**Verify:** Open each project detail page (built in Phase 4) → correct checklist with right item count.

---

## Phase 4 — Admin UI inside `/development` (3 hours, parallel subagents)

Extend `/development` space per SPACE_PATTERN.

| Path | Purpose |
|---|---|
| `src/app/(portal)/development/registry/page.tsx` | Project list w/ chip tabs per type + KPIs |
| `src/app/(portal)/development/registry/[id]/page.tsx` | Project detail + checklist + sidebar |
| `src/app/(portal)/development/registry/[id]/checklist-editor.tsx` | Client toggle UI |
| `src/app/(portal)/development/checklists/page.tsx` | Template list |
| `src/app/(portal)/development/checklists/[id]/page.tsx` | Template edit |
| `src/app/(portal)/development/domains/page.tsx` | Domain tracker |
| `src/app/(portal)/development/integrations/page.tsx` | Integration health |
| `src/app/(portal)/development/ai-tools/page.tsx` | AI tools directory |
| `src/app/(portal)/development/automations/page.tsx` | Automation list |
| `src/app/(portal)/development/ui-kits/page.tsx` | Locked UI kits |
| `src/app/(portal)/development/vault/page.tsx` | Vault pointer directory (no secrets) |
| `src/app/(portal)/development/claude-log/page.tsx` | Claude daily digest |

**Also modify:** `src/components/layout/top-navigation.tsx` — extend `/development` nav.

**Parallelization** — 3 subagents:
- Agent A: registry + checklists
- Agent B: domains + integrations + ai-tools + automations
- Agent C: ui-kits + vault + claude-log + top-nav wiring

Each gets: SPACE_PATTERN §3 skeleton + DB columns from Phase 1 + checklist items from Phase 3.

**Verify:** `npx tsc --noEmit` + `npm run build` clean; KPIs show real counts; chip filters work; checklist toggle persists.

---

## Phase 5 — Agent roster expansion (2 hours, main thread)

Write 9 new agent files at `.claude/agents/<name>.md` (YAML frontmatter + body per existing `layout-implementer.md` pattern).

1. **space-builder** (opus) — New admin spaces per SPACE_PATTERN, runs admin-space checklist.
2. **plugin-builder** (opus) — Cross-space plugins, enforces `space_slug` + dock wiring.
3. **landing-page-builder** (opus) — 11-item landing checklist; orchestrates existing `suprans-copywriter` + `layout-implementer` + `microinteraction-director`.
4. **data-seeder** (sonnet) — xlsx/csv → Supabase via RPCs. **Hard rule: never synthetic rows.**
5. **design-system-enforcer** (sonnet) — Typography + primitive audit; reports, doesn't auto-fix.
6. **deploy-agent** (sonnet) — `vercel --prod --yes --archive=tgz` + alias + log to `deployment_events`.
7. **real-data-auditor** (sonnet) — Scans codebase + DB for fake data; reports, never deletes.
8. **work-logger** (haiku) — Writes `tasks` + `claude_work_log`; decides minor vs major by LOC + file-count.
9. **checklist-enforcer** (sonnet) — Gates phase completion on checklist items.

Also `.claude/agents/README.md` listing all agents + when to invoke.

**Verify:** Dry-run each agent; `space-builder` scaffolds throwaway `/test-space` passing checklist 1-9; `work-logger` creates 1 task + 1 log row on a tiny change.

---

## Phase 6 — Claude auto-logging wiring (30 min, main thread)

Operationalize work-logger.

- Add to `CLAUDE.md`: "after each major change, invoke work-logger subagent".
- Major = new page / new table / migration / deploy / >50 LOC across ≥2 files / multi-step feature. Minor = typo / single-line / formatting / <30 LOC single-file. Minor rows stored with `minor=true` but excluded from digest by default.
- `/development/claude-log` groups rows by date + space; card per major item with commit + deploy URL.

**Verify:** Test change → task + log appear. Minor change → logged w/ `minor=true`, hidden from digest.

---

## Phase 7 — Persist this plan (15 min, main thread)

Copy final plan to `docs/META_INFRA_PLAN.md` (repo-persistent). Add memory entry summarizing plan + current phase.

---

## Phase 8+ — Feature work resumes on new pipeline

Queued feature work (Bookings plugin, more HQ sub-modules, client portal polish) executes via new agents + checklists. Bookings plan from prior session remains valid but routes through `plugin-builder` + plugin checklist.

---

## Critical files

### New
- `.claude/agents/{space-builder,plugin-builder,landing-page-builder,data-seeder,design-system-enforcer,deploy-agent,real-data-auditor,work-logger,checklist-enforcer}.md`
- `.claude/agents/README.md`
- `src/app/(portal)/development/{registry,checklists,domains,integrations,ai-tools,automations,ui-kits,vault,claude-log}/page.tsx` + detail pages
- `docs/META_INFRA_PLAN.md` (Phase 7 copy)

### Modified
- `src/components/layout/top-navigation.tsx` — expand `/development` nav
- `CLAUDE.md` — work-logger invocation rule

### DB migrations
- `meta_infra_foundation` — Phase 1 DDL (11 tables + alters)
- `meta_infra_templates_seed` — Phase 3 checklist templates
- `meta_infra_registry_backfill` — Phase 2 project rows

### Preserved (DO NOT TOUCH)
- Every existing space, plugin, table outside the list above.
- All 8 existing agents.
- `DESIGN_SYSTEM.md`, `SPACE_PATTERN.md`, `docs/SPACE_ARCHITECTURE.md`.

---

## Checkpoints between phases

| After | Gate |
|---|---|
| Phase 0 | Fake row counts = 0. `/hq/people/*` no crashes. |
| Phase 1 | 11 new tables listable via PostgREST; no schema-cache errors. |
| Phase 2 | Every project has exactly one checklist row; type counts match known. |
| Phase 3 | 5 templates present with expected item counts (11/10/9/10/10). |
| Phase 4 | Every new `/development/*` page renders; tsc + build clean. |
| Phase 5 | Each agent dry-runs successfully. |
| Phase 6 | Live task + claude_work_log row from test change. |
| Phase 7 | `docs/META_INFRA_PLAN.md` committed; memory entry saved. |

**Rule:** Phase N+1 does NOT start until Phase N's gate is green. User can interrupt at any checkpoint.

---

## Out of scope (deferred)

- Bookings plugin build — Phase 8, via `plugin-builder`.
- Mobile app bootstrap — Phase 8+, needs `mobile-app-builder` agent (separate plan).
- External-client onboarding — separate plan when first external client signs.
- Landing page AI-copy polishing — use existing `suprans-copywriter`; generic version later.
- File-based SQL migrations per sub-phase — Phase 1-3 applied via MCP; Phase 7 dumps full schema to `supabase/migrations/` for repo history.
- Live Sentry/PostHog/Twilio health checks — Phase 4 creates registry UI but not live probes; per-integration follow-ups.

---

## Verification (end-to-end, after Phase 7)

- [ ] All 11 meta tables exist + populated.
- [ ] `/development/registry` shows every project categorized by type.
- [ ] Each project detail page renders its checklist with correct item count.
- [ ] `/development/domains` lists all known deploy domains.
- [ ] `/development/integrations` has entries for every wired service.
- [ ] `/development/claude-log` shows the test work entry.
- [ ] All 9 new agents have files + README entry.
- [ ] `npx tsc --noEmit` + `npm run build` clean.
- [ ] `docs/META_INFRA_PLAN.md` exists in repo.
- [ ] HQ People pages load with real-only data (no fake attendance/payroll/performance).
