import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Two servers: the API, and the built front that proxies /api to it — the
  // way nginx does in production. Playwright starts both and stops them after.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          // in CI the build is what ships, so that is what gets tested;
          // locally, tsx watch avoids a rebuild on every run
          command: process.env.CI ? 'pnpm --filter ../api serve' : 'pnpm --filter ../api start',
          // polled to know the API is up: any route it answers 2xx on will do
          url: `${API_URL}/api/books`,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
        {
          // --host binds 127.0.0.1 too: vite listens on localhost (IPv6) by
          // default, which the url below would never reach.
          command: `pnpm --filter ../front exec vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
});
