import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  type ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTransloco } from '@jsverse/transloco';
import { AuthStore, unauthorizedInterceptor } from '@boilerplate/web-auth';
import { appRoutes } from './app.routes';
import {
  acceptLanguageInterceptor,
  DEFAULT_LANGUAGE,
  LANGUAGES,
  savedLanguage,
  TranslationLoader,
} from './i18n';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes),
    provideHttpClient(
      withInterceptors([acceptLanguageInterceptor, unauthorizedInterceptor]),
    ),
    provideTransloco({
      config: {
        availableLangs: [...LANGUAGES],
        defaultLang: savedLanguage(),
        fallbackLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslationLoader,
    }),
    // Routes are guarded by the logged in state, so it is known first.
    provideAppInitializer(() => inject(AuthStore).loadMe()),
  ],
};
