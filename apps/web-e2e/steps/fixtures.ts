import { randomInt, randomUUID } from 'node:crypto';
import { test as base, createBdd } from 'playwright-bdd';
import type { APIRequestContext } from '@playwright/test';

export const ADMIN = { email: 'admin@example.com', password: 'admin' };

export interface Account {
  email: string;
  password: string;
}

/** A browser address of its own, so the login limit never spans scenarios. */
function randomAddress(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}

/** Options for one more browser in a scenario, such as a second user's. */
export function newBrowser() {
  return { extraHTTPHeaders: { 'CF-Connecting-IP': randomAddress() } };
}

export const test = base.extend<{
  /** Users of this scenario by the name the scenario gives them. */
  accounts: Map<string, Account>;
  /** Calls the API as the admin, to set up what a scenario takes as given. */
  adminApi: APIRequestContext;
  /** The account logged in last in this scenario. */
  me: { current: Account | null };
}>({
  accounts: async ({}, use) => use(new Map()),
  me: async ({}, use) => use({ current: null }),
  context: async ({ context }, use) => {
    await context.setExtraHTTPHeaders(newBrowser().extraHTTPHeaders);
    await use(context);
  },
  adminApi: async ({ playwright, baseURL }, use) => {
    const api = await playwright.request.newContext({
      baseURL,
      ...newBrowser(),
    });
    const login = await api.post('/api/auth/login', { data: ADMIN });
    if (!login.ok()) {
      throw new Error(`Admin login failed: ${login.status()}`);
    }
    await use(api);
    await api.dispose();
  },
});

/** Scenarios run in parallel on one database, so emails must not repeat. */
export function uniqueEmail(name: string): string {
  return `${name}-${randomUUID().slice(0, 8)}@example.com`;
}

export const { Given, When, Then } = createBdd(test);
