# campaign manager

## Project Overview

TypeScript project.

<!-- RAIZ:STATE:START -->

**Last updated:** 2026-03-29 18:24:14
**Last commit:** feat: auto-create account on first sign-in attempt
**Commit hash:** `2ec4585b`

**Recently changed files:**
- apps/dashboard/src/pages/Login.tsx

<!-- RAIZ:STATE:END -->

## Architecture

_(architecture will be documented as the project develops)_

## Rules

- State what you understand before making changes
- Do not expose secrets, API keys, or credentials in code
- Write clear commit messages explaining why, not just what
- Maintain strict TypeScript — do not use `any` without justification
- Do not modify critical config files without asking first

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
