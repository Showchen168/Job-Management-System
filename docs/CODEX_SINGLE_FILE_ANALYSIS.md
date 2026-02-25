# Codex 單一檔案深度分析指令

> **適用情境**: 當整個應用程式集中在單一檔案（如 `src/App.jsx`）時使用
> **專案**: Job Management System

---

## 🎯 給 Codex 的精確指令

```
請深度分析 `src/App.jsx` 這個單一檔案，它包含整個應用程式的所有組件。

【步驟 1：組件提取】
1. 搜尋所有 React 組件定義：
   - `const XXX = () => {}`
   - `function XXX() {}`
   - `const XXX = ({ props }) => {}`

2. 列出找到的組件名稱、行數、功能描述

【步驟 2：功能分類】
將組件按以下類別分組：
- **頁面級組件**（Page/Manager/Dashboard）
- **功能組件**（Modal/Form/Editor）
- **UI 組件**（Button/Row/NavButton）
- **佈局組件**（Layout/Container）

【步驟 3：組件關係分析】
對於每個主要組件：
1. 它接收哪些 props？
2. 它使用哪些子組件？
3. 它的主要功能是什麼？
4. 它在哪一行定義？（行號範圍）

【步驟 4：功能模組對照】
識別以下功能模組，並列出相關組件：
- 身份認證功能
- 儀表板統計
- 任務管理
- 會議記錄
- AI 智能總結
- 系統設定/權限管理
- 團隊管理

【步驟 5：產出表格】
生成以下表格到 `docs/COMPONENTS_DETAILED.md`：

### 表格 1: 組件索引（按行數排序）
| 組件名稱 | 行號範圍 | 類型 | 功能描述 | Props | 使用的子組件 |
|---------|---------|------|----------|-------|-------------|
| ... | ... | ... | ... | ... | ... |

### 表格 2: 功能模組對照表
| 功能模組 | 主要組件 | 輔助組件 | 相關函數 | 行號範圍 |
|---------|---------|---------|---------|---------|
| ... | ... | ... | ... | ... |

### 表格 3: Props 參數表（每個組件）
| 組件 | Prop 名稱 | 類型 | 必填 | 說明 |
|------|----------|------|------|------|
| ... | ... | ... | ... | ... |

請開始分析 `src/App.jsx`。
```

---

## 📋 預期結果範例

### 組件索引表（部分）

| 組件名稱 | 行號範圍 | 類型 | 功能描述 | Props |
|---------|---------|------|----------|-------|
| `Modal` | 539-563 | UI組件 | 通用彈窗 | isOpen, title, content, onConfirm, onCancel |
| `CopyButton` | 564-625 | UI組件 | 複製按鈕 | text |
| `MarkdownRenderer` | 626-643 | 功能組件 | Markdown渲染 | content |
| `AIConversationModal` | 645-955 | 功能組件 | AI對話介面 | isOpen, onClose, rawData, geminiApiKey |
| `NavButton` | 956-959 | UI組件 | 導航按鈕 | active, onClick, icon, label |
| `ContentEditor` | 960-986 | 功能組件 | 富文本編輯器 | value, onChange |
| `TaskForm` | 987-1057 | 功能組件 | 任務表單 | initialData, onSave, onCancel |
| `TaskRow` | 1058-1082 | UI組件 | 任務列表行 | task, onEdit, onDelete |
| `MeetingForm` | 1083-1103 | 功能組件 | 會議表單 | initialData, onSave, onCancel |
| `MeetingRow` | 1104-1126 | UI組件 | 會議列表行 | meeting, onEdit, onDelete |
| `AuthPage` | 1127-1335 | 頁面組件 | 登入/註冊頁 | auth, error, connectionStatus |
| `Dashboard` | 1336-1426 | 頁面組件 | 儀表板 | db, user, canAccessAll, isAdmin |
| `TaskManager` | 1427-1686 | 頁面組件 | 任務管理 | db, user, canAccessAll, isAdmin, geminiApiKey |
| `MeetingMinutes` | 1687-1812 | 頁面組件 | 會議記錄 | db, user, canAccessAll, isAdmin, geminiApiKey |
| `SettingsPage` | 1813-2960 | 頁面組件 | 系統設定 | db, user, isAdmin, isEditor, cloudAdmins |
| `App` | 2961-結尾 | 根組件 | 應用程式根 | 無 |

---

## 🔧 替代方案：使用自動腳本

如果 Codex 還是無法正確掃描，可以用我提供的腳本：

```bash
cd /Users/show/Desktop/Claude\ code\ agent/Projects/Job-Management-System

# 使用 grep 提取所有組件定義
grep -n "^const [A-Z].*= (" src/App.jsx > docs/component_list.txt

# 或使用完整的自動分析腳本
./scripts/auto-analyze.sh
```

---

## 💡 給 Codex 的額外提示

如果 Codex 仍然只掃到 5 個組件，加入這段：

```
注意：這個專案的 src/App.jsx 有 3000+ 行，包含至少 15 個組件定義。
請使用正則表達式搜尋：
- `^const [A-Z][a-zA-Z0-9]+ = \(`
- `^function [A-Z][a-zA-Z0-9]+\(`
- `^export const [A-Z][a-zA-Z0-9]+ =`

不要只看檔案名稱，要深入分析檔案內容！
```

---

## 🎯 驗證 Codex 是否正確掃描

正確的結果應該至少包含：

✅ **16 個主要組件**：
1. Modal
2. CopyButton
3. MarkdownRenderer
4. AIConversationModal
5. NavButton
6. ContentEditor
7. TaskForm
8. TaskRow
9. MeetingForm
10. MeetingRow
11. AuthPage
12. Dashboard
13. TaskManager
14. MeetingMinutes
15. SettingsPage
16. App

✅ **6 大功能模組**：
1. 身份認證（AuthPage）
2. 儀表板統計（Dashboard）
3. 任務管理（TaskManager + TaskForm + TaskRow）
4. 會議記錄（MeetingMinutes + MeetingForm + MeetingRow）
5. AI 智能總結（AIConversationModal）
6. 系統設定（SettingsPage）

---

## 📊 如何使用這份指令

1. **複製上方「給 Codex 的精確指令」**
2. **貼到 Codex 中**
3. **等待它產出 `docs/COMPONENTS_DETAILED.md`**
4. **驗證結果是否包含至少 16 個組件**

如果還是不行，告訴我，我會幫你用腳本直接提取！
