---
name: browser-demo
description: >
  Walks through a feature's scenarios in the running instance in a real
  browser, error paths included, and shows the developer what it saw. Use
  after the tasks are done, before the pull request, or when the user asks
  to see or try the feature.
metadata:
  kind: step
---

# Try the feature in the browser

Carries out step 6 of
[CONTRIBUTING.md](../../../CONTRIBUTING.md#6-try-it-in-the-browser). It
checks what automated tests miss: layout on a phone, texts in both
languages, how errors look.

1. Get the address with `pnpm --silent instance list`; use the `web` of
   this branch. If it is not running, use the `instance-up` skill.
2. Use the browser tool your agent has, for example Claude in Chrome or a
   Playwright MCP server. Open a new tab; do not reuse the user's tabs.
3. Log in with the test account: `SEED_USER_EMAIL` and
   `SEED_USER_PASSWORD` in the worktree's `.env`. A scenario that needs
   another user creates it first, as the spec says.
4. For each scenario in `<name>.spec.md`, then each item under **Errors**:
   do it, and note what you see against what the spec says.
5. Check at the phone width the app is designed for first (see
   [frontend](../../../docs/concepts/frontend.md)), and switch the language
   once.
6. Record the walk when the tool can (a GIF or screenshots) and tell the
   user where it is.
7. Report in a short list: each scenario as works, differs (how), or could
   not be tried (why). Do not fix anything in this step; differences become
   tasks.

Do not click anything that deletes data that the scenario did not create.
