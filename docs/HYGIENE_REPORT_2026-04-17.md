# Filetree hygiene report — 2026-04-17

## Summary

- Audited: src/ + scripts/ + repo root (roughly 1,200 TS/TSX files)
- Archived: 10 files → `_archive/2026-04-17/`
- Rename suggestions: 3
- Large-file split proposals: 18
- Asset bloat flagged: 6 entries (5 in `public/logos/`, 1 archived)

Working tree at audit start: clean on `team-portal-restructure` @ `6e401b7`. `_archive/` confirmed in `.gitignore` line 58.

## Archived (executed)

| Original path | New path | Reason |
| --- | --- | --- |
| `legal-test.js` | `_archive/2026-04-17/root/legal-test.js` | Ad-hoc Playwright script at repo root, zero inbound refs |
| `test-all-pages.cjs` | `_archive/2026-04-17/root/test-all-pages.cjs` | Ad-hoc Playwright script at repo root, zero inbound refs |
| `test-spaces.js` | `_archive/2026-04-17/root/test-spaces.js` | Ad-hoc Playwright script at repo root, zero inbound refs |
| `tsc-out.txt` | `_archive/2026-04-17/root/tsc-out.txt` | Empty file (0 bytes), typecheck output leftover |
| `docs/screenshots/image copy.png` | `_archive/2026-04-17/docs/screenshots/image copy.png` | Orphan screenshot, no code/doc refs (gitignored) |
| `docs/screenshots/image copy 2.png` | `_archive/2026-04-17/docs/screenshots/image copy 2.png` | Orphan screenshot, no code/doc refs (gitignored) |
| `docs/screenshots/image copy 3.png` | `_archive/2026-04-17/docs/screenshots/image copy 3.png` | Orphan screenshot, no code/doc refs (gitignored) |
| `docs/screenshots/image.png` | `_archive/2026-04-17/docs/screenshots/image.png` | Orphan screenshot, no code/doc refs (gitignored) |
| `docs/screenshots/krish_verma.png` | `_archive/2026-04-17/docs/screenshots/krish_verma.png` | Team photo not referenced by `upload-team-photos.ts` (that script reads from `.claude/`) |
| `docs/screenshots/luca-micheli-ruWkmt3nU58-unsplash.jpg` | `_archive/2026-04-17/docs/screenshots/luca-micheli-ruWkmt3nU58-unsplash.jpg` | 4.2MB stock photo, no inbound references |

Tracked moves used `git mv` (first 4). The 6 gitignored `.png/.jpg` files used plain `mv`.

## Rename suggestions (not executed)

| Current | Proposed | Reason |
| --- | --- | --- |
| `src/app/(portal)/goyo/_components/EditButton.tsx` | `src/app/(portal)/goyo/_components/edit-button.tsx` | `_components/` is kebab-case in every other space (`life`, `legal`, `usdrop`); PascalCase file here breaks the convention shared across duplicates of the same module |
| `src/app/(portal)/goyo/_components/GenericEditLauncher.tsx` | `src/app/(portal)/goyo/_components/generic-edit-launcher.tsx` | Same — kebab-case is the portal-side convention for `_components/` modules |
| `src/react-simple-maps.d.ts` | `src/types/react-simple-maps.d.ts` | Currently a loose `.d.ts` at `src/` root; only used via `declare module` side-effect so path doesn't matter, but moving under `src/types/` mirrors typical Next.js layout |

Duplicate basenames across the portal (`crud.ts`, `_client.ts`, `EditButton.tsx`, `field-specs.ts`, `format.ts`, `types.ts`, `_nav.ts`, `_lib.ts`) are **intentional per-space modules** (`SPACE_PATTERN.md` pattern) — not flagged.

## Large files (>1000 lines, not executed)

