import { fileURLToPath, URL } from 'node:url';

import { defineConfig, loadEnv } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import faroUploader from '@grafana/faro-rollup-plugin';

// La politique de sécurité de contenu vit ici, avec le code dont elle dépend :
// une police, un CDN ou une API tierce ajoutés au front s'ajoutent à cette
// liste, et la console le dit dès `pnpm dev`. Ce qu'une balise <meta> ne peut
// pas porter — frame-ancestors, HSTS — revient à nginx.
const contentSecurityPolicy = (dev: boolean, faroUrl?: string) => {
  const faro = faroUrl ? ` ${new URL(faroUrl).origin}` : '';
  // en développement, Vite injecte le préambule React et les styles en ligne,
  // et HMR parle en WebSocket
  const inline = dev ? " 'unsafe-inline'" : '';
  return [
    "default-src 'self'",
    `script-src 'self'${inline}`,
    `style-src 'self'${inline}`,
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${faro}${dev ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
};

const csp = (dev: boolean, faroUrl?: string): Plugin => ({
  name: 'content-security-policy',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: contentSecurityPolicy(dev, faroUrl),
      },
      injectTo: 'head-prepend',
    },
  ],
});

export default defineConfig(({ mode, command }) => {
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
  //
  // Le plugin injecte un `bundleId` aléatoire : deux machines qui construisent
  // chacune le front servent deux bundles différents, et une page de l'une peut
  // réclamer un fichier que l'autre n'a pas. Le fixer dès que le front est
  // construit à plusieurs endroits.
  const faro =
    env.FARO_API_KEY && env.FARO_APP_ID && env.FARO_STACK_ID && env.FARO_UPLOAD_ENDPOINT
      ? faroUploader({
          appName: env.VITE_APP_NAME || '{project.name}-front',
          endpoint: env.FARO_UPLOAD_ENDPOINT,
          appId: env.FARO_APP_ID,
          stackId: env.FARO_STACK_ID,
          apiKey: env.FARO_API_KEY,
          gzipContents: true,
        })
      : null;

  return {
    plugins: [
      react(),
      tailwindcss(),
      csp(command === 'serve', env.VITE_FARO_URL),
      ...(faro ? [faro] : []),
    ],

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
