// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import IssueManager from '../IssueManager';
import { buildPermissionContext } from '../../../utils/permissions';

vi.mock('../IssueForm', () => ({
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

describe('IssueManager', () => {
    it('hides redundant admin labels and AI summary button', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'show@test.com' },
            userRoles: { 'show@test.com': 'admin' },
        });
        render(
            <IssueManager
                db={null}
                user={{ uid: 'u-1', email: 'show@test.com' }}
                canAccessAll
                isAdmin
                canUseAI
                teams={[]}
                demoMode
                demoState={{ issues: [], users: [] }}
                permissionContext={permissionContext}
            />
        );

        expect(screen.queryByText(/Admin View/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /AI 總結/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /新增問題/i })).toBeInTheDocument();
        expect(screen.getByTestId('issue-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('issue-toolbar-shell')).toHaveClass('sticky');
        expect(screen.queryByText('全部問題')).not.toBeInTheDocument();
        expect(screen.queryByText('未解決')).not.toBeInTheDocument();
        expect(screen.queryByText('已逾期')).not.toBeInTheDocument();
        expect(screen.queryByText('已解決/關閉')).not.toBeInTheDocument();
    });

    it('disables create issue action when role permission denies it', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'viewer@test.com' },
            roleDefinitions: {
                viewer: {
                    key: 'viewer',
                    label: '檢視者',
                    pageAccess: { dashboard: true, tasks: true, issues: true, meetings: true, settings: false, 'team-board': false },
                    actionAccess: { 'issue.create': false },
                },
            },
            userRoles: { 'viewer@test.com': 'viewer' },
        });

        render(
            <IssueManager
                db={null}
                user={{ uid: 'u-2', email: 'viewer@test.com' }}
                canAccessAll={false}
                teams={[]}
                demoMode
                demoState={{ issues: [], users: [] }}
                permissionContext={permissionContext}
            />
        );

        expect(screen.getByRole('button', { name: /新增問題/i })).toBeDisabled();
    });
});
