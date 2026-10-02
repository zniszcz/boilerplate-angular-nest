import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthStore } from './auth.store';

/** Lets in only logged in users, sends others to /login. */
export const authGuard: CanActivateFn = () =>
  inject(AuthStore).isLoggedIn() || inject(Router).createUrlTree(['/login']);

/** Keeps logged in users away from /login. */
export const guestGuard: CanActivateFn = () =>
  !inject(AuthStore).isLoggedIn() || inject(Router).createUrlTree(['/']);
