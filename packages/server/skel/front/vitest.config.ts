import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

// Vitest 5 no longer accepts a `test` key in vite's defineConfig: the test
// setup lives in its own file and reuses the app config.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      // e2e/ belongs to Playwright: vitest would otherwise pick its specs up
      // and fail on an import it cannot resolve.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  }),
);
