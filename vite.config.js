import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rolldownOptions: {
      // One entry per page, so each page only bundles what it imports.
      // Add each new page here.
      input: { main: 'index.html', compiler: 'compiler/index.html' },
    },
  },
});
