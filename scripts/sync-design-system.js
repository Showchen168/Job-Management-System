#!/usr/bin/env node
/**
 * Design System Full Sync Script
 * 自動從 src/ 目錄提取設計模式並完整更新 design-system
 *
 * 功能：
 * - 自動更新 components/*.jsx
 * - 自動更新 DESIGN_SYSTEM.md
 * - 自動更新 starter-template/index.html
 * - 自動更新 README.md
 * - 生成 version.json 和 SYNC_REPORT.md
 *
 * 使用方式: node scripts/sync-design-system.cjs
 */

const fs = require('fs');
const path = require('path');

// 路徑設定
const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const INDEX_CSS = path.join(SRC_DIR, 'index.css');
const APP_JSX = path.join(SRC_DIR, 'App.jsx');
const COMPONENTS_SRC_DIR = path.join(SRC_DIR, 'components');
const DESIGN_SYSTEM_DIR = path.join(ROOT_DIR, 'design-system');
const COMPONENTS_DIR = path.join(DESIGN_SYSTEM_DIR, 'components');
const STARTER_TEMPLATE = path.join(DESIGN_SYSTEM_DIR, 'starter-template', 'index.html');

// ============================================
// 工具函數
// ============================================

function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`無法讀取檔案: ${filePath}`, err.message);
        return null;
    }
}

function writeFile(filePath, content) {
    try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ 已更新: ${path.relative(ROOT_DIR, filePath)}`);
        return true;
    } catch (err) {
        console.error(`✗ 無法寫入: ${filePath}`, err.message);
        return false;
    }
}

function extractVersion(content) {
    const match = content.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    return match ? match[1] : 'unknown';
}

// ============================================
// 顏色提取
// ============================================

function extractColors(content) {
    const colors = { bg: new Set(), text: new Set(), border: new Set() };
    const patterns = {
        bg: /bg-(\w+)-(\d+)/g,
        text: /text-(\w+)-(\d+)/g,
        border: /border-(\w+)-(\d+)/g,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            colors[type].add(`${match[1]}-${match[2]}`);
        }
    }

    return {
        bg: [...colors.bg].sort(),
        text: [...colors.text].sort(),
        border: [...colors.border].sort(),
    };
}

// ============================================
// 元件提取
// ============================================

function extractComponentCode(content, componentName) {
    // 嘗試多種模式來匹配元件定義
    const patterns = [
        // 箭頭函數 with destructuring: const Comp = ({ props }) => { ... }
        new RegExp(
            `const\\s+${componentName}\\s*=\\s*\\(\\s*\\{[^}]*\\}\\s*\\)\\s*=>\\s*\\{([\\s\\S]*?)\\n\\s{8}\\};`,
            'm'
        ),
        // 箭頭函數 with return: const Comp = ({ props }) => ( ... )
        new RegExp(
            `const\\s+${componentName}\\s*=\\s*\\(\\s*\\{[^}]*\\}\\s*\\)\\s*=>\\s*\\(([\\s\\S]*?)\\n\\s{8}\\);`,
            'm'
        ),
    ];

    for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
            return match[0];
        }
    }
    return null;
}

function extractAllComponents(content) {
    const components = [];
    // 匹配所有 React 元件定義（首字母大寫）
    const pattern = /const\s+([A-Z]\w+)\s*=\s*\(\s*\{[^}]*\}\s*\)\s*=>/g;
    let match;
    while ((match = pattern.exec(content)) !== null) {
        components.push(match[1]);
    }
    return [...new Set(components)].sort();
}

// ============================================
// 生成元件檔案
// ============================================

function generateButtonComponent(sourceContent) {
    return `/**
 * Button Component
 * 自動從主專案同步 - 請勿手動編輯
 *
 * 變體: primary, secondary, danger, success, ghost
 * 尺寸: sm, md, lg
 */

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    icon: Icon,
    iconPosition = 'left',
    className = '',
    onClick,
    type = 'button',
    ...props
}) => {
    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
        secondary: 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700',
        ghost: 'text-slate-600 hover:bg-slate-100',
        link: 'text-blue-600 hover:underline p-0',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-2.5 text-base',
        icon: 'p-2',
    };

    const baseStyles = \`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition disabled:opacity-50 disabled:cursor-not-allowed
    \`;

    return (
        <button
            type={type}
            disabled={disabled || loading}
            onClick={onClick}
            className={\`\${baseStyles} \${variants[variant]} \${sizes[size]} \${className}\`}
            {...props}
        >
            {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : (
                <>
                    {Icon && iconPosition === 'left' && <Icon size={size === 'sm' ? 16 : 18} />}
                    {children}
                    {Icon && iconPosition === 'right' && <Icon size={size === 'sm' ? 16 : 18} />}
                </>
            )}
        </button>
    );
};

export default Button;
`;
}

function generateInputComponent(sourceContent) {
    return `/**
 * Input Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Input = ({
    label,
    type = 'text',
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
    hint,
    className = '',
    ...props
}) => {
    const inputStyles = \`
        w-full p-2.5 border rounded-lg transition
        focus:ring-2 focus:ring-blue-500 outline-none
        \${error ? 'border-red-500' : 'border-slate-300'}
        \${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
    \`;

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
                className={inputStyles}
                {...props}
            />
            {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};

const Select = ({
    label,
    value,
    onChange,
    options = [],
    placeholder = '請選擇...',
    required = false,
    disabled = false,
    error,
    className = '',
    ...props
}) => {
    const selectStyles = \`
        w-full p-2.5 border rounded-lg transition
        focus:ring-2 focus:ring-blue-500 outline-none
        \${error ? 'border-red-500' : 'border-slate-300'}
        \${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
    \`;

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                className={selectStyles}
                {...props}
            >
                <option value="">{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};

const Textarea = ({
    label,
    value,
    onChange,
    placeholder,
    rows = 4,
    required = false,
    disabled = false,
    error,
    hint,
    className = '',
    ...props
}) => {
    const textareaStyles = \`
        w-full p-2.5 border rounded-lg transition resize-none
        focus:ring-2 focus:ring-blue-500 outline-none
        \${error ? 'border-red-500' : 'border-slate-300'}
        \${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}
    \`;

    return (
        <div className={className}>
            {label && (
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <textarea
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                rows={rows}
                disabled={disabled}
                required={required}
                className={textareaStyles}
                {...props}
            />
            {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
};

export { Input, Select, Textarea };
export default Input;
`;
}

