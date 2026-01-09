const { test, expect } = require('@playwright/test');

test('顯示郵件通知設定區塊', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=showchen@aivres.com');

  await page.getByRole('button', { name: '系統設定' }).click();

  const section = page.getByTestId('notification-settings');
  await expect(section).toBeVisible();
  await expect(page.getByTestId('notification-enabled')).toBeVisible();
  await expect(page.getByTestId('notification-time-input')).toHaveValue('09:00');
  await expect(page.getByTestId('notification-save-button')).toBeVisible();
});
