import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import faroUploader from '@grafana/faro-rollup-plugin';

export default defineConfig(({ mode }) => {
  // vite.config.ts ne reçoit pas le .env dans process.env : loadEnv le lit
  // explicitement. Le troisième argument vide lève le filtre sur le préfixe
  // VITE_, sans quoi une clé qui ne sert qu'au build resterait invisible ici.
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };

  const API_PROXY = {
    target: env.API_URL || 'http://127.0.0.1:3000',
    changeOrigin: false,
  };

  // Les source maps ne sont téléversées que si la clé est fournie : un build
  // sans observabilité configurée reste possible, et la CI d'une contribution
  // externe n'a pas besoin du secret. Les quatre valeurs viennent de la page de
  // réglages de l'application Grafana.
  const faro =
    env.FARO_API_KEY && env.FARO_APP_ID && env.FARO_STACK_ID && env.FARO_UPLOAD_ENDPOINT
      ? faroUploader({
          appName: env.VITE_FARO_APP_NAME || '{project.name}',
          endpoint: env.FARO_UPLOAD_ENDPOINT,
          appId: env.FARO_APP_ID,
          stackId: env.FARO_STACK_ID,
          apiKey: env.FARO_API_KEY,
          gzipContents: true,
        })
      : null;

  return {
    plugins: [react(), tailwindcss(), ...(faro ? [faro] : [])],

    // Les chemins du tsconfig ne servent qu'au vérificateur de types : le
    // bundler a besoin des siens
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    build: {
      // Sans source maps, une pile d'appels dans Grafana désigne du code
      // minifié. `hidden` les produit sans que le bundle y renvoie : le
      // téléversement les donne à Grafana, le navigateur ne les télécharge
      // jamais.
      sourcemap: 'hidden',
    },

    // Le navigateur ne voit qu'une seule origine, donc le cookie de session
    // d'igo passe comme n'importe quel cookie de même origine — pas de CORS, pas
    // de gestion d'identifiants. En production, nginx joue ce rôle.
    server: {
      port: 5173,
      proxy: { '/api': API_PROXY },
    },

    // `vite preview` n'hérite pas de server.proxy : sans ceci, un build servi
    // pour les tests E2E n'aurait aucune API derrière lui.
    preview: {
      proxy: { '/api': API_PROXY },
    },
  };
});
