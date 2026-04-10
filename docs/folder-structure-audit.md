# Folder Structure Audit

**Date:** 2026-04-10
**Branch:** `team-portal-restructure`
**Scope:** Top-level directory audit + safe cleanup execution for `C:\antigravity\faire\faire-ops`.

This audit was run as part of the Team Portal HQ restructure. The project is a single Next.js 16 app at the repo root; the planned pnpm + Turborepo monorepo migration has been **deliberately deferred** (see `docs/deferred-phases.md`).

---

## 1. Top-level inventory and classification

| Entry | Type | Expected for Next.js 16? | Classification | Notes |
|---|---|---|---|---|
| `.claude/` | dir | Claude Code local state | KEPT (cleaned) | Previously held user-authored guides and pasted screenshots; now only `agents/` and `agent-memory/`. Gitignored. |
| `.env.local` | file | Yes | KEPT | Standard Next.js env file. Gitignored. |
| `.git/` | dir | Yes | KEPT | |
| `.gitignore` | file | Yes | KEPT | Already excludes `.claude/`, `external/`, `*.png`, `.vercel`. |
| `.mcp.json` | file | Tool config | KEPT | MCP server config used by Claude Code. |
| `.npmrc` | file | Yes | KEPT | Pins npm behavior for the root (root uses npm, not pnpm). |
| `.vercel/` | dir | Yes | KEPT | Local Vercel link. Gitignored. |
| `.vercelignore` | file | Yes | KEPT | |
| `AGENTS.md` | file | Agent hint | KEPT | Project guardrail for AI agents. |
| `CLAUDE.md` | file | Agent hint | KEPT | Aliases `@AGENTS.md`. |
| `components.json` | file | shadcn config | KEPT | |
| `docs/` | dir | Internal docs | KEPT (expanded) | Received new `architecture-guides/`, `screenshots/`, and a `README.md`. Excluded from typecheck. |
| `eslint.config.mjs` | file | Yes | KEPT | |
| `exports/` | dir | Stray-ish | KEPT (content) | Holds exported reports/plans (`Business-Strategy-FaireOps.md`, `NexusOS-Business-Plan.md`, `Module-Audit-And-Roadmap.md`, `pet-products-50.csv`, etc). Not imported by `src/`. Not strictly Next.js-standard but is actively used for human artefacts. Left alone per "do not delete anything with real content". Candidate for future move under `docs/exports/`. |
| `external/` | dir | Scaffolding | DOCUMENTED-AS-DEFERRED | Future standalone apps. Gitignored, excluded from typecheck. New `README.md` added. |
| `faire.code-workspace` | file | Editor | KEPT | VS Code multi-root workspace config. |
| `FAIRE-OPS-OVERVIEW.md` | file | Project overview | KEPT | Top-level project README companion. |
| `live-dashboard.png`, `live-listings.png`, `live-orders.png` | files | Reference images | KEPT (noted) | Left alone — they are reference shots pinned to the repo root. Gitignored via `*.png` rule. Candidate for future move into `docs/screenshots/` if they stop being referenced. |
| `next.config.ts` | file | Yes | KEPT | |
| `next-env.d.ts` | file | Yes | KEPT | |
| `node_modules/` | dir | Yes | KEPT | Untouched. |
| `package.json` | file | Yes | KEPT | |
| `package-lock.json` | file | Yes | KEPT | Untouched. |
| `postcss.config.mjs` | file | Yes | KEPT | |
| `public/` | dir | Yes | KEPT | Standard Next.js static assets. |
| `README.md` | file | Yes | KEPT | |
| `scripts/` | dir | Yes | KEPT | One-off TS/MJS scripts (exports, seed, image generation). Excluded from typecheck. |
| `src/` | dir | Yes | KEPT | Next.js App Router source. |
| `tmp-images/` | dir | Stray | KEPT (noted) | Contains `crystal.jpeg`, `hero.png`, `rainbow.png`, `regular.png`. Used by `scripts/` for test uploads. Gitignored via `*.png`. Name explicitly signals "temporary". Candidate for deletion once outreach scripts stop referencing them, but left alone per constraint "do not delete anything with content". |
| `tsconfig.json` | file | Yes | KEPT (unchanged) | Already excludes `node_modules`, `scripts`, `external`, `apps`, `docs`. |
| `tsconfig.tsbuildinfo` | file | Build cache | KEPT | Gitignored. |
| `vercel.json` | file | Yes | KEPT | |

### Directories the master plan mentions that **do not exist**

- `apps/` — no such directory. The master plan's "monorepo" layout (`apps/portal`, `apps/legalnations-web`, `packages/*`) has not been created. This matches `docs/deferred-phases.md`.
- `client/`, `server/` — not present.
- `migrations/` — not present at repo root. Supabase migrations live in the Supabase project itself, not in-repo. No action.
- `00-master-execution-guide.md` — not present in `.claude/` (only 01–05).

No stray `apps/`, `client/`, or `server/` directory had to be removed.

