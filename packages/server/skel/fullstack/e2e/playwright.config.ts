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

  // Deux serveurs : l'API, et le front construit qui lui proxifie /api — comme
  // nginx le fait en production. Playwright démarre les deux et les arrête
  // ensuite.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          // en CI, c'est le build qui part en production, donc c'est lui qu'on
          // teste ; en local, tsx watch évite une reconstruction à chaque essai
          command: process.env.CI ? 'pnpm --filter ../api serve' : 'pnpm --filter ../api start',
          // interrogée pour savoir si l'API répond : n'importe quelle route sur
          // laquelle elle rend un 2xx convient
          url: `${API_URL}/api/books`,
          reuseExistingServer: !process.env.CI,
          timeout: 10_000,
        },
        {
          // --host écoute aussi sur 127.0.0.1 : vite écoute par défaut sur
          // localhost (IPv6), que l'url ci-dessous n'atteindrait jamais.
          command: `pnpm --filter ../front exec vite preview --port ${PORT} --strictPort --host 127.0.0.1`,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 10_000,
        },
      ],
});
