# Workspace note

**Open the parent directory `C:\antigravity\faire` as your Claude workspace, not this folder alone.**

Why: Claude's auto-memory is keyed to the workspace path. Opening `team-portal/` alone creates a fresh, empty memory dir at `C:\Users\pc\.claude-backup\projects\C--antigravity-faire-team-portal\` and future sessions lose all prior context (project state, user preferences, decisions, restructure map).

Your existing memory + work log live at the monorepo-root workspace:
- `C:\Users\pc\.claude-backup\projects\C--antigravity-faire\memory\`

Everything else still works from here — `npm run dev`, `next build`, `vercel --prod --yes` — because each app in the monorepo is self-contained at its deploy-unit level. The rule is about **Claude workspace selection**, not about how code runs.

See `../CLAUDE.md` for the full monorepo map.
