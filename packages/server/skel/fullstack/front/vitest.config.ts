import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

// Vitest 5 n'accepte plus de clé `test` dans le defineConfig de vite : la
// configuration des tests vit dans son propre fichier et réutilise celle de
// l'application.
//
// vite.config.ts est une fonction depuis qu'il lit le .env : on la résout ici en
// mode test, ce qui laisse au passage le téléversement des source maps
// désactivé pendant les tests.
export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      // e2e/ appartient à Playwright : sans ceci, vitest ramasserait ses specs
      // et échouerait sur un import qu'il ne sait pas résoudre.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  }),
);
