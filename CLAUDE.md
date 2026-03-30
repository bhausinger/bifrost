# campaign manager

## Project Overview

TypeScript project.

<!-- RAIZ:STATE:START -->

**Last updated:** 2026-03-30 01:09:55
**Last commit:** fix: resolve 4 bugs from smoke test
**Commit hash:** `d199b6e7`

**Active session — files edited:**
- .raiz/logs/session.md
- .raiz/config.json
- CLAUDE.md
- packages/shared-types/.turbo/turbo-build.log
- apps/dashboard/.turbo/turbo-build.log
- apps/dashboard/tsconfig.tsbuildinfo
- node_modules/.pnpm/node_modules/@campaign-manager/dashboard/tsconfig.tsbuildinfo
- apps/dashboard/dist/bifrost-logo.jpg
- apps/dashboard/.turbo/turbo-test.log
- apps/dashboard/src/pages/Artists.tsx
- .raiz/map/cochange.json
- .raiz/map/imports.json
- .raiz/map/meta.json
- apps/dashboard/src/types/index.ts
- apps/dashboard/src/pages/Campaigns.tsx

<!-- RAIZ:STATE:END -->

## Architecture

_(architecture will be documented as the project develops)_

## Rules

- State what you understand before making changes
- Do not expose secrets, API keys, or credentials in code
- Write clear commit messages explaining why, not just what
- Maintain strict TypeScript — do not use `any` without justification
- Do not modify critical config files without asking first

## UI Rules — Non-Negotiable

All dashboard UI must use the custom components in `components/ui/`. No exceptions.

### Components — Always Use These
- `<Input>` / `<Textarea>` / `<Select>` — never use native `<input>`, `<select>`, `<textarea>` directly
- `<Label>` — never write label styling inline
- `<Modal>` — never build modal overlay/panel from scratch
- `<Card>` — never use raw `<div>` with ad-hoc borders for card-like containers
- Check `components/ui/` first before creating anything new

### Patterns
- Never use native `<form>` elements — use controlled React state with onClick/onChange handlers
- All dropdowns, modals, and overlays must use existing component patterns
- Modals must always have click-outside-to-close behavior
- All form inputs must have visible `<Label>` above the field — never placeholder-only
- Never write custom CSS unless Tailwind cannot achieve the result

### Spacing & Sizing
- Card padding is `p-5` — do not change unless explicitly asked
- Card border radius is `rounded-xl` — do not change
- Never resize or restyle existing components when the task is to add something new
- Font sizes follow the existing scale — do not introduce new ones

### Colors
- Primary accent: teal-500 (`#14b8a6`) for actions, focus rings, active states
- SoundCloud orange (`#ff5500`) only in SoundCloud-specific features (Lead Generator, scraper)
- Text: gray-900 (headings), gray-600 (body), gray-400 (labels/secondary)
- Borders: gray-200 (default), gray-100 (subtle/table rows)

### What Triggers a Stop
If a task would require changing the sizing, spacing, or styling of an existing component that isn't the focus of the task — stop and ask before proceeding.

## Do Not Modify Without Care

- `tsconfig.json`
- `package.json`
- `.env`

## Commands

- dev: `turbo run dev`
- build: `turbo run build`
- test: `turbo run test`
- lint: `turbo run lint`

## Session Protocol

### Plans
- When you propose a plan or multi-step approach and the user approves, save it to `.raiz/plans/current.md` before starting work
- Format the plan with checkboxes: `- [ ] step` for pending, `- [x] step` for done
- Update `.raiz/plans/current.md` as you complete each step
- When all steps are done, rename the file to `.raiz/plans/completed/<date>-<summary>.md`

### Autonomy
- If `.raiz/plans/current.md` has remaining steps, **continue working on them without asking** — the plan is the approval
- Run tests, lint, and type-check after making changes — don't ask permission for these
- Fix trivial issues (lint errors, type errors, missing imports) immediately — don't ask
- Commit completed work with clear messages — don't wait to be told
- **Do ask** before: changing architecture, adding dependencies, modifying critical files, or deviating from the plan

## Session Context

Raiz keeps CLAUDE.md updated in real-time with uncommitted changes, file activity, and plan status.
It also maintains logs in `.raiz/logs/`:
- `progress.md` — rolling session history (last 5 sessions with commits, files edited, plan status)
- `session.md` — current session file edits (written by hooks, rotated each session)

Permissions in `.claude/settings.json` pre-approve safe commands (tests, lint, build, read-only git).
Check `.raiz/plans/current.md` for any active plan — if one exists, continue it.
Check `progress.md` for what happened in recent sessions.
