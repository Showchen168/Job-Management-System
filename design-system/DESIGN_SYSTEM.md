# 設計系統規範 Design System

> 自動從主專案同步生成 - 最後更新: 2026-01-22 (v3.0.0)

基於「工作紀錄中心」專案的 UX/UI 設計規範，供後續專案參考使用。

---

## 1. 色彩系統 Color Palette

### 主要色彩 Primary Colors

| 用途 | Tailwind Class | 說明 |
|------|---------------|------|
| 主要操作 | `bg-blue-600`, `text-blue-600` | 按鈕、連結、主要互動 |
| 次要/AI功能 | `bg-purple-600`, `text-purple-600` | AI 對話、進階功能 |
| 成功狀態 | `bg-emerald-600`, `text-emerald-700` | 完成、成功訊息 |
| 危險/錯誤 | `bg-red-600`, `text-red-600` | 刪除、錯誤提示 |
| 中性基底 | `bg-slate-800`, `text-slate-800` | 文字、邊框、背景 |

### 目前使用的顏色

**背景色 (22 種)**
`bg-amber-500`, `bg-blue-100`, `bg-blue-50`, `bg-blue-600`, `bg-blue-700`, `bg-cyan-100`, `bg-emerald-600`, `bg-emerald-700`, `bg-gray-100`, `bg-green-100`, `bg-purple-100`, `bg-red-100`, `bg-red-50`, `bg-red-500`, `bg-red-600`, `bg-red-700`, `bg-slate-100`, `bg-slate-300`, `bg-slate-50`, `bg-slate-800`...

**文字色 (18 種)**
`text-blue-600`, `text-blue-700`, `text-cyan-700`, `text-emerald-600`, `text-gray-700`, `text-green-700`, `text-purple-600`, `text-purple-700`, `text-red-500`, `text-red-600`, `text-red-700`, `text-slate-300`, `text-slate-400`, `text-slate-500`, `text-slate-600`, `text-slate-700`, `text-slate-800`, `text-yellow-700`

**邊框色 (12 種)**
`border-blue-200`, `border-cyan-200`, `border-gray-200`, `border-green-200`, `border-purple-200`, `border-red-200`, `border-red-500`, `border-slate-100`, `border-slate-200`, `border-slate-300`, `border-slate-700`, `border-yellow-200`

---

## 2. 字型系統 Typography

### 字型家族
```css
font-family: 'Inter', 'Microsoft JhengHei', sans-serif;
```

### 字型層級

| 用途 | Class |
|------|-------|
| 頁面標題 | `text-2xl font-bold text-slate-800` |
| 區塊標題 | `text-xl font-bold text-slate-800` |
| 小標題 | `text-lg font-medium text-slate-700` |
| 正文 | `text-sm text-slate-600` |
| 標籤 | `text-xs font-bold text-slate-500 uppercase` |
| 輔助說明 | `text-xs text-slate-400` |

---

## 3. 間距系統 Spacing

| 場景 | Class |
|------|-------|
| 卡片內距 | `p-6` |
| 表單欄位間距 | `gap-4` |
| 按鈕群組 | `gap-2` |
| 區塊間距 | `mb-6` |

---

## 4. 元件規範 Components

### 按鈕 Button
```jsx
<Button variant="primary">主要按鈕</Button>
<Button variant="secondary">次要按鈕</Button>
<Button variant="danger">危險按鈕</Button>
<Button variant="success">成功按鈕</Button>
<Button variant="ghost">幽靈按鈕</Button>
```

### 輸入框 Input
```jsx
<Input label="欄位名稱" required />
<Select label="下拉選單" options={[...]} />
<Textarea label="多行輸入" rows={4} />
```

### 彈窗 Modal
```jsx
<Modal isOpen={open} onClose={close} title="標題">內容</Modal>
<ConfirmModal variant="danger" message="確認刪除？" />
```

### 卡片 Card
```jsx
<Card>基本卡片</Card>
<CardWithHeader title="標題" icon={Icon}>內容</CardWithHeader>
<StatCard title="統計" value="128" />
```

### 標籤 Badge
```jsx
<Badge variant="success">成功</Badge>
<StatusBadge status="pending" />
<RoleBadge role="admin" />
```

---

## 5. 版面佈局 Layout

```jsx
<Layout>
    <Sidebar navigation={[...]} activeItem={page} onNavigate={setPage} />
    <Content>
        <PageHeader title="頁面標題" />
        <PageContainer>
            <Grid cols={1} mdCols={2} gap={4}>...</Grid>
        </PageContainer>
    </Content>
</Layout>
```

---

## 6. 目前專案元件列表

共 32 個元件：

- `AuthPage`
- `Badge`
- `Button`
- `Card`
- `CardWithHeader`
- `ConfirmModal`
- `Content`
- `Dashboard`
- `FilterBar`
- `Grid`
- `Input`
- `Layout`
- `Modal`
- `NavButton`
- `PageContainer`
- `PageHeader`
- `RoleBadge`
- `Search`
- `Select`
- `SettingsPage`
- `Sidebar`
- `StatCard`
- `StatusBadge`
- `Table`
- `TableBody`
- `TableCell`
- `TableEmpty`
- `TableHead`
- `TableHeader`
- `TableRow`
- `TaskManager`
- `Textarea`

---

*此文件由 sync-design-system.js 自動生成*
