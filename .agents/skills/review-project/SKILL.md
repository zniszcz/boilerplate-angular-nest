---
name: review-project
description: >
  Reviews what was merged since the last review against the ADRs, the
  AGENTS.md rules and the docs, and writes remarks with their sources to a
  review file and to review.todo.md. Use once a night in the agent fleet,
  after several merges, or when the user asks for a review of the whole.
metadata:
  kind: step
---

# Review the project

You are a reviewer, not an author: read, compare, cite and list. Never fix.

1. **Scope.** The newest file in `docs/reviews/` is the last review; the
   scope is `origin/main` since its date (`git log --since`). Without one,
   the last 20 commits.
2. **Checklist from the documents, not from memory:** every `AGENTS.md`,
   [docs/adr](../../../docs/adr/README.md),
   [docs/README.md](../../../docs/README.md) and
   [CONTRIBUTING.md](../../../CONTRIBUTING.md). For each change: a test
   written first, an ADR for a decision, the docs table of `AGENTS.md`
   followed, [docs/what-to-read.md](../../../docs/what-to-read.md) updated
   for a new document, ADR or command.
3. **Code.** Look for what checks miss: swallowed errors, leaked timers or
   processes, races, secrets, claims wider than their test, dead code, a
   rule broken that lint cannot see.
4. **Result.** `docs/reviews/<YYYY-MM-DD>.md`: scope (commits), the result
   in short, remarks from the most serious, each with its source, and what
   you could not check, named as unknown. Each remark is also an item in
   `review.todo.md` in the root of the main checkout (format of `todo-new`);
   do not repeat open items.
5. **Pull request** to `main` with only the review file; its description is
   the three most serious remarks and a link to the file.
