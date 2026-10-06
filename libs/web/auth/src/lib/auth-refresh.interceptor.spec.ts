import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserDto } from '@boilerplate/contracts';
import { authRefreshInterceptor } from './auth-refresh.interceptor';
import { AuthStore } from './auth.store';

// The rules come from the interceptor's contract: an expired access token is
// refreshed once, the request is repeated, and a session that cannot be
// refreshed ends on /login.

const USER: UserDto = {
  id: '1',
  email: 'admin@example.com',
  permissions: ['users:read'],
  firstLoginAt: null,
};
const FRESH: UserDto = { ...USER, permissions: ['users:read', 'users:create'] };

const expired = { status: 'error', code: 'AUTH_UNAUTHENTICATED' };
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

let http: HttpClient;
let backend: HttpTestingController;
let store: InstanceType<typeof AuthStore>;
let router: Router;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideHttpClient(withInterceptors([authRefreshInterceptor])),
      provideHttpClientTesting(),
      provideRouter([]),
    ],
  });
  http = TestBed.inject(HttpClient);
  backend = TestBed.inject(HttpTestingController);
  store = TestBed.inject(AuthStore);
  router = TestBed.inject(Router);
  vi.spyOn(router, 'navigate').mockResolvedValue(true);
  store.setUser(USER);
});

afterEach(() => {
  backend.verify();
  TestBed.resetTestingModule();
});

function get(url: string): Promise<unknown> {
  return firstValueFrom(http.get(url));
}

function refreshSucceeds(): void {
  backend
    .expectOne('/api/auth/refresh')
    .flush({ status: 'success', code: 'OK', data: FRESH });
}

describe('authRefreshInterceptor', () => {
  it('refreshes an expired token, repeats the request and keeps the fresh user', async () => {
    const result = get('/api/users');
    backend.expectOne('/api/users').flush(expired, UNAUTHORIZED);
    refreshSucceeds();
    backend.expectOne('/api/users').flush(['the users']);

    expect(await result).toEqual(['the users']);
    expect(store.user()).toEqual(FRESH);
  });

  it('refreshes once for all requests that failed together', async () => {
    const results = Promise.all([get('/api/users'), get('/api/users/me')]);
    backend.expectOne('/api/users').flush(expired, UNAUTHORIZED);
    backend.expectOne('/api/users/me').flush(expired, UNAUTHORIZED);

    refreshSucceeds();
    backend.expectOne('/api/users').flush('list');
    backend.expectOne('/api/users/me').flush('me');

    expect(await results).toEqual(['list', 'me']);
  });

  it('ends the session on /login when the repeated request is refused too', async () => {
    const result = get('/api/users');
    backend.expectOne('/api/users').flush(expired, UNAUTHORIZED);
    backend
      .expectOne('/api/auth/refresh')
      .flush({ status: 'error', code: 'AUTH_REFRESH_REJECTED' }, UNAUTHORIZED);
    backend.expectOne('/api/users').flush(expired, UNAUTHORIZED);

    await expect(result).rejects.toMatchObject({ status: 401 });
    expect(store.user()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('repeats the request when the refresh fails, because another tab may have refreshed', async () => {
    const result = get('/api/users');
    backend.expectOne('/api/users').flush(expired, UNAUTHORIZED);
    backend
      .expectOne('/api/auth/refresh')
      .flush({ status: 'error', code: 'AUTH_REFRESH_REJECTED' }, UNAUTHORIZED);
    backend.expectOne('/api/users').flush('list');

    expect(await result).toBe('list');
    expect(store.user()).toEqual(USER);
  });

  it('passes other errors through without refreshing', async () => {
    const result = get('/api/users');
    backend
      .expectOne('/api/users')
      .flush(
        { status: 'error', code: 'AUTH_FORBIDDEN' },
        { status: 403, statusText: 'Forbidden' },
      );

    await expect(result).rejects.toMatchObject({ status: 403 });
    expect(store.user()).toEqual(USER);
  });

  it('never refreshes for the auth routes themselves', async () => {
    const result = firstValueFrom(http.post('/api/auth/logout', null));
    backend.expectOne('/api/auth/logout').flush(expired, UNAUTHORIZED);

    await expect(result).rejects.toMatchObject({ status: 401 });
  });
});
