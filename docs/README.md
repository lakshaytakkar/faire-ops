## docs/

Internal documentation for faire-ops (the Team Portal HQ).

### Layout

- **architecture-guides/** — Long-form architecture guides for the Team Portal
  restructure (`01-homepage-repurpose`, `02-schema-isolation-safe-migration`,
  `03-left-dock-space-switcher`, `04-external-apps-monorepo`,
  `05-user-mgmt-rbac-auth`). These were previously dropped into `.claude/` by
  Claude Code sessions and have been moved here so they are properly part of
  the repo.
- **screenshots/** — User-pasted screenshots and reference imagery from planning
  sessions (team headshots used for seed data, UI references, wallpapers, etc).
- **deferred-phases.md** — Canonical record of phases from the master execution
  plan that have been deliberately deferred (monorepo migration, etc).
- **folder-structure-audit.md** — Audit of every top-level directory with a
  classification and cleanup decisions (generated 2026-04-10).
- **db-audit-2026-04-10.md** — Snapshot of the Supabase schema as of the Team
  Portal restructure.
- **CATALOG_PAGE_GUIDE.md / NAV_RESTRUCTURE_PROMPT.md / NEW_FEATURES_GUIDE.md /
  PORTAL_CHANGES_MASTER.md** — Older planning docs kept for historical context.
- **faire-seller-knowledge.md / workflow-optimizations.md /
  sales-summary-q1-2026.md** — Domain reference material for the Faire seller
  workflow the portal automates.
- **tasks/** and **upcoming-tasks/** — Active and queued task notes.

### Conventions

- Anything authored by a human (or that should survive a `rm -rf .claude`) belongs here, **not** in `.claude/`.
- `.claude/` is reserved for Claude Code local state (agents, agent-memory).
- `docs/` is excluded from the TypeScript typecheck (see `tsconfig.json`), so it
  is safe to include `.ts` snippets inside markdown fences without affecting the
  build.
