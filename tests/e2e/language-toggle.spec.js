const fs = require('fs');
const { test, expect, chromium } = require('@playwright/test');

const isChromiumAvailable = fs.existsSync(chromium.executablePath());

test.skip(!isChromiumAvailable, 'Playwright 瀏覽器未安裝，略過 E2E 測試');

test('切換全頁繁簡轉換', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=playwright@example.com');

  await expect(page.getByRole('heading', { name: '工作紀錄中心' })).toBeVisible();

  await page.getByTestId('language-toggle-simplified').click();
  await expect(page.getByRole('heading', { name: '工作纪录中心' })).toBeVisible();

  await page.getByTestId('language-toggle-traditional').click();
  await expect(page.getByRole('heading', { name: '工作紀錄中心' })).toBeVisible();
});
