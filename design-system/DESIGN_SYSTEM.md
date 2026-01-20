# 設計系統規範 Design System

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

### 狀態色彩 Status Colors

```javascript
const statusColors = {
  pending:     { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  inProgress:  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200' },
  completed:   { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200' },
  cancelled:   { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-200' },
  error:       { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200' }
};
```

### 色階使用原則
- **50-100**: 背景色、淺色填充
- **200-300**: 邊框色
- **500-600**: 按鈕背景、主要元素
- **700-800**: 文字色、深色背景

---

## 2. 字型系統 Typography

### 字型家族
```css
font-family: 'Inter', 'Microsoft JhengHei', sans-serif;
```

### 字型層級

| 用途 | Class | 範例 |
|------|-------|------|
| 頁面標題 | `text-2xl font-bold text-slate-800` | 任務管理 |
| 區塊標題 | `text-xl font-bold text-slate-800` | 新增任務 |
| 小標題 | `text-lg font-medium text-slate-700` | 基本資訊 |
| 正文 | `text-sm text-slate-600` | 內容描述 |
| 標籤 | `text-xs font-bold text-slate-500 uppercase` | 欄位標籤 |
| 輔助說明 | `text-xs text-slate-400` | 提示文字 |
| 錯誤訊息 | `text-sm text-red-600` | 錯誤提示 |

---

## 3. 間距系統 Spacing

### 間距規範
- 基礎單位：4px (Tailwind scale)
- 常用間距：`gap-2` (8px), `gap-4` (16px), `gap-6` (24px)

### 應用場景

| 場景 | Class | 說明 |
|------|-------|------|
| 卡片內距 | `p-6` | 主要卡片容器 |
| 表單欄位間距 | `gap-4` | 欄位之間的垂直間距 |
| 按鈕群組 | `gap-2` | 按鈕之間的水平間距 |
| 區塊間距 | `mb-6` | 區塊之間的垂直間距 |
| 標籤與輸入框 | `mb-1` | 標籤下方的小間距 |

---

## 4. 元件規範 Components

### 4.1 按鈕 Button

```html
<!-- 主要按鈕 -->
<button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
               disabled:opacity-50 disabled:cursor-not-allowed transition">
  確認
</button>

<!-- 次要按鈕 -->
<button class="px-4 py-2 bg-white text-slate-600 border border-slate-300
               rounded-lg hover:bg-slate-50 transition">
  取消
</button>

<!-- 危險按鈕 -->
<button class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
  刪除
</button>

<!-- 成功按鈕 -->
<button class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
  儲存
</button>

<!-- 圖示按鈕 -->
<button class="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
  <Icon size={18} />
</button>
```

### 4.2 輸入框 Input

```html
<!-- 文字輸入 -->
<input type="text"
       class="w-full p-2.5 border border-slate-300 rounded-lg
              focus:ring-2 focus:ring-blue-500 outline-none transition"
       placeholder="請輸入..." />

<!-- 下拉選單 -->
<select class="w-full p-2.5 border border-slate-300 rounded-lg
               focus:ring-2 focus:ring-blue-500 outline-none transition">
  <option>選項一</option>
</select>

<!-- 多行輸入 -->
<textarea class="w-full p-2.5 border border-slate-300 rounded-lg
                 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
          rows="4"></textarea>
```

### 4.3 表單標籤 Form Label

```html
<label class="block text-xs font-bold text-slate-500 uppercase mb-1">
  欄位名稱 <span class="text-red-500">*</span>
</label>
```

### 4.4 卡片 Card

```html
<!-- 基礎卡片 -->
<div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
  內容
</div>

<!-- 可點擊卡片 -->
<div class="bg-white p-6 rounded-xl shadow-sm border border-slate-200
            hover:bg-slate-50 cursor-pointer transition-colors">
  內容
</div>

<!-- 帶標題卡片 -->
<div class="bg-white rounded-xl shadow-sm border border-slate-200">
  <div class="flex items-center gap-3 p-6 border-b border-slate-100">
    <div class="p-3 rounded-full bg-blue-100">
      <Icon class="text-blue-700" size={24} />
    </div>
    <div>
      <h2 class="text-xl font-bold text-slate-800">標題</h2>
      <p class="text-sm text-slate-500">副標題說明</p>
    </div>
  </div>
  <div class="p-6">
    內容
  </div>
</div>
```

### 4.5 Modal 彈窗

```html
<!-- Modal 結構 -->
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4
            animate-in fade-in duration-200">
  <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-slate-100">
      <div class="flex items-center gap-3">
        <Icon class="text-blue-600" size={24} />
        <h3 class="text-lg font-bold text-slate-800">標題</h3>
      </div>
      <button class="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
        <X size={20} />
      </button>
    </div>

    <!-- Body -->
    <div class="p-6 max-h-[60vh] overflow-y-auto">
      內容
    </div>

    <!-- Footer -->
    <div class="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
      <button class="px-4 py-2 bg-white text-slate-600 border border-slate-300
                     rounded-lg hover:bg-slate-50">取消</button>
      <button class="px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700">確認</button>
    </div>
  </div>
</div>
```

