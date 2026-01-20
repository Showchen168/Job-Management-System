/**
 * Card Component
 * 通用卡片元件，支援多種樣式變體
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

  const baseStyles = `
    bg-white rounded-xl shadow-sm border border-slate-200
    ${hover ? 'hover:bg-slate-50 cursor-pointer transition-colors' : ''}
    ${paddingSizes[padding]}
  `;

  return (
    <div
      className={`${baseStyles} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

// Card with Header
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
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={`p-3 rounded-full ${iconBgColor}`}>
              <Icon className={iconColor} size={24} />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
            {subtitle && (
              <p className="text-sm text-slate-500">{subtitle}</p>
            )}
          </div>
        </div>
        {headerAction && (
          <div>{headerAction}</div>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
};

// Stat Card - 統計數據卡片
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
            <p className={`text-sm mt-1 ${trendColors[trend] || trendColors.neutral}`}>
              {trend === 'up' && '↑ '}
              {trend === 'down' && '↓ '}
              {trendValue}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-4 rounded-full ${iconBgColor}`}>
            <Icon className={iconColor} size={28} />
          </div>
        )}
      </div>
    </Card>
  );
};

// 使用範例
/*
<Card hover onClick={handleClick}>
  <h3>標題</h3>
  <p>內容</p>
</Card>

<CardWithHeader
  title="系統設定"
  subtitle="管理應用程式設定"
  icon={Settings}
  iconBgColor="bg-purple-100"
  iconColor="text-purple-700"
  headerAction={<Button size="sm">編輯</Button>}
>
  <form>...</form>
</CardWithHeader>

<StatCard
  title="本月任務"
  value="128"
  icon={FileText}
  trend="up"
  trendValue="12% 較上月"
/>
*/

export { Card, CardWithHeader, StatCard };
export default Card;
