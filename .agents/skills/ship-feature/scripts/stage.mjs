// Tells where a feature stands in the workflow of CONTRIBUTING.md, from the
// files and state the steps leave behind, so a new session picks up where
// the last one stopped without reading anything.
//   node .agents/skills/ship-feature/scripts/stage.mjs [name]
// Run in the feature's worktree. <name> picks <name>.spec.md when there are
// several. The last line of stdout is JSON: status, summary, log, data.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
const ROOT = run('git', ['rev-parse', '--show-toplevel']);
const { GhUnavailable, pullRequestOf } = await import(
  join(ROOT, 'scripts/gh.mjs')
);
const branch = run('git', ['branch', '--show-current'], ROOT);
const data = { branch, worktree: ROOT };

function finish(status, summary) {
  console.log(JSON.stringify({ status, summary, log: null, data }));
  process.exit(0);
}

const lastJson = (out) => JSON.parse(out.split('\n').pop());

// 11–12. A merged or closed pull request ends the feature, whatever else
// is left; check it first, because cleanup removes the instance.
let pr;
try {
  pr = pullRequestOf(branch, { cwd: ROOT });
} catch (error) {
  if (error instanceof GhUnavailable) {
    finish(error.status, error.message);
  }
  throw error;
}
if (pr) {
  data.pr = pr;
}
if (pr?.state === 'MERGED') {
  finish('cleanup', `#${pr.number} is merged`);
}
if (pr?.state === 'CLOSED') {
  finish('closed', `#${pr.number} was closed without a merge`);
}

// 1. An instance of this branch that runs, as pnpm instance reports it.
const instances = lastJson(run('pnpm', ['--silent', 'instance', 'list'], ROOT))
  .data.instances;
const instance = instances.find((i) => i.branch === branch);
data.instance = instance
  ? { slot: instance.slot, running: instance.running }
  : null;
if (!instance?.running) {
  finish(
    'start-instance',
    instance ? 'The instance is stopped' : 'No instance for this branch',
  );
}

// 2. A spec without open questions.
const specs = readdirSync(ROOT).filter((file) => file.endsWith('.spec.md'));
const wanted = process.argv[2];
const spec = wanted
  ? `${wanted}.spec.md`
  : specs.length === 1
    ? specs[0]
    : undefined;
if (!spec || !existsSync(join(ROOT, spec))) {
  data.specs = specs;
  finish(
    'write-spec',
    specs.length > 1 ? 'Several specs; name one' : 'No spec yet',
  );
}
const name = spec.replace(/\.spec\.md$/, '');
data.name = name;
// Open questions are the list items under the heading; any other text there
// is a note, not a question.
const open = (
  readFileSync(join(ROOT, spec), 'utf8').split(/^## Open questions\s*$/m)[1] ??
  ''
)
  .split(/^## /m)[0]
  .split('\n')
  .filter((line) => /^\s*[-*] \S/.test(line));
if (open.length > 0) {
  data.openQuestions = open.length;
  finish('write-spec', `${open.length} open questions in the spec`);
}

// 3 and 5. A valid task list, done.
const todo = join(ROOT, `${name}.todo.md`);
const todoScript = join(ROOT, '.agents/skills/todo-next/scripts/todo.mjs');
if (
  !existsSync(todo) ||
  lastJson(run('node', [todoScript, 'check', todo])).status !== 'valid'
) {
  finish(
    'plan-tasks',
    existsSync(todo) ? 'The task list is not valid' : 'No task list yet',
  );
}
const next = lastJson(run('node', [todoScript, 'next', todo]));
if (next.status === 'next') {
  data.progress = next.data.progress;
  data.nextTask = next.data.title;
  finish(
    'build',
    `${next.data.progress.done} of ${next.data.progress.total} tasks done`,
  );
}
if (next.status === 'all-blocked') {
  data.blocked = next.data.blocked;
  finish('blocked', 'Every open task is blocked');
}

// 10. The pull request, open or not yet there.
if (!pr) {
  finish('verify', 'All tasks done; verify, then open the pull request');
}
finish('review', `#${pr.number} is open`);
