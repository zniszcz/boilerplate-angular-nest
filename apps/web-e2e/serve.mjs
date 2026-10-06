// Starts everything the E2E tests talk to, on their own ports from the root
// .env, so they clash neither with `pnpm dev` nor with another instance:
// PostgreSQL in a container, migrations and the seed, the built API on
// E2E_API_PORT, and the built web app on E2E_WEB_PORT with /api proxied,
// as nginx does in the cluster. Run by Playwright's webServer; stops all on
// SIGTERM. Needs `nx run-many -t build -p api web` first.
import { spawn, execFileSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const API_DIST = join(ROOT, 'dist/apps/api');
const WEB_DIST = join(ROOT, 'dist/apps/web/browser');
const port = (name) => {
  const value = Number(process.env[name]);
  if (!value) {
    throw new Error(`${name} is not set; copy .env.example to .env`);
  }
  return value;
};
const API_PORT = port('E2E_API_PORT');
const WEB_PORT = port('E2E_WEB_PORT');

const db = await new PostgreSqlContainer('postgres:18.6')
  .withTmpFs({ '/var/lib/postgresql': 'rw' })
  .withCommand(['postgres', '-c', 'fsync=off', '-c', 'synchronous_commit=off'])
  .start();

const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: String(API_PORT),
  LOG_LEVEL: 'warn',
  DATABASE_URL: db.getConnectionUri(),
  JWT_SECRET: 'e2e-secret',
  MEDIA_DIR: join(ROOT, 'tmp/e2e-media'),
  SEED_USER_EMAIL: 'admin@example.com',
  SEED_USER_PASSWORD: 'admin',
};
execFileSync('node', [join(API_DIST, 'migrate.js')], { env, stdio: 'inherit' });
execFileSync('node', [join(API_DIST, 'seed.js')], { env, stdio: 'inherit' });
const api = spawn('node', [join(API_DIST, 'main.js')], {
  env,
  stdio: 'inherit',
});

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const web = createServer((req, res) => {
  if (req.url?.startsWith('/api')) {
    const upstream = request(
      {
        host: '127.0.0.1',
        port: API_PORT,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (answer) => {
        res.writeHead(answer.statusCode ?? 502, answer.headers);
        answer.pipe(res);
      },
    );
    upstream.on('error', () => res.writeHead(502).end());
    req.pipe(upstream);
    return;
  }
  // Static files, and index.html for every route of the app.
  const path = normalize(join(WEB_DIST, (req.url ?? '/').split('?')[0]));
  const file =
    path.startsWith(WEB_DIST) && existsSync(path) && statSync(path).isFile()
      ? path
      : join(WEB_DIST, 'index.html');
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
  });
  createReadStream(file).pipe(res);
});
web.listen(WEB_PORT, '127.0.0.1');

async function stop() {
  web.close();
  api.kill();
  await db.stop();
  process.exit(0);
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
