import js from '@eslint/js';
import nx from '@nx/eslint-plugin';
import prettier from 'eslint-config-prettier';
import rxjsX from 'eslint-plugin-rxjs-x';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/dist', '**/out-tsc', '**/.angular', '**/.nx'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.js', '**/*.mjs', '**/*.cjs'],
    plugins: { '@nx': nx },
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [{ sourceTag: '*', onlyDependOnLibsWithTags: ['*'] }],
        },
      ],
    },
  },
  // A subscribe() whose subscription is dropped never ends and leaks memory.
  // Use toSignal, the async pipe or takeUntilDestroyed() instead.
  {
    files: ['**/*.ts'],
    plugins: { 'rxjs-x': rxjsX },
    languageOptions: {
      parserOptions: { projectService: true },
    },
    rules: {
      'rxjs-x/no-ignored-subscription': 'error',
    },
  },
  // Must stay last: turns off every rule that would conflict with Prettier.
  prettier,
);