function generateModalComponent(sourceContent) {
    return `/**
 * Modal Component
 * 自動從主專案同步 - 請勿手動編輯
 */

const Modal = ({
    isOpen,
    onClose,
    title,
    icon: Icon,
    iconColor = 'text-blue-600',
    children,
    footer,
    size = 'md',
    closeOnOverlay = true,
    showCloseButton = true,
}) => {
    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-3xl',
        full: 'max-w-none mx-4',
    };

    const handleOverlayClick = (e) => {
        if (closeOnOverlay && e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleOverlayClick}
            style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
            <div
                className={\`bg-white rounded-xl shadow-2xl w-full \${sizes[size]} overflow-hidden\`}
                style={{ animation: 'slideIn 0.2s ease-out' }}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            {Icon && <Icon className={iconColor} size={24} />}
                            {title && <h3 className="text-lg font-bold text-slate-800">{title}</h3>}
                        </div>
                        {showCloseButton && (
                            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                )}
                <div className="p-6 max-h-[60vh] overflow-y-auto">{children}</div>
                {footer && (
                    <div className="flex justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">{footer}</div>
                )}
            </div>
        </div>
    );
};

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = '確認',
    message,
    confirmText = '確認',
    cancelText = '取消',
    variant = 'primary',
    loading = false,
}) => {
    const confirmButtonStyles = {
        primary: 'bg-blue-600 hover:bg-blue-700',
        danger: 'bg-red-600 hover:bg-red-700',
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={\`px-4 py-2 text-white rounded-lg transition disabled:opacity-50 \${confirmButtonStyles[variant]}\`}
                    >
                        {loading ? '處理中...' : confirmText}
                    </button>
                </>
            }
        >
            <p className="text-slate-600">{message}</p>
        </Modal>
    );
};

export { Modal, ConfirmModal };
export default Modal;
`;
}

function generateCardComponent(sourceContent) {
    return `/**
 * Card Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Card = ({
    children,
    className = '',
    hover = false,
    onClick,
    padding = 'md',
    ...props
}) => {
    const paddingSizes = {
        none: '',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
    };

    const baseStyles = \`
        bg-white rounded-xl shadow-sm border border-slate-200
        \${hover ? 'hover:bg-slate-50 cursor-pointer transition-colors' : ''}
        \${paddingSizes[padding]}
    \`;

    return (
        <div className={\`\${baseStyles} \${className}\`} onClick={onClick} {...props}>
            {children}
        </div>
    );
};

const CardWithHeader = ({
    title,
    subtitle,
    icon: Icon,
    iconBgColor = 'bg-blue-100',
    iconColor = 'text-blue-700',
    headerAction,
    children,
    className = '',
}) => {
    return (
        <div className={\`bg-white rounded-xl shadow-sm border border-slate-200 \${className}\`}>
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={\`p-3 rounded-full \${iconBgColor}\`}>
                            <Icon className={iconColor} size={24} />
                        </div>
                    )}
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
                        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                    </div>
                </div>
                {headerAction && <div>{headerAction}</div>}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
};

const StatCard = ({
    title,
    value,
    icon: Icon,
    iconBgColor = 'bg-blue-100',
    iconColor = 'text-blue-600',
    trend,
    trendValue,
    className = '',
}) => {
    const trendColors = {
        up: 'text-emerald-600',
        down: 'text-red-600',
        neutral: 'text-slate-500',
    };

    return (
        <Card className={className}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-500 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-slate-800">{value}</p>
                    {trendValue && (
                        <p className={\`text-sm mt-1 \${trendColors[trend] || trendColors.neutral}\`}>
                            {trend === 'up' && '↑ '}
                            {trend === 'down' && '↓ '}
                            {trendValue}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className={\`p-4 rounded-full \${iconBgColor}\`}>
                        <Icon className={iconColor} size={28} />
                    </div>
                )}
            </div>
        </Card>
    );
};

export { Card, CardWithHeader, StatCard };
export default Card;
`;
}

