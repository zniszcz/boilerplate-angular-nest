// Prepares a pull request: checks the title against the commit rules and
// builds the body from the developer's intro, the tasks that skipped test
// first, and the whole spec, folded. See CONTRIBUTING.md, step 10.
//   node .agents/skills/pr-open/scripts/pr.mjs <name> <intro.md> "<title>"
// <name> is the feature: <name>.spec.md and <name>.todo.md in the root of
// the worktree. The last line of stdout is JSON: status, summary, log, data.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [name, intro, title] = process.argv.slice(2);
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

function finish(status, summary, data = {}) {
  console.log(JSON.stringify({ status, summary, log: null, data }));
  process.exit(0);
}

if (!name || !intro || !title) {
  console.error('Usage: pr.mjs <name> <intro.md> "<title>"');
  process.exit(2);
}
const spec = join(ROOT, `${name}.spec.md`);
const todo = join(ROOT, `${name}.todo.md`);
if (!existsSync(spec)) {
  finish('spec-missing', `${name}.spec.md does not exist`);
}
if (!existsSync(intro)) {
  finish('intro-missing', `${intro} does not exist`);
}

try {
  execFileSync('pnpm', ['--silent', 'exec', 'commitlint'], {
    cwd: ROOT,
    input: title,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (error) {
  // Each problem line ends with the rule's id in brackets, such as
  // [type-empty]; the ids are commitlint's stable API.
  const problems = `${error.stdout ?? ''}${error.stderr ?? ''}`
    .split('\n')
    .map((line) => line.replace(/\x1b\[[0-9;]*m/g, '').trim())
    .filter((line) => /\[[a-z-]+\]$/.test(line))
    .map((line) => line.replace(/^\W+/, ''));
  finish('title-invalid', 'The title breaks the commit rules', { problems });
}

let skipped = [];
let progress;
if (existsSync(todo)) {
  const out = execFileSync(
    'node',
    [join(ROOT, '.agents/skills/todo-next/scripts/todo.mjs'), 'report', todo],
    { encoding: 'utf8' },
  );
  const report = JSON.parse(out.trim().split('\n').pop());
  skipped = report.data.skippedTdd;
  progress = report.data.progress;
}

const parts = [readFileSync(intro, 'utf8').trim()];
if (skipped.length > 0) {
  parts.push(
    '## Test first skipped',
    skipped.map((task) => `- ${task.title}: ${task.reason}`).join('\n'),
  );
}
parts.push(
  `<details>\n<summary>Spec</summary>\n\n${readFileSync(spec, 'utf8').trim()}\n\n</details>`,
);
const dir = join(ROOT, 'tmp/skills/pr-open');
mkdirSync(dir, { recursive: true });
const body = join(dir, `${name}.md`);
writeFileSync(body, `${parts.join('\n\n')}\n`);
finish('ready', `Body in ${body}`, {
  title,
  body,
  skippedTdd: skipped.length,
  progress,
});
