# Known Bugs — Smoke Test (2026-03-29)

## High Priority

- [x] **`exclude_artist` RPC returns 404** — RPC function not deployed to live DB. Added direct-query fallback in `useExcludeList.ts`: checks for existing entry, inserts/updates excluded_artists, moves pipeline entries to "lost". RPC still attempted first for when migration is applied. (Fixed 2026-03-29)

- [x] **Activity log always empty** — Root cause: `onSettled` in `useMoveStage` wasn't invalidating the `pipeline-activities` query, so the detail panel never refetched. Added `pipeline-activities` invalidation + direct activity insert fallback when RPC fails. (Fixed 2026-03-29)

## Medium Priority

- [x] **Modal overlay blocks navigation** — Sidebar had no z-index, so the `z-40` modal overlay covered it. Added `z-50` to sidebar in `Layout.tsx`. Sidebar is now always clickable even with modals open. (Fixed 2026-03-29)

## Low Priority

- [x] **Missing favicon** — Added `favicon.svg` (teal "B" on rounded square) to `public/` and linked in `index.html`. (Fixed 2026-03-29)

## Noted (not yet investigated)

- [ ] **Scraper doesn't work** — Benjamin flagged this. `apps/scraper/` exists with Python/FastAPI code but hasn't been tested or connected to the new dashboard. Needs its own investigation session.

- [ ] **Drag-and-drop not tested** — Stage moves via buttons work and persist. DnD interaction (actual dragging between columns) was not tested during smoke test.

## Fixed

- [x] **Auto-signup on failed login** — Login.tsx lines 50-64 created ghost accounts when credentials were wrong. Removed the auto-signup hack, sign-in is now clean. (Fixed 2026-03-29)

- [x] **Can't log in — email confirmation required** — Supabase had email confirmation enabled with no confirmed users. Toggled off in Supabase dashboard. (Fixed 2026-03-29)
