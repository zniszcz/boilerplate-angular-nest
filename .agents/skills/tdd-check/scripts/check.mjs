// Runs one test and says whether it is red or green, so test-first is
// checked by a tool, not by reading test output. See CONTRIBUTING.md, step 5.
//   node .agents/skills/tdd-check/scripts/check.mjs red|green <test>
// <test> is `path/to/file.spec.ts`, `path/to/file.spec.ts :: name`, or
// `apps/web-e2e/features/x.feature :: Scenario name`. The name matches as
// a substring. The last line of stdout is JSON: status, summary, log, data.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const [mode, ...rest] = process.argv.slice(2);
const spec = rest.join(' ');
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const LOG_DIR = join(ROOT, 'tmp/skills/tdd-check');
mkdirSync(LOG_DIR, { recursive: true });
const LOG = join(
  LOG_DIR,
  `${new Date().toISOString().replace(/[:.]/g, '-')}.log`,
);
writeFileSync(LOG, '');

function finish(status, summary, data = {}) {
  console.log(JSON.stringify({ status, summary, log: LOG, data }));
  process.exit(0);
}

/** Runs a command; returns its output and whether it exited with 0. */
function run(cmd, args, options = {}) {
  writeFileSync(LOG, `$ ${cmd} ${args.join(' ')}\n`, { flag: 'a' });
  try {
    const out = execFileSync(cmd, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      ...options,
    });
    writeFileSync(LOG, out, { flag: 'a' });
    return { ok: true, out };
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    writeFileSync(LOG, out, { flag: 'a' });
    return { ok: false, out };
  }
}

/** The Nx project that owns a file: the nearest folder with project.json. */
function projectOf(file) {
  for (
    let dir = dirname(join(ROOT, file));
    dir.startsWith(ROOT);
    dir = dirname(dir)
  ) {
    const config = join(dir, 'project.json');
    if (existsSync(config)) {
      return { name: JSON.parse(readFileSync(config, 'utf8')).name, root: dir };
    }
  }
  return undefined;
}

function vitest(file, name) {
  const project = projectOf(file);
  if (!project) {
    return finish('bad-input', `No Nx project owns ${file}`);
  }
  const report = join(LOG_DIR, 'vitest.json');
  const args = [
    'nx',
    'test',
    project.name,
    '--skip-nx-cache',
    '--',
    relative(project.root, join(ROOT, file)),
    '--reporter=json',
    `--outputFile=${report}`,
  ];
  if (name) {
    args.push('-t', name);
  }
  if (existsSync(report)) {
    writeFileSync(report, '');
  }
  run('pnpm', args);
  const text = existsSync(report) ? readFileSync(report, 'utf8') : '';
  if (!text) {
    // No report: the file did not compile or the runner broke. With test
    // first, a test of code that does not exist yet often fails this way.
    return { ran: 0, failed: 0, broken: true };
  }
  const result = JSON.parse(text);
  if (result.numTotalTests === 0 && result.numFailedTestSuites > 0) {
    // The file failed before any test ran, such as an import of code that
    // does not exist yet.
    const message = result.testResults.find((file) => file.message)?.message;
    return {
      ran: 0,
      failed: 0,
      broken: true,
      failures: [(message ?? '').split('\n')[0]],
    };
  }
  const failures = result.testResults
    .flatMap((file) => file.assertionResults)
    .filter((test) => test.status === 'failed')
    .slice(0, 3)
    .map(
      (test) =>
        `${test.fullName}: ${(test.failureMessages[0] ?? '').split('\n')[0]}`,
    );
  return {
    ran: result.numPassedTests + result.numFailedTests,
    failed: result.numFailedTests,
    failures,
  };
}

/** The JSON report file the project's Playwright config writes, if any. */
function jsonReport(project) {
  const config = join(project.root, 'playwright.config.ts');
  if (!existsSync(config)) {
    return undefined;
  }
  // Loaded in its own process: plugins such as playwright-bdd keep state in
  // the environment, which must not reach the test run. Node strips the
  // types itself, so the config stays the only source of the path.
  const reporters = JSON.parse(
    execFileSync(
      'node',
      [
        '--no-warnings',
        '--input-type=module',
        '-e',
        "const c = (await import('./playwright.config.ts')).default; console.log(JSON.stringify(c.reporter ?? []))",
      ],
      { cwd: project.root, encoding: 'utf8' },
    ),
  );
  const reporter = reporters.find(
    (entry) => Array.isArray(entry) && entry[0] === 'json',
  );
  const file = reporter?.[1]?.outputFile;
  return file ? join(project.root, file) : undefined;
}

async function playwright(file, name) {
  const project = projectOf(file);
  if (!project) {
    return finish('bad-input', `No Nx project owns ${file}`);
  }
  const report = jsonReport(project);
  if (!report) {
    return finish(
      'no-json-report',
      `${relative(ROOT, project.root)}/playwright.config.ts has no json reporter with an outputFile`,
    );
  }
  if (existsSync(report)) {
    writeFileSync(report, '');
  }
  const args = ['nx', 'e2e', project.name, '--skip-nx-cache', '--'];
  if (name) {
    args.push('--grep', name);
  }
  const { out } = run('pnpm', args);
  const text = existsSync(report) ? readFileSync(report, 'utf8') : '';
  if (!text) {
    // Playwright did not run: bddgen failed, for example on steps that are
    // not defined yet, or the build broke.
    const lines = out
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const errors = lines.filter((line) =>
      /error|missing|undefined/i.test(line),
    );
    return {
      ran: 0,
      failed: 0,
      broken: true,
      failures: (errors.length > 0 ? errors : lines).slice(0, 3),
    };
  }
  const { stats, suites } = JSON.parse(text);
  const specs = (suite) => [
    ...(suite.specs ?? []),
    ...(suite.suites ?? []).flatMap(specs),
  ];
  const failures = suites
    .flatMap(specs)
    .filter((test) => !test.ok)
    .slice(0, 3)
    .map((test) => test.title);
  return {
    ran: stats.expected + stats.unexpected + (stats.flaky ?? 0),
    failed: stats.unexpected + (stats.flaky ?? 0),
    failures,
  };
}

if (!['red', 'green'].includes(mode) || !spec) {
  console.error('Usage: check.mjs red|green <file>[ :: <test name>]');
  process.exit(2);
}
const [file, name] = spec.split('::').map((part) => part.trim());
if (!existsSync(join(ROOT, file))) {
  finish('bad-input', `${file} does not exist`, { file });
}
const result = file.endsWith('.feature')
  ? await playwright(file, name)
  : file.endsWith('.spec.ts')
    ? vitest(file, name)
    : finish('bad-input', 'Only .spec.ts and .feature files are supported', {
        file,
      });
const data = { test: spec, ...result };

if (result.broken) {
  // A test that cannot even run is red before the code, never green after.
  if (mode === 'red') {
    finish(
      'red',
      'The test does not run yet, for example an import of code that does not exist',
      data,
    );
  }
  finish('still-red', 'The test does not run; see the log', data);
}
if (result.ran === 0) {
  finish('no-test-found', 'No test matched; check the file and the name', data);
}
if (mode === 'red') {
  if (result.failed > 0) {
    finish(
      'red',
      `${result.failed} of ${result.ran || 1} failed, as expected before the code`,
      data,
    );
  }
  finish(
    'passes-too-early',
    `All ${result.ran} passed before the code exists`,
    data,
  );
}
if (result.failed === 0) {
  finish('green', `All ${result.ran} passed`, data);
}
finish('still-red', `${result.failed} of ${result.ran} still fail`, data);