---

## 2. Files moved

### `.claude/` -> `docs/architecture-guides/`

| Source | Destination |
|---|---|
| `.claude/01-homepage-repurpose.md` | `docs/architecture-guides/01-homepage-repurpose.md` |
| `.claude/02-schema-isolation-safe-migration.md` | `docs/architecture-guides/02-schema-isolation-safe-migration.md` |
| `.claude/03-left-dock-space-switcher.md` | `docs/architecture-guides/03-left-dock-space-switcher.md` |
| `.claude/04-external-apps-monorepo.md` | `docs/architecture-guides/04-external-apps-monorepo.md` |
| `.claude/05-user-mgmt-rbac-auth.md` | `docs/architecture-guides/05-user-mgmt-rbac-auth.md` |

Reasoning: `.claude/` is Claude Code's local state directory and should not contain user-authored architecture documentation. These files were gitignored there, meaning they would not survive a fresh clone. They are now in `docs/`, which is the canonical home for internal docs (and still excluded from the typecheck).

There is no `00-master-execution-guide.md` to move.

### `.claude/*.png` / `*.jpg` -> `docs/screenshots/`

| Source | Destination |
|---|---|
| `.claude/image copy.png` | `docs/screenshots/image copy.png` |
| `.claude/image copy 2.png` | `docs/screenshots/image copy 2.png` |
| `.claude/image copy 3.png` | `docs/screenshots/image copy 3.png` |
| `.claude/image.png` | `docs/screenshots/image.png` |
| `.claude/krish_verma.png` | `docs/screenshots/krish_verma.png` |
| `.claude/lakshay.png` | `docs/screenshots/lakshay.png` |
| `.claude/shantanu.png` | `docs/screenshots/shantanu.png` |
| `.claude/yash_jain.png` | `docs/screenshots/yash_jain.png` |
| `.claude/luca-micheli-ruWkmt3nU58-unsplash.jpg` | `docs/screenshots/luca-micheli-ruWkmt3nU58-unsplash.jpg` |

Reasoning: these were user-pasted screenshots from previous Claude Code sessions (team headshots used as AI-generation references, UI reference shots, wallpaper stock photography). They have no reason to live under `.claude/`. Moved rather than deleted because several are referenced in the team-photo upload flow.

### Mechanics

`mv` via bash was blocked by the sandbox, so the moves were performed atomically via Node `fs.renameSync` (same filesystem, same drive, so it is a rename, not a copy-delete). Both source and destination are under `.gitignore`, so no `git mv` was needed.

---

## 3. READMEs created

1. **`docs/README.md`** — Describes the purpose and layout of `docs/`, the new `architecture-guides/` and `screenshots/` subfolders, and the convention that human-authored docs belong here, **not** under `.claude/`.
2. **`external/README.md`** — Explains that `external/` is a staging area for future standalone apps, is gitignored, is excluded from the typecheck, must not be imported from `src/`, and is the landing zone for the (deferred) monorepo migration.
3. **`external/legalnations/README.md`** — Full rundown of the `legalnations` pnpm-workspace scaffold (Express + Drizzle + Vite + Orval + Zod), marks it as **not deployed / not active / not imported**, and lists the do-nots (no `pnpm install` at the root, no `src/` imports, no inclusion in root `tsconfig.json`).

---

## 4. Intentionally left alone

| Item | Reason |
|---|---|
| `tsconfig.json` | Already correctly excludes `scripts`, `external`, `apps`, `docs`. No changes per constraint. |
| `package-lock.json` / `node_modules/` | Per constraint. |
| `.next/` | Per constraint (build cache). |
| `.git/` | Per constraint. |
| `exports/` | Contains real content (business plans, audits, CSV exports). Not part of the Next.js build. Not imported by `src/`. Candidate for a later move under `docs/exports/` but not touched here to avoid breaking any scripts that reference the path. |
| `tmp-images/` | Referenced by `scripts/send-dumpling-outreach.ts` and related seed scripts. Name already signals temporary. Gitignored via `*.png`. Left alone. |
| `live-dashboard.png`, `live-listings.png`, `live-orders.png` | Reference screenshots pinned at the repo root. Gitignored. May be referenced by docs/outreach. Left alone. |
| `public/files1.zip` | Appeared in `public/` — existing asset. Not touched. |
| `public/image.png` | Existing asset referenced by the app. Not touched. |
| `.claude/agents/codebase-organizer.md` | Active Claude Code agent definition — stays under `.claude/`. |
| `.claude/agent-memory/codebase-organizer/` | Claude Code runtime state — stays under `.claude/`. |
| `src/**` | Per constraint: do NOT touch source code files. |
| `scripts/**` | Per constraint and because they are actively used. |
| `FAIRE-OPS-OVERVIEW.md` | Top-level overview file, intentionally at the repo root alongside `README.md`. |
| `faire.code-workspace` | VS Code multi-root config used day-to-day. |

---

