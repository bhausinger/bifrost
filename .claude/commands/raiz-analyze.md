Run a deep analysis of this codebase. $ARGUMENTS

Read the following to build full context:
- CLAUDE.md (project identity and stack)
- CONTEXT.md (current state)
- package.json (dependencies)
- The full directory structure: find . -type f -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.raiz/*"

Then use ultrathink to analyze:

1. **Architecture** — does the structure make sense? Is it consistent? What patterns are being used?
2. **Dependencies** — anything outdated, risky, or unnecessary?
3. **Technical debt** — what's messy, inconsistent, or going to cause problems?
4. **Hot spots** — which files are doing too much or changing too often?
5. **Missing pieces** — what's obviously absent (error handling, tests, types, docs)?

Format output as:

## Codebase Analysis

### Architecture
{assessment with specific examples}

### Dependencies
{anything worth flagging}

### Technical Debt
{ranked by impact: high / medium / low}

### Hot Spots
{files that need attention}

### Missing Pieces
{what's not there that should be}

### Overall Assessment
{honest summary — is this codebase in good shape, okay, or needs work?}

### Recommended Actions
{top 3 things to fix, in priority order}