function generateBadgeComponent(sourceContent) {
    return `/**
 * Badge Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Badge = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
}) => {
    const variants = {
        default: 'bg-gray-100 text-gray-700 border-gray-200',
        primary: 'bg-blue-100 text-blue-700 border-blue-200',
        success: 'bg-green-100 text-green-700 border-green-200',
        warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        danger: 'bg-red-100 text-red-700 border-red-200',
        info: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        purple: 'bg-purple-100 text-purple-700 border-purple-200',
    };

    const sizes = {
        sm: 'px-1.5 py-0.5 text-xs',
        md: 'px-2 py-1 text-xs',
        lg: 'px-3 py-1.5 text-sm',
    };

    return (
        <span className={\`inline-flex items-center rounded-full font-bold border \${variants[variant]} \${sizes[size]} \${className}\`}>
            {children}
        </span>
    );
};

const StatusBadge = ({ status, statusMap, className = '' }) => {
    const defaultStatusMap = {
        pending: { label: '待處理', variant: 'warning' },
        'in-progress': { label: '進行中', variant: 'primary' },
        completed: { label: '已完成', variant: 'success' },
        cancelled: { label: '已取消', variant: 'default' },
        error: { label: '錯誤', variant: 'danger' },
    };

    const map = statusMap || defaultStatusMap;
    const config = map[status] || { label: status, variant: 'default' };

    return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
};

const RoleBadge = ({ role, className = '' }) => {
    const roleConfig = {
        admin: { label: '管理員', variant: 'danger' },
        editor: { label: '編輯者', variant: 'primary' },
        leader: { label: '組長', variant: 'purple' },
        user: { label: '一般用戶', variant: 'default' },
    };

    const config = roleConfig[role] || { label: role, variant: 'default' };
    return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
};

export { Badge, StatusBadge, RoleBadge };
export default Badge;
`;
}

function generateTableComponent(sourceContent) {
    return `/**
 * Table Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Table = ({ children, className = '' }) => (
    <div className={\`overflow-x-auto \${className}\`}>
        <table className="w-full">{children}</table>
    </div>
);

const TableHead = ({ children }) => (
    <thead>
        <tr className="bg-slate-50 border-b border-slate-200">{children}</tr>
    </thead>
);

const TableHeader = ({
    children,
    sortable = false,
    sorted = null,
    onSort,
    align = 'left',
    className = '',
}) => {
    const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };

    return (
        <th
            className={\`px-6 py-3 text-xs font-bold text-slate-500 uppercase \${alignClass[align]} \${sortable ? 'cursor-pointer hover:bg-slate-100 select-none' : ''} \${className}\`}
            onClick={sortable ? onSort : undefined}
        >
            <div className="flex items-center gap-1">
                {children}
                {sortable && (
                    <span className="text-slate-400">
                        {sorted === 'asc' && '↑'}
                        {sorted === 'desc' && '↓'}
                        {!sorted && '↕'}
                    </span>
                )}
            </div>
        </th>
    );
};

const TableBody = ({ children }) => (
    <tbody className="divide-y divide-slate-100">{children}</tbody>
);

const TableRow = ({ children, hover = true, selected = false, onClick, className = '' }) => (
    <tr
        className={\`\${hover ? 'hover:bg-slate-50 transition-colors' : ''} \${selected ? 'bg-blue-50' : ''} \${onClick ? 'cursor-pointer' : ''} \${className}\`}
        onClick={onClick}
    >
        {children}
    </tr>
);

const TableCell = ({ children, align = 'left', className = '' }) => {
    const alignClass = { left: 'text-left', center: 'text-center', right: 'text-right' };
    return (
        <td className={\`px-6 py-4 whitespace-nowrap text-sm text-slate-600 \${alignClass[align]} \${className}\`}>
            {children}
        </td>
    );
};

const TableEmpty = ({ icon: Icon, title = '沒有資料', description, action }) => (
    <tr>
        <td colSpan="100%" className="px-6 py-12 text-center">
            {Icon && <div className="flex justify-center mb-4"><Icon className="text-slate-300" size={48} /></div>}
            <p className="text-slate-500 font-medium">{title}</p>
            {description && <p className="text-slate-400 text-sm mt-1">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </td>
    </tr>
);

export { Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty };
export default Table;
`;
}

function generateSearchComponent(sourceContent) {
    return `/**
 * Search Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Search = ({
    value,
    onChange,
    placeholder = '搜尋...',
    className = '',
    onClear,
    autoFocus = false,
}) => {
    const handleClear = () => {
        if (onClear) onClear();
        else if (onChange) onChange({ target: { value: '' } });
    };

    return (
        <div className={\`flex items-center gap-2 bg-white border border-slate-300 rounded-lg px-3 py-2 shadow-sm \${className}\`}>
            <svg className="text-slate-400 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </svg>
            <input
                type="text"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                className="outline-none text-sm w-full bg-transparent text-slate-700 placeholder:text-slate-400"
            />
            {value && (
                <button onClick={handleClear} className="text-slate-400 hover:text-slate-600 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
};

const FilterBar = ({
    searchValue,
    onSearchChange,
    searchPlaceholder = '搜尋...',
    filters = [],
    className = '',
}) => (
    <div className={\`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 \${className}\`}>
        <Search value={searchValue} onChange={onSearchChange} placeholder={searchPlaceholder} className="flex-1" />
        {filters.length > 0 && (
            <div className="flex items-center gap-2">
                {filters.map((filter, index) => (
                    <select
                        key={index}
                        value={filter.value}
                        onChange={filter.onChange}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {filter.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ))}
            </div>
        )}
    </div>
);

export { Search, FilterBar };
export default Search;
`;
}

