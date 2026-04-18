// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';

vi.mock('firebase/app', () => ({
    getApps: () => [],
    initializeApp: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    onSnapshot: vi.fn(() => () => {}),
    orderBy: vi.fn(),
    query: vi.fn(),
    serverTimestamp: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    writeBatch: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn(),
    signOut: vi.fn(),
}));

vi.mock('opencc-js', () => ({
    Converter: () => (text) => text,
}));

vi.mock('../components/common/ErrorBoundary', () => ({
    default: ({ children }) => <>{children}</>,
}));

vi.mock('../components/common/NavButton', () => ({
    default: ({ label, onClick }) => <button type="button" onClick={onClick}>{label}</button>,
}));

vi.mock('../components/AuthPage', () => ({
    default: () => <div data-testid="auth-page">auth</div>,
}));

vi.mock('../components/Dashboard', () => ({
    default: () => <div data-testid="dashboard-page">dashboard</div>,
}));

vi.mock('../components/TaskManager/TaskManager', () => ({
    default: () => <div data-testid="tasks-page">tasks</div>,
}));

vi.mock('../components/MeetingMinutes/MeetingMinutes', () => ({
    default: () => <div data-testid="meetings-page">meetings</div>,
}));

vi.mock('../components/IssueManager/IssueManager', () => ({
    default: () => <div data-testid="issues-page">issues</div>,
}));

vi.mock('../components/SettingsPage', () => ({
    default: () => <div data-testid="settings-page">settings</div>,
}));

vi.mock('../components/Notifications/NotificationBell', () => ({
    default: () => <button type="button">通知鈴鐺</button>,
}));

vi.mock('../components/TeamBoard/TeamBoard', () => ({
    default: () => <div data-testid="team-board-page">team-board</div>,
}));

vi.mock('../utils/logger', () => ({
    default: {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
    },
}));

vi.mock('../mock/demo-store', () => ({
    loadDemoState: vi.fn(() => ({
        teams: [],
        roleDefinitions: {},
        userRoles: { 'showchen@aivres.com': 'admin' },
        notifications: [],
    })),
    getDemoUser: vi.fn(() => ({ uid: 'demo-user', email: 'showchen@aivres.com' })),
    getNotificationsForUser: vi.fn(() => []),
    markAllDemoNotificationsRead: vi.fn((state) => state),
    markDemoNotificationRead: vi.fn((state) => state),
    saveDemoState: vi.fn((state) => state),
}));

describe('App layout', () => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/?testMode=1&demo=1');
        const storage = {
            getItem: vi.fn(() => null),
            setItem: vi.fn(),
            removeItem: vi.fn(),
        };
        Object.defineProperty(window, 'localStorage', {
            value: storage,
            configurable: true,
        });
    });

    it('keeps the main content shell flush to the sticky page header', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('workspace-content-shell')).toBeInTheDocument();
        });

        expect(screen.getByTestId('workspace-content-shell')).toHaveClass('pt-0');
    });

    it('does not render the firebase connection status badge', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('workspace-content-shell')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('firebase-status')).not.toBeInTheDocument();
    });

    it('keeps the sidebar brand title on a single line when space is tight', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('workspace-content-shell')).toBeInTheDocument();
        });

        expect(screen.getByTestId('sidebar-brand-header')).toHaveClass('min-w-0');
        expect(screen.getByTestId('sidebar-brand-title')).toHaveClass('truncate', 'whitespace-nowrap');
        expect(screen.queryByTestId('sidebar-brand-version')).not.toBeInTheDocument();
    });

    it('renders a restrained grouped sidebar without extra descriptive copy', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('workspace-content-shell')).toBeInTheDocument();
        });

        expect(screen.getByTestId('desktop-sidebar')).toHaveClass('md:w-[248px]');
        expect(screen.getByTestId('sidebar-brand-panel')).toBeInTheDocument();
        expect(screen.getByTestId('sidebar-account-card')).toBeInTheDocument();
        expect(screen.getByText('工作區')).toBeInTheDocument();
        expect(screen.getByText('流程追蹤')).toBeInTheDocument();
        expect(screen.queryByText('JMS Workspace')).not.toBeInTheDocument();
        expect(screen.queryByText('目前焦點')).not.toBeInTheDocument();
        expect(screen.queryByText('已登入帳號')).not.toBeInTheDocument();
        expect(screen.queryByText('協作、追蹤與問題處理工作台')).not.toBeInTheDocument();
    });

    it('keeps the desktop sidebar toggle available from the brand panel', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('workspace-content-shell')).toBeInTheDocument();
        });

        expect(screen.getByTestId('desktop-sidebar-toggle')).toBeInTheDocument();
    });

    it('stacks the collapsed sidebar brand controls vertically to keep the spacing balanced', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('workspace-content-shell')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByTestId('desktop-sidebar-toggle'));

        expect(screen.getByTestId('sidebar-brand-header')).toHaveClass('flex-col');
    });

    it('shows the locale switcher in the top-right header actions without extra locale label text', async () => {
        render(<App />);

        await waitFor(() => {
            expect(screen.getByTestId('workspace-content-shell')).toBeInTheDocument();
        });

        expect(screen.getByTestId('workspace-topbar-actions')).toContainElement(screen.getByTestId('locale-toggle-button'));
        expect(screen.queryByTestId('locale-toggle')).not.toBeInTheDocument();
        expect(screen.queryByText('語系')).not.toBeInTheDocument();
    });
});
