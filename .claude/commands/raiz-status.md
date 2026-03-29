Show the current project status using Raiz data.

Read and summarize:
1. CLAUDE.md state block — last commit, uncommitted files, session activity
2. `.raiz/plans/current.md` — active plan progress (done/remaining, next step)
3. `.raiz/logs/progress.md` — recent session history
4. `.raiz/logs/session.md` — current session file edits
5. Run `git status` and `git log --oneline -5` for current git state

Present a concise summary:
- Project health (any build/test issues?)
- Plan progress
- What happened recently
- What's uncommitted
- Suggested next action

If anything looks broken or concerning, flag it.