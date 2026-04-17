// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TaskManager from '../TaskManager';
import { buildPermissionContext } from '../../../utils/permissions';

vi.mock('../TaskForm', () => ({
    default: () => null,
}));

vi.mock('../../common/Modal', () => ({
    default: () => null,
}));

vi.mock('../../AIConversationModal', () => ({
    default: () => null,
}));

vi.mock('../../common/CollapsibleDoneSection', () => ({
    default: ({ children }) => <div>{children}</div>,
}));

describe('TaskManager', () => {
    it('hides redundant admin labels and AI summary button', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'show@test.com' },
            userRoles: { 'show@test.com': 'admin' },
        });
        render(
            <TaskManager
                db={null}
                user={{ uid: 'u-1', email: 'show@test.com' }}
                canAccessAll
                isAdmin
                canUseAI
                teams={[]}
                demoMode
                demoState={{ tasks: [], users: [] }}
                testConfig={{ enabled: false }}
                permissionContext={permissionContext}
            />
        );

        expect(screen.queryByText(/Admin View/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /AI 總結/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /新增/i })).toBeInTheDocument();
        expect(screen.getByTestId('task-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('task-toolbar-shell')).toHaveClass('sticky');
    });

    it('disables create action when role permission denies it', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'viewer@test.com' },
            roleDefinitions: {
                viewer: {
                    key: 'viewer',
                    label: '檢視者',
                    pageAccess: { dashboard: true, tasks: true, issues: true, meetings: true, settings: false, 'team-board': false },
                    actionAccess: { 'task.create': false },
                },
            },
            userRoles: { 'viewer@test.com': 'viewer' },
        });

        render(
            <TaskManager
                db={null}
                user={{ uid: 'u-2', email: 'viewer@test.com' }}
                canAccessAll={false}
                teams={[]}
                demoMode
                demoState={{ tasks: [], users: [] }}
                testConfig={{ enabled: false }}
                permissionContext={permissionContext}
            />
        );

        expect(screen.getByRole('button', { name: /新增/i })).toBeDisabled();
    });
});
