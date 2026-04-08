import { describe, it, expect } from 'vitest';
import {
    checkIsAdmin,
    checkIsEditor,
    checkCanUseAI,
    getTeamLeaders,
    checkIsLeader,
    getLeaderTeamMembers,
    checkIsInAnyTeam,
    formatEmailPrefix,
    extractEmailPrefix,
    normalizePermissionEmail,
} from '../permissions';

describe('checkIsAdmin', () => {
    it('returns false for null user', () => {
        expect(checkIsAdmin(null)).toBe(false);
    });

    it('returns false for user without email', () => {
        expect(checkIsAdmin({ uid: '1' })).toBe(false);
    });

    it('returns true if user email is in cloudAdmins', () => {
        const user = { email: 'admin@test.com' };
        expect(checkIsAdmin(user, ['admin@test.com'])).toBe(true);
    });

    it('returns false if user email not in any admin list', () => {
        const user = { email: 'normal@test.com' };
        expect(checkIsAdmin(user, ['admin@test.com'])).toBe(false);
    });
});

describe('checkIsEditor', () => {
    it('returns false for null user', () => {
        expect(checkIsEditor(null)).toBe(false);
    });

    it('returns true if user is in cloudEditors', () => {
        const user = { email: 'editor@test.com' };
        expect(checkIsEditor(user, ['editor@test.com'])).toBe(true);
    });

    it('returns false if user not in editors', () => {
        const user = { email: 'other@test.com' };
        expect(checkIsEditor(user, ['editor@test.com'])).toBe(false);
    });
});

describe('checkCanUseAI', () => {
    it('returns true if user is in AI users list', () => {
        const user = { email: 'ai@test.com' };
        expect(checkCanUseAI(user, ['ai@test.com'])).toBe(true);
    });

    it('returns false for null user', () => {
        expect(checkCanUseAI(null, ['ai@test.com'])).toBe(false);
    });
});

describe('getTeamLeaders', () => {
    it('returns empty array for null team', () => {
        expect(getTeamLeaders(null)).toEqual([]);
    });

    it('returns leaderIds when available', () => {
        const team = { leaderIds: ['a@test.com', 'b@test.com'] };
        expect(getTeamLeaders(team)).toEqual(['a@test.com', 'b@test.com']);
    });

    it('falls back to leaderId for old format', () => {
        const team = { leaderId: 'old@test.com' };
        expect(getTeamLeaders(team)).toEqual(['old@test.com']);
    });

    it('returns empty array if no leader info', () => {
        expect(getTeamLeaders({})).toEqual([]);
    });
});

describe('checkIsLeader', () => {
    it('returns false for null user', () => {
        expect(checkIsLeader(null, [])).toBe(false);
    });

    it('returns true if user is a team leader', () => {
        const user = { email: 'leader@test.com' };
        const teams = [{ leaderIds: ['leader@test.com'], members: [] }];
        expect(checkIsLeader(user, teams)).toBe(true);
    });

    it('returns false if user is not a leader', () => {
        const user = { email: 'member@test.com' };
        const teams = [{ leaderIds: ['leader@test.com'], members: ['member@test.com'] }];
        expect(checkIsLeader(user, teams)).toBe(false);
    });
});

describe('getLeaderTeamMembers', () => {
    it('returns empty for null user', () => {
        expect(getLeaderTeamMembers(null, [])).toEqual([]);
    });

    it('returns members of teams where user is leader', () => {
        const user = { email: 'leader@test.com' };
        const teams = [
            { leaderIds: ['leader@test.com'], members: ['a@test.com', 'b@test.com'] },
            { leaderIds: ['other@test.com'], members: ['c@test.com'] },
        ];
        const result = getLeaderTeamMembers(user, teams);
        expect(result).toContain('a@test.com');
        expect(result).toContain('b@test.com');
        expect(result).not.toContain('c@test.com');
    });
});

describe('checkIsInAnyTeam', () => {
    it('returns false for null user', () => {
        expect(checkIsInAnyTeam(null, [])).toBe(false);
    });

    it('returns true if user is a member', () => {
        const user = { email: 'member@test.com' };
        const teams = [{ leaderIds: [], members: ['member@test.com'] }];
        expect(checkIsInAnyTeam(user, teams)).toBe(true);
    });

    it('returns true if user is a leader', () => {
        const user = { email: 'leader@test.com' };
        const teams = [{ leaderIds: ['leader@test.com'], members: [] }];
        expect(checkIsInAnyTeam(user, teams)).toBe(true);
    });

    it('returns false if user is not in any team', () => {
        const user = { email: 'outsider@test.com' };
        const teams = [{ leaderIds: ['leader@test.com'], members: ['member@test.com'] }];
        expect(checkIsInAnyTeam(user, teams)).toBe(false);
    });

    it('handles case-insensitive email comparison', () => {
        const user = { email: 'MEMBER@Test.com' };
        const teams = [{ leaderIds: [], members: ['member@test.com'] }];
        expect(checkIsInAnyTeam(user, teams)).toBe(true);
    });
});

describe('formatEmailPrefix', () => {
    it('returns prefix for email', () => {
        expect(formatEmailPrefix('test@example.com')).toBe('test');
    });

    it('returns default for null', () => {
        expect(formatEmailPrefix(null)).toBe('使用者');
    });

    it('returns default for undefined', () => {
        expect(formatEmailPrefix(undefined)).toBe('使用者');
    });
});

describe('extractEmailPrefix', () => {
    it('returns null for null input', () => {
        expect(extractEmailPrefix(null)).toBeNull();
    });

    it('extracts prefix from email', () => {
        expect(extractEmailPrefix('user@test.com')).toBe('user');
    });

    it('returns value if no @ sign', () => {
        expect(extractEmailPrefix('username')).toBe('username');
    });

    it('returns null for empty string', () => {
        expect(extractEmailPrefix('')).toBeNull();
    });
});

describe('normalizePermissionEmail', () => {
    it('returns empty for null', () => {
        expect(normalizePermissionEmail(null)).toBe('');
    });

    it('lowercases and trims email', () => {
        expect(normalizePermissionEmail('  Test@Example.COM  ')).toBe('test@example.com');
    });

    it('returns empty for empty string', () => {
        expect(normalizePermissionEmail('')).toBe('');
    });
});
