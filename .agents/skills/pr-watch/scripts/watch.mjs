// One look at a pull request: its checks, reviews and comments since the
// last push, so an agent can wait for it without reading CI logs.
// See CONTRIBUTING.md, step 10.
//   node .agents/skills/pr-watch/scripts/watch.mjs [number]
// Without a number, the pull request of the current branch. The last line
// of stdout is JSON: status, summary, log, data.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const number = process.argv[2];

function finish(status, summary, data = {}) {
  console.log(JSON.stringify({ status, summary, log: null, data }));
  process.exit(0);
}

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const { gh, GhUnavailable, pullRequestOf } = await import(
  join(ROOT, 'scripts/gh.mjs')
);

let pr;
try {
  const branch = execFileSync('git', ['branch', '--show-current'], {
    encoding: 'utf8',
  }).trim();
  const target = number ?? pullRequestOf(branch, { cwd: ROOT })?.number;
  if (!target) {
    finish('no-pr', `No pull request for ${branch}`);
  }
  pr = JSON.parse(
    gh([
      'pr',
      'view',
      String(target),
      '--json',
      'number,url,state,reviewDecision,statusCheckRollup,comments,reviews,commits',
    ]),
  );
} catch (error) {
  if (error instanceof GhUnavailable) {
    finish(error.status, error.message);
  }
  throw error;
}

const data = { number: pr.number, url: pr.url };
if (pr.state === 'MERGED') {
  finish('merged', `#${pr.number} is merged`, data);
}
if (pr.state === 'CLOSED') {
  finish('closed', `#${pr.number} was closed without a merge`, data);
}

const lastPush = pr.commits.at(-1)?.committedDate ?? '';
const repo = gh([
  'repo',
  'view',
  '--json',
  'nameWithOwner',
  '-q',
  '.nameWithOwner',
]).trim();
const inline = JSON.parse(
  gh(['api', `repos/${repo}/pulls/${pr.number}/comments`]),
);
const newComments = [
  ...pr.comments.map((c) => ({
    author: c.author.login,
    at: c.createdAt,
    body: c.body,
  })),
  ...pr.reviews
    .filter((r) => r.body)
    .map((r) => ({ author: r.author.login, at: r.submittedAt, body: r.body })),
  ...inline.map((c) => ({
    author: c.user.login,
    at: c.created_at,
    body: c.body,
    file: `${c.path}:${c.line ?? c.original_line}`,
  })),
]
  .filter((c) => c.at > lastPush)
  .map((c) => ({ ...c, body: c.body.slice(0, 300) }));

// Check runs have name and conclusion or status; older status checks
// have context and state.
const checks = pr.statusCheckRollup.map((c) => ({
  name: c.name ?? c.context,
  state: c.conclusion || c.state || c.status,
}));
const failed = checks.filter((c) =>
  ['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED'].includes(
    c.state,
  ),
);
const pending = checks.filter((c) =>
  ['QUEUED', 'IN_PROGRESS', 'PENDING', 'WAITING', 'EXPECTED'].includes(c.state),
);
Object.assign(data, {
  failed: failed.map((c) => c.name),
  pending: pending.map((c) => c.name),
  reviewDecision: pr.reviewDecision || null,
  newComments,
});

if (failed.length > 0) {
  finish('failing', `${failed.length} checks failed`, data);
}
if (pr.reviewDecision === 'CHANGES_REQUESTED') {
  finish('changes-requested', 'A reviewer asked for changes', data);
}
if (newComments.length > 0) {
  finish(
    'new-comments',
    `${newComments.length} comments since the last push`,
    data,
  );
}
if (pending.length > 0) {
  finish('pending', `${pending.length} checks still running`, data);
}
finish('green', 'Checks pass and nothing waits for an answer', data);
