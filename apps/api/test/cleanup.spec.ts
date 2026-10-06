import { SessionCleanup } from '@boilerplate/api-authentication';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { startApi, type TestApi } from './api';

let api: TestApi;
let userId: string;

const NOW = new Date('2026-10-06T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY);
}

beforeAll(async () => {
  api = await startApi();
  [{ id: userId }] = await api.db.query('SELECT id FROM users LIMIT 1');
});

afterAll(() => api.close());

beforeEach(() => api.db.query('DELETE FROM refresh_tokens'));

async function token(
  name: string,
  { expiresAt, revokedAt = null }: { expiresAt: Date; revokedAt?: Date | null },
): Promise<void> {
  await api.db.query(
    `INSERT INTO refresh_tokens
       (id, user_id, family_id, token_hash, expires_at, revoked_at)
     VALUES (gen_random_uuid(), $1, gen_random_uuid(), $2, $3, $4)`,
    [userId, name, expiresAt, revokedAt],
  );
}

async function remaining(): Promise<string[]> {
  const rows: { token_hash: string }[] = await api.db.query(
    'SELECT token_hash FROM refresh_tokens ORDER BY token_hash',
  );
  return rows.map((row) => row.token_hash);
}

it('removes expired tokens and sessions ended over 7 days ago, and keeps the rest', async () => {
  const future = new Date(NOW.getTime() + DAY);
  await token('active', { expiresAt: future });
  await token('expired', { expiresAt: new Date(NOW.getTime() - 1) });
  await token('ended-8-days-ago', { expiresAt: future, revokedAt: daysAgo(8) });
  await token('ended-6-days-ago', { expiresAt: future, revokedAt: daysAgo(6) });

  const removed = await api.app.get(SessionCleanup).run(NOW);

  expect(removed).toBe(2);
  expect(await remaining()).toEqual(['active', 'ended-6-days-ago']);
});
