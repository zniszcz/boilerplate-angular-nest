import playwright from 'eslint-plugin-playwright';
import globals from 'globals';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  { ignores: ['.features-gen'] },
  {
    files: ['serve.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['steps/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    // Steps are test blocks too: playwright-bdd runs them inside a test.
    settings: {
      playwright: { globalAliases: { test: ['Given', 'When', 'Then'] } },
    },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Given and When steps act; the Then steps assert.
      'playwright/expect-expect': 'off',
      // Sleeping hides a race instead of fixing it: a flaky test is a
      // failing test. See docs/adr/0021-testing-strategy.md.
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
    },
  },
];
