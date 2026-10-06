// The one way scripts call the GitHub CLI. It tells "gh is not installed"
// and "gh is not logged in" apart from any answer, so a script reports them
// as a status instead of mistaking them for "no pull request".
//   import { gh, GhUnavailable } from '<root>/scripts/gh.mjs';
import { execFileSync } from 'node:child_process';

export class GhUnavailable extends Error {
  constructor(status, summary) {
    super(summary);
    this.status = status;
  }
}

let ready = false;

function check(cwd) {
  try {
    execFileSync('gh', ['--version'], { cwd, stdio: 'ignore' });
  } catch {
    throw new GhUnavailable(
      'gh-missing',
      'The GitHub CLI (gh) is not installed: https://cli.github.com',
    );
  }
  try {
    // Asks GitHub, so a stale or wrong token fails here too.
    execFileSync('gh', ['api', 'user', '--silent'], { cwd, stdio: 'ignore' });
  } catch {
    throw new GhUnavailable(
      'gh-unauthenticated',
      'The GitHub CLI cannot reach GitHub as you: run gh auth login, or check the network',
    );
  }
  ready = true;
}

/** Runs gh and returns its output; throws GhUnavailable before anything
 * else when gh cannot answer at all. */
export function gh(args, { cwd } = {}) {
  if (!ready) {
    check(cwd);
  }
  return execFileSync('gh', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** The pull request of a branch, open, merged or closed; undefined if none. */
export function pullRequestOf(branch, { cwd } = {}) {
  return JSON.parse(
    gh(
      [
        'pr',
        'list',
        '--head',
        branch,
        '--state',
        'all',
        '--limit',
        '1',
        '--json',
        'number,state,url',
      ],
      { cwd },
    ),
  )[0];
}
