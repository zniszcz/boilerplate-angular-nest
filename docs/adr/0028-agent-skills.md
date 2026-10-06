# 0028. Agent skills in the open format, steps and aggregators

- Status: Accepted
- Date: 2026-10-06

## Context

AI agents do most of the routine work here: starting the app on a branch,
turning a requirement into tests, opening a pull request. Without written
skills each agent improvises, spends tokens on work a script does better,
and fills its context with logs it does not need. The skills must also work
outside Claude Code, Devin first.

## Decision

- **Format: [Agent Skills](https://agentskills.io/specification).** A
  folder with `SKILL.md` (frontmatter `name`, `description`) and optional
  `scripts/` and `references/`. Only standard frontmatter fields, plus
  `disable-model-invocation`, which Claude Code and Pi both read.
- **Location: `.agents/skills/<name>/`**, which Devin, Codex, Gemini CLI and
  Pi read. Claude Code reads only `.claude/skills/`, so each skill has a
  symlink `.claude/skills/<name>` to its folder. `pnpm skills:link` creates
  missing links and removes links to removed skills, the pre-commit hook
  runs it, and `pnpm docs:check` fails on a skill without a link or a link
  without a skill.
- **Tools fix only what has one right answer**, such as a link or a
  generated list, and print each fix, so an agent sees its own mistake.
  Anything that needs a decision, such as a missing kind or contract, is
  only reported. CI only reports.
- **Paths from the repository root.** A skill runs its scripts as
  `node .agents/skills/<name>/scripts/<file>`, from the root of the
  repository or worktree, so every agent finds the same file.
- **Two kinds**, set in `metadata.kind`:
  - a **step** has one goal, stated in the first sentence of its
    description, and calls no other skill;
  - an **aggregator** carries out a process that a document for people
    describes, such as [CONTRIBUTING.md](../../CONTRIBUTING.md), links to
    that document instead of repeating it, and calls steps or other
    aggregators. It may have scripts of its own.
- **Scripts do the deterministic work.** The agent reads the result and
  decides. A script prints the full log to a file and ends with one JSON
  line: `status`, `summary`, `log` and `data`. Exit code 0 means the script
  ran, whatever the result; any other code means it broke. `SKILL.md` has a
  `## Contract` section with a table of every status, what it means and what
  to do next. Any other status, no JSON line or a non-zero exit code: stop
  and show the user the log.
- **Skills follow the documentation, never the other way round.** The
  process is described for people; a skill is one way to carry it out.
- **The list of skills is generated** into
  [.agents/skills/README.md](../../.agents/skills/README.md) by
  `pnpm docs:generate`. `pnpm docs:check` also fails on a skill without
  `metadata.kind`, and on a skill with scripts and no `## Contract`.

Rejected: skills only in `.claude/skills/`, because other agents would not
find them. Rejected: symlinking only the `SKILL.md` files, because Claude
Code documents symlinked folders only. Rejected: scripts that print their
whole output, because it fills the agent's context.

## Consequences

- A new skill needs its folder, `metadata.kind`, and a contract if it has
  scripts; the tools add the link and the list entry.
- Scripts are Node.js or Bash without dependencies beyond the repository's.
- Skills are optional. Every rule they serve is also enforced by CI or lint,
  so work done without them is checked the same way.
