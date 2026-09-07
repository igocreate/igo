import { defineConfig, devices } from '@playwright/test';

const PORT     = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
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

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  // Serves the built front and proxies /api to the back, the way nginx does in
  // production — so the tests exercise the real single-origin setup.
  webServer: process.env.E2E_BASE_URL ? undefined : {
    // --host binds 127.0.0.1 too: vite listens on localhost (IPv6) by default,
    // which the url below would never reach.
    command: `pnpm --filter ./front exec vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
