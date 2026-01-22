import fs from 'fs';
import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

const hasBrowser = fs.existsSync(chromium.executablePath());
test.skip(!hasBrowser, 'Playwright 瀏覽器未安裝');

test('權限輸入欄位自動補上預設網域並產生截圖', async ({ page }) => {
  const testAdminEmail = process.env.TEST_ADMIN_EMAIL;
  test.skip(!testAdminEmail, '需要設定 TEST_ADMIN_EMAIL 以進入系統設定');

  await page.goto(`/index.html?testMode=1&testUserEmail=${encodeURIComponent(testAdminEmail)}`);

  await page.getByRole('button', { name: '系統設定' }).click();

  const adminSection = page.getByTestId('admin-permission-section');
  await expect(adminSection).toBeVisible();

  const adminInput = page.getByTestId('admin-email-input');
  await adminInput.fill('mona');
  await adminInput.press('Tab');
  await expect(adminInput).toHaveValue('mona@aivres.com');

  const editorSection = page.getByTestId('editor-permission-section');
  await expect(editorSection).toBeVisible();

  const editorInput = page.getByTestId('editor-email-input');
  await editorInput.fill('leo');
  await editorInput.press('Tab');
  await expect(editorInput).toHaveValue('leo@aivres.com');

  fs.mkdirSync('tests/screenshots', { recursive: true });
  await adminSection.screenshot({ path: 'tests/screenshots/admin-permission-default-domain.jpg', type: 'jpeg', quality: 60 });
  await editorSection.screenshot({ path: 'tests/screenshots/editor-permission-default-domain.jpg', type: 'jpeg', quality: 60 });
});
