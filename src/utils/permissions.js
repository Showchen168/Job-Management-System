import { ROOT_ADMINS } from '../constants';

export const checkIsAdmin = (user, cloudAdmins = []) => {
    if (!user || !user.email) return false;
    return ROOT_ADMINS.includes(user.email) || cloudAdmins.includes(user.email);
};

export const checkIsEditor = (user, cloudEditors = []) => {
    if (!user || !user.email) return false;
    return cloudEditors.includes(user.email);
};

export const checkCanUseAI = (user, cloudAIUsers = []) => {
    if (!user || !user.email) return false;
    return cloudAIUsers.includes(user.email);
};

export const getTeamLeaders = (team) => {
    if (!team) return [];
    if (team.leaderIds && Array.isArray(team.leaderIds)) {
        return team.leaderIds;
    }
    return team.leaderId ? [team.leaderId] : [];
};

export const checkIsLeader = (user, teams = []) => {
    if (!user || !user.email) return false;
    return teams.some(team => getTeamLeaders(team).includes(user.email));
};

export const getLeaderTeamMembers = (user, teams = []) => {
    if (!user || !user.email) return [];
    const memberEmails = new Set();
    teams.forEach(team => {
        if (getTeamLeaders(team).includes(user.email)) {
            (team.members || []).forEach(m => memberEmails.add(m));
        }
    });
    return Array.from(memberEmails);
};

export const checkIsInAnyTeam = (user, teams = []) => {
    if (!user || !user.email) return false;
    const userEmail = user.email.toLowerCase();
    return teams.some(team => {
        const leaders = getTeamLeaders(team).map(l => l.toLowerCase());
        const members = (team.members || []).map(m => m.toLowerCase());
        return leaders.includes(userEmail) || members.includes(userEmail);
    });
};

export const formatEmailPrefix = (email) => {
    if (!email) return '使用者';
    const [prefix] = email.split('@');
    return prefix || email;
};

export const extractEmailPrefix = (value) => {
    if (!value) return null;
    const normalized = String(value).trim();
    if (!normalized) return null;
    if (normalized.includes('@')) {
        const [prefix] = normalized.split('@');
        return prefix || null;
    }
    return normalized;
};

export const normalizePermissionEmail = (value) => {
    if (!value) return '';
    const normalized = String(value).trim();
    if (!normalized) return '';
    return normalized.toLowerCase();
};
