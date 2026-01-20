#!/usr/bin/env node
/**
 * Design System Sync Script
 * 自動從 index.html 提取設計模式並更新 design-system
 *
 * 使用方式: node scripts/sync-design-system.js
 */

const fs = require('fs');
const path = require('path');

// 路徑設定
const ROOT_DIR = path.join(__dirname, '..');
const INDEX_HTML = path.join(ROOT_DIR, 'index.html');
const DESIGN_SYSTEM_DIR = path.join(ROOT_DIR, 'design-system');
const STARTER_TEMPLATE = path.join(DESIGN_SYSTEM_DIR, 'starter-template', 'index.html');

// 顏色提取正則
const COLOR_PATTERNS = {
    bg: /bg-(\w+)-(\d+)/g,
    text: /text-(\w+)-(\d+)/g,
    border: /border-(\w+)-(\d+)/g,
};

// 元件模式正則
const COMPONENT_PATTERNS = {
    button: /className="[^"]*(?:px-\d|py-\d)[^"]*(?:bg-\w+-\d+|border)[^"]*rounded[^"]*"/g,
    input: /className="[^"]*(?:w-full|p-\d)[^"]*border[^"]*rounded[^"]*focus:ring[^"]*"/g,
    card: /className="[^"]*bg-white[^"]*rounded-xl[^"]*shadow[^"]*border[^"]*"/g,
    modal: /className="[^"]*fixed[^"]*inset-0[^"]*bg-black\/\d+[^"]*"/g,
};

/**
 * 讀取檔案內容
 */
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`無法讀取檔案: ${filePath}`, err.message);
        return null;
    }
}

/**
 * 寫入檔案
 */
