# Context — Campaign Manager

**Last updated:** 2026-05-19
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
- **Email sending** — Resend API (replaced Gmail OAuth), single + bulk with NDJSON streaming
- **Campaigns** — CRUD, placements, stream tracking, Spotify auto-fill
- **Financials** — income/expense tracking, charts
- **Outreach** — curator outreach tracking
- **Settings** — blocked terms management, Stripe, scraper health
- **Exclude list** — view, restore, and manually add entries
- **Auth** — Google OAuth via Supabase (login only, no Gmail permissions)
- **Artists page** — tabbed (Artists + Agencies), edit artist modal, genre multi-select, source/agency filter dropdowns
- **Agency management** — tab in Artists page with edit/delete, dedup on create
- **Spotify integration** — play count via Vercel proxy, auto-fill track data from URL
- **Placement stream attribution** — snapshots at placement and removal

### Infrastructure

- `lib/env.ts` — Zod validation for environment variables
- `lib/supabase.ts` — typed with `createClient<Database>()`
- `types/supabase.ts` — freshly generated from linked Supabase project
- `lib/api/email.ts` — typed client for Resend email edge function calls
- `lib/api/scraper.ts` — typed client for discover + scrape calls
- Pre-commit hooks (husky + lint-staged)
- ESLint flat config, Prettier
- GitHub Actions CI — typecheck + test + build on every push/PR
- Security headers on Vercel, CORS locked to production domain
- 99 Vitest unit tests, 11 Playwright E2E, 20 Deno (resend-send), 19 SQL, 39 pytest
- Supabase linked (project ref: nrkibvanlykqkiycpcrv)

---

## Recently Completed (2026-05-19)

### SoundCloud Name Search

Batch search ~400 artist names against SoundCloud to find their profile URLs. Full multi-step modal in the Pipeline toolbar.

**Backend (scraper on Railway):**

- `apps/scraper/src/services/soundcloud_search.py` — search service with fuzzy name matching, confidence scoring, batch support
- `apps/scraper/src/main.py` — added `/search/soundcloud` and `/search/soundcloud/batch` endpoints

**Dashboard API client:**

- `apps/dashboard/src/lib/api/scraper.ts` — added `searchSoundCloud()` and `batchSearchSoundCloud()` client functions

**Dashboard UI (8 files in `components/pipeline/scSearch/`):**

- `scSearchTypes.ts` — types + constants
- `scSearchActions.ts` — batch search, scrape, import, CSV download
- `useScSearch.ts` — hook managing state + step transitions
- `ScSearchModal.tsx` — modal container
- `ScSearchInput.tsx` — paste names textarea
- `ScSearchResults.tsx` — results table with confidence, alternatives, select/copy
- `ScSearchReview.tsx` — post-scrape review with emails, import/CSV
- `ScSearchStates.tsx` — searching/scraping/importing/done progress screens

**Flow:** Paste names → batch search SC → view matches (with confidence + alternatives) → scrape selected for emails → import to pipeline or download CSV

**Needs deploy:** Scraper changes need Railway deploy. Dashboard changes need Vercel deploy.

---

### Gmail → Resend Migration

Replaced entire Gmail OAuth + Gmail API email infrastructure with Resend for CAN-SPAM compliance. Domain: phuturecollective.com. Two senders: benjamin@ and michael@.

**Created:**

- `supabase/functions/resend-send/` — new edge function (single + bulk endpoints)
- `apps/dashboard/src/lib/api/email.ts` — new typed API client
- `supabase/migrations/00013_resend_migration.sql` — renames gmail columns, drops `user_google_tokens`

**Deleted:**

- `supabase/functions/gmail-auth/` — Gmail OAuth edge function
- `supabase/functions/gmail-send/` — Gmail send edge function
- `apps/dashboard/src/hooks/useGmail.ts` — Gmail connection hook
- `apps/dashboard/src/components/settings/GmailSection.tsx` — Gmail UI
- `apps/dashboard/src/lib/api/gmail.ts` — Gmail API client

**Modified:**

- `App.tsx` — removed Gmail token sync
- `Login.tsx` — removed Gmail scopes (Google login still works)
- `Settings.tsx` — removed Gmail section
- `PipelineDetailEmails.tsx` — sender email dropdown (Benjamin/Michael)
- `BulkEmailCompose.tsx` — sender email dropdown
- `useBulkEmailSend.ts` — points to resend-send/bulk
- `types/supabase.ts` — renamed gmail columns, removed user_google_tokens

**Migration NOT yet pushed.** Run `supabase db push` after review.

---

## Known Issues

| Issue                          | Severity | Notes                                                                          |
| ------------------------------ | -------- | ------------------------------------------------------------------------------ |
| Add Artist RLS error (401)     | Medium   | Likely session expiry — user's JWT expired mid-session. Not a code bug.        |
| Duplicate agencies in DB       | Medium   | Need manual cleanup in Supabase SQL editor (dedup logic now prevents new ones) |
| Resend domain not yet verified | High     | phuturecollective.com needs DNS records added in Resend dashboard              |
| Migration 00013 not pushed     | High     | DB column renames pending — push after domain verification                     |

---

## Blocked

- Email sending blocked on Resend domain verification (DNS records for phuturecollective.com)

---

## What's Next (not started)

1. Verify phuturecollective.com domain in Resend (add DNS records)
2. Set `RESEND_API_KEY` in Supabase project secrets
3. Push migration 00013 (`supabase db push`)
4. Clean up duplicate agencies in Supabase DB (manual SQL)
5. E2E testing of full workflow
6. Email template review and improvements
7. Client-facing purchase site (Phase 5)
