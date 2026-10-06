import { randomInt } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { hashPassword } from '@boilerplate/api-access';
import { seedUsers } from '@boilerplate/api-users';
import { AppModule } from '../src/app/app.module';
import { configureApp } from '../src/app/configure-app';

export const ADMIN = { email: 'admin@example.com', password: 'admin-password' };

export interface TestApi {
  app: INestApplication;
  db: DataSource;
  /**
   * A new browser: keeps its own cookies and comes from its own address, so
   * the login limit of one test never blocks another.
   */
  browser(): Browser;
  close(): Promise<void>;
}

export type Browser = ReturnType<typeof request.agent>;

/** The whole API as main.ts builds it, on this test file's database. */
export async function startApi(): Promise<TestApi> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  const db = app.get(DataSource);
  await seedUsers(db, ADMIN);
  return {
    app,
    db,
    browser: () =>
      request
        .agent(app.getHttpServer())
        .set('CF-Connecting-IP', randomAddress()),
    close: () => app.close(),
  };
}

/** A user with no permissions, for routes that require one. */
export async function createUserWithoutPermissions(
  db: DataSource,
  email: string,
  password: string,
): Promise<void> {
  await db.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)', [
    email,
    await hashPassword(password),
  ]);
}

export async function login(
  browser: Browser,
  account: { email: string; password: string } = ADMIN,
): Promise<void> {
  await browser.post('/api/auth/login').send(account).expect(200);
}

/** The refresh token cookie as the browser holds it, `name=value`. */
export function refreshCookie(response: request.Response): string {
  const cookie = cookies(response).find((c) => c.startsWith('refresh_token='));
  if (!cookie) {
    throw new Error('No refresh_token cookie in the response');
  }
  return cookie.split(';')[0];
}

export function cookies(response: request.Response): string[] {
  const header = response.headers['set-cookie'] as unknown;
  return Array.isArray(header) ? (header as string[]) : [];
}

function randomAddress(): string {
  return `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
}
