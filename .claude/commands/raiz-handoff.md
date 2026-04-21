Generate a comprehensive handoff document for the next Claude Code session.

Read all of these sources:
- .raiz/logs/session.md (full session journal)
- .raiz/logs/decisions.md (decisions log)
- .raiz/plans/current.md (active plan)
- CONTEXT.md (current project state)
- git log --oneline -10 (recent commits)
- git diff --stat HEAD (uncommitted changes if any)

Use ultrathink to synthesize everything into a handoff document. Write it to HANDOFF.md in the project root.

Format:

# Handoff — {date}

## Start Here
{2-3 sentences: what this project is and where we are right now}

## What Was Done This Session
{bullet list of completed work with file references}

## Current State
{what's working, what's broken, what's in progress}

## Active Plan
{paste current plan with completed steps marked}

## Decisions Made
{key decisions from this session and the reasoning behind them}

## Next Steps
{ordered list of what to do next session, starting with the most important}

## Watch Out For
{gotchas, known issues, things that are fragile or incomplete}

## Quick Context
{any other information the next session needs to not waste time re-discovering}

After writing the file, output:
"✓ Handoff written to HANDOFF.md
 Next session: open Claude Code and say 'Read HANDOFF.md and let's continue'"