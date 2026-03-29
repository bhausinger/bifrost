Run a deep analysis of the project and discuss findings.

Check the following:

**Dependencies:**
- Run `npx depcheck` to find unused and missing dependencies
- Flag any that should be removed or added

**Code quality:**
- Count TODOs/FIXMEs across the project
- Check for files over 300 lines
- Look for `any` type usage in TypeScript files
- Check for console.log statements that should be removed

**Architecture:**
- Are there circular imports? Check with `npx madge --circular src/`
- Are there orphan modules nobody imports?

**Test coverage:**
- How many test files exist vs source files?
- Which important modules lack tests?

Present findings organized by severity (Critical → Warning → Info).
For each finding, suggest a specific fix.