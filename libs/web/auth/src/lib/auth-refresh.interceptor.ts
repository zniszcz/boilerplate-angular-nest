import {
  HttpErrorResponse,
  type HttpEvent,
  type HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  errorCode,
  type SuccessEnvelope,
  type UserDto,
} from '@boilerplate/contracts';
import {
  catchError,
  filter,
  finalize,
  map,
  type Observable,
  of,
  shareReplay,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { AuthStore } from './auth.store';

/** One refresh at a time, shared by every request that got a 401. */
let refreshing: Observable<UserDto | null> | null = null;

/**
 * On AUTH_UNAUTHENTICATED the access token has expired: exchange the refresh token for new
 * ones, then repeat the request once. When that fails too, the session is
 * over and the user goes to /login.
 */
export const authRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url.startsWith('/api/auth/')) {
    return next(request);
  }
  const store = inject(AuthStore);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!isUnauthorized(error)) {
        return throwError(() => error);
      }
      refreshing ??= next(
        new HttpRequest('POST', '/api/auth/refresh', null),
      ).pipe(
        filter(
          (event): event is HttpResponse<SuccessEnvelope<UserDto>> =>
            event instanceof HttpResponse,
        ),
        map((response) => response.body?.data ?? null),
        finalize(() => (refreshing = null)),
        shareReplay(1),
      );
      return refreshing.pipe(
        tap((user) => user && store.setUser(user)),
        // Another tab may have refreshed first. Its new cookies are already
        // here, so the request is repeated anyway.
        catchError(() => of(null)),
        switchMap((): Observable<HttpEvent<unknown>> => next(request)),
        catchError((retryError: unknown) => {
          if (isUnauthorized(retryError) && store.isLoggedIn()) {
            store.clear();
            void router.navigate(['/login']);
          }
          return throwError(() => retryError);
        }),
      );
    }),
  );
};

function isUnauthorized(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    errorCode(error.error) === 'AUTH_UNAUTHENTICATED'
  );
}
