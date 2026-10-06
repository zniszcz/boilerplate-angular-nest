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
const branch = run('git', ['branch', '--show-current'], ROOT);
const data = { branch, worktree: ROOT };

function finish(status, summary) {
  console.log(JSON.stringify({ status, summary, log: null, data }));
  process.exit(0);
}

const lastJson = (out) => JSON.parse(out.split('\n').pop());

// 1. An instance of this branch that runs.
const commonDir = run(
  'git',
  ['rev-parse', '--path-format=absolute', '--git-common-dir'],
  ROOT,
);
const registry = join(commonDir, 'instances.json');
const instance = existsSync(registry)
  ? JSON.parse(readFileSync(registry, 'utf8')).instances[branch]
  : undefined;
const running = Object.values(instance?.pids ?? {}).some((pid) => {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
});
data.instance = instance ? { slot: instance.slot, running } : null;
if (!instance || !running) {
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
const open = (
  readFileSync(join(ROOT, spec), 'utf8').split(/^## Open questions\s*$/m)[1] ??
  ''
)
  .split(/^## /m)[0]
  .split('\n')
  .filter((line) => line.trim() && !/^Must be empty/.test(line.trim()));
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

// 10–12. The pull request.
let pr;
try {
  pr = JSON.parse(
    run('gh', ['pr', 'view', '--json', 'number,state,url'], ROOT),
  );
} catch {
  finish('verify', 'All tasks done; verify, then open the pull request');
}
data.pr = pr;
if (pr.state === 'MERGED') {
  finish('cleanup', `#${pr.number} is merged`);
}
if (pr.state === 'CLOSED') {
  finish('closed', `#${pr.number} was closed without a merge`);
}
finish('review', `#${pr.number} is open`);
