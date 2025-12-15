const path = require('path');
const commonjs = require('vite-plugin-commonjs').default;

const production = process.env.NODE_ENV === 'production';

// Resolve @igojs/* packages to igo monorepo
const igoPath = path.resolve(__dirname, '../../../..');

// Plugin to trigger full reload on dust template changes
const dustReloadPlugin = () => ({
  name: 'dust-reload',
  handleHotUpdate({ file, server }) {
    if (file.endsWith('.dust')) {
      server.ws.send({ type: 'full-reload', path: '*' });
      return [];
    }
  }
});

// Vite config
const viteConfig = {
  root: process.cwd(),

  // Plugins
  plugins: [
    commonjs(),
    dustReloadPlugin()
  ],

  // Build configuration
  build: {
    manifest: 'manifest.json', // Generate manifest.json at root of dist
    sourcemap: true,

    rollupOptions: {
      input: {
        main: 'js/main.js'
      },
      output: {
        // Asset naming to match webpack pattern
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: '[name]-[hash].js',
        assetFileNames: '[name]-[hash][extname]'
      }
    },

    // Target modern browsers in production
    target: production ? 'es2015' : 'esnext',

    // Minification
    minify: production ? 'esbuild' : false
  },

  // Dev server configuration
  server: {
    middlewareMode: true, // Use as Express middleware
    watch: {
      // Watch dust templates and other files
      ignored: ['!**/views/**/*.dust', '!**/scss/**/*']
    }
  },

  // Resolve @igojs/* aliases
  resolve: {
    alias: {
      '@igojs/signal': path.join(igoPath, 'packages/signal'),
      '@igojs/dust': path.join(igoPath, 'packages/dust'),
      '@igojs/db': path.join(igoPath, 'packages/db'),
      '@igojs/server': path.join(igoPath, 'packages/server'),
    }
  },

  // CSS preprocessing
  css: {
    devSourcemap: true,
    preprocessorOptions: {
      scss: {
        quietDeps: true,
        silenceDeprecations: ['import']
      }
    }
  }
};

module.exports = viteConfig;
