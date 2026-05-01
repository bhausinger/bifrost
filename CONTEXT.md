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
- Pre-commit hooks (husky + lint-staged) — prettier, tsc, file size, vitest
- ESLint flat config — no-any, eqeqeq, no-console, no-duplicate-imports
- Prettier — semi: false, singleQuote, printWidth: 100
- GitHub Actions CI — typecheck + test + build on every push/PR
- Security headers on Vercel (X-Frame-Options, CSP, Referrer-Policy)
- CORS locked to `https://bifrost-eta.vercel.app` on all edge functions
- Barrel exports in all component + hook folders
- Vitest — 97 unit tests across 11 files (all hooks, API clients, dedup, pure functions)
- Playwright — 11 E2E tests (smoke, auth, navigation)
- Deno tests — 36 edge function tests across 4 files
- SQL tests — 19 DB function assertions across 4 files
- pytest — 39 scraper tests across 3 files
- Supabase linked (project ref: nrkibvanlykqkiycpcrv)
- .nvmrc pinning Node 22

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

| Issue                                   | Severity | Notes                                                                                      |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------ |
| Edge function tests missing             | Medium   | gmail-send (474 lines), stripe-webhook, create-invoice, gmail-auth — need Deno test runner |
| DB function tests missing               | Medium   | move_pipeline_stage, exclude_artist, is_excluded, get_dashboard_stats — need test DB       |
| Python scraper tests missing            | Medium   | 5 service modules, 0 tests — needs pytest setup                                            |
| 5 files between 300-366 lines           | Low      | Artists (366), Settings (329), Pipeline (302), LeadGeneratorModal (302), Campaigns (289)   |
| `gmail-send` edge function is 473 lines | Medium   | Supabase function, not covered by dashboard lint                                           |
| `useBulkEmailSend` still has raw fetch  | Low      | Uses NDJSON streaming — can't easily wrap in API client                                    |
| Chunk size warning on build             | Low      | Vite suggests code-splitting for bundle > 500kB                                            |

---

## Blocked

Nothing currently blocked.

---

## What's Next (not started)

1. Gmail integration — bulk email templates, follow-up automation
2. Campaign placement tracking — curator assignments, stream snapshots
3. Client-facing purchase site (Phase 5)
