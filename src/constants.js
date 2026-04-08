export const SYSTEM_CREATOR = "Show";
export const APP_VERSION = "v1.1.0";
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
