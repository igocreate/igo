const commonjs = require('vite-plugin-commonjs').default;

const production = process.env.NODE_ENV === 'production';

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

    // Target modern browsers - es2017+ to preserve async/await
    target: 'es2017',

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
