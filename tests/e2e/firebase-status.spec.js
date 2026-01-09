const { test, expect } = require('@playwright/test');

test('顯示 Firebase 連線狀態並允許測試模式登入', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=playwright@example.com');

  await expect(page.getByRole('heading', { name: '工作紀錄中心' })).toBeVisible();
  const status = page.getByTestId('firebase-status');
  await expect(status).toContainText('Firebase 連線狀態');
  await expect(status).toContainText('測試模式');
});

test('繁簡轉換 UI 可切換並更新結果', async ({ page }) => {
  await page.goto('/index.html?testMode=1&testUserEmail=playwright@example.com');

  const modeSelect = page.getByTestId('text-conversion-mode');
  const input = page.getByTestId('text-conversion-input');
  const output = page.getByTestId('text-conversion-output');

  await expect(modeSelect).toBeVisible();
  await input.fill('測試繁體台灣後');
  await expect(output).toHaveText('测试繁体台湾后');

  await modeSelect.selectOption('s2t');
  await input.fill('测试繁体台湾后');
  await expect(output).toHaveText('測試繁體臺灣後');
});
