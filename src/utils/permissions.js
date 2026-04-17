import {
    DEFAULT_ROLE_DEFINITIONS,
    PERMISSION_ACTION_KEYS,
    PERMISSION_PAGE_KEYS,
    ROLE_LOCKED_ACTION_ACCESS,
    ROLE_LOCKED_PAGE_ACCESS,
    ROOT_ADMINS,
} from '../constants';

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

export const normalizeRoleDefinitions = (definitions = {}) => (
    Object.entries(DEFAULT_ROLE_DEFINITIONS).reduce((acc, [roleKey, roleDefinition]) => {
        const incoming = definitions?.[roleKey] || {};
        acc[roleKey] = {
            ...roleDefinition,
            ...incoming,
            key: roleKey,
            label: roleDefinition.label,
            pageAccess: {
                ...Object.fromEntries(PERMISSION_PAGE_KEYS.map((pageKey) => [pageKey, false])),
                ...(roleDefinition.pageAccess || {}),
                ...(incoming.pageAccess || {}),
            },
            actionAccess: {
                ...Object.fromEntries(PERMISSION_ACTION_KEYS.map((actionKey) => [actionKey, false])),
                ...(roleDefinition.actionAccess || {}),
                ...(incoming.actionAccess || {}),
            },
        };
        return acc;
    }, {})
);

export const getLockedPageAccessKeys = (roleKey = '') => (
    ROLE_LOCKED_PAGE_ACCESS[roleKey] || []
);

export const getLockedActionAccessKeys = (roleKey = '') => (
    ROLE_LOCKED_ACTION_ACCESS[roleKey] || []
);

export const resolveLegacyRoleKey = (user, { cloudAdmins = [], cloudEditors = [], teams = [] } = {}) => {
    if (checkIsAdmin(user, cloudAdmins)) return 'admin';
    if (checkIsEditor(user, cloudEditors)) return 'editor';
    if (checkIsLeader(user, teams)) return 'leader';
    return 'viewer';
};

export const resolveAssignedRoleKey = (user, userRoles = {}) => {
    const normalizedEmail = normalizePermissionEmail(user?.email);
    if (!normalizedEmail) return '';
    return userRoles?.[normalizedEmail] || '';
};

export const buildPermissionContext = ({
    user,
    teams = [],
    cloudAdmins = [],
    cloudEditors = [],
    cloudAIUsers = [],
    userRoles = {},
    roleDefinitions = {},
} = {}) => {
    const resolvedDefinitions = normalizeRoleDefinitions(roleDefinitions);
    const roleKey = resolveAssignedRoleKey(user, userRoles)
        || resolveLegacyRoleKey(user, { cloudAdmins, cloudEditors, teams });
    const roleDefinition = resolvedDefinitions[roleKey] || resolvedDefinitions.viewer;
    const aiEnabledByLegacy = checkCanUseAI(user, cloudAIUsers);

    return {
        roleKey,
        roleLabel: roleDefinition?.label || '員工',
        roleDefinition,
        pageAccess: roleDefinition?.pageAccess || {},
        actionAccess: {
            ...(roleDefinition?.actionAccess || {}),
            'ai.useSummary': roleDefinition?.actionAccess?.['ai.useSummary'] || aiEnabledByLegacy,
        },
        isAdmin: roleKey === 'admin',
        isEditor: roleKey === 'editor',
        isLeader: roleKey === 'leader',
        isViewer: roleKey === 'viewer',
    };
};

export const canAccessPage = (permissionContext, pageKey) => (
    Boolean(permissionContext?.pageAccess?.[pageKey])
);

export const canPerformAction = (permissionContext, actionKey) => (
    Boolean(permissionContext?.actionAccess?.[actionKey])
);

export const updateRoleDefinitionAccess = ({
    roleDefinitions = {},
    roleKey,
    scope,
    accessKey,
    value,
}) => {
    const resolvedDefinitions = normalizeRoleDefinitions(roleDefinitions);
    const nextDefinitions = { ...resolvedDefinitions };
    const currentDefinition = nextDefinitions[roleKey];

    if (!currentDefinition || !['pageAccess', 'actionAccess'].includes(scope)) {
        return resolvedDefinitions;
    }

    const lockedKeys = scope === 'actionAccess'
        ? getLockedActionAccessKeys(roleKey)
        : [];

    if (lockedKeys.includes(accessKey)) {
        return resolvedDefinitions;
    }

    nextDefinitions[roleKey] = {
        ...currentDefinition,
        [scope]: {
            ...currentDefinition[scope],
            [accessKey]: value,
        },
    };

    return nextDefinitions;
};
