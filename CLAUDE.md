# Campaign Manager

Spotify playlist placement agency tool. Artists pay us, we pay curators to place tracks on playlists. Internal dashboard for 2 users. React + Vite + Supabase.

## Stack
Standard stack, see ~/.claude/CLAUDE.md for defaults.

## Architecture

```
apps/dashboard/src/           ← React + Vite + Tailwind (deployed on Vercel)
  lib/api/gmail.ts            ← Gmail edge function client (6 endpoints)
  lib/api/scraper.ts          ← Scraper API client (discover, scrape, health)
  lib/supabase.ts             ← Typed client: createClient<Database>()
  lib/env.ts                  ← Zod-validated env vars (single source of truth)
  lib/dedup.ts                ← Duplicate detection (URL, email, blocked terms)
  hooks/                      ← All React Query hooks (9 hooks, barrel export)
  components/
    ui/                       ← Shared primitives (Button, Modal, Select, etc.)
    pipeline/                 ← Lead generator, scraper modal, bulk email, cards
    curators/                 ← Curator profiles, outreach modals
    layout/                   ← App shell, page header
    exclude/                  ← Exclude list modal
  pages/                      ← Route-level components (lazy-loaded via React.lazy)
    campaigns/                ← Campaign drawer, new campaign modal, constants
  types/
    index.ts                  ← Manual domain types (Artist, Campaign, Pipeline, etc.)
    supabase.ts               ← Auto-generated from DB — regenerate with: supabase gen types typescript --linked

apps/scraper/                 ← Python FastAPI (deployed on Railway)
  src/services/               ← SoundCloud scraper, email extraction, deep scrape
  src/main.py                 ← FastAPI endpoints: /discover, /scrape/soundcloud

supabase/
  migrations/                 ← 8 SQL migrations (schema + RLS + functions)
  functions/                  ← 4 Deno edge functions:
    gmail-auth/               ← OAuth flow (auth-url, callback, status, disconnect)
    gmail-send/               ← Single + bulk email (NDJSON streaming)
    create-invoice/           ← Stripe invoice creation
    stripe-webhook/           ← Payment event handler (invoice.paid, failed, overdue)
  tests/                      ← SQL-based DB function tests (run with pnpm test:db)
```

## Key Domain Concepts

- **Artists** with `status: 'lead' | 'client'` — leads live in the pipeline, clients in the Artists page
- **Pipeline stages**: discovered → contacted → responded → follow_up → negotiating → paid → placing → active → completed | lost
- **Campaigns** = a client's track placed on playlists, with budget/cost/stream tracking
- **Placements** = track X on playlist Y, with cost and status
- **Exclude list** = artists who asked not to be contacted (checked at scraper, email send, and pipeline actions)
- "Move to Campaign" promotes a lead → client and creates a campaign

## Supabase

**Linked project:** `nrkibvanlykqkiycpcrv`

Regenerate types after any migration:
```bash
supabase gen types typescript --linked > apps/dashboard/src/types/supabase.ts
```
Then clean the CLI noise from line 1 and the last 2 lines.

**DB functions** (defined in migration 00002):
- `move_pipeline_stage(entry_id, new_stage, note)` — stage change + timestamps + activity log
- `exclude_artist(artist_id, email, reason, notes)` — exclusion + cascade pipeline to lost
- `is_excluded(email)` → boolean
- `get_dashboard_stats()` → JSONB aggregate

## Testing

```bash
pnpm test                # 97 Vitest unit tests (dashboard)
pnpm test:e2e            # 11 Playwright E2E (needs dev server running)
pnpm test:db             # 19 SQL assertions (needs supabase start)
pnpm test:scraper        # 39 pytest tests (Python scraper)
cd supabase/functions && deno task test  # 36 Deno edge function tests
```

**Always run `pnpm test` after any change.** If tests break, fix them before moving on.

Tests for auth, payments, and data mutations are mandatory — see ~/.claude/CLAUDE.md.

## API Clients

All external HTTP calls go through typed clients in `lib/api/`:
- `lib/api/gmail.ts` — 6 functions (status, authUrl, callback, syncTokens, disconnect, sendSingle)
- `lib/api/scraper.ts` — 3 functions (discoverArtists, scrapeArtist, scraperHealthCheck)
- Exception: `useBulkEmailSend.ts` has a raw fetch for NDJSON streaming (can't abstract)

**Do not add raw `fetch()` calls anywhere else.** Add new endpoints to the appropriate API client.

## Gotchas

- `types/supabase.ts` is auto-generated — don't edit manually, regenerate instead
- `types/index.ts` has manual types that must stay aligned with the DB schema
- The scraper runs on Railway, not Vercel — it's proxied via `vercel.json` rewrites
- `gmail-send` edge function is 474 lines (over our soft limit but it's Supabase-side, not linted)
- Pipeline entries use `artist:artists(*)` relation queries — the `as PipelineEntryWithArtist[]` cast is intentional until Supabase improves relation typing
- `useBulkEmailSend` uses NDJSON streaming with `response.body.getReader()` — don't try to simplify this

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
- [ ] `pnpm test` passes
```

Do not start implementation until the plan is written to the file.
Writing the plan triggers brainstorm review (3 subagents) then
/superpowers:subagent-driven-development for autonomous execution.
Never execute plans manually step by step.

## Current State
See CONTEXT.md
