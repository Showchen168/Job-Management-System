/**
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
        <span className={`inline-flex items-center rounded-full font-bold border ${variants[variant]} ${sizes[size]} ${className}`}>
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
