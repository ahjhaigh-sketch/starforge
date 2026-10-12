import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * The one-file build: the whole game in a single .html that runs by double-click, with no server
 * (npm run single). Everything is inlined: one script (no code splitting), the styles, fonts and
 * images as data. There is no service worker: a file on disk is already offline.
 */
const root = fileURLToPath(new URL('../..', import.meta.url));
const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  root,
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [react()],
  resolve: { alias: { 'virtual:pwa-register': fileURLToPath(new URL('./pwa-stub.ts', import.meta.url)) } },
  build: {
    target: 'es2022',
    outDir: 'dist-single',
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 10_000,
    modulePreload: false,
    rolldownOptions: { output: { inlineDynamicImports: true } },
  },
});
