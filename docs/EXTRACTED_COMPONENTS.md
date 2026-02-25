# React 組件自動提取報告

> **來源檔案**: src/App.jsx
> **提取時間**: $(date +"%Y-%m-%d %H:%M:%S")
> **提取工具**: extract-components.sh

---

## 📦 組件清單（按行號排序）

| # | 組件名稱 | 行號 | 定義方式 | 類型推測 |
|---|---------|------|----------|---------|
| - | `Modal` | 539 | const arrow function | 彈窗組件 |
| - | `CopyButton` | 564 | const arrow function | UI組件 |
| - | `MarkdownRenderer` | 626 | const arrow function | 功能組件 |
| - | `AIConversationModal` | 645 | const arrow function | 彈窗組件 |
| - | `NavButton` | 956 | const arrow function | UI組件 |
| - | `ContentEditor` | 960 | const arrow function | 功能組件 |
| - | `TaskForm` | 987 | const arrow function | 表單組件 |
| - | `TaskRow` | 1058 | const arrow function | UI組件 |
| - | `MeetingForm` | 1083 | const arrow function | 表單組件 |
| - | `MeetingRow` | 1104 | const arrow function | UI組件 |
| - | `AuthPage` | 1127 | const arrow function | 頁面組件 |
| - | `Dashboard` | 1336 | const arrow function | 功能組件 |
| - | `TaskManager` | 1427 | const arrow function | 功能組件 |
| - | `MeetingMinutes` | 1687 | const arrow function | 功能組件 |
| - | `SettingsPage` | 1813 | const arrow function | 頁面組件 |
| - | `App` | 2961 | const arrow function | 根組件 |
```

---

## 📊 統計資訊

- **總組件數**: 16 個
- **檔案總行數**:     3370 行
- **平均每組件行數**: 210 行

---

## 🎯 組件分類統計

### 頁面組件
- 數量: 3 個

### 功能組件
- 數量: 6 個

### UI 組件
- 數量: 4 個


---

## 🗂️ 功能模組對照表

基於組件名稱自動推測的功能分組：

### 1. 身份認證模組
- `AuthPage` - 登入/註冊頁面

### 2. 儀表板模組
- `Dashboard` - 統計儀表板

### 3. 任務管理模組
- `TaskManager` - 任務管理主頁面
- `TaskForm` - 任務新增/編輯表單
- `TaskRow` - 任務列表單行

### 4. 會議記錄模組
- `MeetingMinutes` - 會議記錄主頁面
- `MeetingForm` - 會議新增/編輯表單
- `MeetingRow` - 會議列表單行

### 5. AI 功能模組
- `AIConversationModal` - AI 智能總結對話框

### 6. 系統設定模組
- `SettingsPage` - 系統設定主頁面

### 7. 共用 UI 組件
- `Modal` - 通用彈窗
- `CopyButton` - 複製按鈕
- `NavButton` - 導航按鈕
- `ContentEditor` - 富文本編輯器
- `MarkdownRenderer` - Markdown 渲染器

### 8. 核心組件
- `App` - 應用程式根組件

---

## 📝 詳細組件資訊

以下是每個組件的詳細資訊（需手動查看 src/App.jsx）：


### `Modal` (行 539)

**定義**:
```javascript
const Modal = ({ isOpen, title, content, onConfirm, onCancel, confirmText = '確認', cancelText = '取消', type = 'confirm', children, testId }) => {
```

**Props** (需手動檢查):
- 查看行 539 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `CopyButton` (行 564)

**定義**:
```javascript
const CopyButton = ({ text }) => {
```

**Props** (需手動檢查):
- 查看行 564 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `MarkdownRenderer` (行 626)

**定義**:
```javascript
const MarkdownRenderer = ({ content }) => {
```

**Props** (需手動檢查):
- 查看行 626 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `AIConversationModal` (行 645)

**定義**:
```javascript
const AIConversationModal = ({ isOpen, onClose, rawData, geminiApiKey, geminiModel = 'gemini-2.5-flash', dataType = 'tasks', onDateFilter }) => {
```

**Props** (需手動檢查):
- 查看行 645 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `NavButton` (行 956)

**定義**:
```javascript
const NavButton = ({ active, onClick, icon, label }) => (
```

**Props** (需手動檢查):
- 查看行 956 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `ContentEditor` (行 960)

**定義**:
```javascript
const ContentEditor = ({ value, onChange }) => {
```

**Props** (需手動檢查):
- 查看行 960 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `TaskForm` (行 987)

**定義**:
```javascript
const TaskForm = ({ initialData, onSave, onCancel, taskSources, taskStatuses, assigneeOptions, teams = [] }) => {
```

**Props** (需手動檢查):
- 查看行 987 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `TaskRow` (行 1058)

**定義**:
```javascript
const TaskRow = ({ task, onEdit, onDelete }) => {
```

**Props** (需手動檢查):
- 查看行 1058 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `MeetingForm` (行 1083)

**定義**:
```javascript
const MeetingForm = ({ initialData, onSave, onCancel, categories, teams = [] }) => {
```

**Props** (需手動檢查):
- 查看行 1083 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `MeetingRow` (行 1104)

**定義**:
```javascript
const MeetingRow = ({ meeting, onEdit, onDelete }) => {
```

**Props** (需手動檢查):
- 查看行 1104 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `AuthPage` (行 1127)

**定義**:
```javascript
const AuthPage = ({ auth, error, connectionStatus }) => {
```

**Props** (需手動檢查):
- 查看行 1127 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `Dashboard` (行 1336)

**定義**:
```javascript
const Dashboard = ({ db, user, canAccessAll, isAdmin }) => {
```

**Props** (需手動檢查):
- 查看行 1336 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `TaskManager` (行 1427)

**定義**:
```javascript
const TaskManager = ({ db, user, canAccessAll, isAdmin, testConfig, geminiApiKey, geminiModel, canUseAI, teams = [] }) => {
```

**Props** (需手動檢查):
- 查看行 1427 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `MeetingMinutes` (行 1687)

**定義**:
```javascript
const MeetingMinutes = ({ db, user, canAccessAll, isAdmin, isRootAdmin, geminiApiKey, geminiModel, canUseAI, teams = [] }) => {
```

**Props** (需手動檢查):
- 查看行 1687 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `SettingsPage` (行 1813)

**定義**:
```javascript
const SettingsPage = ({ db, user, isAdmin, isEditor, cloudAdmins, cloudEditors, cloudAIUsers, rootAdmins, onSaveGeminiSettings, testConfig, geminiApiKey, geminiModel, teams = [] }) => {
```

**Props** (需手動檢查):
- 查看行 1813 的參數列表

**功能** (需手動補充):
- [待補充]

---

### `App` (行 2961)

**定義**:
```javascript
const App = () => {
```

**Props** (需手動檢查):
- 查看行 2961 的參數列表

**功能** (需手動補充):
- [待補充]

---

## 🔧 下一步

1. **查看此報告**: 了解所有組件的位置
2. **手動補充 Props**: 檢查每個組件的參數
3. **補充功能說明**: 為每個組件添加功能描述
4. **提供給 Codex**: 將此報告作為上下文，讓 Codex 進行深度分析

---

**生成工具**: extract-components.sh
**最後更新**: $(date +"%Y-%m-%d %H:%M:%S")
