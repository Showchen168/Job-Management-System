import fs from 'fs';
import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const hasBrowser = fs.existsSync(chromium.executablePath());
test.skip(!hasBrowser, 'Playwright 瀏覽器未安裝');

test('顯示郵件通知設定區塊', async ({ page }) => {
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL;
  test.skip(!testAdminEmail, '需要設定 TEST_ADMIN_EMAIL 以進入系統設定');

  await page.goto(`/index.html?testMode=1&testUserEmail=${encodeURIComponent(testAdminEmail)}`);

  await page.getByRole('button', { name: '系統設定' }).click();

  const section = page.getByTestId('notification-settings');
  await expect(section).toBeVisible();
  await expect(page.locator('[data-testid="notification-time-input"]')).toHaveCount(0);
  await expect(page.locator('[data-testid^="notification-weekday-"]')).toHaveCount(0);
  await expect(page.locator('[data-testid="notification-save-button"]')).toHaveCount(0);
  await expect(page.getByTestId('notification-manual-trigger')).toBeVisible();
  await expect(page.getByTestId('notification-manual-trigger-button')).toBeVisible();
  await expect(page.getByRole('heading', { name: '發送 On-going 通知' })).toBeVisible();

  fs.mkdirSync('tests/screenshots', { recursive: true });
  await section.screenshot({ path: 'tests/screenshots/notification-settings.jpg', type: 'jpeg', quality: 60 });
  await page.getByTestId('notification-manual-trigger').screenshot({ path: 'tests/screenshots/notification-manual-trigger.jpg', type: 'jpeg', quality: 60 });
});

test('負責人欄位顯示已註冊使用者下拉選單', async ({ page }) => {
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL;
  test.skip(!testAdminEmail, '需要設定 TEST_ADMIN_EMAIL 以進入系統設定');

  await page.goto(`/index.html?testMode=1&testUserEmail=${encodeURIComponent(testAdminEmail)}&testAssignees=alice,bob`);

  await page.getByRole('button', { name: '新增' }).click();

  const assigneeInput = page.getByTestId('assignee-input');
  await expect(assigneeInput).toBeVisible();
  await expect(page.locator('datalist#assignee-options option')).toHaveCount(2);
});

test('手動發送通知需先完成 EmailJS 設定', async ({ page }) => {
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL;
  test.skip(!testAdminEmail, '需要設定 TEST_ADMIN_EMAIL 以進入系統設定');

  await page.goto(`/index.html?testMode=1&testUserEmail=${encodeURIComponent(testAdminEmail)}`);

  await page.getByRole('button', { name: '系統設定' }).click();

  await expect(page.getByTestId('emailjs-service-id')).toBeVisible();
  await expect(page.getByTestId('emailjs-template-id')).toBeVisible();
  await expect(page.getByTestId('emailjs-public-key')).toBeVisible();

  await page.getByTestId('notification-manual-trigger-button').click();

  await expect(page.getByText('請先完成 EmailJS 服務設定')).toBeVisible();
});

test('已註冊使用者列表標題顯示', async ({ page }) => {
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL;
  test.skip(!testAdminEmail, '需要設定 TEST_ADMIN_EMAIL 以進入系統設定');

  await page.goto(`/index.html?testMode=1&testUserEmail=${encodeURIComponent(testAdminEmail)}`);

  await page.getByRole('button', { name: '系統設定' }).click();

  const userRegistry = page.getByTestId('registered-users');
  await expect(userRegistry).toBeVisible();
  await expect(userRegistry.getByRole('columnheader', { name: '使用者' })).toBeVisible();

  fs.mkdirSync('tests/screenshots', { recursive: true });
  await userRegistry.screenshot({ path: 'tests/screenshots/registered-users-table.jpg', type: 'jpeg', quality: 60 });
});
