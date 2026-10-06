import { fileURLToPath } from 'node:url';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

// API tests: the whole app over HTTP against a real PostgreSQL in a
// container. They need Docker. See docs/adr/0021-testing-strategy.md.
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // SWC, because Nest needs decorator metadata, which esbuild does not emit.
  plugins: [swc.vite({ module: { type: 'es6' } })],
  resolve: {
    tsconfigPaths: true,
    alias: [
      {
        find: /^\.\/migrations$/,
        replacement: here('./test/migrations.ts'),
      },
    ],
  },
  test: {
    // A JSON report next to the usual output, for tools that read results,
    // such as the tdd-check skill. Absolute, like globalSetup in apps/api.
    reporters: ['default', 'json'],
    outputFile: {
      json: `${import.meta.dirname}/../../reports/vitest/api.json`,
    },
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    // Absolute, so Stryker can run the tests from the repository root.
    globalSetup: [here('./test/global-setup.ts')],
    setupFiles: [here('./test/database.ts')],
    hookTimeout: 120_000,
  },
});
