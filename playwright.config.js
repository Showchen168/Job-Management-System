const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true
  },
  webServer: {
    command: 'python -m http.server 4173',
    port: 4173,
    reuseExistingServer: true,
    timeout: 120000
  }
});
