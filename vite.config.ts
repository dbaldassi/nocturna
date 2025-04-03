import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [
    createHtmlPlugin({
      minify: true,
      inject: {
        injectTo: 'head',
        tags: [
          {
            tag: 'script',
            attrs: {
              src: 'https://cdn.babylonjs.com/babylon.js',
            },
          },
          {
            tag: 'script',
            attrs: {
              src: 'https://cdn.havok.com/havok.js',
            },
          },
        ],
      },
    }),
  ],
});