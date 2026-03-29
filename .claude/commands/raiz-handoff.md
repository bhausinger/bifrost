Generate or update the project handoff document at `.raiz/handoff.md`.

Raiz auto-generates the skeleton with file tree, stack, setup, recent sessions, and active plan.
Your job is to fill in the `<!-- CLAUDE:FILL -->` sections:

1. **Project Summary** — what does this project do, who uses it (2-3 sentences)
2. **Architecture narrative** — data flow, key abstractions, patterns used
3. **Current State** — what's complete, in progress, planned
4. **Known Issues & Tech Debt** — bugs, shortcuts, missing tests

Read through the codebase to fill these in accurately.
Be specific — reference actual file paths. A developer should be productive within an hour.