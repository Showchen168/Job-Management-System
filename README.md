# Job Management System

工作紀錄中心 - 任務管理與會議記錄系統

## 技術棧

- **前端框架**: React 18 + Vite
- **樣式**: TailwindCSS
- **後端**: Firebase (Firestore + Auth)
- **AI 功能**: Google Gemini API
- **測試**: Playwright

## 開發指令

```bash
# 安裝依賴
npm install

# 開發伺服器
npm run dev

# 生產構建
npm run build

# 預覽生產版本
npm run preview

# 執行測試
npm run test:e2e
```

## 專案結構

```
├── src/
│   ├── components/     # UI 元件
│   ├── pages/          # 頁面元件
│   ├── hooks/          # 自訂 hooks
│   ├── utils/          # 工具函數
│   ├── App.jsx         # 主應用
│   ├── main.jsx        # 入口點
│   └── index.css       # 全域樣式
├── tests/              # Playwright 測試
├── design-system/      # 設計系統文檔
├── index.html          # HTML 入口
├── vite.config.js      # Vite 設定
├── tailwind.config.js  # TailwindCSS 設定
└── package.json        # 依賴管理
```

## 版本

- v3.0.0 - 重構版本 (Vite + React + TailwindCSS)
- v2.8.4 - 舊版 (單一 HTML 檔案)

## 作者

Created by Show
