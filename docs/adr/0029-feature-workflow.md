# 0029. One recommended workflow for business features

- Status: Accepted
- Date: 2026-10-06

## Context

A business feature touches requirements, tests, architecture, secrets and
documentation. Done ad hoc, a step gets skipped: an end-to-end scenario, a
new variable in `.env.example`, a diagram. AI agents need the same order
written down, and a person opening the repository after half a year needs
to see it at a glance.

## Decision

- **[CONTRIBUTING.md](../../CONTRIBUTING.md) describes the workflow** for
  business features, with diagrams. It is the recommended way, not the only
  one: technical changes, such as swapping a test library, may skip steps.
  Skills carry it out; they are not a second source of truth.
- **The spec is a working file, kept out of git.** `<feature>.spec.md`
  holds the requirements, `<feature>.todo.md` the tasks and their progress,
  both in the root of the worktree and ignored by git. What lasts goes where
  it is already versioned:

  | Part of the spec                      | Goes to                                      |
  | ------------------------------------- | -------------------------------------------- |
  | user scenarios                        | `.feature` files, before the code            |
  | domain rules and edge cases           | API tests, unit tests for domain rules       |
  | shape of the API                      | DTOs and the generated contracts             |
  | a new architectural decision          | an ADR                                       |
  | a change to the system's picture      | `docs/README.md`, see the root `AGENTS.md`   |
  | how a mechanism works                 | the library's `README.md` or `docs/concepts` |
  | new environment variables and secrets | `.env.example` and 1Password                 |
  | why, scope and what is out of scope   | the pull request description                 |

  The whole spec goes into the pull request description, folded, so how we
  write specs can be reviewed later. The working files are deleted with the
  worktree.

- **Test first, one task at a time.** Each implementation task names its
  test. A script runs it before the code, where it must fail, and after,
  where it must pass. A task may skip this only on the developer's explicit
  word, recorded as `TDD: skipped — <reason>` and listed in the pull
  request.

Rejected: specs committed to `docs/specs/`, because they drift from the code
and duplicate the `.feature` files and ADRs. Rejected: an archive of specs
outside git, because nobody would look at it. Rejected: hooks that block
editing the task list, because test-first order cannot be proven after the
fact anyway; CI and mutation testing check that the tests exist.

## Consequences

- The `.feature` files, ADRs and pull requests are the lasting record of a
  feature; the working files are not.
- The order of writing tests first is made the easy path, not enforced.
