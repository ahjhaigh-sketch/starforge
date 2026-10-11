import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// BASE_PATH is set by the GitHub Pages workflow ("/starforge/"); local builds, itch.io and Tauri use "./".
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    react(),
    // The installable app: every file is precached, so the game plays offline. A new version waits
    // until the player chooses to update (src/app/pwa.ts saves first, then reloads).
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Starforge',
        short_name: 'Starforge',
        description: 'A space-fantasy incremental game: tap a dying star back to life, then forge it through six reset layers.',
        lang: 'en',
        theme_color: '#140B2E',
        background_color: '#0B0520',
        display: 'standalone',
        orientation: 'any',
        categories: ['games'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    // libraries in their own chunks: they change rarely, so browsers keep them cached between game updates
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'pixi', test: /node_modules[\/](pixi\.js|@pixi)[\/]/ },
            { name: 'react', test: /node_modules[\/](react|react-dom|scheduler|zustand)[\/]/ },
            { name: 'libs', test: /node_modules[\/](break_eternity\.js|zod|fflate)[\/]/ },
          ],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // several tests play hours of game time in 50 ms ticks; CI machines are a few times slower
    testTimeout: 30_000,
  },
});
