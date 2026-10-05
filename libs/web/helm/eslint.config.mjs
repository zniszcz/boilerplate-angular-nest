import angular from 'angular-eslint';
import { defineConfig } from 'eslint/config';
import baseConfig from '../../../eslint.config.mjs';

// Entry points import each other by alias, such as @boilerplate/web-helm/utils,
// which the boundary rule allows only with allowCircularSelfDependency.
const [level, boundaries] = baseConfig.find(
  (config) => config.rules?.['@nx/enforce-module-boundaries'],
).rules['@nx/enforce-module-boundaries'];

// Same setup as libs/web/ui, with the spartan conventions: the `hlm` prefix
// and class names without a Component or Directive suffix.
export default defineConfig(
  baseConfig,
  {
    files: ['**/*.ts'],
    extends: [angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'hlm', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'hlm', style: 'kebab-case' },
      ],
      // spartan renames inputs, for example aria-label to ariaLabel.
      '@angular-eslint/no-input-rename': 'off',
      '@nx/enforce-module-boundaries': [
        level,
        { ...boundaries, allowCircularSelfDependency: true },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended],
  },
);
