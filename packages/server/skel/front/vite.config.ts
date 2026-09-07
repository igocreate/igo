import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // tsconfig paths are for the type checker only: the bundler needs its own
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  server: {
    port: 5173,
    proxy: {
      // The browser sees a single origin, so the igo session cookie is sent
      // like any same-origin cookie — no CORS, no credentials handling.
      '/api': {
        target: process.env.API_URL || 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
});
