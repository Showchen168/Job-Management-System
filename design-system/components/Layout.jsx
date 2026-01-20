/**
 * Layout Components
 * 自動從主專案同步 - 請勿手動編輯
 */

const Layout = ({ children, className = '' }) => (
    <div className={`flex flex-col md:flex-row min-h-screen bg-slate-100 ${className}`}>
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
    <aside className={`w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-xl z-10 ${className}`}>
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
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'}`}
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
    <main className={`flex-1 overflow-auto ${className}`}>{children}</main>
);

const PageHeader = ({
    title,
    subtitle,
    icon: Icon,
    action,
    breadcrumb,
    className = '',
}) => (
    <div className={`bg-white border-b border-slate-200 ${className}`}>
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
    <div className={`p-6 ${className}`}>{children}</div>
);

const Grid = ({ children, cols = 1, mdCols, lgCols, gap = 4, className = '' }) => {
    const colsMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };
    const mdColsMap = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' };
    const lgColsMap = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };
    const gapMap = { 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6' };

    return (
        <div className={`grid ${colsMap[cols]} ${mdCols ? mdColsMap[mdCols] : ''} ${lgCols ? lgColsMap[lgCols] : ''} ${gapMap[gap]} ${className}`}>
            {children}
        </div>
    );
};

export { Layout, Sidebar, Content, PageHeader, PageContainer, Grid };
export default Layout;