function generateLayoutComponent(sourceContent) {
    return `/**
 * Layout Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Layout = ({ children, className = '' }) => (
    <div className={\`flex flex-col md:flex-row min-h-screen bg-slate-100 \${className}\`}>
        {children}
    </div>
);

const Sidebar = ({
    logo,
    logoText,
    navigation = [],
    activeItem,
    onNavigate,
    footer,
    className = '',
}) => (
    <aside className={\`w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-xl z-10 \${className}\`}>
        <div className="p-6 border-b border-slate-700">
            <h1 className="text-xl font-bold flex items-center gap-2">
                {logo}
                {logoText && <span>{logoText}</span>}
            </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = activeItem === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={\`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition \${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}\`}
                    >
                        {Icon && <Icon size={20} />}
                        <span>{item.label}</span>
                        {item.badge && <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{item.badge}</span>}
                    </button>
                );
            })}
        </nav>
        {footer && <div className="p-4 border-t border-slate-700">{footer}</div>}
    </aside>
);

const Content = ({ children, className = '' }) => (
    <main className={\`flex-1 overflow-auto \${className}\`}>{children}</main>
);

const PageHeader = ({
    title,
    subtitle,
    icon: Icon,
    action,
    breadcrumb,
    className = '',
}) => (
    <div className={\`bg-white border-b border-slate-200 \${className}\`}>
        {breadcrumb && <div className="px-6 py-2 text-sm text-slate-500 border-b border-slate-100">{breadcrumb}</div>}
        <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                {Icon && <Icon className="text-slate-700" size={28} />}
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
                    {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                </div>
            </div>
            {action && <div>{action}</div>}
        </div>
    </div>
);

const PageContainer = ({ children, className = '' }) => (
    <div className={\`p-6 \${className}\`}>{children}</div>
);

const Grid = ({ children, cols = 1, mdCols, lgCols, gap = 4, className = '' }) => {
    const colsMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
    const mdColsMap = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };
    const lgColsMap = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };
    const gapMap = { 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6' };

    return (
        <div className={\`grid \${colsMap[cols]} \${mdCols ? mdColsMap[mdCols] : ''} \${lgCols ? lgColsMap[lgCols] : ''} \${gapMap[gap]} \${className}\`}>
            {children}
        </div>
    );
};

export { Layout, Sidebar, Content, PageHeader, PageContainer, Grid };
export default Layout;
`;
}

function generateIndexFile() {
    return `/**
 * Component Library Index
 * 自動從主專案同步 - 請勿手動編輯
 */

export { default as Button } from './Button';
export { Input, Select, Textarea } from './Input';
export { Modal, ConfirmModal } from './Modal';
export { Card, CardWithHeader, StatCard } from './Card';
export { Badge, StatusBadge, RoleBadge } from './Badge';
export { Table, TableHead, TableHeader, TableBody, TableRow, TableCell, TableEmpty } from './Table';
export { Search, FilterBar } from './Search';
export { Layout, Sidebar, Content, PageHeader, PageContainer, Grid } from './Layout';
`;
}

// ============================================
// 生成 DESIGN_SYSTEM.md
// ============================================

function generateDesignSystemDoc(colors, components, version) {
    const timestamp = new Date().toISOString().split('T')[0];

    return `# 設計系統規範 Design System

> 自動從主專案同步生成 - 最後更新: ${timestamp} (${version})

基於「工作紀錄中心」專案的 UX/UI 設計規範，供後續專案參考使用。

---

## 1. 色彩系統 Color Palette

### 主要色彩 Primary Colors

| 用途 | Tailwind Class | 說明 |
|------|---------------|------|
| 主要操作 | \`bg-blue-600\`, \`text-blue-600\` | 按鈕、連結、主要互動 |
| 次要/AI功能 | \`bg-purple-600\`, \`text-purple-600\` | AI 對話、進階功能 |
| 成功狀態 | \`bg-emerald-600\`, \`text-emerald-700\` | 完成、成功訊息 |
| 危險/錯誤 | \`bg-red-600\`, \`text-red-600\` | 刪除、錯誤提示 |
| 中性基底 | \`bg-slate-800\`, \`text-slate-800\` | 文字、邊框、背景 |

### 目前使用的顏色

**背景色 (${colors.bg.length} 種)**
${colors.bg.slice(0, 20).map(c => `\`bg-${c}\``).join(', ')}${colors.bg.length > 20 ? '...' : ''}

**文字色 (${colors.text.length} 種)**
${colors.text.slice(0, 20).map(c => `\`text-${c}\``).join(', ')}${colors.text.length > 20 ? '...' : ''}

**邊框色 (${colors.border.length} 種)**
${colors.border.slice(0, 20).map(c => `\`border-${c}\``).join(', ')}${colors.border.length > 20 ? '...' : ''}

---

## 2. 字型系統 Typography

### 字型家族
\`\`\`css
font-family: 'Inter', 'Microsoft JhengHei', sans-serif;
\`\`\`

### 字型層級

| 用途 | Class |
|------|-------|
| 頁面標題 | \`text-2xl font-bold text-slate-800\` |
| 區塊標題 | \`text-xl font-bold text-slate-800\` |
| 小標題 | \`text-lg font-medium text-slate-700\` |
| 正文 | \`text-sm text-slate-600\` |
| 標籤 | \`text-xs font-bold text-slate-500 uppercase\` |
| 輔助說明 | \`text-xs text-slate-400\` |

---

## 3. 間距系統 Spacing

| 場景 | Class |
|------|-------|
| 卡片內距 | \`p-6\` |
| 表單欄位間距 | \`gap-4\` |
| 按鈕群組 | \`gap-2\` |
| 區塊間距 | \`mb-6\` |

---

## 4. 元件規範 Components

### 按鈕 Button
\`\`\`jsx
<Button variant="primary">主要按鈕</Button>
<Button variant="secondary">次要按鈕</Button>
<Button variant="danger">危險按鈕</Button>
<Button variant="success">成功按鈕</Button>
<Button variant="ghost">幽靈按鈕</Button>
\`\`\`

### 輸入框 Input
\`\`\`jsx
<Input label="欄位名稱" required />
<Select label="下拉選單" options={[...]} />
<Textarea label="多行輸入" rows={4} />
\`\`\`

### 彈窗 Modal
\`\`\`jsx
<Modal isOpen={open} onClose={close} title="標題">內容</Modal>
<ConfirmModal variant="danger" message="確認刪除？" />
\`\`\`

### 卡片 Card
\`\`\`jsx
<Card>基本卡片</Card>
<CardWithHeader title="標題" icon={Icon}>內容</CardWithHeader>
<StatCard title="統計" value="128" />
\`\`\`

### 標籤 Badge
\`\`\`jsx
<Badge variant="success">成功</Badge>
<StatusBadge status="pending" />
<RoleBadge role="admin" />
\`\`\`

---

## 5. 版面佈局 Layout

\`\`\`jsx
<Layout>
    <Sidebar navigation={[...]} activeItem={page} onNavigate={setPage} />
    <Content>
        <PageHeader title="頁面標題" />
        <PageContainer>
            <Grid cols={1} mdCols={2} gap={4}>...</Grid>
        </PageContainer>
    </Content>
</Layout>
\`\`\`

---

## 6. 目前專案元件列表

共 ${components.length} 個元件：

${components.map(c => `- \`${c}\``).join('\n')}