### 4.6 狀態標籤 Badge

```html
<!-- 狀態標籤 -->
<span class="px-2 py-1 rounded-full text-xs font-bold border
             bg-yellow-100 text-yellow-700 border-yellow-200">
  待處理
</span>

<span class="px-2 py-1 rounded-full text-xs font-bold border
             bg-blue-100 text-blue-700 border-blue-200">
  進行中
</span>

<span class="px-2 py-1 rounded-full text-xs font-bold border
             bg-green-100 text-green-700 border-green-200">
  已完成
</span>
```

### 4.7 表格 Table

```html
<div class="overflow-x-auto">
  <table class="w-full">
    <thead>
      <tr class="bg-slate-50 border-b border-slate-200">
        <th class="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">
          欄位名稱
        </th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
          內容
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### 4.8 搜尋框 Search

```html
<div class="flex items-center gap-2 bg-white border border-slate-300
            rounded-lg px-3 py-2 shadow-sm">
  <Search class="text-slate-400" size={18} />
  <input type="text"
         class="outline-none text-sm w-full bg-transparent"
         placeholder="搜尋..." />
</div>
```

### 4.9 側邊導航 Sidebar

```html
<aside class="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-xl">
  <!-- Logo -->
  <div class="p-6 border-b border-slate-700">
    <h1 class="text-xl font-bold flex items-center gap-2">
      <Icon size={24} />
      系統名稱
    </h1>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-4 space-y-2">
    <!-- Active -->
    <button class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                   bg-blue-600 text-white shadow-md">
      <Icon size={20} />
      <span>目前頁面</span>
    </button>

    <!-- Inactive -->
    <button class="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg
                   text-slate-300 hover:bg-slate-800 transition">
      <Icon size={20} />
      <span>其他頁面</span>
    </button>
  </nav>
</aside>
```

---

## 5. 版面佈局 Layout

### 5.1 主要結構

```html
<div class="flex flex-col md:flex-row min-h-screen bg-slate-100">
  <!-- Sidebar -->
  <aside class="w-full md:w-64 bg-slate-900 flex-shrink-0">...</aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-auto">
    <div class="p-6">
      <!-- Page Content -->
    </div>
  </main>
</div>
```

### 5.2 Grid 佈局

```html
<!-- 儀表板統計 -->
<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div class="bg-white p-6 rounded-xl">...</div>
</div>

<!-- 表單欄位 -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div>...</div>
  <div>...</div>
</div>

<!-- 三欄佈局 -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
  <div>...</div>
</div>
```

---

## 6. 互動狀態 Interactions

### Hover 狀態
- 按鈕：`hover:bg-[color]-700` (加深)
- 卡片：`hover:bg-slate-50`
- 連結：`hover:underline`, `hover:text-blue-600`
- 圖示按鈕：`hover:bg-slate-100 hover:text-slate-600`

### Focus 狀態
- 輸入框：`focus:ring-2 focus:ring-blue-500 outline-none`

### Disabled 狀態
- 全域：`disabled:opacity-50 disabled:cursor-not-allowed`

### 過渡動畫
- 基礎過渡：`transition`
- 顏色過渡：`transition-colors`
- 動畫持續：`duration-200`
- Modal 進場：`animate-in fade-in duration-200`
- 載入動畫：`animate-spin`

---

## 7. 響應式設計 Responsive

### 斷點
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### 常用模式
```html
<!-- 側邊欄收合 -->
<aside class="w-full md:w-64">

<!-- Grid 響應 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

<!-- 彈性寬度 -->
<input class="w-full sm:w-auto">

<!-- 隱藏/顯示 -->
<span class="hidden md:block">
```

---

## 8. 圖示系統 Icons

使用 Lucide React 圖示庫：

```javascript
import {
  Search, Plus, Edit, Trash2, X, Check,
  ChevronDown, ChevronRight, Menu, Settings,
  User, Users, Calendar, FileText, Download,
  AlertCircle, CheckCircle, Clock, Sparkles
} from 'lucide-react';
```

### 圖示尺寸
- 導航圖示：`size={20}`
- 標題圖示：`size={24}`
- 按鈕內圖示：`size={18}`
- 小型圖示：`size={16}`

---

## 9. 最佳實踐 Best Practices

### 可存取性 Accessibility
- 所有互動元素需有 focus 狀態
- 使用語意化 HTML 標籤
- 提供適當的 aria-label
- 確保色彩對比度符合 WCAG 標準

### 效能 Performance
- 使用 Tailwind 的 JIT 模式
- 避免不必要的動畫
- 圖片使用適當的格式和尺寸

### 一致性 Consistency
- 統一使用定義的色彩變數
- 遵循間距系統
- 保持元件樣式一致
