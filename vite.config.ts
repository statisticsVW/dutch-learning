/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { contentPlugin } from './scripts/content-plugin.ts';

export default defineConfig({
  // Relative base so the build works at https://<user>.github.io/<repo>/ without hard-coding the repo name.
  base: './',
  plugins: [preact(), contentPlugin()],
  test: {
    environment: 'jsdom',
  },
});
