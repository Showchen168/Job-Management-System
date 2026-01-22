import fs from 'fs';
import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const hasBrowser = fs.existsSync(chromium.executablePath());
test.skip(!hasBrowser, 'Playwright 瀏覽器未安裝');

test('顯示 Firebase 連線狀態並允許測試模式登入', async ({ page }) => {
  // 檢測 CDN 連線是否可用
  let cdnBlocked = false;
  page.on('console', msg => {
    if (msg.text().includes('ERR_TUNNEL_CONNECTION_FAILED') || msg.text().includes('net::ERR_')) {
      cdnBlocked = true;
    }
  });

  await page.goto('/index.html?testMode=1&testUserEmail=playwright@example.com', { waitUntil: 'domcontentloaded' });

  // 等待一段時間檢測網路狀態
  await page.waitForTimeout(3000);
  test.skip(cdnBlocked, 'CDN 無法連線（測試環境網路受限）');

  // 等待 React 應用程式完全載入（CDN 腳本需要時間）
  await expect(page.getByRole('heading', { name: '工作紀錄中心' })).toBeVisible({ timeout: 60000 });
  const status = page.getByTestId('firebase-status');
  await expect(status).toContainText('Firebase 連線狀態');
  await expect(status).toContainText('測試模式');
});
