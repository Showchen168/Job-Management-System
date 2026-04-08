const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

const hasBrowser = fs.existsSync(chromium.executablePath());
const appUrl = process.env.E2E_APP_URL || 'http://127.0.0.1:5173/Job-Management-System';
test.skip(!hasBrowser, 'Playwright 瀏覽器未安裝');

test('登入頁維持原始單卡結構，只做風格轉換', async ({ page }) => {
  await page.goto(`${appUrl}/?testMode=1&testAuth=1`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('auth-card')).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId('auth-hero')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '工作紀錄中心' })).toBeVisible();
  await expect(page.getByText('請登入以存取您的工作資料')).toBeVisible();
  await expect(page.getByText('Workspace')).toHaveCount(0);
  await expect(page.getByText('登入工作空間')).toHaveCount(0);
});

test('主看板顯示新版工作總覽區', async ({ page }) => {
  await page.goto(`${appUrl}/?testMode=1&testUserEmail=showchen@aivres.com`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('app-shell')).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId('workspace-shell')).toBeVisible();
  await expect(page.getByTestId('dashboard-intro')).toHaveCount(0);
  await expect(page.getByText('Workspace')).toHaveCount(0);
  await expect(page.getByText('把任務、問題與會議集中在同一個工作區。')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '數據看板' })).toBeVisible();
});

test('待辦、會議、問題頁不顯示新增的工作區標題區', async ({ page }) => {
  await page.goto(`${appUrl}/?testMode=1&testUserEmail=showchen@aivres.com`, { waitUntil: 'domcontentloaded' });

  await page.getByRole('button', { name: '待辦事項' }).click();
  await expect(page.getByTestId('tasks-intro')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '工作待辦事項' })).toBeVisible();

  await page.getByRole('button', { name: '會議記錄' }).click();
  await expect(page.getByTestId('meetings-intro')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '會議記錄工具' })).toBeVisible();

  await page.getByRole('button', { name: '問題管理' }).click();
  await expect(page.getByTestId('issues-intro')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '問題管理' })).toBeVisible();
});

test('手機版使用漢堡選單並可切換到待辦頁', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${appUrl}/?testMode=1&testUserEmail=showchen@aivres.com`, { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('mobile-menu-button')).toBeVisible();
  await expect(page.getByTestId('mobile-sidebar-overlay')).toHaveCount(0);
  const sidebarBox = await page.locator('aside').boundingBox();
  expect(sidebarBox).not.toBeNull();
  expect(sidebarBox.x + sidebarBox.width).toBeLessThanOrEqual(1);

  await page.getByTestId('mobile-menu-button').click();
  await expect(page.getByTestId('mobile-sidebar-overlay')).toBeVisible();

  await page.getByRole('button', { name: '待辦事項' }).click();
  await expect(page.getByRole('heading', { name: '工作待辦事項' })).toBeVisible();
  await expect(page.getByTestId('mobile-sidebar-overlay')).toHaveCount(0);
});
