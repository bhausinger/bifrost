# Context — Campaign Manager

**Last updated:** 2026-05-12
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
- **Campaigns** — CRUD, placements, stream tracking, Spotify auto-fill
- **Financials** — income/expense tracking, charts
- **Outreach** — curator outreach tracking
- **Settings** — blocked terms management, Gmail OAuth
- **Exclude list** — view, restore, and manually add entries
- **Auth** — Supabase auth
- **Artists page** — tabbed (Artists + Agencies), edit artist modal, genre multi-select, source/agency filter dropdowns
- **Agency management** — tab in Artists page with edit/delete, dedup on create
- **Spotify integration** — play count via Vercel proxy, auto-fill track data from URL
- **Placement stream attribution** — snapshots at placement and removal

### Infrastructure

- `lib/env.ts` — Zod validation for environment variables
- `lib/supabase.ts` — typed with `createClient<Database>()`
- `types/supabase.ts` — freshly generated from linked Supabase project
- `lib/api/gmail.ts` — typed client for all Gmail edge function calls
- `lib/api/scraper.ts` — typed client for discover + scrape calls
- Pre-commit hooks (husky + lint-staged)
- ESLint flat config, Prettier
- GitHub Actions CI — typecheck + test + build on every push/PR
- Security headers on Vercel, CORS locked to production domain
- 108 Vitest unit tests, 11 Playwright E2E, 36 Deno, 19 SQL, 39 pytest
- Supabase linked (project ref: nrkibvanlykqkiycpcrv)

---

## Recently Completed (2026-05-12)

### Bug Fixes

- **Campaign status: removed stale 'placing' references** — migration 00009 renamed `placing` → `pitching` but code still referenced old value. Fixed in: useCampaigns hook, CampaignDrawer, campaignConstants, tests.
- **Agency duplicate creation** — "Create New" in Add Artist modal created duplicates. Added case-insensitive name dedup to `useCreateAgency`.

### UX Improvements

- **Genre multi-select** — replaced free text input with searchable multi-select (`MultiSelect` component) with 45 predefined genre options covering the playlist placement space.
- **Artist editing** — added Edit button on artist table rows + `EditArtistModal` with genre multi-select, agency picker.
- **Source/agency filters** — replaced filter pill buttons with Select dropdowns (cleaner UI).
- **Artists/Agencies tabs** — Artists page now has tabs for Artists and Agencies views.
- **Agency management tab** — table view with name, contact, email, artist count, edit/delete actions.
- **Exclude list manual add** — "Add to Exclude List" button + modal on the Exclude List page.

### New Components

- `components/ui/MultiSelect.tsx` — searchable multi-select with pill display
- `pages/artists/EditArtistModal.tsx` — edit form matching Add Artist fields
- `pages/artists/AgencyTab.tsx` — agency management table + edit/delete modals
- `pages/artists/genreOptions.ts` — 45 predefined genre options

---

## Known Issues

| Issue                                   | Severity | Notes                                                                          |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------ |
| Add Artist RLS error (401)              | Medium   | Likely session expiry — user's JWT expired mid-session. Not a code bug.        |
| `gmail-send` edge function is 473 lines | Low      | Supabase function, not covered by dashboard lint                               |
| Duplicate agencies in DB                | Medium   | Need manual cleanup in Supabase SQL editor (dedup logic now prevents new ones) |

---

## Blocked

Nothing currently blocked.

---

## What's Next (not started)

1. Clean up duplicate agencies in Supabase DB (manual SQL)
2. E2E testing of full workflow (current Playwright tests are smoke-only)
3. Email template review and improvements
4. Gmail integration — bulk email templates, follow-up automation
5. Client-facing purchase site (Phase 5)
