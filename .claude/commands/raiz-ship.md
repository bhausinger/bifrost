Run the full pre-ship checklist. Do every step in order. Do not skip steps. Do not mark as done until each check passes.

1. **TypeScript**
   Run: `pnpm typecheck`
   If errors: fix them now. Do not proceed until clean.

2. **Lint**
   Run: `pnpm lint`
   If errors: fix them now. Do not proceed until clean.

3. **Tests**
   Run: `pnpm test`
   If failures: fix them now. Do not proceed until passing.

4. **Supabase**
   Run: `supabase status`
   Confirm the linked project is correct for this codebase.
   If not linked: block and ask for project ref before proceeding.

5. **Build**
   Run: `pnpm build`
   If build fails: fix it now. Do not proceed until clean.

6. **Review changes**
   Run: `git diff --stat HEAD`
   Show a summary of what changed this session.

7. **Update CONTEXT.md**
   Read the current session journal from .raiz/logs/session.md.
   Update CONTEXT.md with:
   - What was completed this session
   - Current state of the project
   - Any decisions made
   - Anything blocked or deferred

8. **Commit message**
   Based on `git diff --stat HEAD`, write a conventional commit message.
   Format: type(scope): description
   Show it to the user for approval before committing.
   After approval, run: git add -A && git commit -m "{message}"

9. **Final confirmation**
   Show:
   ✓ TypeScript clean
   ✓ Lint clean
   ✓ Tests passing
   ✓ Build passing
   ✓ Supabase: {linked project}
   ✓ CONTEXT.md updated
   ✓ Committed: {commit message}

   Ready to push. Run: git push