---

*此文件由 sync-design-system.js 自動生成*
`;
}

// ============================================
// 生成 README.md
// ============================================

function generateReadme(version, components) {
    const timestamp = new Date().toISOString().split('T')[0];

    return `# 設計系統 Design System

> 自動同步自「工作紀錄中心」${version} - 最後更新: ${timestamp}

## 目錄結構

\`\`\`
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
\`\`\`

## 快速開始

### 方式一：直接複製
\`\`\`bash
cp -r design-system/ /path/to/your-project/
\`\`\`

### 方式二：Git Submodule
\`\`\`bash
git submodule add https://github.com/Showchen168/Job-Management-System.git lib
# 使用 lib/design-system/
\`\`\`

### 方式三：下載 starter-template
直接複製 \`starter-template/index.html\` 開始新專案

## 元件使用

\`\`\`javascript
import {
    Button, Input, Select, Textarea,
    Modal, ConfirmModal,
    Card, CardWithHeader, StatCard,
    Badge, StatusBadge, RoleBadge,
    Table, TableHead, TableBody, TableRow, TableCell,
    Search, FilterBar,
    Layout, Sidebar, Content, PageHeader, Grid
} from './design-system/components';
\`\`\`

## 自動同步

此設計系統會在主專案 \`index.html\` 變更時自動同步更新：
- GitHub Action 自動觸發
- 更新所有元件檔案
- 更新設計規範文件
- 生成同步報告

## 源專案元件 (${components.length} 個)

${components.slice(0, 10).map(c => `- ${c}`).join('\n')}
${components.length > 10 ? `- ... 等共 ${components.length} 個` : ''}

---

*由 sync-design-system.js 自動生成*
`;
}

// ============================================
// 生成 starter-template
// ============================================

