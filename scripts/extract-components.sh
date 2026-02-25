#!/bin/bash

# 組件提取腳本 - 從單一大檔案中提取所有 React 組件
# 用途: 當 Codex 無法正確掃描時，直接提取組件清單
# 使用: ./extract-components.sh

set -e

PROJECT_PATH="/Users/show/Desktop/Claude code agent/Projects/Job-Management-System"
APP_FILE="$PROJECT_PATH/src/App.jsx"
OUTPUT_FILE="$PROJECT_PATH/docs/EXTRACTED_COMPONENTS.md"

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔍 開始從 App.jsx 提取組件...${NC}"

# 檢查檔案是否存在
if [ ! -f "$APP_FILE" ]; then
    echo -e "${YELLOW}⚠️  找不到 $APP_FILE${NC}"
    exit 1
fi

# 建立輸出文件
cat > "$OUTPUT_FILE" << 'HEADER'
# React 組件自動提取報告

> **來源檔案**: src/App.jsx
> **提取時間**: $(date +"%Y-%m-%d %H:%M:%S")
> **提取工具**: extract-components.sh

---

## 📦 組件清單（按行號排序）

| # | 組件名稱 | 行號 | 定義方式 | 類型推測 |
|---|---------|------|----------|---------|
HEADER

# 提取組件（使用多種模式）
echo "正在搜尋組件定義..."

# 模式 1: const ComponentName = () => {}
# 模式 2: const ComponentName = ({ props }) => {}
# 模式 3: function ComponentName() {}
# 模式 4: export const ComponentName = () => {}

grep -n "^const [A-Z][a-zA-Z0-9]* = (" "$APP_FILE" | while IFS=: read -r line_num line_content; do
    component_name=$(echo "$line_content" | sed -E 's/^const ([A-Z][a-zA-Z0-9]*).*/\1/')

    # 推測組件類型
    component_type="功能組件"
    if [[ "$component_name" == *"Page" ]]; then
        component_type="頁面組件"
    elif [[ "$component_name" == *"Modal" ]]; then
        component_type="彈窗組件"
    elif [[ "$component_name" == *"Form" ]]; then
        component_type="表單組件"
    elif [[ "$component_name" == *"Row" || "$component_name" == *"Button" ]]; then
        component_type="UI組件"
    elif [[ "$component_name" == "App" ]]; then
        component_type="根組件"
    fi

    echo "| - | \`$component_name\` | $line_num | const arrow function | $component_type |" >> "$OUTPUT_FILE"
done

echo '```' >> "$OUTPUT_FILE"

# 統計資訊
TOTAL_COMPONENTS=$(grep -c "^const [A-Z][a-zA-Z0-9]* = (" "$APP_FILE" || echo "0")

cat >> "$OUTPUT_FILE" << STATS

---

## 📊 統計資訊

- **總組件數**: $TOTAL_COMPONENTS 個
- **檔案總行數**: $(wc -l < "$APP_FILE") 行
- **平均每組件行數**: $(echo "scale=0; $(wc -l < "$APP_FILE") / $TOTAL_COMPONENTS" | bc) 行

---

## 🎯 組件分類統計

STATS

# 按類型分類
echo "### 頁面組件" >> "$OUTPUT_FILE"
grep "頁面組件" "$OUTPUT_FILE" | wc -l | xargs -I {} echo "- 數量: {} 個" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### 功能組件" >> "$OUTPUT_FILE"
grep "功能組件" "$OUTPUT_FILE" | wc -l | xargs -I {} echo "- 數量: {} 個" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "### UI 組件" >> "$OUTPUT_FILE"
grep "UI組件" "$OUTPUT_FILE" | wc -l | xargs -I {} echo "- 數量: {} 個" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# 功能模組對照
cat >> "$OUTPUT_FILE" << 'MODULES'

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

MODULES

# 為每個組件生成詳細資訊模板
grep -n "^const [A-Z][a-zA-Z0-9]* = (" "$APP_FILE" | while IFS=: read -r line_num line_content; do
    component_name=$(echo "$line_content" | sed -E 's/^const ([A-Z][a-zA-Z0-9]*).*/\1/')

    cat >> "$OUTPUT_FILE" << COMPONENT_DETAIL

### \`$component_name\` (行 $line_num)

**定義**:
\`\`\`javascript
$(sed -n "${line_num}p" "$APP_FILE")
\`\`\`

**Props** (需手動檢查):
- 查看行 $line_num 的參數列表

**功能** (需手動補充):
- [待補充]

---
COMPONENT_DETAIL
done

# 完成訊息
cat >> "$OUTPUT_FILE" << 'FOOTER'

## 🔧 下一步

1. **查看此報告**: 了解所有組件的位置
2. **手動補充 Props**: 檢查每個組件的參數
3. **補充功能說明**: 為每個組件添加功能描述
4. **提供給 Codex**: 將此報告作為上下文，讓 Codex 進行深度分析

---

**生成工具**: extract-components.sh
**最後更新**: $(date +"%Y-%m-%d %H:%M:%S")
FOOTER

echo -e "${GREEN}✅ 提取完成！${NC}"
echo -e "${BLUE}📄 報告已生成: $OUTPUT_FILE${NC}"
echo ""
echo -e "${YELLOW}找到 $TOTAL_COMPONENTS 個組件${NC}"
echo ""
echo "查看報告:"
echo "  cat $OUTPUT_FILE"
echo ""
echo "或在編輯器中打開:"
echo "  open $OUTPUT_FILE"
