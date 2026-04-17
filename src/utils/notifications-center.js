import { extractEmailPrefix, formatEmailPrefix } from './permissions';

const buildBaseNotification = ({ type, item, actorEmail, receiverEmail, message }) => ({
    type,
    title: type.endsWith('_assigned')
        ? `你有新${item?.entityType === 'issue' ? '問題' : '任務'}`
        : `你的${item?.entityType === 'issue' ? '問題' : '任務'}有新留言`,
    message,
    targetPath: item?.path || '',
    targetId: item?.id || '',
    targetType: item?.entityType || 'task',
    read: false,
    actorEmail,
    receiverEmail,
});

export const buildAssignmentNotification = ({ entityType, item, actorEmail, receiverEmail }) => {
    if (!receiverEmail || receiverEmail === actorEmail) return null;

    return buildBaseNotification({
        type: `${entityType}_assigned`,
        item: { ...item, entityType },
        actorEmail,
        receiverEmail,
        message: item?.title || '未命名卡片',
    });
};

export const buildCommentNotifications = ({ entityType, item, actorEmail, commentPreview }) => {
    const recipients = Array.from(new Set(
        [item?.assigneeEmail, item?.createdByEmail].filter(Boolean)
    )).filter((email) => email !== actorEmail);

    return recipients.map((receiverEmail) => buildBaseNotification({
        type: `${entityType}_comment`,
        item: { ...item, entityType },
        actorEmail,
        receiverEmail,
        message: commentPreview || item?.title || '未命名卡片',
    }));
};

export const countUnreadNotifications = (notifications = []) => (
    notifications.filter((item) => !item?.read).length
);

export const buildNotificationTargetKey = ({ targetType = 'task', targetId = '', targetPath = '' } = {}) => (
    `${targetType}:${targetId || targetPath || ''}`
);

export const buildUnreadCommentCountMap = (notifications = []) => (
    notifications.reduce((acc, notification) => {
        if (notification?.read || !String(notification?.type || '').endsWith('_comment')) {
            return acc;
        }

        const key = buildNotificationTargetKey(notification);
        if (!key || key.endsWith(':')) return acc;

        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {})
);

export const buildUserDirectoryMap = (users = []) => (
    users.reduce((acc, user) => {
        if (!user?.email || !user?.uid) return acc;
        acc[user.email.toLowerCase()] = {
            uid: user.uid,
            email: user.email,
            name: formatEmailPrefix(user.email),
        };
        return acc;
    }, {})
);

export const resolveDirectoryUser = (userDirectoryMap = {}, value = '') => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return null;

    if (userDirectoryMap[normalized]) {
        return userDirectoryMap[normalized];
    }

    const prefix = extractEmailPrefix(normalized);
    if (!prefix) return null;

    return Object.values(userDirectoryMap).find((user) => (
        extractEmailPrefix(user?.email)?.toLowerCase() === prefix.toLowerCase()
    )) || null;
};
