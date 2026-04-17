// @vitest-environment jsdom
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
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
});
