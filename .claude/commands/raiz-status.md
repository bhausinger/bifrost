Run a full Raiz status check and display a clean summary. Do all of these steps:

1. Run `supabase status` and show the linked project name, or "not linked" if unlinked
2. Check if the dev server is responding at the configured port (check .raiz/config.json for port, default 3000): curl -s -o /dev/null -w "%{http_code}" http://localhost:{port}
3. Read .raiz/plans/current.md and show the current plan step and X/Y progress
4. Read the last 5 lines of .raiz/logs/session.md and show the most recent edits
5. Read CONTEXT.md and show the full contents
6. Run `git status --short` and show what's changed but not committed
7. Run `pnpm typecheck` silently and report: "✓ No TypeScript errors" or list the errors

Format the output as:

---
## Raiz Status

**Supabase:** {linked project or "not linked"}
**Server:** {✓ up at localhost:{port} / ✗ not responding}
**TypeScript:** {✓ clean / ✗ {n} errors}
**Git:** {n files changed / clean}

## Active Plan
{current step and progress from current.md}

## Context
{full CONTEXT.md contents}

## Recent Edits
{last 5 journal entries}
---

If anything is red (not linked, server down, TS errors), flag it prominently at the top.