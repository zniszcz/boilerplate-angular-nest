import { defineConfig } from 'vitest/config';

// Unit tests of frontend logic without templates, such as interceptors and
// stores. Components are not unit tested; Storybook and E2E show them. See
// docs/adr/0021-testing-strategy.md.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // A JSON report next to the usual output, for tools that read results,
    // such as the tdd-check skill. Absolute, like globalSetup in apps/api.
    reporters: ['default', 'json'],
    outputFile: {
      json: `${import.meta.dirname}/../../../reports/vitest/web-auth.json`,
    },
    include: ['src/**/*.spec.ts'],
    environment: 'jsdom',
    setupFiles: ['../../../tools/vitest/angular-setup.ts'],
  },
});
