// Compares the projects a feature's plan names with those its change really
// touched, and gives the `## Impact` notes of the touched ones, so the agent
// reads only what matters. See CONTRIBUTING.md, step 8.
//   node .agents/skills/impact-scan/scripts/impact.mjs <name>.todo.md [base]
// The plan names its projects in a line `Projects: a, b` near the top of the
// task list. The base defaults to the merge base with origin/main, not the local
// main, which may be behind. The last
// line of stdout is JSON: status, summary, log, data.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [todo, baseArg] = process.argv.slice(2);
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();

function finish(status, summary, data = {}) {
  console.log(JSON.stringify({ status, summary, log: null, data }));
  process.exit(0);
}

const git = (...args) =>
  execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

if (!todo) {
  console.error('Usage: impact.mjs <name>.todo.md [base]');
  process.exit(2);
}
if (!existsSync(todo)) {
  finish('not-found', `${todo} does not exist`);
}
const plannedLine = readFileSync(todo, 'utf8').match(/^Projects:\s*(.*)$/m);
if (!plannedLine) {
  finish(
    'no-plan',
    `${todo} has no "Projects:" line naming the planned projects`,
  );
}
const planned = plannedLine[1]
  .split(',')
  .map((name) => name.trim().replace(/`/g, ''))
  .filter(Boolean);

// Fresh origin/main first; offline, the last fetched one has to do.
try {
  git('fetch', '--quiet', 'origin', 'main');
} catch {
  // no network
}
const base = baseArg ?? git('merge-base', 'HEAD', 'origin/main');
// Committed since the base, changed and new files in the working tree.
const files = [
  ...new Set(
    [
      git('diff', '--name-only', base),
      git('ls-files', '--others', '--exclude-standard'),
    ]
      .join('\n')
      .split('\n')
      .filter(Boolean),
  ),
];
if (files.length === 0) {
  finish('no-changes', `Nothing changed since ${base.slice(0, 7)}`);
}

const projects = git('ls-files', '*project.json')
  .split('\n')
  .filter(Boolean)
  .map((file) => ({
    root: dirname(file),
    name: JSON.parse(readFileSync(join(ROOT, file), 'utf8')).name,
  }))
  // Deepest first, so a file belongs to its nearest project.
  .sort((a, b) => b.root.length - a.root.length);

const owner = (file) =>
  projects.find((project) => file.startsWith(`${project.root}/`));
const touched = [
  ...new Set(
    files
      .map(owner)
      .filter(Boolean)
      .map((project) => project.name),
  ),
].sort();
const otherFiles = files.filter((file) => !owner(file));

const affected = JSON.parse(
  execFileSync(
    'pnpm',
    [
      '--silent',
      'nx',
      'show',
      'projects',
      '--affected',
      `--base=${base}`,
      '--json',
    ],
    { cwd: ROOT, encoding: 'utf8' },
  ),
);

/** The `## Impact` items of a project's README, one line each. */
function impactOf(name) {
  const project = projects.find((p) => p.name === name);
  const readme = join(ROOT, project.root, 'README.md');
  if (!existsSync(readme)) {
    return [];
  }
  const section = readFileSync(readme, 'utf8')
    .split(/^## Impact\s*$/m)[1]
    ?.split(/^## /m)[0];
  return (section ?? '')
    .split(/\n(?=- )/)
    .filter((item) => item.startsWith('- '))
    .map((item) => item.slice(2).replace(/\s+/g, ' ').trim());
}

const unknown = planned.filter(
  (name) => !projects.some((p) => p.name === name),
);
const data = {
  base: base.slice(0, 7),
  planned,
  touched,
  plannedUntouched: planned.filter(
    (name) => !touched.includes(name) && !unknown.includes(name),
  ),
  touchedUnplanned: touched.filter((name) => !planned.includes(name)),
  unknownPlanned: unknown,
  alsoAffected: affected.filter((name) => !touched.includes(name)).sort(),
  otherFiles,
  impact: Object.fromEntries(touched.map((name) => [name, impactOf(name)])),
};
const differs =
  data.plannedUntouched.length + data.touchedUnplanned.length + unknown.length >
  0;
finish(
  differs ? 'differs' : 'matches',
  differs
    ? `${data.touchedUnplanned.length} touched but not planned, ${data.plannedUntouched.length} planned but not touched`
    : `The change touched exactly the ${touched.length} planned projects`,
  data,
);
