// Runs a branch as an isolated instance of the apps: its own git worktree
// next to the main checkout, its own block of ports, its own database on the
// shared PostgreSQL and its own Valkey database. At most three instances
// besides the main checkout. See docs/adr/0030-isolated-instances.md.
//   node scripts/instances.mjs up <branch>      create or start, then wait
//   node scripts/instances.mjs stop <branch>    stop its apps, keep the rest
//   node scripts/instances.mjs down <branch>    remove it, if nothing is lost
//   node scripts/instances.mjs sweep            remove those whose PR merged
//   node scripts/instances.mjs list
// The full log goes to tmp/instances/ of the main checkout. The last line of
// stdout is one JSON object: status, summary, log, data. Exit code 0 means
// the command ran, whatever the status; any other code means it broke.
import { execFileSync, spawn } from 'node:child_process';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

const LIMIT = 3;
const FIRST_PORT = 41000;
const BLOCK = 10;
const READY_TIMEOUT_MS = 180_000;

const MAIN = mainCheckout();
const REGISTRY = join(gitCommonDir(), 'instances.json');
const LOG_DIR = join(MAIN, 'tmp/instances');
mkdirSync(LOG_DIR, { recursive: true });
const [command, branch] = process.argv.slice(2);
const LOG = join(
  LOG_DIR,
  `${command ?? 'none'}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`,
);

function log(line) {
  appendFileSync(LOG, `${line}\n`);
}

function finish(status, summary, data = {}) {
  console.log(JSON.stringify({ status, summary, log: LOG, data }));
  process.exit(0);
}

/** Runs a command, logs its output, throws with the command on failure. */
function run(cmd, args, options = {}) {
  log(`$ ${cmd} ${args.join(' ')}`);
  try {
    const out = execFileSync(cmd, args, {
      cwd: MAIN,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });
    log(out);
    return out;
  } catch (error) {
    log(`${error.stdout ?? ''}${error.stderr ?? ''}`);
    throw new Error(`${cmd} ${args.slice(0, 3).join(' ')} failed`);
  }
}

function mainCheckout() {
  const out = execFileSync('git', ['worktree', 'list', '--porcelain'], {
    encoding: 'utf8',
  });
  return out.match(/^worktree (.+)$/m)[1];
}

function gitCommonDir() {
  const dir = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd: MAIN,
    encoding: 'utf8',
  }).trim();
  return dir.startsWith('/') ? dir : join(MAIN, dir);
}

function readRegistry() {
  return existsSync(REGISTRY)
    ? JSON.parse(readFileSync(REGISTRY, 'utf8'))
    : { instances: {} };
}

function writeRegistry(registry) {
  writeFileSync(REGISTRY, `${JSON.stringify(registry, null, 2)}\n`);
}

const slug = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** The per-instance port variables of .env.example, in offset order. */
function portVariables() {
  const text = readFileSync(join(MAIN, '.env.example'), 'utf8');
  const block = text.match(
    /# per-instance-ports\n([\s\S]*?)# \/per-instance-ports/,
  );
  if (!block) {
    throw new Error('.env.example has no # per-instance-ports block');
  }
  return [...block[1].matchAll(/^([A-Z0-9_]+)=/gm)].map((match) => match[1]);
}

function portsOf(slot) {
  const base = FIRST_PORT + slot * BLOCK;
  return Object.fromEntries(
    portVariables().map((name, offset) => [name, base + offset]),
  );
}

/** Copies the main .env once and sets this instance's values in it. */
function writeEnv(instance) {
  const source = join(MAIN, '.env');
  if (!existsSync(source)) {
    throw new Error('The main checkout has no .env. Run: cp .env.example .env');
  }
  const values = {
    ...instance.ports,
    POSTGRES_DB: instance.database,
    VALKEY_DB: String(instance.slot),
  };
  let text = readFileSync(source, 'utf8');
  for (const [name, value] of Object.entries(values)) {
    const line = new RegExp(`^${name}=.*$`, 'm');
    text = line.test(text)
      ? text.replace(line, `${name}=${value}`)
      : `${text}\n${name}=${value}`;
  }
  writeFileSync(join(instance.worktree, '.env'), text);
}

function alive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopApps(instance) {
  for (const pid of Object.values(instance.pids ?? {})) {
    if (alive(pid)) {
      process.kill(-pid, 'SIGTERM');
      log(`stopped process group ${pid}`);
    }
  }
  instance.pids = {};
}

/** Starts one app in its own process group, its output in a log file. */
function startApp(instance, name, args) {
  const file = join(LOG_DIR, `${instance.slug}-${name}.log`);
  const out = openSync(file, 'w');
  const child = spawn('pnpm', ['nx', ...args], {
    cwd: instance.worktree,
    detached: true,
    stdio: ['ignore', out, out],
  });
  child.unref();
  log(`started ${name} as process group ${child.pid}, log ${file}`);
  return { pid: child.pid, file };
}

async function reachable(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(2000) });
    return true;
  } catch {
    return false;
  }
}

