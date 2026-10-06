import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ADMIN, cookies, refreshCookie, startApi, type TestApi } from './api';

let api: TestApi;

beforeAll(async () => {
  api = await startApi();
});

afterAll(() => api.close());

/** Presents a refresh token from a browser that holds nothing else. */
function refreshWith(cookie: string) {
  return api.browser().post('/api/auth/refresh').set('Cookie', cookie);
}

async function loginAndKeepToken(): Promise<string> {
  const response = await api
    .browser()
    .post('/api/auth/login')
    .send(ADMIN)
    .expect(200);
  return refreshCookie(response);
}

describe('login', () => {
  it('returns the account and sets both tokens as httpOnly cookies', async () => {
    const response = await api
      .browser()
      .post('/api/auth/login')
      .send(ADMIN)
      .expect(200);

    expect(response.body).toEqual({
      status: 'success',
      code: 'OK',
      data: {
        id: expect.any(String),
        email: ADMIN.email,
        permissions: expect.arrayContaining(['users:read']),
      },
    });
    const set = cookies(response);
    expect(set).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^access_token=.+HttpOnly.+SameSite=Strict/),
        expect.stringMatching(
          /^refresh_token=.+Path=\/api\/auth.+HttpOnly.+SameSite=Strict/,
        ),
      ]),
    );
  });

  it('refuses a wrong password and an unknown email with the same code', async () => {
    const wrongPassword = await api
      .browser()
      .post('/api/auth/login')
      .send({ email: ADMIN.email, password: 'wrong' })
      .expect(401);
    const unknownEmail = await api
      .browser()
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: ADMIN.password })
      .expect(401);

    expect(wrongPassword.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(cookies(wrongPassword)).toEqual([]);
  });

  it('names each invalid field with its own code', async () => {
    const response = await api
      .browser()
      .post('/api/auth/login')
      .send({ email: 'not-an-email', role: 'admin' })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        { field: 'email', code: 'INVALID_EMAIL' },
        { field: 'password', code: 'REQUIRED' },
        { field: 'role', code: 'UNKNOWN_FIELD' },
      ]),
    );
  });

  it('blocks an address for 15 minutes after 5 attempts, even with the right password', async () => {
    const browser = api.browser();
    for (let attempt = 0; attempt < 5; attempt++) {
      await browser
        .post('/api/auth/login')
        .send({ email: ADMIN.email, password: 'wrong' })
        .expect(401);
    }

    const blocked = await browser
      .post('/api/auth/login')
      .send(ADMIN)
      .expect(429);

    expect(blocked.body).toMatchObject({
      code: 'AUTH_TOO_MANY_ATTEMPTS',
      params: { retryAfter: 900 },
    });
    await api.browser().post('/api/auth/login').send(ADMIN).expect(200);
  });
});

describe('refresh', () => {
  it('exchanges the token for a new one that works in turn', async () => {
    const first = await loginAndKeepToken();

    const second = refreshCookie(await refreshWith(first).expect(200));

    expect(second).not.toBe(first);
    await refreshWith(second).expect(200);
  });

  it('refuses a request without a token and clears both cookies', async () => {
    const response = await api.browser().post('/api/auth/refresh').expect(401);

    expect(response.body.code).toBe('AUTH_REFRESH_REJECTED');
    expect(cookies(response)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^access_token=;/),
        expect.stringMatching(/^refresh_token=;/),
      ]),
    );
  });

  it('refuses a token that is not in the issued format', async () => {
    await refreshWith('refresh_token=not-a-token').expect(401);
  });

  it('refuses a token with a wrong secret', async () => {
    const token = await loginAndKeepToken();
    const forged = token.replace(/\.[^.]+$/, '.forged-secret');

    await refreshWith(forged).expect(401);
    await refreshWith(token).expect(200);
  });

  it('ends the whole session when a used token comes back later, as after a theft', async () => {
    const stolen = await loginAndKeepToken();
    const current = refreshCookie(await refreshWith(stolen).expect(200));
    // The thief comes back after the grace time for racing tabs.
    await api.db.query(
      "UPDATE refresh_tokens SET used_at = used_at - interval '1 minute'",
    );

    await refreshWith(stolen).expect(401);

    await refreshWith(current).expect(401);
  });

  it('lets two tabs refresh at once without ending the session', async () => {
    const shared = await loginAndKeepToken();

    // Both requests must reach the database write together, which a fast
    // machine would not do on its own. A lock on the token holds them there.
    const [a, b] = await whileTokensLocked(() =>
      Promise.all([refreshWith(shared), refreshWith(shared)]),
    );

    expect([a.status, b.status].sort()).toEqual([200, 401]);
    const winner = a.status === 200 ? a : b;
    await refreshWith(refreshCookie(winner)).expect(200);
  });
});

/**
 * Locks every refresh token, starts `requests`, waits until two of them wait
 * for the lock, and releases it.
 */
async function whileTokensLocked<T>(requests: () => Promise<T>): Promise<T> {
  const runner = api.db.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  await runner.query('SELECT id FROM refresh_tokens FOR UPDATE');
  const pending = requests();
  await waitFor(async () => {
    const [{ count }] = await api.db.query(
      "SELECT count(*)::int AS count FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND datname = current_database()",
    );
    return count >= 2;
  });
  await runner.commitTransaction();
  await runner.release();
  return pending;
}

async function waitFor(condition: () => Promise<boolean>): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('The condition was not met within 2 seconds');
}

describe('logout', () => {
  it('ends the session on the server, not only in the browser', async () => {
    const browser = api.browser();
    const token = refreshCookie(
      await browser.post('/api/auth/login').send(ADMIN).expect(200),
    );

    await browser.post('/api/auth/logout').expect(200);

    // The browser dropped its cookies, so present the token by hand, as a
    // copy of it would be after a theft.
    await refreshWith(token).expect(401);
  });
});
