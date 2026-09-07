import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_PROXY = {
  target: process.env.API_URL || 'http://127.0.0.1:3000',
  changeOrigin: false,
};

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // tsconfig paths are for the type checker only: the bundler needs its own
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  // The browser sees a single origin, so the igo session cookie is sent like
  // any same-origin cookie — no CORS, no credentials handling. In production
  // nginx plays this role.
  server: {
    port: 5173,
    proxy: { '/api': API_PROXY },
  },

  // `vite preview` does not inherit server.proxy: without this, a build served
  // for E2E tests would have no API behind it.
  preview: {
    proxy: { '/api': API_PROXY },
  },
});