/** Waits for both apps; reports a taken port as soon as a log shows it. */
async function waitReady(instance, apps) {
  const urls = {
    api: `http://localhost:${instance.ports.API_PORT}/api/health/live`,
    web: `http://localhost:${instance.ports.WEB_PORT}/`,
  };
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    for (const [name, app] of Object.entries(apps)) {
      const text = readFileSync(app.file, 'utf8');
      const busy = text.match(
        /.*(EADDRINUSE|address already in use|Port \d+ is already in use).*/i,
      );
      if (busy) {
        log(`${name}: ${busy[0].replace(/\x1b\[[0-9;]*m/g, '')}`);
        return { ok: false, reason: 'port-busy', app: name };
      }
      if (!alive(app.pid)) {
        return { ok: false, reason: 'exited', app: name };
      }
    }
    const ready = await Promise.all(Object.values(urls).map(reachable));
    if (ready.every(Boolean)) {
      return { ok: true };
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  return { ok: false, reason: 'timeout' };
}

function compose(args) {
  return run('docker', ['compose', ...args]);
}

function createDatabase(name) {
  const exists = compose([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'app',
    '-d',
    'app',
    '-Atc',
    `select 1 from pg_database where datname = '${name}'`,
  ]).trim();
  if (exists !== '1') {
    compose(['exec', '-T', 'postgres', 'createdb', '-U', 'app', name]);
  }
}

function dropDatabase(name) {
  compose([
    'exec',
    '-T',
    'postgres',
    'dropdb',
    '-U',
    'app',
    '--if-exists',
    '--force',
    name,
  ]);
}

function flushValkey(db) {
  compose([
    'exec',
    '-T',
    'valkey',
    'valkey-cli',
    '--user',
    'app',
    '--pass',
    'app',
    '--no-auth-warning',
    '-n',
    String(db),
    'FLUSHDB',
  ]);
}

function freeSlot(registry, skip = []) {
  const taken = Object.values(registry.instances).map((i) => i.slot);
  for (let slot = 1; slot <= LIMIT + skip.length; slot += 1) {
    if (!taken.includes(slot) && !skip.includes(slot)) {
      return slot;
    }
  }
  return undefined;
}

function branchExists(name) {
  try {
    run('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]);
    return true;
  } catch {
    return false;
  }
}

async function up(name) {
  const sweepResult = sweepInstances();
  const registry = readRegistry();
  let instance = registry.instances[name];
  const skipped = [];
  if (!instance) {
    if (Object.keys(registry.instances).length >= LIMIT) {
      return finish(
        'limit-reached',
        `${LIMIT} instances already exist; remove one first`,
        { instances: summaries(registry), sweep: sweepResult },
      );
    }
    const id = slug(name);
    instance = {
      branch: name,
      slug: id,
      slot: freeSlot(registry),
      worktree: join(dirname(MAIN), `${basename(MAIN)}--${id}`),
      database: `app_${id.replace(/-/g, '_')}`.slice(0, 63),
    };
    instance.ports = portsOf(instance.slot);
    if (!existsSync(instance.worktree)) {
      run('git', [
        'worktree',
        'add',
        instance.worktree,
        ...(branchExists(name) ? [name] : ['-b', name]),
      ]);
    }
    writeEnv(instance);
    registry.instances[name] = instance;
    writeRegistry(registry);
    run('pnpm', ['install', '--frozen-lockfile', '--prefer-offline'], {
      cwd: instance.worktree,
    });
    createDatabase(instance.database);
    run('pnpm', ['nx', 'run', 'api:migrate'], { cwd: instance.worktree });
    run('pnpm', ['nx', 'run', 'api:seed'], { cwd: instance.worktree });
  }
  stopApps(instance);
  for (;;) {
    const apps = {
      api: startApp(instance, 'api', [
        'serve',
        'api',
        `--port=${instance.ports.API_DEBUG_PORT}`,
      ]),
      web: startApp(instance, 'web', [
        'serve',
        'web',
        `--port=${instance.ports.WEB_PORT}`,
      ]),
    };
    instance.pids = { api: apps.api.pid, web: apps.web.pid };
    writeRegistry(registry);
    const result = await waitReady(instance, apps);
    if (result.ok) {
      break;
    }
    stopApps(instance);
    writeRegistry(registry);
    if (result.reason !== 'port-busy') {
      return finish(
        result.reason === 'timeout' ? 'start-timeout' : 'start-failed',
        `${result.app ?? 'The apps'} did not start; see its log`,
        {
          logs: Object.fromEntries(
            Object.entries(apps).map(([k, v]) => [k, v.file]),
          ),
        },
      );
    }
    // A port of this block is taken by something else: move to another slot.
    skipped.push(instance.slot);
    const slot = freeSlot(registry, skipped);
    if (!slot || skipped.length > LIMIT) {
      return finish('no-free-ports', 'Every free block has a taken port', {
        skipped,
      });
    }
    instance.slot = slot;
    instance.ports = portsOf(slot);
    writeEnv(instance);
    writeRegistry(registry);
    log(`port taken, moved to slot ${slot}`);
  }
  return finish(
    'ready',
    `${name} runs at http://localhost:${instance.ports.WEB_PORT}`,
    {
      ...summary(instance),
      movedFromSlots: skipped,
      sweep: sweepResult,
    },
  );
}

function summary(instance) {
  return {
    branch: instance.branch,
    slot: instance.slot,
    worktree: instance.worktree,
    web: `http://localhost:${instance.ports.WEB_PORT}`,
    api: `http://localhost:${instance.ports.API_PORT}/api`,
    database: instance.database,
    valkeyDb: instance.slot,
    running: Object.values(instance.pids ?? {}).some(alive),
  };
}

function summaries(registry) {
  return Object.values(registry.instances).map(summary);
}

function dirty(instance) {
  if (!existsSync(instance.worktree)) {
    return false;
  }
  const status = run('git', ['status', '--porcelain'], {
    cwd: instance.worktree,
  });
  const ahead = run(
    'git',
    // Commits only this branch has: on no remote and no other local branch.
    [
      'log',
      '--oneline',
      instance.branch,
      '--not',
      `--exclude=${instance.branch}`,
      '--branches',
      '--remotes',
    ],
    { cwd: instance.worktree },
  );
  return status.trim() !== '' || ahead.trim() !== '';
}

/** Removes one instance. Refuses when work would be lost, unless merged. */
function remove(registry, instance, merged) {
  if (!merged && dirty(instance)) {
    return 'dirty';
  }
  stopApps(instance);
  dropDatabase(instance.database);
  flushValkey(instance.slot);
  if (existsSync(instance.worktree)) {
    // Each worktree has its own Nx daemon; it would outlive the folder.
    try {
      run('pnpm', ['nx', 'daemon', '--stop'], { cwd: instance.worktree });
    } catch {
      log('no Nx daemon to stop');
    }
    run('git', ['worktree', 'remove', '--force', instance.worktree]);
  }
  if (branchExists(instance.branch)) {
    run('git', ['branch', '-D', instance.branch]);
  }
  delete registry.instances[instance.branch];
  writeRegistry(registry);
  return 'removed';
}

function prState(name) {
  const out = run('gh', [
    'pr',
    'list',
    '--head',
    name,
    '--state',
    'all',
    '--json',
    'state',
    '--limit',
    '1',
  ]);
  return JSON.parse(out)[0]?.state;
}

function sweepInstances() {
  const registry = readRegistry();
  const result = { removed: [], closedUnmerged: [], keptDirty: [] };
  for (const instance of Object.values(registry.instances)) {
    const state = prState(instance.branch);
    if (state === 'MERGED') {
      // Squash merges leave the branch's commits unknown to main, so a
      // merged pull request counts as saved work.
      if (hasUncommitted(instance)) {
        result.keptDirty.push(instance.branch);
        continue;
      }
      remove(registry, instance, true);
      result.removed.push(instance.branch);
    } else if (state === 'CLOSED') {
      result.closedUnmerged.push(instance.branch);
    }
  }
  return result;
}

function hasUncommitted(instance) {
  return (
    existsSync(instance.worktree) &&
    run('git', ['status', '--porcelain'], { cwd: instance.worktree }).trim() !==
      ''
  );
}

async function main() {
  const registry = readRegistry();
  const instance = branch && registry.instances[branch];
  switch (command) {
    case 'up':
      if (!branch) break;
      return up(branch);
    case 'stop':
      if (!instance) return finish('not-found', `No instance for ${branch}`);
      stopApps(instance);
      writeRegistry(registry);
      return finish(
        'stopped',
        `${branch} stopped; up starts it again`,
        summary(instance),
      );
    case 'down': {
      if (!instance) return finish('not-found', `No instance for ${branch}`);
      const merged = prState(branch) === 'MERGED';
      if (merged && hasUncommitted(instance)) {
        return finish(
          'dirty',
          `${branch} has uncommitted changes`,
          summary(instance),
        );
      }
      const outcome = remove(registry, instance, merged);
      return outcome === 'dirty'
        ? finish(
            'dirty',
            `${branch} has uncommitted or unpushed work`,
            summary(instance),
          )
        : finish('removed', `${branch} removed`, { branch });
    }
    case 'sweep': {
      const result = sweepInstances();
      return finish(
        'swept',
        `${result.removed.length} removed, ${result.closedUnmerged.length} closed without merge`,
        result,
      );
    }
    case 'list':
      return finish(
        'listed',
        `${Object.keys(registry.instances).length} instances`,
        {
          instances: summaries(registry),
        },
      );
  }
  console.error(
    'Usage: node scripts/instances.mjs up|stop|down <branch> | sweep | list',
  );
  process.exit(2);
}

main().catch((error) => {
  log(error.stack);
  console.error(`${error.message}. Log: ${LOG}`);
  process.exit(1);
});
