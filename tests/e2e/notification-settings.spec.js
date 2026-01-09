const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

const hasBrowser = fs.existsSync(chromium.executablePath());
test.skip(!hasBrowser, 'Playwright 瀏覽器未安裝');

test('顯示郵件通知設定區塊', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=showchen@aivres.com');

  await page.getByRole('button', { name: '系統設定' }).click();

  const section = page.getByTestId('notification-settings');
  await expect(section).toBeVisible();
  await expect(page.getByTestId('notification-enabled')).toBeVisible();
  await expect(page.getByTestId('notification-time-input')).toHaveValue('09:00');
  await expect(page.getByTestId('notification-save-button')).toBeVisible();
});

test('負責人欄位顯示已註冊使用者下拉選單', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=showchen@aivres.com&testAssignees=alice,bob');

  await page.getByRole('button', { name: '新增' }).click();

  const assigneeInput = page.getByTestId('assignee-input');
  await expect(assigneeInput).toBeVisible();
  await expect(page.locator('datalist#assignee-options option')).toHaveCount(2);
});
