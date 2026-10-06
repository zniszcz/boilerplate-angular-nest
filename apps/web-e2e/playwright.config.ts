import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Scenarios are the .feature files; playwright-bdd turns them into
// Playwright tests (`bddgen`). See docs/adr/0023-end-to-end-tests.md.
const testDir = defineBddConfig({
  features: 'features/*.feature',
  steps: 'steps/*.ts',
});

const CI = !!process.env['CI'];
// serve.mjs listens here; the port comes from the root .env.
const WEB = `http://127.0.0.1:${process.env['E2E_WEB_PORT']}`;

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: CI,
  // A test that passes only on a retry is flaky, and a flaky test fails the
  // run like any failing test. The retry is there to tell flaky from broken.
  retries: CI ? 1 : 0,
  failOnFlakyTests: CI,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: '../../reports/e2e/html' }],
    ['json', { outputFile: '../../reports/e2e/results.json' }],
  ],
  outputDir: '../../tmp/e2e-results',
  use: {
    baseURL: WEB,
    trace: 'on-first-retry',
  },
  // Mobile first: the main run is on a phone.
  projects: [{ name: 'phone', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'node serve.mjs',
    url: `${WEB}/api`,
    timeout: 120_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
  },
});
