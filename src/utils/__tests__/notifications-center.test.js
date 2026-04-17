import { describe, it, expect } from 'vitest';
import {
    buildAssignmentNotification,
    buildCommentNotifications,
    buildUnreadCommentCountMap,
    countUnreadNotifications,
    buildUserDirectoryMap,
    resolveDirectoryUser,
} from '../notifications-center';

describe('buildAssignmentNotification', () => {
    it('creates task assignment notification', () => {
        const notification = buildAssignmentNotification({
            entityType: 'task',
            item: { id: 'task-1', title: '補通知鈴鐺', path: 'users/u1/tasks/task-1' },
            actorEmail: 'leader@test.com',
            receiverEmail: 'doris@test.com',
        });

        expect(notification).toMatchObject({
            type: 'task_assigned',
            targetId: 'task-1',
            targetType: 'task',
            receiverEmail: 'doris@test.com',
            actorEmail: 'leader@test.com',
        });
        expect(notification.title).toContain('新任務');
    });

    it('returns null when actor and receiver are the same', () => {
        const notification = buildAssignmentNotification({
            entityType: 'task',
            item: { id: 'task-1', title: '補通知鈴鐺', path: 'users/u1/tasks/task-1' },
            actorEmail: 'doris@test.com',
            receiverEmail: 'doris@test.com',
        });

        expect(notification).toBeNull();
    });
});

describe('buildCommentNotifications', () => {
    it('creates notifications for assignee and creator but removes duplicates', () => {
        const notifications = buildCommentNotifications({
            entityType: 'issue',
            item: {
                id: 'issue-1',
                title: '通知面板過窄',
                path: 'users/u1/issues/issue-1',
                assigneeEmail: 'doris@test.com',
                createdByEmail: 'show@test.com',
            },
            actorEmail: 'leader@test.com',
            commentPreview: '請確認手機版寬度',
        });

        expect(notifications).toHaveLength(2);
        expect(notifications.map(item => item.receiverEmail)).toEqual([
            'doris@test.com',
            'show@test.com',
        ]);
        expect(notifications[0].type).toBe('issue_comment');
    });

    it('skips notifying the commenter', () => {
        const notifications = buildCommentNotifications({
            entityType: 'task',
            item: {
                id: 'task-1',
                title: '補通知鈴鐺',
                path: 'users/u1/tasks/task-1',
                assigneeEmail: 'doris@test.com',
                createdByEmail: 'show@test.com',
            },
            actorEmail: 'doris@test.com',
            commentPreview: '我來處理',
        });

        expect(notifications).toHaveLength(1);
        expect(notifications[0].receiverEmail).toBe('show@test.com');
    });
});

describe('countUnreadNotifications', () => {
    it('counts only unread notifications', () => {
        const unread = countUnreadNotifications([
            { id: 1, read: false },
            { id: 2, read: true },
            { id: 3, read: false },
        ]);

        expect(unread).toBe(2);
    });
});

describe('buildUnreadCommentCountMap', () => {
    it('counts unread comment notifications by card target', () => {
        const map = buildUnreadCommentCountMap([
            { id: '1', type: 'task_comment', targetType: 'task', targetId: 'task-1', read: false },
            { id: '2', type: 'task_comment', targetType: 'task', targetId: 'task-1', read: false },
            { id: '3', type: 'issue_comment', targetType: 'issue', targetId: 'issue-2', read: false },
            { id: '4', type: 'task_assigned', targetType: 'task', targetId: 'task-1', read: false },
            { id: '5', type: 'task_comment', targetType: 'task', targetId: 'task-1', read: true },
        ]);

        expect(map).toEqual({
            'task:task-1': 2,
            'issue:issue-2': 1,
        });
    });
});

describe('resolveDirectoryUser', () => {
    const directoryMap = buildUserDirectoryMap([
        { uid: 'u-1', email: 'doris@test.com' },
        { uid: 'u-2', email: 'show@test.com' },
    ]);

    it('matches by display name prefix', () => {
        expect(resolveDirectoryUser(directoryMap, 'doris')).toMatchObject({
            uid: 'u-1',
            email: 'doris@test.com',
        });
    });

    it('matches by full email', () => {
        expect(resolveDirectoryUser(directoryMap, 'show@test.com')).toMatchObject({
            uid: 'u-2',
            email: 'show@test.com',
        });
    });
});
