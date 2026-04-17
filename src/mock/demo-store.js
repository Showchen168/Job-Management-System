import { buildCommentPayload, buildCommentSummary } from '../utils/comments';
import { DEFAULT_ROLE_DEFINITIONS } from '../constants';
import {
    buildAssignmentNotification,
    buildCommentNotifications,
} from '../utils/notifications-center';
import { formatEmailPrefix } from '../utils/permissions';

const DEMO_STORAGE_KEY = 'jms-demo-state-v1';

const createDemoTimestamp = () => new Date().toISOString();

const createId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const createPath = (entityType, id) => `mock/${entityType}s/${id}`;

export const buildInitialDemoState = () => ({
    teams: [
        {
            id: 'team-rd',
            name: '研發一組',
            leaderIds: ['leader@test.com'],
            members: ['doris@test.com', 'showchen@aivres.com'],
        },
    ],
    users: [
        { uid: 'user-admin', email: 'showchen@aivres.com' },
        { uid: 'user-leader', email: 'leader@test.com' },
        { uid: 'user-doris', email: 'doris@test.com' },
    ],
    userRoles: {
        'showchen@aivres.com': 'admin',
        'leader@test.com': 'leader',
        'doris@test.com': 'viewer',
    },
    roleDefinitions: DEFAULT_ROLE_DEFINITIONS,
    tasks: [
        {
            id: 'task-seed-1',
            path: createPath('task', 'task-seed-1'),
            title: '補員工通知鈴鐺',
            assignee: 'doris',
            assigneeEmail: 'doris@test.com',
            status: 'On-going',
            source: 'Meeting',
            assignedDate: '2026-04-17',
            dueDate: '2026-04-18',
            progress: '等待 Doris 補前端通知樣式',
            teamId: 'team-rd',
            teamName: '研發一組',
            createdByEmail: 'showchen@aivres.com',
            createdAt: '2026-04-17T09:00:00.000Z',
            commentCount: 2,
            lastCommentBy: 'doris',
            lastCommentPreview: '我先把員工看到的通知入口整理好了',
            comments: [
                {
                    id: 'comment-seed-1',
                    content: '請今天先把鈴鐺畫面補起來',
                    entityType: 'task',
                    createdByEmail: 'showchen@aivres.com',
                    createdByName: 'showchen',
                    createdAt: '2026-04-17T09:10:00.000Z',
                },
                {
                    id: 'comment-seed-2',
                    content: '我先把員工看到的通知入口整理好了',
                    entityType: 'task',
                    createdByEmail: 'doris@test.com',
                    createdByName: 'doris',
                    createdAt: '2026-04-17T09:35:00.000Z',
                },
            ],
        },
        {
            id: 'task-seed-2',
            path: createPath('task', 'task-seed-2'),
            title: '整理交接文件',
            assignee: 'showchen',
            assigneeEmail: 'showchen@aivres.com',
            status: 'Done',
            source: 'Meeting',
            assignedDate: '2026-04-15',
            dueDate: '2026-04-16',
            progress: '文件已確認完成，等待備查。',
            teamId: 'team-rd',
            teamName: '研發一組',
            createdByEmail: 'leader@test.com',
            createdAt: '2026-04-16T09:00:00.000Z',
            updatedAt: '2026-04-16T17:30:00.000Z',
            commentCount: 1,
            lastCommentBy: 'leader',
            lastCommentPreview: '這張可以先歸檔',
            comments: [
                {
                    id: 'comment-seed-3',
                    content: '這張可以先歸檔',
                    entityType: 'task',
                    createdByEmail: 'leader@test.com',
                    createdByName: 'leader',
                    createdAt: '2026-04-16T17:30:00.000Z',
                },
            ],
        },
    ],
    issues: [
        {
            id: 'issue-seed-1',
            path: createPath('issue', 'issue-seed-1'),
            itemName: '員工工作台',
            title: '留言區高度太擠',
            description: '卡片展開後留言區太窄，手機上不易閱讀。',
            issueSource: '開發',
            client: '開發',
            issueLocation: '測試',
            issueEscalation: '項目組',
            status: '處理中',
            assignee: 'leader',
            assigneeEmail: 'leader@test.com',
            dueDate: '2026-04-20',
            progress: '先調整桌機版 spacing，再處理手機版。',
            teamId: 'team-rd',
            teamName: '研發一組',
            createdByEmail: 'showchen@aivres.com',
            createdAt: '2026-04-17T08:30:00.000Z',
            commentCount: 0,
            comments: [],
        },
    ],
    notifications: [
        {
            id: 'notif-seed-1',
            type: 'task_assigned',
            title: '你有新任務',
            message: '補員工通知鈴鐺',
            targetPath: createPath('task', 'task-seed-1'),
            targetId: 'task-seed-1',
            targetType: 'task',
            read: false,
            actorEmail: 'showchen@aivres.com',
            receiverEmail: 'doris@test.com',
            createdAt: '2026-04-17T09:00:00.000Z',
            updatedAt: '2026-04-17T09:00:00.000Z',
        },
        {
            id: 'notif-seed-2',
            type: 'task_comment',
            title: '你的任務有新留言',
            message: '我先把員工看到的通知入口整理好了',
            targetPath: createPath('task', 'task-seed-1'),
            targetId: 'task-seed-1',
            targetType: 'task',
            read: false,
            actorEmail: 'doris@test.com',
            receiverEmail: 'showchen@aivres.com',
            createdAt: '2026-04-17T09:35:00.000Z',
            updatedAt: '2026-04-17T09:35:00.000Z',
        },
    ],
});

