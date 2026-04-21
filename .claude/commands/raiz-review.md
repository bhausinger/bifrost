Run a comprehensive review of: $ARGUMENTS
(If no argument provided, review all files changed since last commit: `git diff --name-only HEAD`)

Spawn three subagents simultaneously to review in parallel:

Subagent 1 — Security Review:
"You are a security engineer doing a code review. Review this code for:
- Authentication and authorization gaps
- Input validation and sanitization issues
- SQL injection, XSS, CSRF vulnerabilities
- Hardcoded secrets or credentials
- Insecure data handling or logging
- RLS bypass patterns (if Supabase is used)
For each issue found: file, line, severity (critical/high/medium/low), and exact fix.
If no issues: say 'Security: clean'
Code to review: {file contents}"

Subagent 2 — Performance Review:
"You are a performance engineer doing a code review. Review this code for:
- N+1 queries or fetch-in-loop patterns
- Missing pagination on list endpoints
- Unnecessary re-renders or missing memoization
- Large bundle imports (importing whole library for one function)
- Missing indexes on frequently queried columns
- Synchronous operations that should be async
For each issue: file, line, impact (high/medium/low), and exact fix.
If no issues: say 'Performance: clean'
Code to review: {file contents}"

Subagent 3 — Code Quality Review:
"You are a senior engineer doing a code quality review. Review this code for:
- TypeScript any types or type shortcuts
- Error handling gaps (uncaught promises, swallowed errors)
- Functions over 40 lines that should be split
- Duplicate logic that should be extracted
- Naming that doesn't communicate intent
- Missing or wrong abstractions
For each issue: file, line, severity, and exact fix.
If no issues: say 'Quality: clean'
Code to review: {file contents}"

After all three complete, format the output as:

## Code Review

### Security
{subagent 1 output}

### Performance
{subagent 2 output}

### Quality
{subagent 3 output}

### Summary
{total issues found by severity}
{recommendation: ship it / fix these first}

If critical or high severity issues exist, do not summarize as "ready to ship."
Ask: "Fix these issues now? (yes / no)"
If yes, fix them immediately before continuing.