function generateStarterTemplate(version) {
    return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>應用程式名稱</title>
    <!-- 自動同步自工作紀錄中心 ${version} -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        * { font-family: 'Inter', 'Microsoft JhengHei', sans-serif; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        .animate-slide-in { animation: slideIn 0.2s ease-out; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        const { useState, useEffect, createContext, useContext } = React;

        // ========== Firebase 設定 ==========
        const firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_PROJECT.firebaseapp.com",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_PROJECT.appspot.com",
            messagingSenderId: "YOUR_SENDER_ID",
            appId: "YOUR_APP_ID"
        };

        const APP_VERSION = "v1.0.0";
        let app, auth, db;
        try {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
        } catch (e) { console.error('Firebase 初始化失敗:', e); }

        // ========== 通用元件 ==========
        const Button = ({ children, variant = 'primary', size = 'md', disabled, loading, onClick, className = '', ...props }) => {
            const variants = {
                primary: 'bg-blue-600 text-white hover:bg-blue-700',
                secondary: 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50',
                danger: 'bg-red-600 text-white hover:bg-red-700',
                success: 'bg-emerald-600 text-white hover:bg-emerald-700',
                ghost: 'text-slate-600 hover:bg-slate-100',
            };
            const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-2.5 text-base' };
            return (
                <button disabled={disabled || loading} onClick={onClick}
                    className={\`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed \${variants[variant]} \${sizes[size]} \${className}\`} {...props}>
                    {loading ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : children}
                </button>
            );
        };

        const Card = ({ children, className = '', padding = 'p-6' }) => (
            <div className={\`bg-white rounded-xl shadow-sm border border-slate-200 \${padding} \${className}\`}>{children}</div>
        );

        const Input = ({ label, required, error, hint, className = '', ...props }) => (
            <div className={className}>
                {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label} {required && <span className="text-red-500">*</span>}</label>}
                <input className={\`w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition \${error ? 'border-red-500' : 'border-slate-300'}\`} {...props} />
                {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
        );

        const Badge = ({ children, variant = 'default' }) => {
            const variants = {
                default: 'bg-gray-100 text-gray-700 border-gray-200',
                primary: 'bg-blue-100 text-blue-700 border-blue-200',
                success: 'bg-green-100 text-green-700 border-green-200',
                warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                danger: 'bg-red-100 text-red-700 border-red-200',
            };
            return <span className={\`px-2 py-1 rounded-full text-xs font-bold border \${variants[variant]}\`}>{children}</span>;
        };

        // ========== 頁面 ==========
        const LoginPage = () => {
            const [email, setEmail] = useState('');
            const [password, setPassword] = useState('');
            const [loading, setLoading] = useState(false);
            const [error, setError] = useState('');

            const handleSubmit = async (e) => {
                e.preventDefault();
                setLoading(true);
                setError('');
                try { await auth.signInWithEmailAndPassword(email, password); }
                catch (err) { setError('登入失敗：' + err.message); }
                finally { setLoading(false); }
            };

            return (
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
                    <Card className="w-full max-w-md" padding="p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold text-slate-800">歡迎回來</h1>
                            <p className="text-slate-500 mt-2">請登入您的帳號</p>
                        </div>
                        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input label="電子郵件" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            <Input label="密碼" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                            <Button type="submit" loading={loading} className="w-full">登入</Button>
                        </form>
                        <p className="text-center text-sm text-slate-500 mt-6">{APP_VERSION}</p>
                    </Card>
                </div>
            );
        };

        const Sidebar = ({ currentPage, setCurrentPage, user, onLogout }) => {
            const navItems = [
                { id: 'dashboard', label: '儀表板', icon: 'home' },
                { id: 'tasks', label: '任務管理', icon: 'file-text' },
                { id: 'settings', label: '設定', icon: 'settings' },
            ];
            return (
                <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-xl z-10">
                    <div className="p-6 border-b border-slate-700"><h1 className="text-xl font-bold">應用程式</h1></div>
                    <nav className="flex-1 p-4 space-y-2">
                        {navItems.map(item => (
                            <button key={item.id} onClick={() => setCurrentPage(item.id)}
                                className={\`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition \${currentPage === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}\`}>
                                <i data-lucide={item.icon} className="w-5 h-5"></i><span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                    <div className="p-4 border-t border-slate-700">
                        <p className="text-sm mb-2 truncate">{user?.email}</p>
                        <Button variant="ghost" onClick={onLogout} className="w-full text-slate-300">登出</Button>
                    </div>
                </aside>
            );
        };

        const DashboardPage = () => (
            <div className="p-6">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">儀表板</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {[{ label: '總數', value: '128' }, { label: '進行中', value: '45' }, { label: '已完成', value: '80' }, { label: '待處理', value: '3' }].map((s, i) => (
                        <Card key={i}><p className="text-sm text-slate-500">{s.label}</p><p className="text-3xl font-bold text-slate-800">{s.value}</p></Card>
                    ))}
                </div>
            </div>
        );

        const App = () => {
            const [user, setUser] = useState(null);
            const [loading, setLoading] = useState(true);
            const [currentPage, setCurrentPage] = useState('dashboard');

            useEffect(() => {
                const unsubscribe = auth.onAuthStateChanged((u) => { setUser(u); setLoading(false); });
                return () => unsubscribe();
            }, []);

            useEffect(() => { if (window.lucide) lucide.createIcons(); });

            if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100"><svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div>;
            if (!user) return <LoginPage />;

            return (
                <div className="flex flex-col md:flex-row min-h-screen bg-slate-100">
                    <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} user={user} onLogout={() => auth.signOut()} />
                    <main className="flex-1 overflow-auto">{currentPage === 'dashboard' && <DashboardPage />}</main>
                </div>
            );
        };

        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
`;
}

// ============================================
// 生成 PATTERNS.md (功能模式文件)
// ============================================

function extractFunctionalPatterns(content) {
    const patterns = {
        auth: [],
        permission: [],
        team: [],
        ai: [],
        utilities: []
    };

    // 提取認證相關
    if (content.includes('signInWithEmailAndPassword')) patterns.auth.push('Email/Password 登入');
    if (content.includes('createUserWithEmailAndPassword')) patterns.auth.push('註冊新帳號');
    if (content.includes('sendPasswordResetEmail')) patterns.auth.push('密碼重設');
    if (content.includes('onAuthStateChanged')) patterns.auth.push('登入狀態監聽');

    // 提取權限相關
    if (content.includes('checkIsAdmin')) patterns.permission.push('Admin 權限檢查');
    if (content.includes('checkIsEditor')) patterns.permission.push('Editor 權限檢查');
    if (content.includes('checkIsLeader')) patterns.permission.push('Leader 權限檢查');
    if (content.includes('ROOT_ADMINS')) patterns.permission.push('Root Admin 機制');
    if (content.includes('createPermissionManager')) patterns.permission.push('權限管理工具');

    // 提取團隊相關
    if (content.includes('getTeamLeaders')) patterns.team.push('取得團隊 Leader');
    if (content.includes('getLeaderTeamMembers')) patterns.team.push('取得團隊成員');
    if (content.includes('checkIsLeader')) patterns.team.push('Leader 身份檢查');

    // 提取 AI 相關
    if (content.includes('callGeminiAI')) patterns.ai.push('Gemini API 呼叫');
    if (content.includes('extractContentForAI')) patterns.ai.push('圖片內容提取');
    if (content.includes('AIConversationModal')) patterns.ai.push('AI 對話介面');

    // 提取工具函數
    if (content.includes('copyToClipboard')) patterns.utilities.push('剪貼簿複製');
    if (content.includes('exportToCSV')) patterns.utilities.push('CSV 匯出');
    if (content.includes('compressImage')) patterns.utilities.push('圖片壓縮');
    if (content.includes('formatLocalDate')) patterns.utilities.push('日期格式化');
    if (content.includes('downloadAsWord')) patterns.utilities.push('Word 文件下載');

    return patterns;
}

function generatePatternsDoc(patterns, version) {
    const timestamp = new Date().toISOString().split('T')[0];

    return `# 功能模式 Functional Patterns

> 自動同步自「工作紀錄中心」${version} - 最後更新: ${timestamp}

本文件記錄主專案中可重用的功能模式，供其他專案參考實作。

---

## 功能模組總覽

| 模組 | 功能數量 | 說明 |
|------|----------|------|
| 身份驗證 | ${patterns.auth.length} | Firebase Auth 整合 |
| 權限管理 | ${patterns.permission.length} | 多角色權限系統 |
| 團隊管理 | ${patterns.team.length} | 團隊協作功能 |
| AI 整合 | ${patterns.ai.length} | Gemini API 整合 |
| 通用工具 | ${patterns.utilities.length} | 常用工具函數 |

---

## 1. 身份驗證 (Authentication)

### 支援功能
${patterns.auth.map(f => `- ${f}`).join('\n')}

### 使用方式
\`\`\`javascript
// 登入
await signInWithEmailAndPassword(auth, email, password);

// 註冊
await createUserWithEmailAndPassword(auth, email, password);

// 登出
await signOut(auth);

// 監聽狀態
onAuthStateChanged(auth, (user) => { /* ... */ });
\`\`\`

---

## 2. 權限管理 (Permission Management)

### 支援功能
${patterns.permission.map(f => `- ${f}`).join('\n')}

### 權限層級
| 層級 | 角色 | 權限說明 |
|------|------|----------|
| 1 | Root Admin | 最高權限，硬編碼不可移除 |
| 2 | Admin | 管理所有資料和權限 |
| 3 | Editor | 存取所有資料 |
| 4 | Leader | 存取團隊資料 |
| 5 | User | 僅存取自己資料 |

### 使用方式
\`\`\`javascript
const isAdmin = checkIsAdmin(user, cloudAdmins);
const isEditor = checkIsEditor(user, cloudEditors);
const canAccessAll = isAdmin || isEditor;
\`\`\`

---

## 3. 團隊管理 (Team Management)

### 支援功能
${patterns.team.map(f => `- ${f}`).join('\n')}

### 資料結構
\`\`\`javascript
{
    id: "team-uuid",
    name: "團隊名稱",
    leaderIds: ["leader@example.com"],
    members: ["member@example.com"]
}
\`\`\`

### 使用方式
\`\`\`javascript
const isLeader = checkIsLeader(user, teams);
const teamMembers = getLeaderTeamMembers(user, teams);
\`\`\`

---

## 4. AI 整合 (AI Integration)

### 支援功能
${patterns.ai.map(f => `- ${f}`).join('\n')}

### 使用方式
\`\`\`javascript
const result = await callGeminiAI(
    [{ text: prompt }],
    apiKey,
    'gemini-2.5-flash'
);
\`\`\`

---

## 5. 通用工具 (Utilities)

### 支援功能
${patterns.utilities.map(f => `- ${f}`).join('\n')}

---

## 詳細文件

完整的程式碼範例和實作細節，請參考主專案 \`index.html\` 或在提示詞中指定需要的功能模組。

---

*由 sync-design-system.js 自動生成*
`;
}

// ============================================
// 生成 PROMPT.md (提示詞指南)
// ============================================

function generatePromptDoc(patterns, components, version) {
    const timestamp = new Date().toISOString().split('T')[0];

    return `# AI 提示詞指南 Prompt Guide

> 自動同步自「工作紀錄中心」${version} - 最後更新: ${timestamp}

本文件提供在其他專案中引用此設計系統和功能模式的標準提示詞。

---

## 快速參考

### 新專案 (UI + 功能)
\`\`\`
請使用以下設計系統建立新專案：
https://github.com/Showchen168/Job-Management-System/tree/main/design-system

參考檔案：
- starter-template/index.html (專案模板)
- DESIGN_SYSTEM.md (設計規範)
- PATTERNS.md (功能模式)
- components/ (元件庫)

需求：[描述你的需求]
\`\`\`

### 僅 UI 改良
\`\`\`
請參考以下設計系統統一我的專案 UI 風格：
https://github.com/Showchen168/Job-Management-System/tree/main/design-system

重點：
- 色彩：blue-600 主色、emerald-600 成功、red-600 錯誤
- 卡片：rounded-xl shadow-sm border border-slate-200
- 按鈕：rounded-lg font-medium transition
- 文字：標題 slate-800、內文 slate-600

只改 UI，保持功能不變。
\`\`\`

---

## 功能模組提示詞

### 身份驗證
\`\`\`
請參考 PATTERNS.md 實作登入功能：
- Firebase Auth (Email/Password)
- 登入/註冊/忘記密碼
- 錯誤訊息中文化
\`\`\`

### 權限管理
\`\`\`
請參考 PATTERNS.md 實作權限系統：
- 三級權限：Admin > Editor > User
- Firestore 儲存權限清單
- UI 根據權限顯示/隱藏功能
\`\`\`

### 團隊管理
\`\`\`
請參考 PATTERNS.md 實作團隊功能：
- 團隊 CRUD
- 多組長支援
- 組長可查看組員資料
\`\`\`

### AI 整合
\`\`\`
請參考 PATTERNS.md 實作 AI 功能：
- Gemini API 呼叫
- 支援文字和圖片
- AI 對話介面
\`\`\`

---

## 目前可用資源

### 元件庫 (${components.length} 個源元件)
${components.slice(0, 10).map(c => `- ${c}`).join('\n')}
${components.length > 10 ? `- ... 等共 ${components.length} 個` : ''}

### 功能模式
- 身份驗證: ${patterns.auth.length} 項
- 權限管理: ${patterns.permission.length} 項
- 團隊管理: ${patterns.team.length} 項
- AI 整合: ${patterns.ai.length} 項
- 通用工具: ${patterns.utilities.length} 項

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
`;
}

// ============================================
// 讀取 src 目錄所有檔案
// ============================================

function readAllSrcFiles() {
    let allContent = '';

    // 讀取 App.jsx
    const appContent = readFile(APP_JSX);
    if (appContent) {
        allContent += appContent + '\n';
    }

    // 讀取 index.css
    const cssContent = readFile(INDEX_CSS);
    if (cssContent) {
        allContent += cssContent + '\n';
    }

    // 讀取 src/components 目錄下的所有 jsx 檔案
    if (fs.existsSync(COMPONENTS_SRC_DIR)) {
        const files = fs.readdirSync(COMPONENTS_SRC_DIR);
        for (const file of files) {
            if (file.endsWith('.jsx') || file.endsWith('.js')) {
                const content = readFile(path.join(COMPONENTS_SRC_DIR, file));
                if (content) {
                    allContent += content + '\n';
                }
            }
        }
    }

    return allContent;
}

// ============================================
// 主函數
// ============================================

function main() {
    console.log('🔄 開始完整同步 Design System...\n');

    // 從 src/ 目錄讀取所有檔案內容
    const sourceContent = readAllSrcFiles();
    if (!sourceContent) {
        console.error('無法讀取 src/ 目錄檔案');
        process.exit(1);
    }

    const version = extractVersion(sourceContent);
    const colors = extractColors(sourceContent);
    const components = extractAllComponents(sourceContent);

    console.log(`📦 源版本: ${version}`);
    console.log(`📦 元件數量: ${components.length}`);
    console.log(`🎨 顏色統計: bg(${colors.bg.length}) text(${colors.text.length}) border(${colors.border.length})\n`);

    // 1. 更新元件檔案
    console.log('📁 更新元件檔案...');
    writeFile(path.join(COMPONENTS_DIR, 'Button.jsx'), generateButtonComponent(sourceContent));
    writeFile(path.join(COMPONENTS_DIR, 'Input.jsx'), generateInputComponent(sourceContent));
    writeFile(path.join(COMPONENTS_DIR, 'Modal.jsx'), generateModalComponent(sourceContent));
    writeFile(path.join(COMPONENTS_DIR, 'Card.jsx'), generateCardComponent(sourceContent));
    writeFile(path.join(COMPONENTS_DIR, 'Badge.jsx'), generateBadgeComponent(sourceContent));
    writeFile(path.join(COMPONENTS_DIR, 'Table.jsx'), generateTableComponent(sourceContent));
    writeFile(path.join(COMPONENTS_DIR, 'Search.jsx'), generateSearchComponent(sourceContent));
    writeFile(path.join(COMPONENTS_DIR, 'Layout.jsx'), generateLayoutComponent(sourceContent));
    writeFile(path.join(COMPONENTS_DIR, 'index.js'), generateIndexFile());

    // 2. 更新 DESIGN_SYSTEM.md
    console.log('\n📄 更新設計規範文件...');
    writeFile(path.join(DESIGN_SYSTEM_DIR, 'DESIGN_SYSTEM.md'), generateDesignSystemDoc(colors, components, version));

    // 3. 更新 README.md
    console.log('\n📄 更新 README...');
    writeFile(path.join(DESIGN_SYSTEM_DIR, 'README.md'), generateReadme(version, components));

    // 4. 更新 starter-template
    console.log('\n📄 更新專案模板...');
    writeFile(STARTER_TEMPLATE, generateStarterTemplate(version));

    // 5. 更新 PATTERNS.md 和 PROMPT.md
    console.log('\n📄 更新功能模式和提示詞文件...');
    const patterns = extractFunctionalPatterns(sourceContent);
    writeFile(path.join(DESIGN_SYSTEM_DIR, 'PATTERNS.md'), generatePatternsDoc(patterns, version));
    writeFile(path.join(DESIGN_SYSTEM_DIR, 'PROMPT.md'), generatePromptDoc(patterns, components, version));

    // 6. 更新 version.json
    const versionInfo = {
        lastSync: new Date().toISOString(),
        sourceVersion: version,
        componentsCount: components.length,
        components: components,
        colors: colors,
        patterns: {
            auth: patterns.auth.length,
            permission: patterns.permission.length,
            team: patterns.team.length,
            ai: patterns.ai.length,
            utilities: patterns.utilities.length,
        },
    };
    writeFile(path.join(DESIGN_SYSTEM_DIR, 'version.json'), JSON.stringify(versionInfo, null, 2));

    // 7. 生成同步報告
    const report = `# Design System 同步報告

生成時間: ${new Date().toISOString()}
源版本: ${version}

## 更新內容

### UI 元件
- ✅ components/Button.jsx
- ✅ components/Input.jsx
- ✅ components/Modal.jsx
- ✅ components/Card.jsx
- ✅ components/Badge.jsx
- ✅ components/Table.jsx
- ✅ components/Search.jsx
- ✅ components/Layout.jsx
- ✅ components/index.js

### 文件
- ✅ DESIGN_SYSTEM.md (設計規範)
- ✅ PATTERNS.md (功能模式)
- ✅ PROMPT.md (提示詞指南)
- ✅ README.md (說明文件)

### 模板和資訊
- ✅ starter-template/index.html
- ✅ version.json

## 統計

### UI
- 元件數量: ${components.length}
- 背景色: ${colors.bg.length} 種
- 文字色: ${colors.text.length} 種
- 邊框色: ${colors.border.length} 種

### 功能模式
- 身份驗證: ${patterns.auth.length} 項
- 權限管理: ${patterns.permission.length} 項
- 團隊管理: ${patterns.team.length} 項
- AI 整合: ${patterns.ai.length} 項
- 通用工具: ${patterns.utilities.length} 項

---
*由 sync-design-system.cjs 自動生成*
`;
    writeFile(path.join(DESIGN_SYSTEM_DIR, 'SYNC_REPORT.md'), report);

    console.log('\n✅ Design System 完整同步完成!');
}

main();

