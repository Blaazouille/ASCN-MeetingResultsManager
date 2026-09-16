import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            // better-sqlite3 is CJS and resolves its native binding path via
            // `__dirname`. Bundling it inline into the ESM main-process
            // bundle strips that `__dirname` (nested CJS modules bundled
            // into an ES module don't get one), crashing `createDatabase()`
            // at startup. Keeping it external makes Node load it through
            // its own real CJS module system instead, where `__dirname`
            // works normally.
            rolldownOptions: {
              external: ['better-sqlite3'],
            },
          },
        },
      },
      preload: {
        input: path.join(import.meta.dirname, 'electron/preload.ts'),
        vite: {
          build: {
            outDir: 'dist-electron',
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
});
