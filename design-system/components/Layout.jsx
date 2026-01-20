/**
 * Layout Components
 * 版面佈局元件，包含 Sidebar、Header、Content 等
 */

// Main Layout Container
const Layout = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-col md:flex-row min-h-screen bg-slate-100 ${className}`}>
      {children}
    </div>
  );
};

// Sidebar Component
const Sidebar = ({
  logo,
  logoText,
  navigation = [],
  activeItem,
  onNavigate,
  footer,
  className = '',
}) => {
  return (
    <aside className={`w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-xl z-10 ${className}`}>
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          {logo}
          {logoText && <span>{logoText}</span>}
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition
                ${isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800'
                }
              `}
            >
              {Icon && <Icon size={20} />}
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-slate-700">
          {footer}
        </div>
      )}
    </aside>
  );
};

// Nav Item (for Sidebar)
const NavItem = ({
  icon: Icon,
  label,
  active = false,
  badge,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition
        ${active
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-slate-300 hover:bg-slate-800'
        }
      `}
    >
      {Icon && <Icon size={20} />}
      <span>{label}</span>
      {badge && (
        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
};

// Main Content Area
const Content = ({ children, className = '' }) => {
  return (
    <main className={`flex-1 overflow-auto ${className}`}>
      {children}
    </main>
  );
};

// Page Header
const PageHeader = ({
  title,
  subtitle,
  icon: Icon,
  action,
  breadcrumb,
  className = '',
}) => {
  return (
    <div className={`bg-white border-b border-slate-200 ${className}`}>
      {/* Breadcrumb */}
      {breadcrumb && (
        <div className="px-6 py-2 text-sm text-slate-500 border-b border-slate-100">
          {breadcrumb}
        </div>
      )}

      {/* Header Content */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="text-slate-700" size={28} />}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
};

// Page Container
const PageContainer = ({ children, className = '' }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

// Grid Layout
const Grid = ({
  children,
  cols = 1,
  mdCols,
  lgCols,
  gap = 4,
  className = '',
}) => {
  const colsMap = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
  };

  const mdColsMap = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    5: 'md:grid-cols-5',
    6: 'md:grid-cols-6',
  };

  const lgColsMap = {
    1: 'lg:grid-cols-1',
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
  };

  const gapMap = {
    1: 'gap-1',
    2: 'gap-2',
    3: 'gap-3',
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
  };

  return (
    <div
      className={`
        grid ${colsMap[cols]}
        ${mdCols ? mdColsMap[mdCols] : ''}
        ${lgCols ? lgColsMap[lgCols] : ''}
        ${gapMap[gap]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// 使用範例
/*
<Layout>
  <Sidebar
    logoText="系統名稱"
    navigation={[
      { id: 'dashboard', label: '儀表板', icon: Home },
      { id: 'tasks', label: '任務管理', icon: FileText, badge: 3 },
      { id: 'settings', label: '設定', icon: Settings },
    ]}
    activeItem={currentPage}
    onNavigate={setCurrentPage}
    footer={<UserMenu user={currentUser} />}
  />

  <Content>
    <PageHeader
      title="任務管理"
      subtitle="管理所有任務"
      icon={FileText}
      action={<Button icon={Plus}>新增任務</Button>}
    />

    <PageContainer>
      <Grid cols={1} mdCols={2} lgCols={4} gap={4}>
        <StatCard title="總任務" value="128" />
        <StatCard title="進行中" value="45" />
        <StatCard title="已完成" value="80" />
        <StatCard title="待處理" value="3" />
      </Grid>
    </PageContainer>
  </Content>
</Layout>
*/

export {
  Layout,
  Sidebar,
  NavItem,
  Content,
  PageHeader,
  PageContainer,
  Grid,
};
export default Layout;
