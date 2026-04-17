// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeetingMinutes from '../MeetingMinutes';
import { buildPermissionContext } from '../../../utils/permissions';

vi.mock('../MeetingForm', () => ({
    default: () => null,
}));

vi.mock('../../common/Modal', () => ({
    default: () => null,
}));

vi.mock('../../AIConversationModal', () => ({
    default: () => null,
}));

describe('MeetingMinutes', () => {
    it('hides redundant admin labels and AI summary button', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'show@test.com' },
            userRoles: { 'show@test.com': 'admin' },
        });
        render(
            <MeetingMinutes
                db={null}
                user={{ uid: 'u-1', email: 'show@test.com' }}
                canAccessAll
                isAdmin
                canUseAI
                teams={[]}
                permissionContext={permissionContext}
            />
        );

        expect(screen.queryByText(/Admin View/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /AI 總結/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /新增/i })).toBeInTheDocument();
        expect(screen.getByTestId('meeting-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId('meeting-toolbar-shell')).toHaveClass('sticky');
    });

    it('disables create meeting action when role permission denies it', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'viewer@test.com' },
            roleDefinitions: {
                viewer: {
                    key: 'viewer',
                    label: '檢視者',
                    pageAccess: { dashboard: true, tasks: true, issues: true, meetings: true, settings: false, 'team-board': false },
                    actionAccess: { 'meeting.create': false },
                },
            },
            userRoles: { 'viewer@test.com': 'viewer' },
        });

        render(
            <MeetingMinutes
                db={null}
                user={{ uid: 'u-2', email: 'viewer@test.com' }}
                canAccessAll={false}
                teams={[]}
                permissionContext={permissionContext}
            />
        );

        expect(screen.getByRole('button', { name: /新增/i })).toBeDisabled();
    });
});
