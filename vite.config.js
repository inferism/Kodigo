import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      // One entry per page, so each page only bundles what it imports.
      // The compiler page adds `compiler: 'compiler/index.html'` here when it exists.
      input: { main: 'index.html' },
    },
  },
});
