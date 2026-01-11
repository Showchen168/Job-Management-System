const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

const hasBrowser = fs.existsSync(chromium.executablePath());
test.skip(!hasBrowser, 'Playwright 瀏覽器未安裝');

test('登入頁面顯示並產生截圖', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testAuth=1');

  await expect(page.getByTestId('login-email')).toBeVisible();
  await expect(page.getByTestId('login-password')).toBeVisible();
  await expect(page.getByTestId('login-submit')).toBeVisible();

  fs.mkdirSync('tests/screenshots', { recursive: true });
  await page.screenshot({ path: 'tests/screenshots/login-page.png', fullPage: true });
});

test('測試模式登入成功畫面並產生截圖', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=showchen@aivres.com');

  await expect(page.getByTestId('app-shell')).toBeVisible();

  fs.mkdirSync('tests/screenshots', { recursive: true });
  await page.screenshot({ path: 'tests/screenshots/login-success.png', fullPage: true });
});
