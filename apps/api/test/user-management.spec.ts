// Adding users and deleting one's own account. Each test names the rule of
// the specification it checks.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ADMIN,
  cookies,
  createUserWithoutPermissions,
  login,
  refreshCookie,
  startApi,
  type TestApi,
} from './api';

let api: TestApi;

beforeAll(async () => {
  api = await startApi();
  await createUserWithoutPermissions(api.db, 'reader@example.com', 'reader');
});

afterAll(() => api.close());

async function asAdmin() {
  const browser = api.browser();
  await login(browser);
  return browser;
}

async function createUser(email: string) {
  const response = await (
    await asAdmin()
  )
    .post('/api/users')
    .send({ email })
    .expect(201);
  return response.body.data as {
    user: { id: string; email: string; permissions: string[] };
    password: string;
  };
}

async function listedUser(email: string) {
  const response = await (await asAdmin()).get('/api/users').expect(200);
  return (
    response.body.data as { email: string; firstLoginAt: string | null }[]
  ).find((user) => user.email === email);
}

describe('adding a user', () => {
  it('rule 1: creates an account without permissions and shows its generated password once', async () => {
    const created = await createUser('new@example.com');

    expect(created.user).toMatchObject({
      email: 'new@example.com',
      permissions: [],
    });
    expect(created.password).toEqual(expect.any(String));
    expect(created.password.length).toBeGreaterThanOrEqual(16);
    const listed = await (await asAdmin()).get('/api/users').expect(200);
    expect(JSON.stringify(listed.body)).not.toContain(created.password);
  });

  it('rule 1: generates a different password for each account', async () => {
    const first = await createUser('first@example.com');
    const second = await createUser('second@example.com');

    expect(first.password).not.toBe(second.password);
  });

  it('rule 2: the new user logs in with the generated password', async () => {
    const created = await createUser('fresh@example.com');

    await login(api.browser(), {
      email: 'fresh@example.com',
      password: created.password,
    });
  });

  it('rule 3: refuses a user without users:create', async () => {
    const browser = api.browser();
    await login(browser, { email: 'reader@example.com', password: 'reader' });

    const response = await browser
      .post('/api/users')
      .send({ email: 'other@example.com' })
      .expect(403);

    expect(response.body.code).toBe('AUTH_FORBIDDEN');
  });

  it('rule 4: stores the email in lower case and logs in with any case', async () => {
    const created = await createUser('Mixed.Case@Example.COM');

    expect(created.user.email).toBe('mixed.case@example.com');
    await login(api.browser(), {
      email: 'MIXED.case@example.com',
      password: created.password,
    });
  });

  it('rule 5: refuses an email that exists, whatever its case', async () => {
    await createUser('taken@example.com');

    const response = await (
      await asAdmin()
    )
      .post('/api/users')
      .send({ email: 'TAKEN@example.com' })
      .expect(409);

    expect(response.body.code).toBe('USERS_EMAIL_TAKEN');
  });

  it('rule 6: refuses an invalid email with a field code', async () => {
    const response = await (
      await asAdmin()
    )
      .post('/api/users')
      .send({ email: 'not-an-email' })
      .expect(400);

    expect(response.body.details).toEqual([
      { field: 'email', code: 'INVALID_EMAIL' },
    ]);
  });
});

describe('first login', () => {
  it('rules 7 and 8: a new account is inactive until it logs in for the first time', async () => {
    const created = await createUser('first-login@example.com');
    expect((await listedUser('first-login@example.com'))?.firstLoginAt).toBe(
      null,
    );

    await login(api.browser(), {
      email: 'first-login@example.com',
      password: created.password,
    });
    const first = (await listedUser('first-login@example.com'))?.firstLoginAt;
    expect(first).toEqual(expect.any(String));

    await login(api.browser(), {
      email: 'first-login@example.com',
      password: created.password,
    });
    expect((await listedUser('first-login@example.com'))?.firstLoginAt).toBe(
      first,
    );
  });

  it('rule 7: a failed login does not count', async () => {
    await createUser('failed-login@example.com');

    await api
      .browser()
      .post('/api/auth/login')
      .send({ email: 'failed-login@example.com', password: 'wrong' })
      .expect(401);

    expect((await listedUser('failed-login@example.com'))?.firstLoginAt).toBe(
      null,
    );
  });
});

describe('deleting the own account', () => {
  async function loggedInAs(email: string) {
    const { password } = await createUser(email);
    const browser = api.browser();
    const response = await browser
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return { browser, password, token: refreshCookie(response) };
  }

  it('rules 9 and 10: deletes the account with the password and ends its sessions', async () => {
    const { browser, password, token } = await loggedInAs(
      'leaving@example.com',
    );

    const response = await browser
      .delete('/api/users/me')
      .send({ password })
      .expect(200);

    expect(cookies(response)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^access_token=;/),
        expect.stringMatching(/^refresh_token=;/),
      ]),
    );
    await api
      .browser()
      .post('/api/auth/refresh')
      .set('Cookie', token)
      .expect(401);
    await api
      .browser()
      .post('/api/auth/login')
      .send({ email: 'leaving@example.com', password })
      .expect(401);
    expect(await listedUser('leaving@example.com')).toBeUndefined();
  });

  it('rule 11: keeps the account when the password is wrong', async () => {
    const { browser } = await loggedInAs('careful@example.com');

    const response = await browser
      .delete('/api/users/me')
      .send({ password: 'wrong' })
      .expect(403);

    expect(response.body.code).toBe('USERS_WRONG_PASSWORD');
    expect(await listedUser('careful@example.com')).toBeDefined();
  });

  it('rule 12: there is no route to delete another account', async () => {
    const { user } = await createUser('target@example.com');
    const browser = await asAdmin();

    await browser
      .delete(`/api/users/${user.id}`)
      .send({ password: ADMIN.password })
      .expect(404);

    expect(await listedUser('target@example.com')).toBeDefined();
  });

  it('rule 13: the last user with users:create cannot delete the account', async () => {
    const browser = await asAdmin();

    const response = await browser
      .delete('/api/users/me')
      .send({ password: ADMIN.password })
      .expect(409);

    expect(response.body.code).toBe('USERS_LAST_ADMIN');
    expect(await listedUser(ADMIN.email)).toBeDefined();
  });

  it('rule 13: an admin can leave while another admin remains', async () => {
    await api.db.query(
      `INSERT INTO user_permissions (user_id, permission_code)
       SELECT id, 'users:create' FROM users WHERE email = 'reader@example.com'`,
    );
    const browser = await asAdmin();

    await browser
      .delete('/api/users/me')
      .send({ password: ADMIN.password })
      .expect(200);
  });
});
