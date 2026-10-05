import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import {
  PreloadAllModules,
  provideRouter,
  withPreloading,
} from '@angular/router';
import { AuthStore, authRefreshInterceptor } from '@boilerplate/web-auth';
import { provideSpartanHlm } from '@boilerplate/web-helm/utils';
import { acceptLanguageInterceptor, provideI18n } from '@boilerplate/web-i18n';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withPreloading(PreloadAllModules)),
    provideHttpClient(
      withInterceptors([acceptLanguageInterceptor, authRefreshInterceptor]),
    ),
    provideI18n(),
    provideSpartanHlm(),
    // Routes are guarded by the logged in state, so it is known first.
    provideAppInitializer(() => inject(AuthStore).loadMe()),
  ],
};
