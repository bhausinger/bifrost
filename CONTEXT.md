# Context — Campaign Manager

**Last updated:** 2026-04-11
**Last commit:** `109fca8` — fix: CORS preflight failure
**Status:** Functional, in production use

---

## What This Is

Internal tool for a Spotify playlist placement agency. 2 users. Artists pay us, we pay playlist curators to place tracks. The dashboard manages the full pipeline from lead discovery through placement tracking and financials.

## Stack

- **Dashboard:** React 18 + Vite + Tailwind — deployed on Vercel
- **Scraper:** Python FastAPI — deployed on Railway
- **Backend:** Supabase (auth, DB, RLS, edge functions)
- **Monorepo:** Turborepo + pnpm
- **Packages:** `apps/dashboard/`, `apps/scraper/`, `packages/shared-types/` (stub)

---

## Current State

### Working

- **Pipeline kanban** — drag-and-drop, stage transitions, activity logging
- **Lead discovery** — SoundCloud scraper with genre filtering, dedup
- **Email scraping** — extracts from SoundCloud bios, linktree, subpages
- **Campaigns** — CRUD, placements, stream tracking
- **Financials** — income/expense tracking, charts
- **Outreach** — curator outreach tracking
- **Settings** — blocked terms management
- **Exclude list** — opt-out management
- **Auth** — Supabase auth configured (dev bypass still active)

### Infrastructure (just added)

- `lib/env.ts` — Zod validation for environment variables
- `types/supabase.ts` — generated from Supabase schema
- `.env.example` — template for environment setup
- Pre-commit hooks (husky + lint-staged) — tsc check and file size enforcement

---

## In Progress

Nothing actively in progress.

---

## Known Issues

| Issue | Severity | File(s) |
|---|---|---|
| Zero test files exist | High | — |
| `LeadGeneratorModal.tsx` is 1192 lines | Medium | `apps/dashboard/src/components/pipeline/` |
| `Campaigns.tsx` is 720 lines | Medium | `apps/dashboard/src/pages/` |
| `ScraperModal.tsx` is 602 lines | Medium | `apps/dashboard/src/components/pipeline/` |
| Dev auth bypass (`window.__bifrostDevBypass`) ships to production | High | `apps/dashboard/src/App.tsx` |
| Supabase types generated but not wired into `createClient<Database>()` | Medium | `apps/dashboard/src/lib/supabase.ts` |
| `shared-types` package is an empty stub | Low | `packages/shared-types/` |
| Hardcoded SoundCloud `client_id` will break on rotation | Medium | `apps/scraper/` |

---

## Blocked

Nothing currently blocked.

---

## What's Next (not started)

1. Wire generated Supabase types into `createClient<Database>()` and remove `as` casts
2. Break up oversized files (LeadGeneratorModal, Campaigns, ScraperModal)
3. Write tests for pipeline transitions, dedup logic, exclude flow
4. Remove dev auth bypass once auth is confirmed working
5. Add scraper health check / connection status to dashboard
