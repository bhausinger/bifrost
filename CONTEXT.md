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
- `types/supabase.ts` — generated from Supabase schema
- `.env.example` — template for environment setup
- Pre-commit hooks (husky + lint-staged) — tsc check and file size enforcement
- Barrel exports in all component + hook folders

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

## In Progress

Nothing actively in progress.

---

## Known Issues

| Issue | Severity | Notes |
|---|---|---|
| Zero test files exist | High | Vitest installed, infrastructure ready |
| 5 files between 300-366 lines | Low | Artists (366), Settings (329), Pipeline (302), LeadGeneratorModal (302), Campaigns (289) |
| `gmail-send` edge function is 473 lines | Medium | Supabase function, not covered by dashboard lint |
| Supabase types may need regeneration | Low | `status` column was manually added; re-run `supabase gen types` when linked |
| Raw `fetch()` calls in hooks | Low | 10 fetch calls live in dedicated hooks — acceptable pattern, could centralize later |
| Chunk size warning on build | Low | Vite suggests code-splitting for bundle > 500kB |

---

## Blocked

Nothing currently blocked.

---

## What's Next (not started)

1. Write tests for pipeline transitions, dedup logic, exclude flow, auth, financial mutations
2. Centralize fetch calls into `lib/api/` if adding retry/error handling logic
3. Add scraper health check / connection status to dashboard
4. Code-split large routes with React.lazy for smaller bundles
