# 設計系統 Design System

基於「工作紀錄中心」專案建立的設計系統，提供可重用的 UX/UI 規範、元件庫及專案模板。

## 目錄結構

```
design-system/
├── README.md              # 本說明文件
├── DESIGN_SYSTEM.md       # 完整設計規範文件
├── components/            # 可重用元件庫
│   ├── index.js           # 元件匯出入口
│   ├── Button.jsx         # 按鈕元件
│   ├── Input.jsx          # 輸入框元件 (Input, Select, Textarea)
│   ├── Modal.jsx          # 彈窗元件 (Modal, ConfirmModal)
│   ├── Card.jsx           # 卡片元件 (Card, CardWithHeader, StatCard)
│   ├── Badge.jsx          # 標籤元件 (Badge, StatusBadge, RoleBadge)
│   ├── Table.jsx          # 表格元件
│   ├── Search.jsx         # 搜尋元件 (Search, FilterBar)
│   └── Layout.jsx         # 版面元件 (Layout, Sidebar, PageHeader...)
└── starter-template/      # 專案模板
    └── index.html         # 完整的 starter 範例
```

## 快速開始

### 方式一：使用專案模板

1. 複製 `starter-template/index.html` 到你的專案
2. 修改 Firebase 設定
3. 根據需求調整頁面內容

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    // ...
};
```

### 方式二：引用元件庫

將 `components/` 目錄複製到你的專案中：

```javascript
// 匯入元件
import {
  Button,
  Card,
  Modal,
  Input,
  Badge,
  Table,
  Layout,
} from './design-system/components';

// 使用元件
function MyComponent() {
  return (
    <Card>
      <Input label="名稱" required />
      <Button variant="primary">儲存</Button>
    </Card>
  );
}
```

### 方式三：參考設計規範

查閱 `DESIGN_SYSTEM.md` 取得完整的：
- 色彩系統
- 字型規範
- 間距系統
- 元件樣式
- 互動狀態
- 響應式設計

## 元件列表

### Button 按鈕

```jsx
<Button variant="primary">主要按鈕</Button>
<Button variant="secondary">次要按鈕</Button>
<Button variant="danger">危險按鈕</Button>
<Button variant="success">成功按鈕</Button>
<Button variant="ghost" icon={Settings}>圖示按鈕</Button>
<Button loading>載入中</Button>
```

**Props:**
| 屬性 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| variant | string | 'primary' | 'primary', 'secondary', 'danger', 'success', 'ghost' |
| size | string | 'md' | 'sm', 'md', 'lg' |
| loading | boolean | false | 是否顯示載入狀態 |
| icon | Component | - | Lucide icon 元件 |

### Input 輸入框

```jsx
<Input label="電子郵件" type="email" required />
<Select label="狀態" options={[{value: '1', label: '選項一'}]} />
<Textarea label="備註" rows={4} />
```

### Modal 彈窗

```jsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="標題"
  footer={<Button>確認</Button>}
>
  內容
</Modal>

<ConfirmModal
  isOpen={isDeleteOpen}
  onConfirm={handleDelete}
  variant="danger"
  message="確定要刪除嗎？"
/>
```

### Card 卡片

```jsx
<Card>基本卡片</Card>
<Card hover onClick={handleClick}>可點擊卡片</Card>
<CardWithHeader title="標題" icon={Settings}>帶標題卡片</CardWithHeader>
<StatCard title="總數" value="128" icon={FileText} />
```

### Badge 標籤

```jsx
<Badge variant="success">已完成</Badge>
<StatusBadge status="pending" />
<RoleBadge role="admin" />
```

### Table 表格

```jsx
<Table>
  <TableHead>
    <TableHeader>名稱</TableHeader>
    <TableHeader>狀態</TableHeader>
  </TableHead>
  <TableBody>
    <TableRow>
      <TableCell>項目一</TableCell>
      <TableCell><Badge>完成</Badge></TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Layout 版面

```jsx
<Layout>
  <Sidebar
    navigation={navItems}
    activeItem={currentPage}
    onNavigate={setCurrentPage}
  />
  <Content>
    <PageHeader title="頁面標題" />
    <PageContainer>
      <Grid cols={1} mdCols={2} gap={4}>
        {/* 內容 */}
      </Grid>
    </PageContainer>
  </Content>
</Layout>
```

## 設計規範摘要

### 色彩

| 用途 | Class |
|------|-------|
| 主要操作 | `bg-blue-600` |
| 成功 | `bg-emerald-600` |
| 警告 | `bg-yellow-100` |
| 危險 | `bg-red-600` |
| 中性 | `bg-slate-800` |

### 字型

| 用途 | Class |
|------|-------|
| 頁面標題 | `text-2xl font-bold text-slate-800` |
| 標籤 | `text-xs font-bold text-slate-500 uppercase` |
| 正文 | `text-sm text-slate-600` |

### 間距

| 場景 | Class |
|------|-------|
| 卡片內距 | `p-6` |
| 欄位間距 | `gap-4` |
| 按鈕間距 | `gap-2` |

### 圓角

| 元件 | Class |
|------|-------|
| 輸入框/按鈕 | `rounded-lg` |
| 卡片 | `rounded-xl` |
| 標籤 | `rounded-full` |

## 技術棧

- **CSS Framework**: Tailwind CSS
- **Icon Library**: Lucide Icons
- **Font**: Inter + Microsoft JhengHei
- **Backend**: Firebase (Auth + Firestore)
- **Frontend**: React 18

## 最佳實踐

1. **一致性** - 使用定義好的色彩和間距變數
2. **可存取性** - 確保所有互動元素有 focus 狀態
3. **響應式** - 使用 `md:` 斷點處理不同螢幕尺寸
4. **效能** - 避免不必要的動畫和重繪

## 授權

此設計系統基於「工作紀錄中心」專案，可自由用於個人和商業專案。
