---
name: spec-write
description: >
  Turns an idea, however chaotic, into a spec file by asking the developer
  questions one at a time. Use when a new business feature starts, when the
  user describes what they want built, or when an existing spec has open
  questions.
metadata:
  kind: step
---

# Write the spec

Carries out step 2 of [CONTRIBUTING.md](../../../CONTRIBUTING.md#2-write-the-spec).
What lasts from the spec and where it goes:
[ADR 0029](../../../docs/adr/0029-feature-workflow.md).

1. Pick a short kebab-case name for the feature and confirm it with the
   user. The file is `<name>.spec.md` in the root of the worktree; git
   ignores it.
2. Start from [the template](references/spec-template.md). Fill in what the
   user already said; mark everything else as an open question.
3. Ask **one question at a time**, the most important first, and offer
   options with a recommendation when you can. Update the file after each
   answer, so nothing lives only in the conversation.
4. Read only what a question needs: `docs/README.md` for the big picture,
   the `README.md` of a library the feature touches, `docs/concepts/` for a
   mechanism. Do not read code to write the spec.
5. Write scenarios in the user's language of the app, as Given/When/Then,
   the way `apps/web-e2e/features` does.
6. Stop when **Open questions** is empty and the user agrees. Then say that
   the next step is planning the tasks (the `todo-new` skill).

Never invent requirements to fill a section; leave it empty or ask.
