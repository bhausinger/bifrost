You are about to plan a development task. The task is: $ARGUMENTS

Do this in order and do not skip steps:

1. Switch to plan mode (read-only). Do not write any code yet.

2. Use ultrathink to reason through the full scope of this task:
   - What files will be touched?
   - What are the dependencies and risks?
   - What could go wrong?
   - What's the right order of operations?
   - Are there any architectural decisions that need to be made first?

3. Write a structured plan to .raiz/plans/current.md in this format:
   # Plan: {task name}
   ## Objective
   {one paragraph description}
   ## Scope
   {files that will be touched}
   ## Steps
   - [ ] Step 1
   - [ ] Step 2
   ...
   ## Risks
   {anything that could go wrong}
   ## Out of Scope
   {what we are explicitly NOT doing}

4. Spawn a subagent with this prompt:
   "You are a staff engineer reviewing a development plan. Be skeptical.
   Read this plan and identify: missing steps, hidden complexity, wrong assumptions,
   scope creep risks, and anything that will cause problems during implementation.
   Be direct. If the plan is solid, say so. If not, say exactly what's wrong.
   Plan: {paste plan contents}"

5. Show the subagent's review to the user.

6. Ask: "Ready to implement? (yes / revise the plan first)"
   Do not start implementation until the user confirms.

After confirmation, exit plan mode and begin executing the plan step by step,
checking off each step in current.md as you complete it.