export const loadDemoState = ({ reset = false } = {}) => {
    if (typeof window === 'undefined') return buildInitialDemoState();
    if (reset) {
        const nextState = buildInitialDemoState();
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextState));
        return nextState;
    }

    const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!saved) {
        const initialState = buildInitialDemoState();
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(initialState));
        return initialState;
    }

    try {
        return JSON.parse(saved);
    } catch {
        const fallback = buildInitialDemoState();
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fallback));
        return fallback;
    }
};

export const saveDemoState = (state) => {
    if (typeof window === 'undefined') return state;
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
    return state;
};

const sortNotifications = (notifications = []) => (
    [...notifications].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
);

const normalizeEntity = ({ entityType, formData, actorEmail }) => {
    const id = formData.id || createId(entityType);
    return {
        ...formData,
        id,
        path: formData.path || createPath(entityType, id),
        createdByEmail: formData.createdByEmail || actorEmail,
        createdAt: formData.createdAt || createDemoTimestamp(),
        updatedAt: createDemoTimestamp(),
        comments: formData.comments || [],
        commentCount: formData.commentCount || 0,
        lastCommentBy: formData.lastCommentBy || '',
        lastCommentPreview: formData.lastCommentPreview || '',
    };
};

const appendNotification = (state, notification) => {
    if (!notification) return state;
    return {
        ...state,
        notifications: sortNotifications([
            {
                ...notification,
                id: createId('notification'),
                createdAt: createDemoTimestamp(),
                updatedAt: createDemoTimestamp(),
            },
            ...(state.notifications || []),
        ]),
    };
};

export const getNotificationsForUser = (state, userEmail) => (
    sortNotifications(
        (state.notifications || []).filter((notification) => notification.receiverEmail === userEmail)
    )
);

export const upsertDemoEntity = (state, { entityType, actorEmail, formData }) => {
    const collectionKey = entityType === 'issue' ? 'issues' : 'tasks';
    const currentItems = state[collectionKey] || [];
    const existingItem = currentItems.find((item) => item.id === formData.id);
    const nextItem = normalizeEntity({ entityType, formData, actorEmail });
    const previousAssignee = existingItem?.assigneeEmail || '';
    const nextItems = existingItem
        ? currentItems.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem } : item))
        : [nextItem, ...currentItems];

    const assignmentNotification = nextItem.assigneeEmail && nextItem.assigneeEmail !== previousAssignee
        ? buildAssignmentNotification({
            entityType,
            item: nextItem,
            actorEmail,
            receiverEmail: nextItem.assigneeEmail,
        })
        : null;

    return appendNotification(
        { ...state, [collectionKey]: nextItems },
        assignmentNotification
    );
};

export const addDemoComment = (state, { entityType, itemId, actorEmail, content }) => {
    const collectionKey = entityType === 'issue' ? 'issues' : 'tasks';
    const currentItems = state[collectionKey] || [];
    const currentItem = currentItems.find((item) => item.id === itemId);
    if (!currentItem) return state;

    const payload = buildCommentPayload({
        content,
        entityType,
        user: { email: actorEmail },
    });

    const comment = {
        ...payload,
        id: createId('comment'),
        createdAt: createDemoTimestamp(),
        updatedAt: createDemoTimestamp(),
    };

    const summary = buildCommentSummary({
        existingCount: currentItem.commentCount || currentItem.comments?.length || 0,
        comment,
    });

    const updatedItem = {
        ...currentItem,
        comments: [...(currentItem.comments || []), comment],
        ...summary,
        lastCommentAt: comment.createdAt,
        updatedAt: createDemoTimestamp(),
    };

    const nextState = {
        ...state,
        [collectionKey]: currentItems.map((item) => (item.id === itemId ? updatedItem : item)),
    };

    const notifications = buildCommentNotifications({
        entityType,
        item: updatedItem,
        actorEmail,
        commentPreview: summary.lastCommentPreview,
    });

    return notifications.reduce((acc, notification) => appendNotification(acc, notification), nextState);
};

export const markDemoNotificationRead = (state, { userEmail, notificationId }) => ({
    ...state,
    notifications: (state.notifications || []).map((notification) => (
        notification.id === notificationId && notification.receiverEmail === userEmail
            ? { ...notification, read: true, readAt: createDemoTimestamp(), updatedAt: createDemoTimestamp() }
            : notification
    )),
});

export const markAllDemoNotificationsRead = (state, { userEmail }) => ({
    ...state,
    notifications: (state.notifications || []).map((notification) => (
        notification.receiverEmail === userEmail && !notification.read
            ? { ...notification, read: true, readAt: createDemoTimestamp(), updatedAt: createDemoTimestamp() }
            : notification
    )),
});

export const deleteDemoEntity = (state, { entityType, itemId }) => {
    const collectionKey = entityType === 'issue' ? 'issues' : 'tasks';
    return {
        ...state,
        [collectionKey]: (state[collectionKey] || []).filter((item) => item.id !== itemId),
    };
};

export const getDemoUser = (state, email) => {
    const matched = (state.users || []).find((user) => user.email === email);
    if (matched) return matched;
    return {
        uid: createId('user'),
        email,
        name: formatEmailPrefix(email),
    };
};
