import type { Route } from '@angular/router';
import { authGuard, guestGuard, LoginPage } from '@boilerplate/web-auth';

// Pages are lazy chunks, preloaded in the background after start
// (app.config.ts), so moving between pages never waits for the network. The
// login page is the exception: web-auth is needed at start for its guards and
// store anyway, so a lazy import would save nothing.
export const appRoutes: Route[] = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@boilerplate/web-home').then((m) => m.HomePage),
  },
  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@boilerplate/web-users').then((m) => m.UsersPage),
  },
  {
    path: 'account',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@boilerplate/web-account').then((m) => m.AccountPage),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: LoginPage,
  },
  {
    path: '**',
    loadComponent: () =>
      import('@boilerplate/web-errors').then((m) => m.NotFoundPage),
  },
];
