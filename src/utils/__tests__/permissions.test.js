import { describe, expect, it } from 'vitest';
import {
    buildPermissionContext,
    canAccessPage,
    canPerformAction,
    getLockedActionAccessKeys,
    getLockedPageAccessKeys,
    normalizeRoleDefinitions,
    resolveLegacyRoleKey,
    updateRoleDefinitionAccess,
} from '../permissions';

describe('permissions', () => {
    it('builds default role definitions with page and action maps', () => {
        const definitions = normalizeRoleDefinitions();

        expect(definitions.admin.pageAccess.settings).toBe(true);
        expect(definitions.viewer.pageAccess['team-board']).toBe(false);
        expect(definitions.leader.actionAccess['settings.manageTeams']).toBe(true);
    });

    it('resolves legacy role fallback from admin, editor, leader state', () => {
        expect(resolveLegacyRoleKey({ email: 'root@test.com' }, { cloudAdmins: ['root@test.com'] })).toBe('admin');
        expect(resolveLegacyRoleKey({ email: 'editor@test.com' }, { cloudEditors: ['editor@test.com'] })).toBe('editor');
        expect(resolveLegacyRoleKey({ email: 'leader@test.com' }, {
            teams: [{ id: 't1', leaderIds: ['leader@test.com'], members: [] }],
        })).toBe('leader');
        expect(resolveLegacyRoleKey({ email: 'viewer@test.com' }, {})).toBe('viewer');
    });

    it('uses assigned role over legacy role and exposes page/action access', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'member@test.com' },
            userRoles: { 'member@test.com': 'leader' },
            teams: [],
        });

        expect(permissionContext.roleKey).toBe('leader');
        expect(canAccessPage(permissionContext, 'team-board')).toBe(true);
        expect(canPerformAction(permissionContext, 'settings.manageRolePermissions')).toBe(false);
    });

    it('keeps AI access enabled when legacy AI allowlist grants it', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'ai@test.com' },
            cloudAIUsers: ['ai@test.com'],
        });

        expect(canPerformAction(permissionContext, 'ai.useSummary')).toBe(true);
    });

    it('returns locked access keys for protected role settings', () => {
        expect(getLockedPageAccessKeys('admin')).toEqual([]);
        expect(getLockedActionAccessKeys('admin')).toContain('settings.manageRoles');
    });

    it('allows page access keys to be adjusted by admin', () => {
        const nextDefinitions = updateRoleDefinitionAccess({
            roleDefinitions: {},
            roleKey: 'admin',
            scope: 'pageAccess',
            accessKey: 'settings',
            value: false,
        });

        expect(nextDefinitions.admin.pageAccess.settings).toBe(false);
    });

    it('updates non-locked access keys in role definitions', () => {
        const nextDefinitions = updateRoleDefinitionAccess({
            roleDefinitions: {},
            roleKey: 'leader',
            scope: 'actionAccess',
            accessKey: 'task.delete',
            value: false,
        });

        expect(nextDefinitions.leader.actionAccess['task.delete']).toBe(false);
    });
});
