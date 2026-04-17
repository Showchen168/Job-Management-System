import { formatEmailPrefix, getTeamLeaders } from './permissions';

export const isArchivedBoardItem = (item = {}) => {
    const normalizedStatus = String(item.status || '').toLowerCase();
    return normalizedStatus.includes('done')
        || normalizedStatus.includes('complete')
        || normalizedStatus.includes('完成')
        || normalizedStatus.includes('已解決')
        || normalizedStatus.includes('closed')
        || normalizedStatus.includes('關閉');
};

export const formatBoardDate = (value) => {
    if (!value) return '—';
    if (typeof value === 'string') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('zh-TW');
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000).toLocaleDateString('zh-TW');
    }
    return '—';
};

export const buildBoardItems = ({ tasks = [], issues = [] }) => ([
    ...tasks.map((task) => ({
        ...task,
        type: 'task',
        assigneeEmail: task.assigneeEmail || '',
        assigneeName: task.assignee || formatEmailPrefix(task.assigneeEmail || ''),
        lastEditedLabel: formatBoardDate(task.updatedAt || task.createdAt),
    })),
    ...issues.map((issue) => ({
        ...issue,
        type: 'issue',
        assigneeEmail: issue.assigneeEmail || '',
        assigneeName: issue.assignee || formatEmailPrefix(issue.assigneeEmail || ''),
        lastEditedLabel: formatBoardDate(issue.updatedAt || issue.createdAt),
    })),
]);

export const filterBoardItems = (items = [], { teamId = 'All', type = 'All', status = 'All' } = {}) => (
    items.filter((item) => {
        if (teamId !== 'All' && item.teamId !== teamId) return false;
        if (type !== 'All' && item.type !== type) return false;
        if (status !== 'All' && item.status !== status) return false;
        return true;
    })
);

export const buildTeamBoardColumns = ({ team, items = [] }) => {
    const members = [
        ...getTeamLeaders(team).map((email) => ({ email, role: 'leader' })),
        ...(team?.members || []).map((email) => ({ email, role: 'member' })),
    ];

    return members.map(({ email, role }) => ({
        memberEmail: email,
        memberName: formatEmailPrefix(email),
        role,
        items: items.filter((item) => item.assigneeEmail === email),
    }));
};
