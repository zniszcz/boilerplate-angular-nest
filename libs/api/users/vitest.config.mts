import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // A JSON report next to the usual output, for tools that read results,
    // such as the tdd-check skill. Absolute, like globalSetup in apps/api.
    reporters: ['default', 'json'],
    outputFile: {
      json: `${import.meta.dirname}/../../../reports/vitest/api-users.json`,
    },
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
