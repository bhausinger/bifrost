Explain the current project to a new developer joining the team.

Cover:
- What the project does (in plain language)
- How the code is organized
- Key files and what they do
- How to run it locally
- How Raiz works in this project:
  - What hooks are active and what they enforce (check `.claude/settings.json` and `.raiz/hooks/`)
  - What commands Claude can run without asking (check `permissions.allow` in `.claude/settings.json`)
  - How session tracking works (live state in CLAUDE.md, logs in `.raiz/logs/`)
  - How plans drive autonomous work (`.raiz/plans/current.md`)
- Any gotchas or non-obvious patterns

Be concise. A developer should understand this project in 5 minutes.