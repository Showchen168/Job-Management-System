# Job-Management-System AGENTS.md

> Creator: Show  
> Updated: 2026-04-09

## 回覆規則

- 一律使用繁體中文（台灣用語）。
- 以淺顯方式說明，不要堆太多專業術語。
- 除非使用者明確要求，否則不要直接部署到 NAS。

## 開發規則

- 開始處理專案前，先啟用 Serena 專案並使用 Serena 語義工具找資料。
- 查文件時優先用 Context7。
- 驗證畫面時固定用 Chrome DevTools。
- 功能修改遵循 TDD，先補測試，再改程式，再驗證。

## 專案基本資訊

- 專案類型：React 19 + Vite 前端專案。
- GitHub：`https://github.com/Showchen168/Job-Management-System.git`
- 建置指令：`npm run build`
- 輸出目錄：`dist/`
- 本機開發：`npm run dev`
- 本機預覽：`npm run preview`
- Playwright 預覽網址：`http://127.0.0.1:4173`

## NAS 部署資訊

### 已知資訊

- 這個專案目前是 **Vite 靜態網站輸出**，NAS 端至少需要能提供 `dist/` 內容的靜態站點服務。
- `vite.config.js` 目前設定 `base: '/Job-Management-System/'`。
- 這代表 NAS 上如果要正常開站，網址路徑必須保留 `/Job-Management-System/` 這個子路徑。
- 如果要改成網域根目錄 `/` 開站，必須先調整 `vite.config.js` 的 `base`，再重新 build。
- Firebase 設定來自 `.env`，部署時 NAS 端需要帶上同一組 `VITE_FIREBASE_*` 與 `VITE_ROOT_ADMINS`。
- 這個 repo 目前 **沒有** 專案內建的 NAS Docker Compose、cloudflared、反向代理設定檔。
- 代表 NAS 上的容器、站點路徑、反向代理、網域綁定，現在是由 repo 外部環境管理，不在本 repo 內。

### 部署前檢查

- 先確認使用者有明確同意部署。
- 若要部署到 NAS，必須使用 `nas-deploy` 技能，不可自行猜測流程。
- 先執行 `npm run build`，確認 `dist/` 已更新。
- 確認 NAS 端站點實際掛載的是最新 `dist/`。
- 確認部署後網址包含 `/Job-Management-System/`，否則靜態資源路徑可能會錯。

### 待補資訊

下面這些資訊目前 repo 內查不到，若之後確認了，請補在這裡：

- NAS 主機 IP / 主機名稱
- NAS 專案實際部署路徑
- 使用的 Web Server / Docker 容器名稱
- 對外正式網址
- cloudflared / 反向代理設定位置

## 建議驗證流程

1. `npm run build`
2. `npx vite preview`
3. 用 Chrome DevTools 檢查主要頁面
4. 跑需要的 Playwright 測試
5. 若使用者同意，再走 NAS 部署流程
