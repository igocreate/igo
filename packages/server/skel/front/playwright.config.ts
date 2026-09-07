import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4173);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3000';
// Polled to know the API is up: any route it answers 2xx on will do.
const API_HEALTH_URL = process.env.E2E_API_HEALTH_URL ?? `${API_URL}/api/books`;

// The API lives in this repository, but only the project knows how to start
// it: `pnpm --filter ./back start`, `npm start --prefix ../api`, a docker
// compose… Set it here once, or leave it empty to test against an API that is
// already running.
const API_COMMAND = process.env.E2E_API_COMMAND ?? '';

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

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Two servers: the API of this project, and the built front that proxies
  // /api to it — the way nginx does in production.
  // --host binds 127.0.0.1 too, which vite does not do by default.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        ...(API_COMMAND
          ? [
              {
                command: API_COMMAND,
                url: API_HEALTH_URL,
                reuseExistingServer: !process.env.CI,
                timeout: 120_000,
              },
            ]
          : []),
        {
          command: `pnpm exec vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
});
