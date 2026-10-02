import {
  HttpErrorResponse,
  type HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth.store';

/** When the session expires, any 401 sends the user back to /login. */
export const unauthorizedInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        store.isLoggedIn()
      ) {
        store.clear();
        void router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
