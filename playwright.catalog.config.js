import { defineConfig } from '@playwright/test'

// Frontend contract tests: API is intercepted; no database or real account is touched.
export default defineConfig({
  testDir: './e2e', testMatch: 'catalog-remote.spec.js', workers: 1,
  reporter: 'list', outputDir: 'test-results/catalog-remote',
  use: { baseURL: 'http://127.0.0.1:5184', channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5184 --strictPort', url: 'http://127.0.0.1:5184', reuseExistingServer: false },
})
