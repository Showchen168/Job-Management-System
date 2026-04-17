// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NotificationBell from '../NotificationBell';

describe('NotificationBell', () => {
    it('shows unread badge and toggles notification panel', () => {
        render(
            <NotificationBell
                notifications={[
                    { id: '1', title: '你有新任務', message: '補通知已讀邏輯', read: false },
                    { id: '2', title: '你的卡片有新留言', message: '請補測試', read: true },
                ]}
                onOpenTarget={() => {}}
                onMarkAsRead={() => {}}
            />
        );

        expect(screen.getByText('1')).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: '通知鈴鐺' }));
        expect(screen.getByText('你有新任務')).toBeInTheDocument();
        expect(screen.getByText('補通知已讀邏輯')).toBeInTheDocument();
    });

    it('supports marking all unread notifications as read', () => {
        const handleMarkAllAsRead = vi.fn();

        render(
            <NotificationBell
                notifications={[
                    { id: '1', title: '你有新任務', message: '補通知已讀邏輯', read: false },
                    { id: '2', title: '你的卡片有新留言', message: '請補測試', read: false },
                ]}
                onOpenTarget={() => {}}
                onMarkAsRead={() => {}}
                onMarkAllAsRead={handleMarkAllAsRead}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '通知鈴鐺' }));
        fireEvent.click(screen.getByRole('button', { name: /全部已讀/i }));

        expect(handleMarkAllAsRead).toHaveBeenCalledTimes(1);
    });
});
