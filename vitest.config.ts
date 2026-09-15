import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Deliberately separate from vite.config.ts: the app's Vite config loads
 * vite-plugin-electron-renderer to polyfill Node builtins for the browser
 * renderer bundle, which breaks real `node:fs` access needed by these tests
 * (they read fixtures straight off disk).
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
