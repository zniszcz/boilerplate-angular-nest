import { defineConfig } from 'vitest/config';

// Unit tests of frontend logic without templates, such as interceptors and
// stores. Components are not unit tested; Storybook and E2E show them. See
// docs/adr/0021-testing-strategy.md.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'jsdom',
    setupFiles: ['../../../tools/vitest/angular-setup.ts'],
  },
});
