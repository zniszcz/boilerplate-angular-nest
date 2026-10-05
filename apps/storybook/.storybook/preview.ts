import { Injectable } from '@angular/core';
import {
  provideTransloco,
  type Translation,
  type TranslocoLoader,
} from '@jsverse/transloco';
import { applicationConfig, type Preview } from '@storybook/angular';
import { provideSpartanHlm } from '@boilerplate/web-helm/utils';

/**
 * Loads the app's real texts, served from apps/web/public/i18n by staticDirs
 * in main.ts. A relative URL, so it also works under /storybook/.
 */
@Injectable({ providedIn: 'root' })
class StaticLoader implements TranslocoLoader {
  async getTranslation(lang: string): Promise<Translation> {
    return (await fetch(`i18n/${lang}.json`)).json();
  }
}

/** Widths of the Tailwind breakpoints, with a phone first. */
const VIEWPORTS = {
  phone: {
    name: 'Phone',
    styles: { width: '375px', height: '740px' },
    type: 'mobile',
  },
  sm: { name: 'sm (640px)', styles: { width: '640px', height: '900px' } },
  md: { name: 'md (768px)', styles: { width: '768px', height: '1000px' } },
  desktop: {
    name: 'Desktop',
    styles: { width: '1280px', height: '900px' },
    type: 'desktop',
  },
};

/** Phone first: every story opens at phone width. */
const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        provideSpartanHlm(),
        // The real texts, so stories show what the app shows.
        provideTransloco({
          config: { availableLangs: ['en', 'pl'], defaultLang: 'en' },
          loader: StaticLoader,
        }),
      ],
    }),
  ],
  parameters: {
    viewport: { options: VIEWPORTS },
    layout: 'padded',
  },
  initialGlobals: {
    viewport: { value: 'phone', isRotated: false },
  },
};

export default preview;
