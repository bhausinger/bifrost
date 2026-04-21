# campaign manager
TypeScript project.

## Stack
Standard stack, see ~/.claude/CLAUDE.md for defaults.

## Architecture
_(architecture will be documented as the project develops)_

## Supabase Project
Not linked — run: `supabase link --project-ref YOUR_REF`

## Global Rules
All coding standards, design rules, testing rules, Supabase patterns, and workflow
preferences live in ~/.claude/CLAUDE.md and ~/.claude/skills/. Those take precedence.

## Plans
When any task touches more than 2 files or takes more than one step,
write the plan to `.raiz/plans/current.md` before doing anything else.
This triggers the Raiz autonomous execution flow automatically.

```md
# Plan: {task name}
## Objective
{one paragraph}
## Steps
- [ ] Step 1
- [ ] Step 2
## Independent chunks
{which steps can run in parallel}
## Out of scope
{what we are not doing}
## Compliance
Before marking this plan complete, verify:
- [ ] No file exceeds 300 lines (hard limit: 500)
- [ ] No `as` casts on Supabase responses — use generated types
- [ ] `lib/env.ts` used for all env vars — no raw `import.meta.env`
- [ ] `CONTEXT.md` updated with current state
- [ ] `pnpm build` passes
```

Do not start implementation until the plan is written to the file.
Writing the plan triggers brainstorm review (3 subagents) then
/superpowers:subagent-driven-development for autonomous execution.
Never execute plans manually step by step.

## Current State
See CONTEXT.md

<!-- RAIZ:STATE:START -->

**Last updated:** 2026-04-12 14:29:13
**Last commit:** fix: CORS preflight failure — disable credentials with wildcard origin
**Commit hash:** `109fca86`

**Active session — files edited:**
- .raiz/plans/current.md
- .raiz/logs/session.md
- supabase/.temp/cli-latest
- supabase/.gitignore
- supabase/config.toml
- supabase/.temp/postgres-version
- supabase/.temp/pooler-url
- supabase/.temp/storage-migration
- supabase/.temp/storage-version
- supabase/.temp/gotrue-version
- supabase/.temp/project-ref
- supabase/.temp/rest-version
- apps/dashboard/src/types/supabase.ts
- .raiz/map/meta.json
- .raiz/map/cochange.json

<!-- RAIZ:STATE:END -->
