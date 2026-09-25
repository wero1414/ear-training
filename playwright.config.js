import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  timeout: 180_000,
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
