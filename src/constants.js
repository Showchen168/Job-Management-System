export const SYSTEM_CREATOR = "Show";
export const APP_VERSION = "v1.5.0";
export const ON_GOING_KEYWORDS = ["on-going", "ongoing", "進行"];
export const LOCALE_STORAGE_KEY = "jms-locale";
export const DEFAULT_LOCALE = "zh-Hant";
export const AIVRES_EMAIL_DOMAIN = "@aivres.com";
export const NOTIFICATION_EMAIL_DOMAIN = "@aivres.com";
export const DEFAULT_MEETING_CATEGORIES = ['內部會議', '客戶會議', '專案檢討', '腦力激盪'];
export const DEFAULT_TASK_SOURCES = ['Email', 'Meeting', 'Chat', 'Other'];
export const DEFAULT_TASK_STATUSES = ['Pending', 'On-going', 'Done'];
export const DEFAULT_ISSUE_SOURCES = ['開發', '維護', '客戶', '產線'];
export const DEFAULT_ISSUE_LOCATIONS = ['硬件', '固件', '測試', '其它'];
export const DEFAULT_ISSUE_ESCALATIONS = ['項目組', 'Nvidia', '領導', '技術負責人'];
export const PERMISSION_PAGE_KEYS = ['dashboard', 'team-board', 'tasks', 'issues', 'meetings', 'settings'];
export const PERMISSION_ACTION_KEYS = [
    'notification.markAllRead',
    'ai.useSummary',
    'settings.manageRoles',
    'settings.manageRolePermissions',
    'settings.manageAdmins',
    'settings.manageEditors',
    'settings.manageAIUsers',
    'settings.manageTeams',
    'settings.manageDropdowns',
    'settings.manageTaskStatuses',
    'task.create',
    'task.edit',
    'task.delete',
    'issue.create',
    'issue.edit',
    'issue.delete',
    'meeting.create',
    'meeting.edit',
    'meeting.delete',
];
export const ROLE_LOCKED_PAGE_ACCESS = {
    admin: [],
    leader: [],
    editor: [],
    viewer: [],
};
export const ROLE_LOCKED_ACTION_ACCESS = {
    admin: ['settings.manageRoles', 'settings.manageRolePermissions'],
    leader: [],
    editor: [],
    viewer: [],
};
export const DEFAULT_ROLE_DEFINITIONS = {
    admin: {
        key: 'admin',
        label: '管理員',
        pageAccess: {
            dashboard: true,
            'team-board': true,
            tasks: true,
            issues: true,
            meetings: true,
            settings: true,
        },
        actionAccess: {
            'notification.markAllRead': true,
            'ai.useSummary': true,
            'settings.manageRoles': true,
            'settings.manageRolePermissions': true,
            'settings.manageAdmins': true,
            'settings.manageEditors': true,
            'settings.manageAIUsers': true,
            'settings.manageTeams': true,
            'settings.manageDropdowns': true,
            'settings.manageTaskStatuses': true,
            'task.create': true,
            'task.edit': true,
            'task.delete': true,
            'issue.create': true,
            'issue.edit': true,
            'issue.delete': true,
            'meeting.create': true,
            'meeting.edit': true,
            'meeting.delete': true,
        },
    },
    leader: {
        key: 'leader',
        label: '主管',
        pageAccess: {
            dashboard: true,
            'team-board': true,
            tasks: true,
            issues: true,
            meetings: true,
            settings: true,
        },
        actionAccess: {
            'notification.markAllRead': true,
            'ai.useSummary': false,
            'settings.manageRoles': false,
            'settings.manageRolePermissions': false,
            'settings.manageAdmins': false,
            'settings.manageEditors': false,
            'settings.manageAIUsers': false,
            'settings.manageTeams': true,
            'settings.manageDropdowns': true,
            'settings.manageTaskStatuses': false,
            'task.create': true,
            'task.edit': true,
            'task.delete': true,
            'issue.create': true,
            'issue.edit': true,
            'issue.delete': true,
            'meeting.create': true,
            'meeting.edit': true,
            'meeting.delete': true,
        },
    },
    editor: {
        key: 'editor',
        label: '編輯者',
        pageAccess: {
            dashboard: true,
            'team-board': true,
            tasks: true,
            issues: true,
            meetings: true,
            settings: true,
        },
        actionAccess: {
            'notification.markAllRead': true,
            'ai.useSummary': true,
            'settings.manageRoles': false,
            'settings.manageRolePermissions': false,
            'settings.manageAdmins': false,
            'settings.manageEditors': false,
            'settings.manageAIUsers': false,
            'settings.manageTeams': true,
            'settings.manageDropdowns': true,
            'settings.manageTaskStatuses': true,
            'task.create': true,
            'task.edit': true,
            'task.delete': true,
            'issue.create': true,
            'issue.edit': true,
            'issue.delete': true,
            'meeting.create': true,
            'meeting.edit': true,
            'meeting.delete': true,
        },
    },
    viewer: {
        key: 'viewer',
        label: '員工',
        pageAccess: {
            dashboard: true,
            'team-board': false,
            tasks: true,
            issues: true,
            meetings: true,
            settings: false,
        },
        actionAccess: {
            'notification.markAllRead': true,
            'ai.useSummary': false,
            'settings.manageRoles': false,
            'settings.manageRolePermissions': false,
            'settings.manageAdmins': false,
            'settings.manageEditors': false,
            'settings.manageAIUsers': false,
            'settings.manageTeams': false,
            'settings.manageDropdowns': false,
            'settings.manageTaskStatuses': false,
            'task.create': true,
            'task.edit': true,
            'task.delete': true,
            'issue.create': true,
            'issue.edit': true,
            'issue.delete': true,
            'meeting.create': true,
            'meeting.edit': true,
            'meeting.delete': true,
        },
    },
};

export const DEFAULT_CONFIG = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

export const ROOT_ADMINS = (import.meta.env.VITE_ROOT_ADMINS || '').split(',').map(e => e.trim()).filter(Boolean);
