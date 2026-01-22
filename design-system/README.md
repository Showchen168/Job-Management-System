# 設計系統 Design System

> 自動同步自「工作紀錄中心」v3.0.0 - 最後更新: 2026-01-22

## 目錄結構

```
design-system/
├── README.md              # 本說明文件
├── DESIGN_SYSTEM.md       # 完整設計規範
├── components/            # 可重用元件庫
│   ├── Button.jsx
│   ├── Input.jsx
│   ├── Modal.jsx
│   ├── Card.jsx
│   ├── Badge.jsx
│   ├── Table.jsx
│   ├── Search.jsx
│   ├── Layout.jsx
│   └── index.js
├── starter-template/
│   └── index.html         # 專案模板
├── version.json           # 版本資訊
└── SYNC_REPORT.md         # 同步報告
```

## 快速開始

### 方式一：直接複製
```bash
cp -r design-system/ /path/to/your-project/
```

### 方式二：Git Submodule
```bash
git submodule add https://github.com/Showchen168/Job-Management-System.git lib
# 使用 lib/design-system/
```

### 方式三：下載 starter-template
直接複製 `starter-template/index.html` 開始新專案

## 元件使用

```javascript
import {
    Button, Input, Select, Textarea,
    Modal, ConfirmModal,
    Card, CardWithHeader, StatCard,
    Badge, StatusBadge, RoleBadge,
    Table, TableHead, TableBody, TableRow, TableCell,
    Search, FilterBar,
    Layout, Sidebar, Content, PageHeader, Grid
} from './design-system/components';
```

## 自動同步

此設計系統會在主專案 `index.html` 變更時自動同步更新：
- GitHub Action 自動觸發
- 更新所有元件檔案
- 更新設計規範文件
- 生成同步報告

## 源專案元件 (32 個)

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

---

*由 sync-design-system.js 自動生成*
