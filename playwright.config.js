import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 180_000,
  // Recorded snapshots live next to the tests; screenshots are per platform.
  snapshotPathTemplate: '{testDir}/__golden__/{arg}-{platform}{ext}',
  use: {
    baseURL: 'http://localhost:4173/ear-training/',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'main', testIgnore: /jam-timing/ },
    // Measures frame timing, so it runs alone after everything else: CPU contention
    // from parallel workers delays animation frames and would read as drift.
    { name: 'timing', testMatch: /jam-timing/, dependencies: ['main'], fullyParallel: false },
  ],
  webServer: {
    command: 'node test/serve.mjs',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
