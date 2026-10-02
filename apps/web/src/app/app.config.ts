import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { AuthStore, authRefreshInterceptor } from '@boilerplate/web-auth';
import { acceptLanguageInterceptor, provideI18n } from '@boilerplate/web-i18n';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([acceptLanguageInterceptor, authRefreshInterceptor]),
    ),
    provideI18n(),
    // Routes are guarded by the logged in state, so it is known first.
    provideAppInitializer(() => inject(AuthStore).loadMe()),
  ],
};
