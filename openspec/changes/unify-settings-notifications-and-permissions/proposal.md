## Why

目前系統的設定頁風格和其他主頁不一致，通知中心也還缺少「全部已讀」這種常用操作，權限管理則只有基礎團隊與角色判斷，還沒有像參考系統那樣把「角色」和「可存取頁面 / 可執行功能」拆開管理。這會讓管理者操作不直覺，也限制後續系統擴充。

## What Changes

- 統一設定頁的篩選區、操作列與表單區塊風格，和目前待辦、問題、會議、團隊看板的標準工具列一致。
- 擴充通知中心，新增「全部標記已讀」等進階操作，讓通知整理更有效率。
- 導入角色權限管理模型，參考 ContractHub 的做法，把「使用者角色管理」與「角色權限設定」拆開。
- 讓權限可以控制頁面存取與功能操作，不再只靠 Admin / Editor / Leader 的固定判斷。
- 將現有導航、頁面顯示與操作按鈕逐步接上新的權限判斷邏輯。

## Capabilities

### New Capabilities
- `settings-ui-consistency`: 統一定義設定頁工具列、篩選列、表單區塊與操作區的標準風格與互動。
- `notification-center-advanced-actions`: 定義通知中心的批次已讀、未讀摘要與操作回饋行為。
- `role-based-permissions-management`: 定義角色、頁面存取、功能操作與使用者角色指派的權限管理能力。

### Modified Capabilities

- 無

## Impact

- 受影響前端頁面：
  - `src/components/SettingsPage.jsx`
  - `src/components/Notifications/*`
  - `src/App.jsx`
  - `src/hooks/useTeamAccess.js`
  - 既有各頁按鈕與導航顯示邏輯
- 受影響資料模型：
  - 使用者角色資料
  - 角色權限定義資料
  - 通知已讀摘要資料
- 需要補上對應的單元測試與 Chrome 驗證流程
