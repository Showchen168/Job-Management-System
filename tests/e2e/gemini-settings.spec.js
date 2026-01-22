import fs from 'fs';
import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const hasBrowser = fs.existsSync(chromium.executablePath());
test.skip(!hasBrowser, 'Playwright 瀏覽器未安裝');

test('系統設定可更新 Gemini API Key 並產生截圖', async ({ page }) => {
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL;
  test.skip(!testAdminEmail, '需要設定 TEST_ADMIN_EMAIL 以進入系統設定');

  await page.goto(`/index.html?testMode=1&testUserEmail=${encodeURIComponent(testAdminEmail)}`);

  await page.getByRole('button', { name: '系統設定' }).click();

  const section = page.getByTestId('gemini-settings');
  await expect(section).toBeVisible();

  await page.getByTestId('gemini-api-key-input').fill('test-gemini-key');
  await page.getByTestId('gemini-api-key-save-button').click();

  await expect(page.getByText('Gemini API Key 已更新')).toBeVisible();

  fs.mkdirSync('tests/screenshots', { recursive: true });
  await section.screenshot({ path: 'tests/screenshots/gemini-settings.jpg', type: 'jpeg', quality: 60 });
});
