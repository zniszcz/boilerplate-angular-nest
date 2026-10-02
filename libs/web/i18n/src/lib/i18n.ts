import { HttpClient, type HttpInterceptorFn } from '@angular/common/http';
import { inject, Injectable, isDevMode } from '@angular/core';
import {
  provideTransloco,
  type Translation,
  type TranslocoLoader,
  TranslocoService,
} from '@jsverse/transloco';

export const LANGUAGES = ['en', 'pl'] as const;
export const DEFAULT_LANGUAGE = 'en';
const STORAGE_KEY = 'language';

/** Loads public/i18n/<language>.json. */
@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(language: string) {
    return this.http.get<Translation>(`/i18n/${language}.json`);
  }
}

/** Sends the current language, so the API answers in it too. */
export const acceptLanguageInterceptor: HttpInterceptorFn = (request, next) =>
  next(
    request.clone({
      setHeaders: {
        'Accept-Language': inject(TranslocoService).getActiveLang(),
      },
    }),
  );

/** The language chosen earlier in this browser, or the default. */
export function savedLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && (LANGUAGES as readonly string[]).includes(saved)
      ? saved
      : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function saveLanguage(language: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Storage can be blocked, the choice then lasts until reload.
  }
}

/** Transloco with the app languages and the remembered choice. */
export function provideI18n() {
  return provideTransloco({
    config: {
      availableLangs: [...LANGUAGES],
      defaultLang: savedLanguage(),
      fallbackLang: DEFAULT_LANGUAGE,
      reRenderOnLangChange: true,
      prodMode: !isDevMode(),
    },
    loader: TranslationLoader,
  });
}
