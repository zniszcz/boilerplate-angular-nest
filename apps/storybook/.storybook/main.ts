import type { StorybookConfig } from '@storybook/angular';

/**
 * Collects the stories that sit next to the components in the web UI
 * libraries: atoms in libs/web/helm, the rest in libs/web/ui.
 */
const config: StorybookConfig = {
  stories: ['../../../libs/web/**/*.stories.ts'],
  framework: { name: '@storybook/angular', options: {} },
  // The app's translation files, loaded by the Transloco loader in preview.ts.
  staticDirs: [{ from: '../../web/public/i18n', to: '/i18n' }],
};

export default config;
