// @vitest-environment jsdom
import '@testing-library/jest-dom';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import SettingsPage from '../SettingsPage';
import { buildPermissionContext } from '../../utils/permissions';

vi.mock('../common/Modal', () => ({
    default: () => null,
}));

describe('SettingsPage', () => {
    const demoUsers = [
        { uid: 'u-1', email: 'admin@test.com', lastSeen: { seconds: 300 } },
        { uid: 'u-2', email: 'leader@test.com', lastSeen: { seconds: 200 } },
        { uid: 'u-3', email: 'staff@test.com', lastSeen: { seconds: 100 } },
    ];

    it('shows streamlined role management with dropdowns and a save button', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'admin@test.com' },
            userRoles: { 'admin@test.com': 'admin' },
        });

        render(
            <SettingsPage
                db={null}
                user={{ uid: 'u-1', email: 'admin@test.com' }}
                isAdmin
                isEditor={false}
                cloudAdmins={[]}
                cloudEditors={[]}
                cloudAIUsers={[]}
                rootAdmins={[]}
                onSaveGeminiSettings={vi.fn()}
                onSaveRoleDefinitions={vi.fn()}
                onSaveUserRole={vi.fn()}
                testConfig={{ enabled: false }}
                geminiApiKey=""
                geminiModel="gemini-2.5-flash"
                teams={[]}
                permissionContext={permissionContext}
                userRoles={{ 'admin@test.com': 'admin' }}
                demoUsers={demoUsers}
            />
        );

        expect(screen.getByTestId('settings-page-root')).toBeInTheDocument();
        expect(screen.getByTestId('settings-role-management')).toBeInTheDocument();
        expect(screen.getByTestId('settings-role-definitions')).toBeInTheDocument();
        expect(screen.getByText('使用者角色管理')).toBeInTheDocument();
        expect(screen.getByText('角色權限設定')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '儲存角色與權限' })).toBeInTheDocument();
        expect(within(screen.getByTestId('settings-tabs')).getByRole('button', { name: '儲存角色與權限' })).toBeInTheDocument();
        expect(screen.getByLabelText('選擇使用者')).toBeInTheDocument();
        expect(screen.getByLabelText('角色設定')).toBeInTheDocument();
        expect(screen.queryByText('設定頁管理')).not.toBeInTheDocument();
        expect(screen.queryByText('功能操作')).not.toBeInTheDocument();
        expect(screen.queryByTestId('admin-permission-section')).not.toBeInTheDocument();
        expect(screen.queryByTestId('editor-permission-section')).not.toBeInTheDocument();
        expect(screen.getAllByRole('option', { name: '管理員' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('option', { name: '主管' }).length).toBeGreaterThan(0);
        expect(screen.getAllByRole('option', { name: '員工' }).length).toBeGreaterThan(0);
        expect(screen.queryAllByRole('option', { name: '編輯者' })).toHaveLength(0);
        expect(screen.queryAllByRole('option', { name: '檢視者' })).toHaveLength(0);
        expect(screen.getByTestId('settings-role-management-header')).toHaveClass('min-h-[88px]', 'border-b', 'border-slate-100', 'pb-5');
        expect(screen.getByTestId('settings-role-definitions-header')).toHaveClass('min-h-[88px]', 'border-b', 'border-slate-100', 'pb-5');
        expect(screen.getByTestId('settings-role-toolbar')).toHaveClass('rounded-2xl', 'border-slate-200', 'bg-slate-50');
        expect(screen.getByTestId('settings-tabs')).toHaveClass('sticky', 'bg-white');
    });

    it('organizes settings tabs with registered users before role permissions and without ai tab', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'admin@test.com' },
            userRoles: { 'admin@test.com': 'admin' },
        });

        render(
            <SettingsPage
                db={null}
                user={{ uid: 'u-1', email: 'admin@test.com' }}
                isAdmin
                isEditor={false}
                cloudAdmins={[]}
                cloudEditors={[]}
                cloudAIUsers={[]}
                rootAdmins={[]}
                onSaveGeminiSettings={vi.fn()}
                onSaveRoleDefinitions={vi.fn()}
                onSaveUserRole={vi.fn()}
                testConfig={{ enabled: false }}
                geminiApiKey=""
                geminiModel="gemini-2.5-flash"
                teams={[]}
                permissionContext={permissionContext}
                userRoles={{ 'admin@test.com': 'admin' }}
                demoUsers={demoUsers}
            />
        );

        expect(screen.getByTestId('settings-page-root')).toHaveClass('w-full');
        const tabs = within(screen.getByTestId('settings-tabs')).getAllByRole('button')
            .map((button) => button.textContent)
            .filter((label) => label !== '儲存角色與權限');
        expect(tabs).toEqual(['已註冊使用者', '角色與權限', '團隊與成員', '下拉選單']);
        expect(screen.queryByRole('button', { name: 'AI 與通知' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '已註冊使用者' }));

        expect(screen.getByTestId('registered-users')).toBeInTheDocument();
        expect(screen.getByText('已註冊使用者列表')).toBeInTheDocument();
        expect(screen.queryByText('團隊管理')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '下拉選單' }));

        expect(screen.getByText('全域下拉選單管理')).toBeInTheDocument();
        expect(screen.queryByText('Gemini API 設定')).not.toBeInTheDocument();
        expect(screen.queryByText('團隊管理')).not.toBeInTheDocument();
    });

    it('uses a consistent panel style across registered users, teams and dropdown tabs', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'admin@test.com' },
            userRoles: { 'admin@test.com': 'admin' },
        });

        render(
            <SettingsPage
                db={null}
                user={{ uid: 'u-1', email: 'admin@test.com' }}
                isAdmin
                isEditor={false}
                cloudAdmins={[]}
                cloudEditors={[]}
                cloudAIUsers={[]}
                rootAdmins={[]}
                onSaveGeminiSettings={vi.fn()}
                onSaveRoleDefinitions={vi.fn()}
                onSaveUserRole={vi.fn()}
                testConfig={{ enabled: false }}
                geminiApiKey=""
                geminiModel="gemini-2.5-flash"
                teams={[{ id: 'team-1', name: '研發一組', leaderIds: ['admin@test.com'], members: ['leader@test.com'] }]}
                permissionContext={permissionContext}
                userRoles={{ 'admin@test.com': 'admin' }}
                demoUsers={demoUsers}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '已註冊使用者' }));
        expect(screen.getByTestId('registered-users')).toHaveClass('rounded-2xl', 'border-slate-200', 'bg-white', 'shadow-sm');

        fireEvent.click(screen.getByRole('button', { name: '團隊與成員' }));
        expect(screen.getByTestId('settings-team-management')).toHaveClass('rounded-2xl', 'border-slate-200', 'bg-white', 'shadow-sm');

        fireEvent.click(screen.getByRole('button', { name: '下拉選單' }));
        expect(screen.getByTestId('settings-global-options')).toHaveClass('rounded-2xl', 'border-slate-200', 'bg-white', 'shadow-sm');
    });

    it('supports search, role filtering and sorting in registered users page', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'admin@test.com' },
            userRoles: {
                'admin@test.com': 'admin',
                'leader@test.com': 'leader',
                'staff@test.com': 'viewer',
            },
        });

        render(
            <SettingsPage
                db={null}
                user={{ uid: 'u-1', email: 'admin@test.com' }}
                isAdmin
                isEditor={false}
                cloudAdmins={[]}
                cloudEditors={[]}
                cloudAIUsers={[]}
                rootAdmins={[]}
                onSaveGeminiSettings={vi.fn()}
                onSaveRoleDefinitions={vi.fn()}
                onSaveUserRole={vi.fn()}
                testConfig={{ enabled: false }}
                geminiApiKey=""
                geminiModel="gemini-2.5-flash"
                teams={[]}
                permissionContext={permissionContext}
                userRoles={{
                    'admin@test.com': 'admin',
                    'leader@test.com': 'leader',
                    'staff@test.com': 'viewer',
                }}
                demoUsers={demoUsers}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '已註冊使用者' }));

        expect(screen.getByLabelText('搜尋已註冊使用者')).toBeInTheDocument();
        expect(screen.getByLabelText('角色篩選')).toBeInTheDocument();
        expect(screen.getByLabelText('排序方式')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('leader')).toBeInTheDocument();
        expect(screen.getByText('staff')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('搜尋已註冊使用者'), {
            target: { value: 'leader' },
        });

        expect(screen.queryByText('admin')).not.toBeInTheDocument();
        expect(screen.getByText('leader')).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('搜尋已註冊使用者'), {
            target: { value: '' },
        });
        fireEvent.change(screen.getByLabelText('角色篩選'), {
            target: { value: 'viewer' },
        });

        expect(screen.getByText('staff')).toBeInTheDocument();
        expect(screen.queryByText('leader')).not.toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('角色篩選'), {
            target: { value: 'all' },
        });
        fireEvent.change(screen.getByLabelText('排序方式'), {
            target: { value: 'name-asc' },
        });

        const userCells = screen.getAllByTestId('registered-user-name').map((cell) => cell.textContent);
        expect(userCells).toEqual(['admin', 'leader', 'staff']);
    });

    it('supports pagination in registered users page when there are many users', () => {
        const manyUsers = Array.from({ length: 12 }, (_, index) => ({
            uid: `u-${index + 1}`,
            email: `member${String(index + 1).padStart(2, '0')}@test.com`,
            lastSeen: { seconds: 1000 - index },
        }));

        const manyUserRoles = Object.fromEntries(
            manyUsers.map((entry, index) => [entry.email, index % 3 === 0 ? 'admin' : (index % 3 === 1 ? 'leader' : 'viewer')])
        );

        const permissionContext = buildPermissionContext({
            user: { email: 'member01@test.com' },
            userRoles: { 'member01@test.com': 'admin' },
        });

        render(
            <SettingsPage
                db={null}
                user={{ uid: 'u-1', email: 'member01@test.com' }}
                isAdmin
                isEditor={false}
                cloudAdmins={[]}
                cloudEditors={[]}
                cloudAIUsers={[]}
                rootAdmins={[]}
                onSaveGeminiSettings={vi.fn()}
                onSaveRoleDefinitions={vi.fn()}
                onSaveUserRole={vi.fn()}
                testConfig={{ enabled: false }}
                geminiApiKey=""
                geminiModel="gemini-2.5-flash"
                teams={[]}
                permissionContext={permissionContext}
                userRoles={manyUserRoles}
                demoUsers={manyUsers}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '已註冊使用者' }));

        expect(screen.getByText('第 1 頁，共 2 頁')).toBeInTheDocument();
        expect(screen.getAllByTestId('registered-user-name')).toHaveLength(10);
        expect(screen.getByText('member01')).toBeInTheDocument();
        expect(screen.queryByText('member11')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '下一頁' }));

        expect(screen.getByText('第 2 頁，共 2 頁')).toBeInTheDocument();
        expect(screen.getAllByTestId('registered-user-name')).toHaveLength(2);
        expect(screen.getByText('member11')).toBeInTheDocument();
        expect(screen.getByText('member12')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '上一頁' }));

        expect(screen.getByText('第 1 頁，共 2 頁')).toBeInTheDocument();
    });

    it('keeps registered user roles aligned with saved settings before save', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'admin@test.com' },
            userRoles: {
                'admin@test.com': 'admin',
                'leader@test.com': 'leader',
            },
        });

        render(
            <SettingsPage
                db={null}
                user={{ uid: 'u-1', email: 'admin@test.com' }}
                isAdmin
                isEditor={false}
                cloudAdmins={[]}
                cloudEditors={[]}
                cloudAIUsers={[]}
                rootAdmins={[]}
                onSaveGeminiSettings={vi.fn()}
                onSaveRoleDefinitions={vi.fn()}
                onSaveUserRole={vi.fn()}
                testConfig={{ enabled: false }}
                geminiApiKey=""
                geminiModel="gemini-2.5-flash"
                teams={[]}
                permissionContext={permissionContext}
                userRoles={{
                    'admin@test.com': 'admin',
                    'leader@test.com': 'leader',
                }}
                demoUsers={demoUsers}
            />
        );

        fireEvent.change(screen.getByLabelText('選擇使用者'), {
            target: { value: 'leader@test.com' },
        });
        fireEvent.change(screen.getByLabelText('角色設定'), {
            target: { value: 'viewer' },
        });

        fireEvent.click(screen.getByRole('button', { name: '已註冊使用者' }));

        const leaderRowName = screen.getByText('leader');
        const leaderRow = leaderRowName.closest('tr');

        expect(leaderRowName).toBeInTheDocument();
        expect(leaderRow).not.toBeNull();
        expect(within(leaderRow).getByText('主管')).toBeInTheDocument();
        expect(within(leaderRow).queryByText('員工')).not.toBeInTheDocument();
    });

    it('keeps registered user roles aligned with effective role resolution', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'admin@test.com' },
            cloudAdmins: ['admin@test.com'],
            userRoles: {},
        });

        render(
            <SettingsPage
                db={null}
                user={{ uid: 'u-1', email: 'admin@test.com' }}
                isAdmin
                isEditor={false}
                cloudAdmins={['admin@test.com']}
                cloudEditors={[]}
                cloudAIUsers={[]}
                rootAdmins={[]}
                onSaveGeminiSettings={vi.fn()}
                onSaveRoleDefinitions={vi.fn()}
                onSaveUserRole={vi.fn()}
                testConfig={{ enabled: false }}
                geminiApiKey=""
                geminiModel="gemini-2.5-flash"
                teams={[]}
                permissionContext={permissionContext}
                userRoles={{}}
                demoUsers={demoUsers}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: '已註冊使用者' }));

        const adminRowName = screen.getByText('admin');
        const adminRow = adminRowName.closest('tr');

        expect(adminRowName).toBeInTheDocument();
        expect(adminRow).not.toBeNull();
        expect(within(adminRow).getByText('管理員')).toBeInTheDocument();
        expect(within(adminRow).queryByText('員工')).not.toBeInTheDocument();
    });

    it('lets admin choose page access for all three roles including admin pages', () => {
        const permissionContext = buildPermissionContext({
            user: { email: 'admin@test.com' },
            userRoles: { 'admin@test.com': 'admin' },
        });

        render(
            <SettingsPage
                db={null}
                user={{ uid: 'u-1', email: 'admin@test.com' }}
                isAdmin
                isEditor={false}
                cloudAdmins={[]}
                cloudEditors={[]}
                cloudAIUsers={[]}
                rootAdmins={[]}
                onSaveGeminiSettings={vi.fn()}
                onSaveRoleDefinitions={vi.fn()}
                onSaveUserRole={vi.fn()}
                testConfig={{ enabled: false }}
                geminiApiKey=""
                geminiModel="gemini-2.5-flash"
                teams={[]}
                permissionContext={permissionContext}
                userRoles={{ 'admin@test.com': 'admin' }}
                demoUsers={demoUsers}
            />
        );

        const roleSelect = screen.getByLabelText('目前編輯角色');
        fireEvent.change(roleSelect, { target: { value: 'admin' } });

        const settingsCheckbox = screen.getByRole('checkbox', { name: '系統設定 settings' });
        expect(settingsCheckbox).not.toBeDisabled();
    });
});
