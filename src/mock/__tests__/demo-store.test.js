import { describe, expect, it } from 'vitest';
import { buildInitialDemoState, markAllDemoNotificationsRead } from '../demo-store';

describe('demo-store notifications', () => {
    it('marks all unread notifications as read for the selected user only', () => {
        const state = buildInitialDemoState();
        const nextState = markAllDemoNotificationsRead(state, {
            userEmail: 'showchen@aivres.com',
        });

        const showchenNotifications = nextState.notifications.filter(
            (notification) => notification.receiverEmail === 'showchen@aivres.com'
        );
        const dorisNotifications = nextState.notifications.filter(
            (notification) => notification.receiverEmail === 'doris@test.com'
        );

        expect(showchenNotifications.every((notification) => notification.read)).toBe(true);
        expect(dorisNotifications.some((notification) => !notification.read)).toBe(true);
    });
});
