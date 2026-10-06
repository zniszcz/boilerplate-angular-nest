import { defineConfig, mergeConfig } from 'vitest/config';
import api from './apps/api/vitest.config.mts';

// Every backend test in one run, for Stryker only: a mutant in the domain
// must be caught by unit tests and API tests alike. One project, not
// `test.projects`, because Stryker's per-test coverage misses tests in
// projects. Nx runs each project's own vitest.config.mts instead.
export default mergeConfig(
  api,
  defineConfig({
    root: import.meta.dirname,
    test: {
      include: ['libs/api/*/src/**/*.spec.ts', 'apps/api/test/**/*.spec.ts'],
    },
  }),
  false,
);
