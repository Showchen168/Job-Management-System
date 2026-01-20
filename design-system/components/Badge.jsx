/**
 * Badge Component
 * 狀態標籤元件，用於顯示狀態、分類等
 */

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  // 預設變體樣式
  const variants = {
    default: 'bg-gray-100 text-gray-700 border-gray-200',
    primary: 'bg-blue-100 text-blue-700 border-blue-200',
    success: 'bg-green-100 text-green-700 border-green-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    danger: 'bg-red-100 text-red-700 border-red-200',
    info: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  // 尺寸樣式
  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const baseStyles = 'inline-flex items-center rounded-full font-bold border';

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};

// Status Badge - 根據狀態自動選擇顏色
const StatusBadge = ({ status, statusMap, className = '' }) => {
  // 預設狀態映射
  const defaultStatusMap = {
    pending: { label: '待處理', variant: 'warning' },
    'in-progress': { label: '進行中', variant: 'primary' },
    completed: { label: '已完成', variant: 'success' },
    cancelled: { label: '已取消', variant: 'default' },
    error: { label: '錯誤', variant: 'danger' },
    active: { label: '啟用', variant: 'success' },
    inactive: { label: '停用', variant: 'default' },
  };

  const map = statusMap || defaultStatusMap;
  const config = map[status] || { label: status, variant: 'default' };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};

// Role Badge - 角色標籤
const RoleBadge = ({ role, className = '' }) => {
  const roleConfig = {
    admin: { label: '管理員', variant: 'danger' },
    editor: { label: '編輯者', variant: 'primary' },
    leader: { label: '組長', variant: 'purple' },
    user: { label: '一般用戶', variant: 'default' },
  };

  const config = roleConfig[role] || { label: role, variant: 'default' };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
};

// 使用範例
/*
<Badge variant="success">已完成</Badge>
<Badge variant="warning" size="sm">待審核</Badge>
<Badge variant="danger" size="lg">緊急</Badge>

<StatusBadge status="pending" />
<StatusBadge
  status="custom"
  statusMap={{
    custom: { label: '自訂狀態', variant: 'purple' }
  }}
/>

<RoleBadge role="admin" />
*/

export { Badge, StatusBadge, RoleBadge };
export default Badge;
