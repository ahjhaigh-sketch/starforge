import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BASE_PATH is set by the GitHub Pages workflow ("/starforge/"); local builds, itch.io and Tauri use "./".
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
    // libraries in their own chunks: they change rarely, so browsers keep them cached between game updates
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'pixi', test: /node_modules[\\/](pixi\.js|@pixi)[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|zustand)[\\/]/ },
            { name: 'libs', test: /node_modules[\\/](break_eternity\.js|zod|fflate)[\\/]/ },
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
