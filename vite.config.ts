/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import preact from '@preact/preset-vite';
import { contentPlugin } from './scripts/content-plugin.ts';
import { serviceWorker } from './pwa/service-worker.ts';

export default defineConfig({
  // Relative base so the build works at https://<user>.github.io/<repo>/ without hard-coding the repo name.
  base: './',
  plugins: [preact(), contentPlugin(), serviceWorker()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Parallel sessions keep git worktrees here; their tests are theirs to run.
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
