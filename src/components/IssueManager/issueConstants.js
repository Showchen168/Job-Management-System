export const ISSUE_STATUSES = ['處理中', '待驗證', '已解決'];

export const priorityConfig = {
    high: { color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
    medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
    low: { color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
};

export const issueStatusConfig = {
    '處理中': { color: 'bg-blue-100 text-blue-700', icon: '🔵' },
    '待驗證': { color: 'bg-yellow-100 text-yellow-700', icon: '🟡' },
    '已解決': { color: 'bg-green-100 text-green-700', icon: '🟢' },
};