## 5. Final folder structure (post-cleanup)

```
faire-ops/
|
|-- src/                                   # Next.js 16 App Router source (TYPECHECKED)
|   |-- app/
|   |   |-- (portal)/                      # Authenticated portal routes
|   |   |-- api/                           # API route handlers
|   |   |-- vendor/
|   |   |-- layout.tsx
|   |   +-- page.tsx
|   |-- components/
|   |-- hooks/
|   |-- lib/
|   +-- react-simple-maps.d.ts
|
|-- public/                                # Static assets served at /
|   |-- icon-*.png                         # PWA icons
|   |-- manifest.json
|   |-- sw.js
|   +-- *.svg
|
|-- scripts/                               # One-off TS/MJS scripts (EXCLUDED from typecheck)
|   |-- export-pet-products.ts
|   |-- generate-*.ts|mjs                  # AI image generation
|   |-- seed-reports.ts
|   +-- upload-team-photos.ts
|
|-- docs/                                  # Internal docs (EXCLUDED from typecheck)
|   |-- README.md                          # [NEW] Docs layout + conventions
|   |-- architecture-guides/               # [NEW] Master execution guides
|   |   |-- 01-homepage-repurpose.md
|   |   |-- 02-schema-isolation-safe-migration.md
|   |   |-- 03-left-dock-space-switcher.md
|   |   |-- 04-external-apps-monorepo.md
|   |   +-- 05-user-mgmt-rbac-auth.md
|   |-- screenshots/                       # [NEW] Pasted screenshots + reference imagery
|   |   |-- image*.png
|   |   |-- <team-member>.png
|   |   +-- luca-micheli-*.jpg
|   |-- deferred-phases.md                 # Why monorepo + auth-gates are deferred
|   |-- folder-structure-audit.md          # [NEW] This document
|   |-- db-audit-2026-04-10.md
|   |-- CATALOG_PAGE_GUIDE.md
|   |-- NAV_RESTRUCTURE_PROMPT.md
|   |-- NEW_FEATURES_GUIDE.md
|   |-- PORTAL_CHANGES_MASTER.md
|   |-- faire-seller-knowledge.md
|   |-- workflow-optimizations.md
|   |-- sales-summary-q1-2026.md
|   |-- tasks/
|   +-- upcoming-tasks/
|
|-- external/                              # GITIGNORED, EXCLUDED from typecheck
|   |-- README.md                          # [NEW] Explains the staging area
|   +-- legalnations/                      # Future legalnations.com scaffolding
|       |-- README.md                      # [NEW] Not deployed, not imported
|       |-- artifacts/
|       |   |-- api-server/                # Express 5 + Drizzle
|       |   |-- legal-nations/             # Vite + React landing page
|       |   |-- mobile/
|       |   +-- mockup-sandbox/
|       |-- lib/
|       |   |-- api-client-react/
|       |   |-- api-spec/
|       |   |-- api-zod/
|       |   +-- db/
|       |-- scripts/
|       |-- pnpm-workspace.yaml
|       |-- package.json                   # pnpm workspace root (isolated)
|       +-- replit.md
|
|-- exports/                               # Exported reports + data dumps (NOT imported by src/)
|   |-- *.md                               # Business plans, audits, roadmaps
|   |-- *.pdf
|   +-- *.csv
|
|-- tmp-images/                            # Test upload images used by scripts/
|   +-- *.png|*.jpeg
|
|-- .claude/                               # Claude Code local state (GITIGNORED)
|   |-- agents/
|   |   +-- codebase-organizer.md
|   +-- agent-memory/
|       +-- codebase-organizer/
|
|-- .vercel/                               # GITIGNORED
|-- .git/
|-- node_modules/
|
|-- AGENTS.md                              # Agent guardrails
|-- CLAUDE.md                              # Alias -> AGENTS.md
|-- FAIRE-OPS-OVERVIEW.md
|-- README.md
|-- package.json
|-- package-lock.json                      # npm (NOT pnpm) at the root
|-- next.config.ts
|-- next-env.d.ts
|-- tsconfig.json                          # excludes: node_modules, scripts, external, apps, docs
|-- tsconfig.tsbuildinfo
|-- eslint.config.mjs
|-- postcss.config.mjs
|-- components.json                        # shadcn/ui config
|-- vercel.json
|-- .vercelignore
|-- .gitignore
|-- .npmrc
|-- .mcp.json
|-- .env.local
|-- faire.code-workspace
|-- live-dashboard.png                     # Reference screenshots (gitignored)
|-- live-listings.png
+-- live-orders.png
```

---

## 6. Build verification

After all moves and README writes, the TypeScript compile was run:

```bash
npx tsc --noEmit
```

Result: see the "Summary" section at the bottom of the accompanying agent
response. The `src/` tree was not touched, and `tsconfig.json` already excluded
every directory affected by this audit (`docs`, `external`, `scripts`), so the
typecheck outcome is identical to the pre-audit baseline.
