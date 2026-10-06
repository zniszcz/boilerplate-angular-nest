// Writes one short summary at the top of a CI run's page: a line per job
// with its result and key number, and details only for what failed. Run by
// the Summary job after the others; RESULTS is `toJSON(needs)` and the
// reports come from their artifacts in summary/. Locally it reads reports/
// and prints.   node scripts/ci-summary.mjs
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const out = process.env.GITHUB_STEP_SUMMARY;
const write = (text) =>
  out ? appendFileSync(out, `${text}\n`) : console.log(text);
const read = (name, local) => {
  const file = existsSync('summary') ? `summary/${name}` : local;
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
};

const ICON = { success: '✅', failure: '❌', cancelled: '⏹️', skipped: '⚪' };
const THRESHOLD = 80;

function mutation() {
  const report = read('mutation.json', 'reports/mutation/mutation.json');
  if (!report) {
    return { note: 'no report', details: [] };
  }
  let detected = 0;
  let valid = 0;
  const survivors = [];
  for (const [path, { mutants }] of Object.entries(report.files)) {
    const counted = mutants.filter(
      (m) => !['CompileError', 'RuntimeError', 'Ignored'].includes(m.status),
    ).length;
    const killed = mutants.filter((m) =>
      ['Killed', 'Timeout'].includes(m.status),
    ).length;
    detected += killed;
    valid += counted;
    if (counted > killed) {
      survivors.push(`\`${path}\`: ${counted - killed} survived`);
    }
  }
  const score = valid ? (100 * detected) / valid : 100;
  return {
    note: `score ${score.toFixed(1)}% (threshold ${THRESHOLD}%)`,
    // Where to add tests, only when the score is too low.
    details: score < THRESHOLD ? survivors : [],
  };
}

function e2e() {
  const report = read('results.json', 'reports/e2e/results.json');
  if (!report) {
    return { note: 'no report', details: [] };
  }
  const { stats, suites } = report;
  const failed = [];
  const walk = (suite, feature) => {
    for (const spec of suite.specs ?? []) {
      const status = spec.tests.at(-1)?.results.at(-1)?.status;
      if (status !== 'passed' && status !== 'skipped') {
        failed.push(`${feature ?? suite.title}: ${spec.title}`);
      }
    }
    for (const child of suite.suites ?? []) {
      walk(child, child.title || feature);
    }
  };
  suites.forEach((suite) => walk(suite));
  const total = stats.expected + stats.unexpected + stats.flaky;
  const flaky = stats.flaky ? `, ${stats.flaky} flaky` : '';
  return {
    note: `${stats.expected} of ${total} scenarios passed${flaky}`,
    details: failed,
  };
}

const JOBS = [
  [
    'static',
    'Static checks',
    () => ({ note: 'lint, format, layers, contracts, docs' }),
  ],
  ['build', 'Build and Storybook', () => ({ note: 'apps and Storybook' })],
  [
    'test',
    'Unit and API tests',
    () => ({ note: 'failures are annotated in the job' }),
  ],
  ['mutation', 'Mutation testing', mutation],
  ['e2e', 'End-to-end', e2e],
];

const results = JSON.parse(process.env.RESULTS ?? '{}');
const rows = JOBS.map(([key, name, info]) => ({
  name,
  result: results[key]?.result ?? 'success',
  ...info(),
}));
const passed = rows.every((row) => row.result === 'success');

write(`## ${passed ? '✅ Everything passed' : '❌ Something failed'}\n`);
write('| | Job | Result |\n| --- | --- | --- |');
for (const row of rows) {
  write(`| ${ICON[row.result] ?? row.result} | ${row.name} | ${row.note} |`);
}
for (const row of rows.filter((r) => r.details?.length)) {
  write(`\n**${row.name}**\n`);
  write(row.details.map((line) => `- ${line}`).join('\n'));
}
