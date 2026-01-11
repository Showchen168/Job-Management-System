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
  await expect(page.getByTestId('notification-weekday-mon')).toBeChecked();
  await expect(page.getByTestId('notification-save-button')).toBeVisible();

  fs.mkdirSync('tests/screenshots', { recursive: true });
  await section.screenshot({ path: 'tests/screenshots/notification-weekdays.png' });
});

test('負責人欄位顯示已註冊使用者下拉選單', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=showchen@aivres.com&testAssignees=alice,bob');

  await page.getByRole('button', { name: '新增' }).click();

  const assigneeInput = page.getByTestId('assignee-input');
  await expect(assigneeInput).toBeVisible();
  await expect(page.locator('datalist#assignee-options option')).toHaveCount(2);
});

test('測試通知需先完成 EmailJS 設定', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=showchen@aivres.com');

  await page.getByRole('button', { name: '系統設定' }).click();

  await expect(page.getByTestId('emailjs-service-id')).toBeVisible();
  await expect(page.getByTestId('emailjs-template-id')).toBeVisible();
  await expect(page.getByTestId('emailjs-public-key')).toBeVisible();

  await page.getByTestId('notification-test-email').fill('alice@example.com');
  await page.getByTestId('notification-test-button').click();

  const modal = page.getByTestId('notification-test-modal');
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('請先完成 EmailJS 服務設定');
});