| Path | LOC | Classification | Split proposal |
| --- | --- | --- | --- |
| `src/app/(portal)/workspace/chat/page.tsx` | 2555 | decomposable (`manual`) | Extract message list, composer, sidebar, thread panel, reactions into sibling files under `workspace/chat/_components/` |
| `src/app/(portal)/overview/analytics/page.tsx` | 2026 | data-heavy + decomposable (`manual`) | Move the inline chart configs to `_data/analytics-config.ts`; split KPI section, geography, traffic, revenue panels into `_components/` |
| `src/app/(portal)/hq/hiring/candidates/[id]/candidate-detail-tabs.tsx` | 1996 | decomposable (`manual`) | One file per tab in `candidates/[id]/_tabs/` (profile, interviews, offers, history, attachments) |
| `src/app/tasks/_data/task-details.ts` | 1653 | data-heavy (`auto-safe`) | Split into per-task JSON fixtures under `src/app/tasks/_data/tasks/` and barrel-export; no logic, safe mechanical split |
| `src/app/(portal)/ets/catalog/products/page.tsx` | 1634 | decomposable (`manual`) | Extract product-table, filters, drawer, bulk-actions to sibling files |
| `src/app/vendor/page.tsx` | 1620 | decomposable (`manual`) | Vendor onboarding wizard — split per-step components under `vendor/_steps/` |
| `src/app/tasks/page.tsx` | 1504 | decomposable (`manual`) | Kanban + list + detail panel in one file; extract into `tasks/_components/` |
| `src/app/(portal)/jsblueridge/overview/analytics/page.tsx` | 1498 | decomposable (`manual`) | Mirror of `/overview/analytics/page.tsx`; same split plan |
| `src/app/(portal)/workspace/tickets/[id]/page.tsx` | 1404 | decomposable (`manual`) | Ticket-detail tabs + activity stream should move to `_tabs/` and `_components/` |
| `src/app/(portal)/hq/calls/calls/[id]/page.tsx` | 1189 | decomposable (`manual`) | Call-detail transcript + timeline + recording controls as sibling files |
| `src/app/(portal)/workspace/knowledge/articles/page.tsx` | 1169 | decomposable (`manual`) | Editor + sidebar + preview into `_components/` |
| `src/components/layout/top-navigation.tsx` | 1121 | decomposable (`manual`) | Split into `top-nav-logo.tsx`, `top-nav-search.tsx`, `top-nav-space-switcher.tsx`, `top-nav-user-menu.tsx`; keep `top-navigation.tsx` as composition shell |
| `src/app/(portal)/workspace/gmail/page.tsx` | 1102 | decomposable (`manual`) | Label tree + thread list + reader panel into separate components |
| `src/app/(portal)/ets/sales/clients/[id]/page.tsx` | 1074 | decomposable (`manual`) | Client detail tabs: profile, bookings, ledger, notes |
| `src/app/(portal)/catalog/image-studio/page.tsx` | 1072 | decomposable (`manual`) | Image queue + editor + AI panel split |
| `src/app/(portal)/catalog/publishing-queue/page.tsx` | 1037 | decomposable (`manual`) | Queue table + detail drawer + bulk actions |
| `src/app/(portal)/workspace/emails/compose/page.tsx` | 1032 | decomposable (`manual`) | Compose form + attachment dock + send-scheduler split |
| `src/app/(portal)/retailers/directory/page.tsx` | 1000 | atomic (borderline) | Leave alone — large filter + table surface is naturally single-file; revisit if growth continues |

None auto-executed. Only one (`task-details.ts`) is clearly `auto-safe`, but the prime directive says splits are propose-only.

## Asset bloat (>500KB in tree, not executed)

| Path | Size | Recommendation |
| --- | --- | --- |
| `public/logos/goyotours.png` | 827 KB | Compress to <100KB WebP or host in Supabase `logos` bucket per memory rule |
| `public/logos/eazysell.png` | 802 KB | Compress / move to Supabase |
| `public/logos/suprans.png` | 784 KB | Compress / move to Supabase |
| `public/logos/teamsync-ai.png` | 773 KB | Compress / move to Supabase |
| `public/logos/toysinbulk.png` | 764 KB | Compress / move to Supabase |
| `docs/screenshots/luca-micheli-…jpg` | 4.2 MB | Archived this run |

`public/logos/*.png` are URL-stable assets (referenced by `app-logos.ts`) — the report proposes compression only; do not rename or move without a coordinated code change.

## Residual concerns

- **`src/design-system/`, `src/design-system-legalnations/`, `src/design-system-usdrop/`** — no CSS `@import` refs found anywhere under `src/app/`. These may be canonical docs-only style references for the 3 product brands, but they could also be dead. Flag for human review; do not archive autonomously because naming strongly implies intent.
- **`src/app/tasks/` + `src/app/vendor/`** — these are legacy top-level app routes sitting outside the `(portal)` group. Likely pre-restructure. Still referenced internally, so cannot be archived, but a human may want to migrate them into `(portal)` or remove them.
- **`exports/` at repo root** — tracked Markdown/PDF outputs; user-authored, left alone.
- **`scripts/` folder (39 files)** — many look like one-off seeding scripts (`list-dumplings.ts`, `send-dumpling-outreach.ts`, `recreate-dumplings-with-variants.ts`, etc.). Zero cross-refs by design (user runs via `tsx`/`node`). Flag for human curation; not archived because one-offs may still be re-run.
- **`scripts/upload-team-photos.ts`** — reads from `.claude/*.png`, not `docs/screenshots/`. The 3 team photos (`lakshay.png`, `shantanu.png`, `yash_jain.png`) in `docs/screenshots/` are likely old copies but I left them in place since the basename matches the script. Only unambiguously-orphan images were archived.
- **`FAIRE-OPS-OVERVIEW.md` at repo root** — no inbound references; user-facing overview doc, left alone.
- Hard limit of 50 archive moves: not approached (only 10 moves). No residual queue.
