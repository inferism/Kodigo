import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'test',
  testMatch: '*.spec.js',
  // CheerpJ's first download can take 15 to 36 seconds or more (see docs/ARCHITECTURE.md), and some runs stall.
  timeout: 120_000,
  retries: 1,
  workers: 1,
  reporter: 'list',
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  // Tests the production build, because that's what ships.
  webServer: {
    command: 'npm run build && npx vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174/compiler/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
