import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 180_000,
  // Recorded snapshots live next to the tests; screenshots are per platform.
  snapshotPathTemplate: '{testDir}/__golden__/{arg}-{platform}{ext}',
  use: {
    baseURL: 'http://localhost:4173/ear-trainer/',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node test/serve.mjs',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