function writeFile(filePath, content) {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ 已更新: ${path.relative(ROOT_DIR, filePath)}`);
        return true;
    } catch (err) {
        console.error(`✗ 無法寫入: ${filePath}`, err.message);
        return false;
    }
}

/**
 * 提取所有使用的顏色
 */
function extractColors(content) {
    const colors = {
        bg: new Set(),
        text: new Set(),
        border: new Set(),
    };

    for (const [type, pattern] of Object.entries(COLOR_PATTERNS)) {
        let match;
        const regex = new RegExp(pattern.source, 'g');
        while ((match = regex.exec(content)) !== null) {
            colors[type].add(`${match[1]}-${match[2]}`);
        }
    }

    return {
        bg: [...colors.bg].sort(),
        text: [...colors.text].sort(),
        border: [...colors.border].sort(),
    };
}

/**
 * 提取版本號
 */
function extractVersion(content) {
    const match = content.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : 'unknown';
}

/**
 * 提取 React 元件名稱
 */
function extractComponents(content) {
    const components = [];
    const pattern = /const\s+(\w+)\s*=\s*\(\s*\{[^}]*\}\s*\)\s*=>/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
        if (match[1][0] === match[1][0].toUpperCase()) {
            components.push(match[1]);
        }
    }
    return [...new Set(components)].sort();
}

/**
 * 提取狀態配置
 */
function extractStatusConfig(content) {
    const statusMatch = content.match(/getStatusColor\s*=\s*\([^)]*\)\s*=>\s*\{([^}]+)\}/s);
    if (statusMatch) {
        const configs = [];
        const casePattern = /case\s+['"]([^'"]+)['"]\s*:\s*return\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = casePattern.exec(statusMatch[1])) !== null) {
            configs.push({ status: match[1], classes: match[2] });
        }
        return configs;
    }
    return [];
}

/**
 * 生成變更摘要
 */
function generateChangeSummary(oldContent, newContent) {
    const oldVersion = extractVersion(oldContent || '');
    const newVersion = extractVersion(newContent);
    const oldComponents = extractComponents(oldContent || '');
    const newComponents = extractComponents(newContent);

    const addedComponents = newComponents.filter(c => !oldComponents.includes(c));
    const removedComponents = oldComponents.filter(c => !newComponents.includes(c));

    return {
        version: { old: oldVersion, new: newVersion },
        components: {
            added: addedComponents,
            removed: removedComponents,
            total: newComponents.length,
        },
    };
}

/**
 * 更新 starter-template
 */
function updateStarterTemplate(sourceContent) {
    const templateContent = readFile(STARTER_TEMPLATE);
    if (!templateContent) return false;

    // 提取核心元件定義（Button, Card, Modal, Input, Badge）
    const coreComponents = [
        'Button',
        'Card',
        'Modal',
        'Input',
        'Badge',
    ];

    let updated = false;

    for (const componentName of coreComponents) {
        // 從源文件提取元件
        const componentPattern = new RegExp(
            `const\\s+${componentName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?^\\s*\\};`,
            'm'
        );
        const match = sourceContent.match(componentPattern);

        if (match) {
            // 檢查模板中是否有此元件需要更新
            const templatePattern = new RegExp(
                `const\\s+${componentName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{[\\s\\S]*?^\\s*\\};`,
                'm'
            );

            // 這裡可以添加更新邏輯
            // 目前僅作為檢測用途
        }
    }

    return updated;
}

/**
 * 生成同步報告
 */
function generateReport(summary, colors) {
    const timestamp = new Date().toISOString();
    const report = `# Design System 同步報告

生成時間: ${timestamp}
源版本: ${summary.version.new}

## 元件統計

- 總元件數: ${summary.components.total}
${summary.components.added.length > 0 ? `- 新增元件: ${summary.components.added.join(', ')}` : ''}
${summary.components.removed.length > 0 ? `- 移除元件: ${summary.components.removed.join(', ')}` : ''}

## 色彩使用統計

### 背景色 (${colors.bg.length} 種)
${colors.bg.map(c => `- bg-${c}`).join('\n')}

### 文字色 (${colors.text.length} 種)
${colors.text.map(c => `- text-${c}`).join('\n')}

### 邊框色 (${colors.border.length} 種)
${colors.border.map(c => `- border-${c}`).join('\n')}

---
*此報告由 sync-design-system.js 自動生成*
`;
    return report;
}

/**
 * 主函數
 */
function main() {
    console.log('🔄 開始同步 Design System...\n');

    // 讀取源文件
    const sourceContent = readFile(INDEX_HTML);
    if (!sourceContent) {
        console.error('無法讀取 index.html，中止同步');
        process.exit(1);
    }

    // 讀取舊的模板（用於比較）
    const oldTemplateContent = readFile(STARTER_TEMPLATE);

    // 提取資訊
    const version = extractVersion(sourceContent);
    const colors = extractColors(sourceContent);
    const components = extractComponents(sourceContent);
    const statusConfig = extractStatusConfig(sourceContent);
    const summary = generateChangeSummary(oldTemplateContent, sourceContent);

    console.log(`📦 源版本: ${version}`);
    console.log(`📦 元件數量: ${components.length}`);
    console.log(`🎨 使用顏色: bg(${colors.bg.length}) text(${colors.text.length}) border(${colors.border.length})`);

    // 生成報告
    const report = generateReport(summary, colors);
    const reportPath = path.join(DESIGN_SYSTEM_DIR, 'SYNC_REPORT.md');
    writeFile(reportPath, report);

    // 更新版本記錄
    const versionInfo = {
        lastSync: new Date().toISOString(),
        sourceVersion: version,
        componentsCount: components.length,
        components: components,
        colors: colors,
    };

    const versionPath = path.join(DESIGN_SYSTEM_DIR, 'version.json');
    writeFile(versionPath, JSON.stringify(versionInfo, null, 2));

    // 檢查是否有變更
    if (summary.components.added.length > 0 || summary.components.removed.length > 0) {
        console.log('\n⚠️  偵測到元件變更:');
        if (summary.components.added.length > 0) {
            console.log(`   新增: ${summary.components.added.join(', ')}`);
        }
        if (summary.components.removed.length > 0) {
            console.log(`   移除: ${summary.components.removed.join(', ')}`);
        }
        console.log('\n💡 建議手動檢查 design-system/components/ 是否需要更新');
    }

    console.log('\n✅ Design System 同步完成!');

    // 返回是否有變更（供 CI 使用）
    const hasChanges = summary.components.added.length > 0 ||
                       summary.components.removed.length > 0 ||
                       summary.version.old !== summary.version.new;

    process.exit(hasChanges ? 0 : 0);
}

// 執行
main();
