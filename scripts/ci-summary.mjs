// Writes a short table to the summary of a CI run, so the result is on the
// run's page without opening logs. Usage, after the step that wrote the
// report: node scripts/ci-summary.mjs mutation|e2e
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const kind = process.argv[2];
const out = process.env.GITHUB_STEP_SUMMARY;
const write = (text) =>
  out ? appendFileSync(out, `${text}\n`) : console.log(text);

function mutation() {
  const file = 'reports/mutation/mutation.json';
  if (!existsSync(file)) {
    return write('### Mutation testing\n\nNo report: Stryker did not finish.');
  }
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const rows = [];
  let detected = 0;
  let valid = 0;
  for (const [path, { mutants }] of Object.entries(report.files)) {
    const killed = mutants.filter((m) =>
      ['Killed', 'Timeout'].includes(m.status),
    ).length;
    const counted = mutants.filter(
      (m) => !['CompileError', 'RuntimeError', 'Ignored'].includes(m.status),
    ).length;
    detected += killed;
    valid += counted;
    const survived = counted - killed;
    if (survived > 0) {
      rows.push(`| \`${path}\` | ${survived} |`);
    }
  }
  const score = valid ? ((100 * detected) / valid).toFixed(1) : '100.0';
  write(
    `### Mutation testing\n\n**Score ${score}%**, threshold 80%. ` +
      `${detected} of ${valid} mutants caught.\n`,
  );
  if (rows.length) {
    write('| File with surviving mutants | Survived |\n| --- | --- |');
    write(rows.join('\n'));
  }
}

function e2e() {
  const file = 'reports/e2e/results.json';
  if (!existsSync(file)) {
    return write('### End-to-end\n\nNo report: Playwright did not finish.');
  }
  const { stats, suites } = JSON.parse(readFileSync(file, 'utf8'));
  write(
    `### End-to-end\n\n| Passed | Failed | Flaky | Time |\n| --- | --- | --- | --- |\n` +
      `| ${stats.expected} | ${stats.unexpected} | ${stats.flaky} | ` +
      `${(stats.duration / 1000).toFixed(1)} s |\n`,
  );
  const lines = [];
  const walk = (suite, feature) => {
    for (const spec of suite.specs ?? []) {
      const status = spec.tests.at(-1)?.results.at(-1)?.status;
      const icon =
        { passed: '✅', failed: '❌', timedOut: '❌' }[status] ?? '⚪';
      lines.push(`| ${icon} | ${feature ?? suite.title} | ${spec.title} |`);
    }
    for (const child of suite.suites ?? []) {
      walk(child, child.title || feature);
    }
  };
  suites.forEach((suite) => walk(suite));
  write('| | Feature | Scenario |\n| --- | --- | --- |');
  write(lines.join('\n'));
}

const run = { mutation, e2e }[kind];
if (!run) {
  console.error('Usage: node scripts/ci-summary.mjs mutation|e2e');
  process.exit(2);
}
run();
