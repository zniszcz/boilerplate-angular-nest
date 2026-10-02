import type { Route } from '@angular/router';
import { authGuard, guestGuard, LoginPage } from '@boilerplate/web-auth';
import { HomePage } from './home/home-page';

export const appRoutes: Route[] = [
  { path: '', component: HomePage, canActivate: [authGuard] },
  { path: 'login', component: LoginPage, canActivate: [guestGuard] },
  { path: '**', redirectTo: '' },
];
