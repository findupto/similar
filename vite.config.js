import { defineConfig } from 'vite';

export default defineConfig({
  // Electron loads the production build from file://, so assets must use
  // relative URLs instead of absolute /assets/... URLs.
  base: './'
});
