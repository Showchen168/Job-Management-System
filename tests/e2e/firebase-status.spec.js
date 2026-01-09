const { test, expect } = require('@playwright/test');

test('顯示 Firebase 連線狀態並允許測試模式登入', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=playwright@example.com');

  await expect(page.getByRole('heading', { name: '工作紀錄中心' })).toBeVisible();
  const status = page.getByTestId('firebase-status');
  await expect(status).toContainText('Firebase 連線狀態');
  await expect(status).toContainText('測試模式');
});
