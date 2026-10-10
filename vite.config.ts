import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// BASE_PATH is set by the GitHub Pages workflow ("/starforge/"); local builds, itch.io and Tauri use "./".
export default defineConfig({
  base: process.env.BASE_PATH ?? './',
  plugins: [react()],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
