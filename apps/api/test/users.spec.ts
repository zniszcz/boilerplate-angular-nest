import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ADMIN,
  createUserWithoutPermissions,
  login,
  startApi,
  type TestApi,
} from './api';

let api: TestApi;

beforeAll(async () => {
  api = await startApi();
  await createUserWithoutPermissions(api.db, 'reader@example.com', 'reader');
});

afterAll(() => api.close());

describe('access to routes', () => {
  it('refuses a request without a token', async () => {
    const response = await api.browser().get('/api/users/me').expect(401);

    expect(response.body).toEqual({
      status: 'error',
      code: 'AUTH_UNAUTHENTICATED',
    });
  });

  it('refuses a forged access token', async () => {
    await api
      .browser()
      .get('/api/users/me')
      .set('Cookie', 'access_token=forged.jwt.value')
      .expect(401);
  });

  it('shows the logged in user', async () => {
    const browser = api.browser();
    await login(browser);

    const response = await browser.get('/api/users/me').expect(200);

    expect(response.body.data).toMatchObject({ email: ADMIN.email });
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  it('refuses a route to a user who lacks its permission', async () => {
    const browser = api.browser();
    await login(browser, { email: 'reader@example.com', password: 'reader' });

    const response = await browser.get('/api/users').expect(403);

    expect(response.body.code).toBe('AUTH_FORBIDDEN');
  });

  it('opens the route to a user with the permission', async () => {
    const browser = api.browser();
    await login(browser);

    const response = await browser.get('/api/users').expect(200);

    expect(response.body.data.map((u: { email: string }) => u.email)).toEqual(
      expect.arrayContaining([ADMIN.email, 'reader@example.com']),
    );
  });

  it('answers an unknown path with its own code', async () => {
    const response = await api.browser().get('/api/no-such-route').expect(404);

    expect(response.body.code).toBe('ROUTE_NOT_FOUND');
  });
});
