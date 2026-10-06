import { expect, type Page } from '@playwright/test';
import {
  ADMIN,
  type Account,
  Given,
  newBrowser,
  Then,
  uniqueEmail,
  When,
} from './fixtures';

// Steps find elements the way a user does: by role and visible text, never
// by CSS classes. Assertions wait on their own; no fixed waits.

async function logIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
}

function account(accounts: Map<string, Account>, name: string): Account {
  const found = accounts.get(name);
  if (!found) {
    throw new Error(`The scenario has not added "${name}" yet`);
  }
  return found;
}

function loggedIn(current: Account | null): Account {
  if (!current) {
    throw new Error('Nobody is logged in in this scenario');
  }
  return current;
}

async function userRow(page: Page, email: string) {
  await page.goto('/users');
  return page.getByRole('listitem').filter({ hasText: email });
}

Given('I am logged in as the admin', async ({ page, me }) => {
  await logIn(page, ADMIN.email, ADMIN.password);
  await expect(page.getByText(`Logged in as ${ADMIN.email}`)).toBeVisible();
  me.current = ADMIN;
});

When('I log in as the admin', async ({ page, me }) => {
  await logIn(page, ADMIN.email, ADMIN.password);
  me.current = ADMIN;
});

When(
  'I log in as {string} with the password {string}',
  async ({ page }, email: string, password: string) => {
    await logIn(page, email, password);
  },
);

Given(
  'the admin has added the user {string}',
  async ({ adminApi, accounts }, name: string) => {
    const email = uniqueEmail(name);
    const response = await adminApi.post('/api/users', { data: { email } });
    expect(response.status()).toBe(201);
    const { data } = await response.json();
    accounts.set(name, { email, password: data.password });
  },
);

When('I add the user {string}', async ({ page, accounts }, name: string) => {
  const email = uniqueEmail(name);
  await page.getByRole('link', { name: 'Users' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Add user' }).click();
  // A test id, because the password has no role or label of its own.
  const password = await page.getByTestId('new-password').textContent();
  accounts.set(name, { email, password: (password ?? '').trim() });
});

Then(
  'I see the password of {string} once',
  async ({ page, accounts }, name: string) => {
    const { email, password } = account(accounts, name);
    const status = page.getByRole('status');
    await expect(status).toContainText(`Account ${email} created`);
    await expect(status).toContainText(password);
    expect(password).toMatch(/^\S{16,}$/);
    await page.reload();
    await expect(page.getByText(password)).toHaveCount(0);
  },
);

When(
  '{string} logs in with that password',
  async ({ page, accounts, me }, name: string) => {
    const user = account(accounts, name);
    await logIn(page, user.email, user.password);
    await expect(page.getByText(`Logged in as ${user.email}`)).toBeVisible();
    me.current = user;
  },
);

When(
  '{string} logs in with that password on another device',
  async ({ browser, accounts }, name: string) => {
    const user = account(accounts, name);
    const context = await browser.newContext(newBrowser());
    const other = await context.newPage();
    await logIn(other, user.email, user.password);
    await expect(other.getByText(`Logged in as ${user.email}`)).toBeVisible();
    await context.close();
  },
);

Then(
  '{string} is marked as never logged in',
  async ({ page, accounts }, name: string) => {
    const row = await userRow(page, account(accounts, name).email);
    await expect(row).toContainText('Never logged in');
  },
);

Then(
  '{string} is marked as active',
  async ({ page, accounts }, name: string) => {
    const row = await userRow(page, account(accounts, name).email);
    await expect(row).toContainText('Active');
  },
);

Then('there is no link to the users page', async ({ page }) => {
  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
});

Then('I am on the home page as {string}', async ({ page }, email: string) => {
  await expect(page).toHaveURL('/');
  await expect(page.getByText(`Logged in as ${email}`)).toBeVisible();
});

When('I log out', async ({ page }) => {
  await page.getByRole('button', { name: 'Log out' }).click();
});

Then('I see the login form', async ({ page }) => {
  await expect(page).toHaveURL('/login');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});

Then('I see the error {string}', async ({ page }, text: string) => {
  await expect(page.getByRole('alert')).toHaveText(text);
});

async function deleteAccount(page: Page, password: string) {
  await page.getByRole('link', { name: 'Account' }).click();
  await page.getByLabel('Current password').fill(password);
  await page.getByRole('button', { name: 'Delete account' }).click();
}

When('I delete my account with my password', async ({ page, me }) => {
  await deleteAccount(page, loggedIn(me.current).password);
});

When(
  'I delete my account with the password {string}',
  async ({ page }, password: string) => {
    await deleteAccount(page, password);
  },
);

Then(
  '{string} can no longer log in',
  async ({ page, accounts }, name: string) => {
    const { email, password } = account(accounts, name);
    await logIn(page, email, password);
    await expect(page.getByRole('alert')).toHaveText(
      'Invalid email or password',
    );
  },
);
