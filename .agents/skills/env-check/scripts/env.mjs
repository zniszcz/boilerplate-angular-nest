// Lists the environment variables a branch adds to or removes from
// .env.example and flags the ones that look like secrets. Every way of
// running the project reads .env, so that is the only place they go
// locally. See CONTRIBUTING.md, step 4.
//   node .agents/skills/env-check/scripts/env.mjs [base]
// The base defaults to the merge base with the remote's default
// branch. The last line of
// stdout is JSON: status, summary, log, data.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf8',
}).trim();
const git = (...args) =>
  execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
/** origin's default branch, asking the remote once if git does not know it. */
function defaultBranch() {
  const head = () => git('symbolic-ref', '--short', 'refs/remotes/origin/HEAD');
  try {
    return head();
  } catch {
    git('remote', 'set-head', 'origin', '--auto');
    return head();
  }
}

const base = process.argv[2] ?? git('merge-base', 'HEAD', defaultBranch());

const keys = (text) =>
  new Set([...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]));
const before = keys(git('show', `${base}:.env.example`));
const now = keys(readFileSync(join(ROOT, '.env.example'), 'utf8'));
const SECRET = /SECRET|PASSWORD|TOKEN|KEY|PRIVATE|CREDENTIAL/;

const added = [...now]
  .filter((name) => !before.has(name))
  .map((name) => ({ name, secret: SECRET.test(name) }));
const removed = [...before].filter((name) => !now.has(name));

const data = { base: base.slice(0, 7), added, removed };
if (added.length + removed.length === 0) {
  console.log(
    JSON.stringify({
      status: 'no-changes',
      summary: 'No variables added or removed',
      log: null,
      data,
    }),
  );
} else {
  console.log(
    JSON.stringify({
      status: 'changed',
      summary: `${added.length} added (${added.filter((v) => v.secret).length} secret), ${removed.length} removed`,
      log: null,
      data,
    }),
  );
}
