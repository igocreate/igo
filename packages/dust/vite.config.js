import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  plugins: [
    commonjs(),
    nodeResolve({ browser: true }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'index.js'),
      name: 'IgoDust',
      fileName: () => `igo-dust-${pkg.version}-min.js`,
      formats: ['iife'],
    },
    outDir: 'dist',
    minify: 'terser',
    rollupOptions: {
      output: {
        extend: true,
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      fs: resolve(__dirname, 'src/fs/stub.js'),
      path: resolve(__dirname, 'src/fs/stub.js'),
    },
  },
});
