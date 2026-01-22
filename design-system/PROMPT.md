# AI 提示詞指南 Prompt Guide

> 自動同步自「工作紀錄中心」v3.0.0 - 最後更新: 2026-01-22

本文件提供在其他專案中引用此設計系統和功能模式的標準提示詞。

---

## 快速參考

### 新專案 (UI + 功能)
```
請使用以下設計系統建立新專案：
https://github.com/Showchen168/Job-Management-System/tree/main/design-system

參考檔案：
- starter-template/index.html (專案模板)
- DESIGN_SYSTEM.md (設計規範)
- PATTERNS.md (功能模式)
- components/ (元件庫)

需求：[描述你的需求]
```

### 僅 UI 改良
```
請參考以下設計系統統一我的專案 UI 風格：
https://github.com/Showchen168/Job-Management-System/tree/main/design-system

重點：
- 色彩：blue-600 主色、emerald-600 成功、red-600 錯誤
- 卡片：rounded-xl shadow-sm border border-slate-200
- 按鈕：rounded-lg font-medium transition
- 文字：標題 slate-800、內文 slate-600

只改 UI，保持功能不變。
```

---

## 功能模組提示詞

### 身份驗證
```
請參考 PATTERNS.md 實作登入功能：
- Firebase Auth (Email/Password)
- 登入/註冊/忘記密碼
- 錯誤訊息中文化
```

### 權限管理
```
請參考 PATTERNS.md 實作權限系統：
- 三級權限：Admin > Editor > User
- Firestore 儲存權限清單
- UI 根據權限顯示/隱藏功能
```

### 團隊管理
```
請參考 PATTERNS.md 實作團隊功能：
- 團隊 CRUD
- 多組長支援
- 組長可查看組員資料
```

### AI 整合
```
請參考 PATTERNS.md 實作 AI 功能：
- Gemini API 呼叫
- 支援文字和圖片
- AI 對話介面
```

---

## 目前可用資源

### 元件庫 (32 個源元件)
- AuthPage
- Badge
- Button
- Card
- CardWithHeader
- ConfirmModal
- Content
- Dashboard
- FilterBar
- Grid
- ... 等共 32 個

### 功能模式
- 身份驗證: 4 項
- 權限管理: 2 項
- 團隊管理: 0 項
- AI 整合: 0 項
- 通用工具: 1 項

---

## 相關文件

| 文件 | 說明 |
|------|------|
| README.md | 設計系統總覽 |
| DESIGN_SYSTEM.md | 完整設計規範 |
| PATTERNS.md | 功能模式文件 |
| PROMPT.md | 本文件 |
| components/ | 元件庫 |
| starter-template/ | 專案模板 |

---

*由 sync-design-system.js 自動生成*
