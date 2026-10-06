import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, inject } from 'vitest';
import { TEMPLATE_DATABASE } from './template';

// Runs before each test file is imported: a fresh copy of the migrated
// database, set in the environment before data-source.ts reads it.
const adminUrl = inject('postgresAdminUrl');
const name = `test_${randomUUID().replaceAll('-', '')}`;

const admin = new Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(`CREATE DATABASE ${name} TEMPLATE ${TEMPLATE_DATABASE}`);
await admin.end();

const url = new URL(adminUrl);
url.pathname = `/${name}`;
process.env.DATABASE_URL = url.toString();
process.env.JWT_SECRET = 'api-test-secret';

afterAll(async () => {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
  await client.end();
});
