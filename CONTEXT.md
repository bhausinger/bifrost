# Context — Campaign Manager

**Last updated:** 2026-04-29
**Status:** Functional, in production use

---

## What This Is

Internal tool for a Spotify playlist placement agency. 2 users. Artists pay us, we pay playlist curators to place tracks. The dashboard manages the full pipeline from lead discovery through placement tracking and financials.

## Stack

- **Dashboard:** React 18 + Vite + Tailwind — deployed on Vercel
- **Scraper:** Python FastAPI — deployed on Railway
- **Backend:** Supabase (auth, DB, RLS, edge functions)
- **Monorepo:** Turborepo + pnpm

---

## Current State

### Working

- **Pipeline kanban** — drag-and-drop, stage transitions, activity logging
- **Lead discovery** — SoundCloud scraper with genre filtering, dedup
- **Email scraping** — extracts from SoundCloud bios, linktree, subpages
- **Campaigns** — CRUD, placements, stream tracking
- **Financials** — income/expense tracking, charts
- **Outreach** — curator outreach tracking
- **Settings** — blocked terms management, Gmail OAuth
- **Exclude list** — opt-out management
- **Auth** — Supabase auth (dev bypass removed)

### Infrastructure

- `lib/env.ts` — Zod validation for environment variables
- `lib/supabase.ts` — typed with `createClient<Database>()`
- `types/supabase.ts` — freshly generated from linked Supabase project
- `lib/api/gmail.ts` — typed client for all Gmail edge function calls
- `lib/api/scraper.ts` — typed client for discover + scrape calls
- `.env.example` — template for environment setup
- Pre-commit hooks (husky + lint-staged) — tsc check and file size enforcement
- Barrel exports in all component + hook folders
- Vitest configured — 26 tests covering dedup, Gmail API, scraper API
- Supabase linked (project ref: nrkibvanlykqkiycpcrv)

---

## Recently Completed

### Codebase Audit & Cleanup (2026-04-29)

**Phase 1 — Split oversized files:**
- `LeadGeneratorModal.tsx` (1,189 lines) → 7 files: types, actions, hook, config step, results step, review step, modal shell
- `Campaigns.tsx` (677 lines) → 4 files: constants, drawer, new campaign modal, main page
- `ScraperModal.tsx` (604 lines) → 4 files: types, hook, results table, modal shell

**Phase 3 — Type safety:**
- Wired `createClient<Database>()` for type-safe Supabase operations
- Removed all `as any` casts (3 instances eliminated)
- Fixed type mismatches in Curators, Outreach, Artists, Pipeline, Financials, EmailTemplates
- Aligned manual `Artist` interface with actual DB nullability

**Phase 4 — Organization:**
- Added barrel exports to: pipeline/, curators/, layout/, exclude/, hooks/
- Deleted empty `packages/shared-types/` stub
- Extracted magic numbers to named constants in Settings.tsx

### API Clients, Tests & Infrastructure (2026-04-29 – 2026-04-30)

- Regenerated Supabase types from linked project
- Created `lib/api/gmail.ts` (6 Gmail edge function wrappers) and `lib/api/scraper.ts` (discover + scrape + health check)
- Replaced all raw `fetch()` calls with centralized API clients (except NDJSON streaming in useBulkEmailSend)
- 49 passing tests across 5 files: dedup, Gmail API, scraper API, pipeline transitions, exclude list
- Scraper health check on Settings page with 30s polling
- Code-split all page routes with `React.lazy` + `Suspense` (Login stays eager)

## In Progress

Nothing actively in progress.

---

## Known Issues

| Issue | Severity | Notes |
|---|---|---|
| Test coverage is partial (49 tests, logic only) | Low | Core business logic covered, no component/e2e tests |
| 5 files between 300-366 lines | Low | Artists (366), Settings (329), Pipeline (302), LeadGeneratorModal (302), Campaigns (289) |
| `gmail-send` edge function is 473 lines | Medium | Supabase function, not covered by dashboard lint |
| `useBulkEmailSend` still has raw fetch | Low | Uses NDJSON streaming — can't easily wrap in API client |
| Chunk size warning on build | Low | Vite suggests code-splitting for bundle > 500kB |

---

## Blocked

Nothing currently blocked.

---

## What's Next (not started)

1. Gmail integration — bulk email templates, follow-up automation
2. Campaign placement tracking — curator assignments, stream snapshots
3. Client-facing purchase site (Phase 5)
