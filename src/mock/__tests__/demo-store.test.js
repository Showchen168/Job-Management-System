import { describe, expect, it } from 'vitest';
import {
    addDemoComment,
    buildInitialDemoState,
    deleteDemoEntity,
    getNotificationsForUser,
    markDemoNotificationRead,
    upsertDemoEntity,
} from '../demo-store';

describe('upsertDemoEntity', () => {
    it('creates assignment notification when a new task is assigned', () => {
        const state = buildInitialDemoState();

        const nextState = upsertDemoEntity(state, {
            entityType: 'task',
            actorEmail: 'showchen@aivres.com',
            formData: {
                title: '補驗證流程',
                assignee: 'doris',
                assigneeEmail: 'doris@test.com',
                status: 'On-going',
                source: 'Meeting',
                assignedDate: '2026-04-17',
                dueDate: '2026-04-18',
                progress: '今天完成',
                teamId: 'team-rd',
                teamName: '研發一組',
            },
        });

        const dorisNotifications = getNotificationsForUser(nextState, 'doris@test.com');
        expect(dorisNotifications[0]).toMatchObject({
            type: 'task_assigned',
            receiverEmail: 'doris@test.com',
        });
    });
});

describe('addDemoComment', () => {
    it('adds comment summary and creates notifications for creator/assignee', () => {
        const state = buildInitialDemoState();
        const nextState = addDemoComment(state, {
            entityType: 'task',
            itemId: 'task-seed-1',
            actorEmail: 'doris@test.com',
            content: '我已補上通知鈴鐺',
        });

        const task = nextState.tasks.find((item) => item.id === 'task-seed-1');
        expect(task.commentCount).toBe(3);
        expect(task.lastCommentPreview).toContain('我已補上通知鈴鐺');

        const showNotifications = getNotificationsForUser(nextState, 'showchen@aivres.com');
        expect(showNotifications[0]).toMatchObject({
            type: 'task_comment',
            receiverEmail: 'showchen@aivres.com',
        });
    });
});

describe('markDemoNotificationRead', () => {
    it('marks one notification as read for current user', () => {
        const state = buildInitialDemoState();
        const [notification] = getNotificationsForUser(state, 'doris@test.com');

        const nextState = markDemoNotificationRead(state, {
            userEmail: 'doris@test.com',
            notificationId: notification.id,
        });

        const updated = getNotificationsForUser(nextState, 'doris@test.com')[0];
        expect(updated.read).toBe(true);
    });
});

describe('deleteDemoEntity', () => {
    it('removes task from demo state', () => {
        const state = buildInitialDemoState();
        const nextState = deleteDemoEntity(state, { entityType: 'task', itemId: 'task-seed-1' });

        expect(nextState.tasks.some((item) => item.id === 'task-seed-1')).toBe(false);
    });
});
