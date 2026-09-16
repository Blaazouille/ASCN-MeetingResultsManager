import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Deliberately separate from vite.config.ts: the app's Vite config loads
 * vite-plugin-electron, which spawns the Electron main/preload build and
 * an Electron process during `vite dev` — unwanted overhead for a test run
 * that just needs Node's `fs` to read fixtures straight off disk.
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
