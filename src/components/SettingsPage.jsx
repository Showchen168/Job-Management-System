import React, { useState, useEffect, useMemo } from 'react';
import {
    collection, collectionGroup, deleteDoc, doc, getDoc, getDocs, setDoc,
    query, orderBy, onSnapshot, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import {
    Users, Save, X, Edit2, Trash2, ChevronRight, ShieldCheck, Lock,
    UserCog, User, Sparkles, Bot, Clock
} from 'lucide-react';

import {
    DEFAULT_MEETING_CATEGORIES, DEFAULT_TASK_SOURCES, DEFAULT_TASK_STATUSES,
    DEFAULT_ISSUE_SOURCES, DEFAULT_ISSUE_LOCATIONS, DEFAULT_ISSUE_ESCALATIONS,
    DEFAULT_ROLE_DEFINITIONS, PERMISSION_PAGE_KEYS,
} from '../constants';
import {
    buildPermissionContext,
    canPerformAction,
    formatEmailPrefix,
    getTeamLeaders,
    normalizePermissionEmail,
    checkIsLeader,
    normalizeRoleDefinitions,
    updateRoleDefinitionAccess,
} from '../utils/permissions';
import { buildNotificationPayloads, sendEmailJsNotification } from '../utils/notifications';
import Modal from './common/Modal';
import { StandardToolbarSelect } from './common/StandardToolbar';
import logger from '../utils/logger';

const PAGE_ACCESS_LABELS = {
    dashboard: '數據看板',
    'team-board': '團隊看板',
    tasks: '待辦事項',
    issues: '問題管理',
    meetings: '會議記錄',
    settings: '系統設定',
};

const SETTINGS_ROLE_OPTION_KEYS = ['admin', 'leader', 'viewer'];
const REGISTERED_USERS_PAGE_SIZE = 10;
const SETTINGS_PANEL_CLASS = 'rounded-2xl border border-slate-200 bg-white shadow-sm';
const SETTINGS_SUBSECTION_CLASS = 'rounded-2xl border border-slate-200 bg-slate-50 p-5';
const SETTINGS_MAIN_SECTION_CLASS = `${SETTINGS_PANEL_CLASS} p-8`;
const SETTINGS_SECTION_HEADER_CLASS = 'mb-6 flex min-h-[88px] items-start justify-between gap-3 border-b border-slate-100 pb-5';

const SettingsPage = ({
    db,
    user,
    isAdmin,
    isEditor,
    cloudAdmins,
    cloudEditors,
    cloudAIUsers,
    rootAdmins,
    onSaveGeminiSettings,
    testConfig,
    geminiApiKey,
    geminiModel,
    teams = [],
    permissionContext = null,
    roleDefinitions = DEFAULT_ROLE_DEFINITIONS,
    userRoles = {},
    onSaveRoleDefinitions = async () => {},
    onSaveUserRole = async () => {},
    demoUsers = [],
}) => {
    const [newCategory, setNewCategory] = useState('');
    const [categories, setCategories] = useState(DEFAULT_MEETING_CATEGORIES);
    const [newTaskSource, setNewTaskSource] = useState('');
    const [taskSources, setTaskSources] = useState(DEFAULT_TASK_SOURCES);
    const [newTaskStatus, setNewTaskStatus] = useState('');
    const [taskStatuses, setTaskStatuses] = useState(DEFAULT_TASK_STATUSES);
    const [newIssueSource, setNewIssueSource] = useState('');
    const [issueSources, setIssueSources] = useState(DEFAULT_ISSUE_SOURCES);
    const [newIssueLocation, setNewIssueLocation] = useState('');
    const [issueLocations, setIssueLocations] = useState(DEFAULT_ISSUE_LOCATIONS);
    const [newIssueEscalation, setNewIssueEscalation] = useState('');
    const [issueEscalations, setIssueEscalations] = useState(DEFAULT_ISSUE_ESCALATIONS);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newEditorEmail, setNewEditorEmail] = useState('');
    const [newAIUserEmail, setNewAIUserEmail] = useState('');
    const [newLeaderEmail, setNewLeaderEmail] = useState('');
    const [selectedTeamForLeader, setSelectedTeamForLeader] = useState('');
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamLeader, setNewTeamLeader] = useState('');
    const [newTeamMembers, setNewTeamMembers] = useState('');
    const [editingTeamId, setEditingTeamId] = useState(null);
    const [editTeamName, setEditTeamName] = useState('');
    const [editTeamLeader, setEditTeamLeader] = useState('');
    const [editTeamMembers, setEditTeamMembers] = useState('');
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    const isLeader = useMemo(() => checkIsLeader(user, teams), [user, teams]);
    const resolvedRoleDefinitions = useMemo(
        () => normalizeRoleDefinitions(roleDefinitions),
        [roleDefinitions]
    );
    const canManageRoles = canPerformAction(permissionContext, 'settings.manageRoles');
    const canManageRolePermissions = canPerformAction(permissionContext, 'settings.manageRolePermissions');
    const canManageAdmins = canPerformAction(permissionContext, 'settings.manageAdmins');
    const canManageEditors = canPerformAction(permissionContext, 'settings.manageEditors');
    const canEditDropdowns = canPerformAction(permissionContext, 'settings.manageDropdowns') || isAdmin || isEditor || isLeader;
    const canEditTaskStatuses = canPerformAction(permissionContext, 'settings.manageTaskStatuses') || isAdmin || isEditor;
    const canEditTeams = canPerformAction(permissionContext, 'settings.manageTeams') || isAdmin || isEditor;
    const canViewTeamPanel = canEditTeams || isLeader;
    const [allUsers, setAllUsers] = useState([]);
    const [isUserListLoading, setIsUserListLoading] = useState(false);
    const [userListError, setUserListError] = useState('');
    const [registeredUserSearch, setRegisteredUserSearch] = useState('');
    const [registeredUserRoleFilter, setRegisteredUserRoleFilter] = useState('all');
    const [registeredUserSort, setRegisteredUserSort] = useState('recent-desc');
    const [registeredUsersPage, setRegisteredUsersPage] = useState(1);
    const [emailServiceConfig, setEmailServiceConfig] = useState({
        provider: 'emailjs',
        serviceId: '',
        templateId: '',
        publicKey: '',
        fromName: ''
    });
    const [emailServiceError, setEmailServiceError] = useState('');
    const [isEmailServiceSaving, setIsEmailServiceSaving] = useState(false);
    const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
    const [geminiModelInput, setGeminiModelInput] = useState('gemini-2.5-flash');
    const [availableModels, setAvailableModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isGeminiSaving, setIsGeminiSaving] = useState(false);
    const [isManualNotificationSending, setIsManualNotificationSending] = useState(false);
    const [selectedRoleKey, setSelectedRoleKey] = useState('viewer');
    const [selectedManagedUserEmail, setSelectedManagedUserEmail] = useState('');
    const [activeSettingsTab, setActiveSettingsTab] = useState('permissions');
    const [draftRoleDefinitions, setDraftRoleDefinitions] = useState(() => normalizeRoleDefinitions(roleDefinitions));
    const [draftUserRoles, setDraftUserRoles] = useState(userRoles || {});
    const [isSavingPermissions, setIsSavingPermissions] = useState(false);
    const userTableColSpan = isAdmin ? 5 : 4;
    const selectedRoleDefinition = draftRoleDefinitions[selectedRoleKey] || draftRoleDefinitions.viewer;
    const roleOptions = useMemo(
        () => SETTINGS_ROLE_OPTION_KEYS
            .map((roleKey) => resolvedRoleDefinitions[roleKey])
            .filter(Boolean)
            .map((definition) => ({
                key: definition.key,
                label: definition.label,
            })),
        [resolvedRoleDefinitions]
    );
    const settingsTabs = useMemo(() => {
        const nextTabs = [];
        if (isAdmin || isEditor) {
            nextTabs.push({ id: 'registered-users', label: '已註冊使用者' });
        }
        if (canManageRoles || canManageRolePermissions || canManageAdmins || canManageEditors) {
            nextTabs.push({ id: 'permissions', label: '角色與權限' });
        }
        if ((isAdmin || isEditor) || canViewTeamPanel) {
            nextTabs.push({ id: 'teams', label: '團隊與成員' });
        }
        if (canEditDropdowns) {
            nextTabs.push({ id: 'dropdowns', label: '下拉選單' });
        }
        return nextTabs;
    }, [
        canManageRoles,
        canManageRolePermissions,
        canManageAdmins,
        canManageEditors,
        isAdmin,
        isEditor,
        canViewTeamPanel,
        canEditDropdowns,
    ]);

    const validUserOptions = useMemo(
        () => allUsers.filter((entry) => entry.email && entry.email !== '(未填寫)'),
        [allUsers]
    );

    const permissionSettingsDirty = useMemo(() => {
        return JSON.stringify(draftRoleDefinitions) !== JSON.stringify(resolvedRoleDefinitions)
            || JSON.stringify(draftUserRoles) !== JSON.stringify(userRoles || {});
    }, [draftRoleDefinitions, resolvedRoleDefinitions, draftUserRoles, userRoles]);

    const getRoleLabel = (roleKey) => {
        return resolvedRoleDefinitions[roleKey]?.label || resolvedRoleDefinitions.viewer?.label || '員工';
    };

    const registeredUsers = useMemo(() => {
        const normalizedSearch = registeredUserSearch.trim().toLowerCase();
        const filteredUsers = allUsers.filter((entry) => {
            const email = (entry.email || '').toLowerCase();
            const prefix = formatEmailPrefix(entry.email || '').toLowerCase();
            const uid = (entry.uid || '').toLowerCase();
            const roleKey = draftUserRoles[normalizePermissionEmail(entry.email)] || 'viewer';

            const matchesSearch = !normalizedSearch
                || email.includes(normalizedSearch)
                || prefix.includes(normalizedSearch)
                || uid.includes(normalizedSearch);
            const matchesRole = registeredUserRoleFilter === 'all' || roleKey === registeredUserRoleFilter;

            return matchesSearch && matchesRole;
        });

        const getLastSeenTime = (entry) => {
            if (entry.lastSeen?.toDate) return entry.lastSeen.toDate().getTime();
            if (entry.lastSeen?.seconds) return entry.lastSeen.seconds * 1000;
            return 0;
        };

        return [...filteredUsers].sort((left, right) => {
            if (registeredUserSort === 'name-asc') {
                return formatEmailPrefix(left.email || '').localeCompare(formatEmailPrefix(right.email || ''), 'zh-Hant');
            }
            if (registeredUserSort === 'name-desc') {
                return formatEmailPrefix(right.email || '').localeCompare(formatEmailPrefix(left.email || ''), 'zh-Hant');
            }
            return getLastSeenTime(right) - getLastSeenTime(left);
        });
    }, [allUsers, draftUserRoles, registeredUserSearch, registeredUserRoleFilter, registeredUserSort, resolvedRoleDefinitions]);

    const totalRegisteredUsersPages = Math.max(1, Math.ceil(registeredUsers.length / REGISTERED_USERS_PAGE_SIZE));
    const paginatedRegisteredUsers = useMemo(() => {
        const startIndex = (registeredUsersPage - 1) * REGISTERED_USERS_PAGE_SIZE;
        return registeredUsers.slice(startIndex, startIndex + REGISTERED_USERS_PAGE_SIZE);
    }, [registeredUsers, registeredUsersPage]);

    useEffect(() => {
        if (!db) {
            setCategories(DEFAULT_MEETING_CATEGORIES);
            setTaskSources(DEFAULT_TASK_SOURCES);
            setTaskStatuses(DEFAULT_TASK_STATUSES);
            setIssueSources(DEFAULT_ISSUE_SOURCES);
            setIssueLocations(DEFAULT_ISSUE_LOCATIONS);
            setIssueEscalations(DEFAULT_ISSUE_ESCALATIONS);
            return;
        }
        const settingsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCategories(data.meetingCategories || DEFAULT_MEETING_CATEGORIES);
                setTaskSources(data.taskSources || DEFAULT_TASK_SOURCES);
                setTaskStatuses(data.taskStatuses || DEFAULT_TASK_STATUSES);
                setIssueSources(data.issueSources || DEFAULT_ISSUE_SOURCES);
                setIssueLocations(data.issueLocations || DEFAULT_ISSUE_LOCATIONS);
                setIssueEscalations(data.issueEscalations || DEFAULT_ISSUE_ESCALATIONS);
            } else {
                setCategories(DEFAULT_MEETING_CATEGORIES);
                setTaskSources(DEFAULT_TASK_SOURCES);
                setTaskStatuses(DEFAULT_TASK_STATUSES);
                setIssueSources(DEFAULT_ISSUE_SOURCES);
                setIssueLocations(DEFAULT_ISSUE_LOCATIONS);
                setIssueEscalations(DEFAULT_ISSUE_ESCALATIONS);
            }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (testConfig?.demo || (!db && demoUsers.length > 0)) {
            setAllUsers((demoUsers || []).map((entry) => ({
                ...entry,
                docId: entry.uid || entry.email,
            })));
            setIsUserListLoading(false);
            return undefined;
        }
        if (!db || !(canViewTeamPanel || canManageRoles || isAdmin || isEditor)) return;
        setIsUserListLoading(true);
        setUserListError('');
        const q = query(collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users'), orderBy('lastSeen', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const users = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data();
                    return {
                        ...data,
                        uid: data.uid || docSnap.id,
                        email: data.email || '(未填寫)',
                        docId: docSnap.id
                    };
                });
                setAllUsers(users);
                setIsUserListLoading(false);
            },
            (error) => {
                logger.error('User list snapshot error:', error);
                setUserListError(`讀取失敗：${error.message}`);
                setIsUserListLoading(false);
            }
        );
        return () => unsubscribe();
    }, [db, canViewTeamPanel, canManageRoles, isAdmin, isEditor, demoUsers, testConfig?.demo]);

    useEffect(() => {
        if (!db || !isAdmin) return;
        const emailServiceRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'emailService');
        const unsubscribe = onSnapshot(
            emailServiceRef,
            (docSnap) => {
                setEmailServiceError('');
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEmailServiceConfig({
                        provider: data.provider || 'emailjs',
                        serviceId: data.serviceId || '',
                        templateId: data.templateId || '',
                        publicKey: data.publicKey || '',
                        fromName: data.fromName || ''
                    });
                } else {
                    setEmailServiceConfig({
                        provider: 'emailjs',
                        serviceId: '',
                        templateId: '',
                        publicKey: '',
                        fromName: ''
                    });
                }
            },
            (error) => {
                logger.error('Email service settings snapshot error:', error);
                setEmailServiceError(`讀取失敗：${error.message}`);
            }
        );
        return () => unsubscribe();
    }, [db, isAdmin]);

    useEffect(() => {
        setGeminiApiKeyInput(geminiApiKey || '');
    }, [geminiApiKey]);

    useEffect(() => {
        setGeminiModelInput(geminiModel || 'gemini-2.5-flash');
    }, [geminiModel]);

    useEffect(() => {
        if (resolvedRoleDefinitions[selectedRoleKey]) return;
        const fallbackRoleKey = Object.keys(resolvedRoleDefinitions)[0] || 'viewer';
        setSelectedRoleKey(fallbackRoleKey);
    }, [resolvedRoleDefinitions, selectedRoleKey]);

    useEffect(() => {
        setDraftRoleDefinitions(resolvedRoleDefinitions);
    }, [resolvedRoleDefinitions]);

    useEffect(() => {
        setDraftUserRoles(userRoles || {});
    }, [userRoles]);

    useEffect(() => {
        if (!validUserOptions.length) {
            setSelectedManagedUserEmail('');
            return;
        }
        if (validUserOptions.some((entry) => entry.email === selectedManagedUserEmail)) return;
        setSelectedManagedUserEmail(validUserOptions[0]?.email || '');
    }, [validUserOptions, selectedManagedUserEmail]);

    useEffect(() => {
        if (settingsTabs.some((tab) => tab.id === activeSettingsTab)) return;
        setActiveSettingsTab(settingsTabs[0]?.id || 'permissions');
    }, [settingsTabs, activeSettingsTab]);

    useEffect(() => {
        setRegisteredUsersPage(1);
    }, [registeredUserSearch, registeredUserRoleFilter, registeredUserSort]);

    useEffect(() => {
        if (registeredUsersPage <= totalRegisteredUsersPages) return;
        setRegisteredUsersPage(totalRegisteredUsersPages);
    }, [registeredUsersPage, totalRegisteredUsersPages]);

    // 獲取可用的 Gemini 模型列表
    const fetchAvailableModels = async () => {
        const apiKey = geminiApiKeyInput.trim();
        if (!apiKey) {
            setAvailableModels([]);
            return;
        }
        setIsLoadingModels(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
            if (!response.ok) throw new Error('無法獲取模型列表');
            const data = await response.json();
            // 只顯示支援 generateContent 的模型
            const models = (data.models || [])
                .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                .map(m => ({
                    id: m.name.replace('models/', ''),
                    name: m.displayName || m.name.replace('models/', ''),
                    description: m.description || ''
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
            setAvailableModels(models);
        } catch (e) {
            logger.error('獲取模型列表失敗:', e);
            setAvailableModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleAddItem = async (field, newItem, list, setListState, setNewItemState) => {
        if (!newItem.trim()) return;
        if (list.includes(newItem.trim())) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "此選項已存在", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); return; }
        if (!db || testConfig?.enabled) {
            setListState([...list, newItem.trim()]);
            setNewItemState('');
            return;
        }
        try { await setDoc(doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options'), { [field]: arrayUnion(newItem.trim()) }, { merge: true }); setNewItemState(''); }
        catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "更新失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };
    const confirmDeleteItem = (field, itemToDelete, list) => { setModalConfig({ isOpen: true, type: 'danger', title: '確認刪除', content: `確定要刪除「${itemToDelete}」嗎？`, onConfirm: () => executeDeleteItem(field, itemToDelete, list), onCancel: () => setModalConfig({ isOpen: false }) }); };
    const executeDeleteItem = async (field, itemToDelete, list) => {
        setModalConfig({ isOpen: false });
        if (!db || testConfig?.enabled) {
            const updatedList = list.filter(c => c !== itemToDelete);
            if (field === 'meetingCategories') setCategories(updatedList);
            if (field === 'taskSources') setTaskSources(updatedList);
            if (field === 'taskStatuses') setTaskStatuses(updatedList);
            if (field === 'issueSources') setIssueSources(updatedList);
            if (field === 'issueLocations') setIssueLocations(updatedList);
            if (field === 'issueEscalations') setIssueEscalations(updatedList);
            return;
        }
        const settingsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options');
        try {
            const snapshot = await getDoc(settingsRef);
            let updatedList = [];
            if (snapshot.exists()) { updatedList = (snapshot.data()[field] || []).filter(c => c !== itemToDelete); }
            else { updatedList = list.filter(c => c !== itemToDelete); }
            await setDoc(settingsRef, { [field]: updatedList }, { merge: true });
        } catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "刪除失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };
    const confirmDeleteUser = (userToDelete) => {
        if (!isAdmin) return;
        const label = formatEmailPrefix(userToDelete.email);
        setModalConfig({
            isOpen: true,
            type: 'danger',
            title: '刪除使用者',
            content: `確定要刪除 ${label} 的註冊資料嗎？此操作僅會移除登入清單記錄。`,
            onConfirm: () => executeDeleteUser(userToDelete),
            onCancel: () => setModalConfig({ isOpen: false })
        });
    };
    const executeDeleteUser = async (userToDelete) => {
        if (!db || !userToDelete?.docId) return;
        setModalConfig({ isOpen: false });
        try {
            const userEmail = userToDelete.email.toLowerCase();

            // 1. 刪除用戶註冊資料
            await deleteDoc(doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users', userToDelete.docId));

            // 2. 從團隊中移除（leaderIds 和 members）
            const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
            const teamsSnapshot = await getDoc(teamsRef);
            if (teamsSnapshot.exists()) {
                const currentTeams = teamsSnapshot.data().list || [];
                const updatedTeams = currentTeams.map(team => ({
                    ...team,
                    leaderIds: (team.leaderIds || []).filter(id => id.toLowerCase() !== userEmail),
                    members: (team.members || []).filter(m => m.toLowerCase() !== userEmail)
                }));
                await setDoc(teamsRef, { list: updatedTeams }, { merge: true });
            }

            // 3. 從權限列表中移除（admins, editors, aiUsers）
            const permissionTypes = ['admins', 'editors', 'aiUsers'];
            for (const type of permissionTypes) {
                const permRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', type);
                const permSnapshot = await getDoc(permRef);
                if (permSnapshot.exists()) {
                    const currentList = permSnapshot.data().list || [];
                    const updatedList = currentList.filter(e => e.toLowerCase() !== userEmail);
                    if (currentList.length !== updatedList.length) {
                        await setDoc(permRef, { list: updatedList }, { merge: true });
                    }
                }
            }

            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: '刪除成功',
                content: `已刪除 ${formatEmailPrefix(userToDelete.email)} 的所有資料（包含團隊和權限）。`,
                onConfirm: () => setModalConfig({ isOpen: false }),
                confirmText: "好",
                onCancel: null
            });
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "刪除失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };
    // 通用權限管理函數 (重構後)
    const PERMISSION_PATHS = {
        admins: 'artifacts/work-tracker-v1/public/data/settings/admins',
        editors: 'artifacts/work-tracker-v1/public/data/settings/editors',
        aiUsers: 'artifacts/work-tracker-v1/public/data/settings/aiUsers'
    };

    const handleAddPermission = async (type, email, existingList, rootList = []) => {
        const normalizedEmail = normalizePermissionEmail(email);
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請輸入使用者帳號", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return false;
        }
        const allExisting = [...existingList, ...rootList].map(e => e.toLowerCase());
        if (allExisting.includes(normalizedEmail)) {
            const typeNames = { admins: '管理員', editors: '編輯者', aiUsers: 'AI 使用' };
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: `該使用者已有${typeNames[type]}權限`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return false;
        }
        try {
            await setDoc(doc(db, ...PERMISSION_PATHS[type].split('/')), { list: arrayUnion(normalizedEmail) }, { merge: true });
            const typeNames = { admins: '管理員', editors: '編輯者', aiUsers: 'AI 使用權限' };
            setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: `已將 ${normalizedEmail} 新增為${typeNames[type]}`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            return true;
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "操作失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return false;
        }
    };

    const executeRemovePermission = async (type, emailToRemove) => {
        setModalConfig({ isOpen: false });
        const docRef = doc(db, ...PERMISSION_PATHS[type].split('/'));
        try {
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                const updatedList = (snapshot.data().list || []).filter(e => e !== emailToRemove);
                await setDoc(docRef, { list: updatedList }, { merge: true });
            }
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "操作失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };

    const confirmRemovePermission = (type, emailToRemove) => {
        const typeNames = { admins: '管理員', editors: '編輯者', aiUsers: 'AI 使用' };
        setModalConfig({
            isOpen: true, type: 'danger', title: '移除權限',
            content: `確定要移除 ${formatEmailPrefix(emailToRemove)} 的${typeNames[type]}權限？`,
            onConfirm: () => executeRemovePermission(type, emailToRemove),
            onCancel: () => setModalConfig({ isOpen: false })
        });
    };

    // 簡化的權限操作函數
    const handleAddAdmin = async () => {
        if (await handleAddPermission('admins', newAdminEmail, cloudAdmins, rootAdmins)) setNewAdminEmail('');
    };
    const confirmRemoveAdmin = (email) => confirmRemovePermission('admins', email);

    const handleAddEditor = async () => {
        // 編輯者不能同時是管理員
        const normalizedEmail = normalizePermissionEmail(newEditorEmail);
        const normalizedAdmins = [...cloudAdmins, ...rootAdmins].map(e => e.toLowerCase());
        if (normalizedAdmins.includes(normalizedEmail)) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "該使用者已經是管理員", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        if (await handleAddPermission('editors', newEditorEmail, cloudEditors)) setNewEditorEmail('');
    };
    const confirmRemoveEditor = (email) => confirmRemovePermission('editors', email);

    const handleAddAIUser = async () => {
        if (await handleAddPermission('aiUsers', newAIUserEmail, cloudAIUsers || [])) setNewAIUserEmail('');
    };
    const confirmRemoveAIUser = (email) => confirmRemovePermission('aiUsers', email);

    // Leader 管理（快速添加）
    const handleAddLeader = async () => {
        if (!newLeaderEmail) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請選擇使用者", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        const normalizedEmail = normalizePermissionEmail(newLeaderEmail);
        const leaderName = formatEmailPrefix(normalizedEmail);
        const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');

        try {
            if (selectedTeamForLeader) {
                // 添加到現有團隊
                const snapshot = await getDoc(teamsRef);
                if (snapshot.exists()) {
                    const currentList = snapshot.data().list || [];
                    const updatedList = currentList.map(t => {
                        if (t.id === selectedTeamForLeader) {
                            const currentLeaders = getTeamLeaders(t);
                            if (currentLeaders.map(l => l.toLowerCase()).includes(normalizedEmail.toLowerCase())) {
                                throw new Error("該使用者已經是此團隊的 Leader");
                            }
                            const updatedTeam = {
                                ...t,
                                leaderIds: [...currentLeaders, normalizedEmail]
                            };
                            delete updatedTeam.leaderId; // 移除舊格式
                            return updatedTeam;
                        }
                        return t;
                    });
                    await setDoc(teamsRef, { list: updatedList }, { merge: true });
                    const teamName = currentList.find(t => t.id === selectedTeamForLeader)?.name || '';
                    setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: `已將 ${leaderName} 加入團隊「${teamName}」為 Leader`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
                }
            } else {
                // 建立新團隊
                const newTeam = {
                    id: `team-${crypto.randomUUID()}`,
                    name: `${leaderName} 的團隊`,
                    leaderIds: [normalizedEmail],
                    members: []
                };
                await setDoc(teamsRef, { list: arrayUnion(newTeam) }, { merge: true });
                setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: `已將 ${leaderName} 設為新團隊的 Leader`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            }
            setNewLeaderEmail('');
            setSelectedTeamForLeader('');
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: e.message || "操作失敗", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };

    // 團隊管理
    const handleAddTeam = async () => {
        const leaderList = newTeamLeader
            .split(',')
            .map(l => normalizePermissionEmail(l.trim()))
            .filter(Boolean);

        if (!newTeamName.trim() || leaderList.length === 0) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請填寫團隊名稱並選擇至少一位 Leader", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }

        const newTeam = {
            id: `team-${crypto.randomUUID()}`,
            name: newTeamName.trim(),
            leaderIds: leaderList,
            members: [] // 成員由 Leader 自行管理
        };

        try {
            const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
            await setDoc(teamsRef, { list: arrayUnion(newTeam) }, { merge: true });
            setNewTeamName('');
            setNewTeamLeader('');
            setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: `已建立團隊「${newTeam.name}」，成員請由 Leader 自行管理`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "建立失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };
    const confirmDeleteTeam = (teamId, teamName) => {
        setModalConfig({ isOpen: true, type: 'danger', title: '確認刪除', content: `確定要刪除團隊「${teamName}」？`, onConfirm: () => executeDeleteTeam(teamId), onCancel: () => setModalConfig({ isOpen: false }) });
    };
    const executeDeleteTeam = async (teamId) => {
        setModalConfig({ isOpen: false });
        const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
        try {
            const snapshot = await getDoc(teamsRef);
            if (snapshot.exists()) {
                const updatedList = (snapshot.data().list || []).filter(t => t.id !== teamId);
                await setDoc(teamsRef, { list: updatedList }, { merge: true });
            }
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "刪除失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };

    // 檢查用戶是否可以管理特定團隊
    const canManageTeam = (team) => {
        if (isAdmin || isEditor) return true;
        if (isLeader && user?.email && getTeamLeaders(team).includes(user.email)) return true;
        return false;
    };

    // 開始編輯團隊
    const startEditTeam = (team) => {
        setEditingTeamId(team.id);
        setEditTeamName(team.name);
        setEditTeamLeader(getTeamLeaders(team).join(', '));
        setEditTeamMembers(team.members ? team.members.join(', ') : '');
    };

    // 取消編輯團隊
    const cancelEditTeam = () => {
        setEditingTeamId(null);
        setEditTeamName('');
        setEditTeamLeader('');
        setEditTeamMembers('');
    };

    // 儲存編輯的團隊
    const handleUpdateTeam = async (teamId) => {
        if (!editTeamName.trim()) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "團隊名稱不能為空", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        const memberList = [...new Set(editTeamMembers
            .split(',')
            .map(m => normalizePermissionEmail(m.trim()))
            .filter(Boolean))];
        const leaderList = [...new Set(editTeamLeader
            .split(',')
            .map(l => normalizePermissionEmail(l.trim()))
            .filter(Boolean))];

        const teamsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'teams');
        try {
            const snapshot = await getDoc(teamsRef);
            if (snapshot.exists()) {
                const currentList = snapshot.data().list || [];
                const updatedList = currentList.map(t => {
                    if (t.id === teamId) {
                        const updatedTeam = {
                            ...t,
                            name: editTeamName.trim(),
                            members: memberList
                        };
                        // 只有 Admin/Editor 可以變更 Leader
                        if (isAdmin || isEditor) {
                            updatedTeam.leaderIds = leaderList;
                            delete updatedTeam.leaderId; // 移除舊格式
                        }
                        return updatedTeam;
                    }
                    return t;
                });
                await setDoc(teamsRef, { list: updatedList }, { merge: true });
                cancelEditTeam();
                setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: "團隊已更新", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            }
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "更新失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        }
    };

    const resolveDisplayedRoleKey = (email) => {
        if (!email) return 'viewer';
        const normalizedEmail = normalizePermissionEmail(email);
        const assignedRoleKey = draftUserRoles?.[normalizedEmail]
            || buildPermissionContext({
                user: { email: normalizedEmail },
                teams,
                cloudAdmins,
                cloudEditors,
                cloudAIUsers,
                userRoles: draftUserRoles,
                roleDefinitions: draftRoleDefinitions,
            }).roleKey;

        return SETTINGS_ROLE_OPTION_KEYS.includes(assignedRoleKey)
            ? assignedRoleKey
            : 'viewer';
    };

    const selectedManagedUser = validUserOptions.find((entry) => entry.email === selectedManagedUserEmail) || null;

    const handleChangeUserRole = (email, roleKey) => {
        if (!email || !roleKey) return;
        const normalizedEmail = normalizePermissionEmail(email);
        setDraftUserRoles((current) => ({
            ...current,
            [normalizedEmail]: roleKey,
        }));
    };

    const handleToggleRoleAccess = ({ scope, accessKey, value }) => {
        const nextDefinitions = updateRoleDefinitionAccess({
            roleDefinitions: draftRoleDefinitions,
            roleKey: selectedRoleKey,
            scope,
            accessKey,
            value,
        });
        setDraftRoleDefinitions(nextDefinitions);
    };

    const handleSavePermissionSettings = async () => {
        if (!permissionSettingsDirty) return;
        setIsSavingPermissions(true);
        try {
            if (JSON.stringify(draftRoleDefinitions) !== JSON.stringify(resolvedRoleDefinitions)) {
                await onSaveRoleDefinitions(draftRoleDefinitions);
            }

            const changedEmails = Object.keys({
                ...(userRoles || {}),
                ...(draftUserRoles || {}),
            }).filter((email) => (draftUserRoles?.[email] || '') !== ((userRoles || {})[email] || ''));

            for (const email of changedEmails) {
                await onSaveUserRole(email, draftUserRoles[email]);
            }

            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: '成功',
                content: '角色與權限設定已儲存',
                onConfirm: () => setModalConfig({ isOpen: false }),
                confirmText: '好',
                onCancel: null,
            });
        } catch (error) {
            setModalConfig({
                isOpen: true,
                type: 'danger',
                title: '錯誤',
                content: `儲存失敗：${error.message}`,
                onConfirm: () => setModalConfig({ isOpen: false }),
                confirmText: '關閉',
                onCancel: null,
            });
        } finally {
            setIsSavingPermissions(false);
        }
    };

    const handleEmailServiceChange = (field, value) => {
        setEmailServiceConfig((prev) => ({ ...prev, [field]: value }));
    };

    const handleSaveEmailServiceSettings = async () => {
        if (!db) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "目前無法儲存 Email 服務設定", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        if (!emailServiceConfig.serviceId.trim() || !emailServiceConfig.templateId.trim() || !emailServiceConfig.publicKey.trim()) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請填寫 EmailJS Service ID / Template ID / Public Key", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        setIsEmailServiceSaving(true);
        try {
            await setDoc(
                doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'emailService'),
                {
                    provider: 'emailjs',
                    serviceId: emailServiceConfig.serviceId.trim(),
                    templateId: emailServiceConfig.templateId.trim(),
                    publicKey: emailServiceConfig.publicKey.trim(),
                    fromName: emailServiceConfig.fromName.trim(),
                    updatedAt: serverTimestamp(),
                    updatedBy: user?.email || null
                },
                { merge: true }
            );
            setModalConfig({ isOpen: true, type: 'confirm', title: '成功', content: "Email 服務設定已更新", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "更新失敗：" + e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        } finally {
            setIsEmailServiceSaving(false);
        }
    };

    const handleSaveGeminiSettingsLocal = async () => {
        const trimmedKey = geminiApiKeyInput.trim();
        if (!trimmedKey) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請填寫 Gemini API Key", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        if (!geminiModelInput) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請選擇模型版本", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        setIsGeminiSaving(true);
        try {
            await onSaveGeminiSettings(trimmedKey, geminiModelInput);
            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: '成功',
                content: "Gemini 設定已更新",
                onConfirm: () => setModalConfig({ isOpen: false }),
                confirmText: "好",
                onCancel: null
            });
        } catch (e) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: `更新失敗：${e.message}`, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
        } finally {
            setIsGeminiSaving(false);
        }
    };

    const fetchOnGoingNotificationPayloads = async (notifyDate) => {
        const taskSnapshot = await getDocs(query(collectionGroup(db, 'tasks')));
        const tasks = taskSnapshot.docs.map((docSnap) => docSnap.data());
        const usersSnapshot = await getDocs(collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users'));
        const userEmails = usersSnapshot.docs
            .map((docSnap) => docSnap.data()?.email)
            .filter(Boolean);
        return buildNotificationPayloads(tasks, userEmails, notifyDate);
    };


    const handleManualOnGoingNotification = async () => {
        if (!db) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "目前無法發送通知", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        if (!emailServiceConfig.serviceId.trim() || !emailServiceConfig.templateId.trim() || !emailServiceConfig.publicKey.trim()) {
            setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: "請先完成 EmailJS 服務設定", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null });
            return;
        }
        setIsManualNotificationSending(true);
        try {
            const notifyDate = new Date();
            const payloads = await fetchOnGoingNotificationPayloads(notifyDate);
            if (!payloads.length) {
                setModalConfig({
                    isOpen: true,
                    type: 'danger',
                    title: '無通知可發送',
                    content: '目前沒有 On-going 待辦事項或負責人資料。',
                    onConfirm: () => setModalConfig({ isOpen: false }),
                    confirmText: '關閉',
                    onCancel: null
                });
                return;
            }
            const recipients = [...new Set(payloads.map((payload) => payload.to))];
            const preview = `通知數量：${payloads.length}\n收件人：${recipients.join('、')}`;
            setModalConfig({
                isOpen: true,
                type: 'confirm',
                title: '確認發送 On-going 通知',
                content: `將會發送目前 On-going 待辦的通知（不受每日限制）。\n${preview}`,
                onConfirm: async () => {
                    setModalConfig({ isOpen: false });
                    setIsManualNotificationSending(true);
                    try {
                        for (const payload of payloads) {
                            await sendEmailJsNotification(emailServiceConfig, payload);
                        }
                        setModalConfig({
                            isOpen: true,
                            type: 'confirm',
                            title: '通知發送完成',
                            content: preview,
                            onConfirm: () => setModalConfig({ isOpen: false }),
                            confirmText: '關閉',
                            onCancel: null
                        });
                    } catch (error) {
                        setModalConfig({
                            isOpen: true,
                            type: 'danger',
                            title: '發送失敗',
                            content: `EmailJS 發送失敗：${error.message}`,
                            onConfirm: () => setModalConfig({ isOpen: false }),
                            confirmText: '關閉',
                            onCancel: null
                        });
                    } finally {
                        setIsManualNotificationSending(false);
                    }
                },
                confirmText: '確認發送',
                onCancel: () => setModalConfig({ isOpen: false })
            });
        } catch (error) {
            setModalConfig({
                isOpen: true,
                type: 'danger',
                title: '發送失敗',
                content: `通知準備失敗：${error.message}`,
                onConfirm: () => setModalConfig({ isOpen: false }),
                confirmText: '關閉',
                onCancel: null
            });
        } finally {
            setIsManualNotificationSending(false);
        }
    };

    return (
        <div className="w-full space-y-6 pb-12" data-testid="settings-page-root">
            <Modal {...modalConfig} />

            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" data-testid="settings-tabs">
                <div className="flex flex-wrap gap-2">
                    {settingsTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveSettingsTab(tab.id)}
                            className={`rounded-xl px-5 py-2.5 text-sm font-medium transition ${
                                activeSettingsTab === tab.id
                                    ? 'bg-[#0075de] text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeSettingsTab === 'permissions' && ((canManageRoles || canManageRolePermissions) ? (
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleSavePermissionSettings}
                                disabled={!permissionSettingsDirty || isSavingPermissions}
                                className="rounded-xl bg-[#0075de] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#005ec1] disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {isSavingPermissions ? '儲存中...' : '儲存角色與權限'}
                            </button>
                        </div>
                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
                        <section className={SETTINGS_MAIN_SECTION_CLASS} data-testid="settings-role-management">
                            <div className={SETTINGS_SECTION_HEADER_CLASS} data-testid="settings-role-management-header">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">使用者角色管理</h2>
                                    <p className="mt-1 text-sm text-slate-500">先選一位使用者，再指定他在系統裡的角色。</p>
                                </div>
                                {!canManageRoles && (
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">僅檢視</span>
                                )}
                            </div>
                            <div className="space-y-5">
                                {validUserOptions.length === 0 ? (
                                    <div className={`${SETTINGS_SUBSECTION_CLASS} border-dashed text-center text-sm text-slate-400`}>
                                        目前還沒有註冊使用者資料
                                    </div>
                                ) : (
                                    <>
                                        <div className={SETTINGS_SUBSECTION_CLASS}>
                                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                                                <div>
                                                    <label htmlFor="settings-managed-user-select" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">選擇使用者</label>
                                                    <select
                                                        id="settings-managed-user-select"
                                                        aria-label="選擇使用者"
                                                        value={selectedManagedUserEmail}
                                                        onChange={(event) => setSelectedManagedUserEmail(event.target.value)}
                                                        className="w-full rounded-xl border border-[#bfcde0] bg-white px-3 py-3 text-sm text-slate-700"
                                                    >
                                                        {validUserOptions.map((account) => (
                                                            <option key={account.uid || account.email} value={account.email}>
                                                                {formatEmailPrefix(account.email)}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor="settings-managed-user-role" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">角色設定</label>
                                                    <select
                                                        id="settings-managed-user-role"
                                                        aria-label="角色設定"
                                                        value={resolveDisplayedRoleKey(selectedManagedUserEmail)}
                                                        onChange={(event) => handleChangeUserRole(selectedManagedUserEmail, event.target.value)}
                                                        disabled={!canManageRoles || normalizePermissionEmail(user?.email) === normalizePermissionEmail(selectedManagedUserEmail)}
                                                        className="w-full rounded-xl border border-[#bfcde0] bg-white px-3 py-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                    >
                                                        {roleOptions.map((role) => (
                                                            <option key={role.key} value={role.key}>{role.label}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        {selectedManagedUser && (
                                            <div className={SETTINGS_SUBSECTION_CLASS}>
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div>
                                                        <div className="font-medium text-slate-800">{formatEmailPrefix(selectedManagedUser.email)}</div>
                                                        <div className="text-xs text-slate-400">{selectedManagedUser.email}</div>
                                                    </div>
                                                    {normalizePermissionEmail(user?.email) === normalizePermissionEmail(selectedManagedUser.email) && (
                                                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-700">自己的角色不可改</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>

                        <section className={SETTINGS_MAIN_SECTION_CLASS} data-testid="settings-role-definitions">
                            <div className={SETTINGS_SECTION_HEADER_CLASS} data-testid="settings-role-definitions-header">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">角色權限設定</h2>
                                    <p className="mt-1 text-sm text-slate-500">只保留頁面存取設定，決定這個角色看得到哪些頁面。</p>
                                </div>
                                {!canManageRolePermissions && (
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">僅檢視</span>
                                )}
                            </div>

                            <div className="space-y-5">
                                <div className={SETTINGS_SUBSECTION_CLASS} data-testid="settings-role-toolbar">
                                    <label htmlFor="settings-role-select" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">目前編輯角色</label>
                                    <StandardToolbarSelect id="settings-role-select" aria-label="目前編輯角色" value={selectedRoleKey} onChange={(event) => setSelectedRoleKey(event.target.value)} className="w-full">
                                        {roleOptions.map((role) => (
                                            <option key={role.key} value={role.key}>{role.label}</option>
                                        ))}
                                    </StandardToolbarSelect>
                                </div>

                                <div className={SETTINGS_SUBSECTION_CLASS}>
                                    <h3 className="mb-2 text-sm font-semibold text-slate-700">頁面存取</h3>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {PERMISSION_PAGE_KEYS.map((pageKey) => {
                                            return (
                                                <label key={pageKey} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                                                    <div className="space-y-1">
                                                        <div className="font-medium text-slate-700">{PAGE_ACCESS_LABELS[pageKey] || pageKey}</div>
                                                        <div className="text-xs text-slate-400">{pageKey}</div>
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(selectedRoleDefinition?.pageAccess?.[pageKey])}
                                                        disabled={!canManageRolePermissions}
                                                        onChange={(event) => handleToggleRoleAccess({
                                                            scope: 'pageAccess',
                                                            accessKey: pageKey,
                                                            value: event.target.checked,
                                                        })}
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-400">
                        你目前可以查看系統設定，但不能變更角色或角色權限。
                    </div>
                ))}

            {activeSettingsTab === 'registered-users' && (isAdmin || isEditor) && (
                <div className={SETTINGS_PANEL_CLASS} data-testid="registered-users">
                    <div className="border-b border-slate-100 px-8 py-6">
                        <h2 className="text-xl font-bold text-slate-800">已註冊使用者列表</h2>
                        <p className="mt-1 text-sm text-slate-500">獨立查看所有登入過系統的帳號資料。</p>
                    </div>
                    <div className="border-b border-slate-100 px-8 py-5">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_220px_220px]">
                                <div>
                                    <label htmlFor="registered-user-search" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">搜尋已註冊使用者</label>
                                    <input
                                        id="registered-user-search"
                                        aria-label="搜尋已註冊使用者"
                                        type="text"
                                        value={registeredUserSearch}
                                        onChange={(event) => setRegisteredUserSearch(event.target.value)}
                                        placeholder="輸入姓名、Email 或 UID"
                                        className="w-full rounded-xl border border-[#bfcde0] bg-white px-3 py-3 text-sm text-slate-700"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="registered-user-role-filter" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">角色篩選</label>
                                    <StandardToolbarSelect
                                        id="registered-user-role-filter"
                                        aria-label="角色篩選"
                                        value={registeredUserRoleFilter}
                                        onChange={(event) => setRegisteredUserRoleFilter(event.target.value)}
                                        className="w-full"
                                    >
                                        <option value="all">全部角色</option>
                                        {roleOptions.map((role) => (
                                            <option key={role.key} value={role.key}>{role.label}</option>
                                        ))}
                                    </StandardToolbarSelect>
                                </div>
                                <div>
                                    <label htmlFor="registered-user-sort" className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">排序方式</label>
                                    <StandardToolbarSelect
                                        id="registered-user-sort"
                                        aria-label="排序方式"
                                        value={registeredUserSort}
                                        onChange={(event) => setRegisteredUserSort(event.target.value)}
                                        className="w-full"
                                    >
                                        <option value="recent-desc">最近上線優先</option>
                                        <option value="name-asc">姓名 A 到 Z</option>
                                        <option value="name-desc">姓名 Z 到 A</option>
                                    </StandardToolbarSelect>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto px-8 py-6">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">使用者</th>
                                    <th className="px-4 py-3">角色</th>
                                    <th className="px-4 py-3">User UID</th>
                                    <th className="px-4 py-3">最後上線</th>
                                    {isAdmin && <th className="px-4 py-3 text-right">操作</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {userListError ? (
                                    <tr><td colSpan={userTableColSpan} className="px-4 py-4 text-center text-red-500">{userListError}</td></tr>
                                ) : isUserListLoading ? (
                                    <tr><td colSpan={userTableColSpan} className="px-4 py-4 text-center text-slate-400">資料載入中...</td></tr>
                                ) : paginatedRegisteredUsers.length === 0 ? (
                                    <tr><td colSpan={userTableColSpan} className="px-4 py-4 text-center text-slate-400">尚無資料</td></tr>
                                ) : (
                                    paginatedRegisteredUsers.map((u) => {
                                        const lastSeenDate = u.lastSeen?.toDate
                                            ? u.lastSeen.toDate()
                                            : (u.lastSeen?.seconds ? new Date(u.lastSeen.seconds * 1000) : null);
                                        const isSelf = user?.email && u.email === user.email;
                                        const isRootAdmin = rootAdmins.includes(u.email);
                                        const canDelete = isAdmin && !isSelf && !isRootAdmin;
                                        const roleKey = draftUserRoles[normalizePermissionEmail(u.email)] || 'viewer';
                                        return (
                                            <tr key={u.uid} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-800" data-testid="registered-user-name">{formatEmailPrefix(u.email)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                                                        {getRoleLabel(roleKey)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.uid}</td>
                                                <td className="px-4 py-3 text-xs">{lastSeenDate ? lastSeenDate.toLocaleString() : 'N/A'}</td>
                                                {isAdmin && (
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => canDelete && confirmDeleteUser(u)}
                                                            disabled={!canDelete}
                                                            className={`p-1 rounded transition ${canDelete ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-slate-300 cursor-not-allowed'}`}
                                                            title={canDelete ? '刪除使用者' : (isSelf ? '不可刪除自己' : '不可刪除系統管理員')}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-8 py-4">
                        <div className="text-sm text-slate-500">
                            第 {registeredUsersPage} 頁，共 {totalRegisteredUsersPages} 頁
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setRegisteredUsersPage((page) => Math.max(1, page - 1))}
                                disabled={registeredUsersPage === 1}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                                上一頁
                            </button>
                            <button
                                type="button"
                                onClick={() => setRegisteredUsersPage((page) => Math.min(totalRegisteredUsersPages, page + 1))}
                                disabled={registeredUsersPage === totalRegisteredUsersPages}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                                下一頁
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Management Panel */}
            {activeSettingsTab === 'teams' && canViewTeamPanel && (
                <div className={`${SETTINGS_PANEL_CLASS} p-8`} data-testid="settings-team-management">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="rounded-full bg-[#eaf3ff] p-3"><Users className="text-[#0075de]" size={24} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">團隊管理</h2>
                            <p className="text-sm text-slate-500">
                                {canEditTeams ? '設定團隊讓 Leader 可查看成員待辦事項' : '管理你的團隊成員'}
                            </p>
                        </div>
                    </div>
                    {/* 新增團隊表單 - 僅 Admin/Editor 可見 */}
                    {canEditTeams && (
                        <div className={`${SETTINGS_SUBSECTION_CLASS} mb-4`}>
                            <h3 className="font-bold text-slate-700 mb-3">新增團隊</h3>
                            <div className="mb-3">
                                <label className="block text-xs text-slate-500 mb-1">團隊名稱</label>
                                <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="輸入團隊名稱" className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-700" />
                            </div>
                            <div className="mb-3">
                                <label className="block text-xs text-slate-500 mb-1">選擇 Leader（可多選）</label>
                                <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                                    {allUsers.filter(u => u.email && u.email !== '(未填寫)').map(u => {
                                        const leaderList = newTeamLeader.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
                                        const isSelected = leaderList.includes(u.email.toLowerCase());
                                        return (
                                            <label key={u.uid} className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setNewTeamLeader(prev => prev ? `${prev}, ${u.email}` : u.email);
                                                        } else {
                                                            setNewTeamLeader(prev => prev.split(',').map(l => l.trim()).filter(l => l.toLowerCase() !== u.email.toLowerCase()).join(', '));
                                                        }
                                                    }}
                                                    className="rounded border-slate-300 text-[#0075de] focus:ring-[#0075de]"
                                                />
                                                <span className="text-sm text-slate-700">{formatEmailPrefix(u.email)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <p className="mb-3 text-xs text-slate-500">團隊成員由 Leader 自行管理。</p>
                            <button onClick={handleAddTeam} className="rounded-xl bg-[#0075de] px-4 py-2 text-sm text-white transition hover:bg-[#005ec1]">建立團隊</button>
                        </div>
                    )}
                    {/* 團隊列表 */}
                    <div className="space-y-3">
                        {(() => {
                            const visibleTeams = canEditTeams ? teams : teams.filter(t => getTeamLeaders(t).includes(user?.email));
                            if (!visibleTeams || visibleTeams.length === 0) {
                                return <p className="text-sm text-slate-400">{canEditTeams ? '尚無團隊' : '你目前沒有管理的團隊'}</p>;
                            }
                            return visibleTeams.map(team => (
                                <div key={team.id} className={SETTINGS_SUBSECTION_CLASS}>
                                    {editingTeamId === team.id ? (
                                        /* 編輯模式 */
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">團隊名稱</label>
                                                    <input value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} placeholder="團隊名稱" className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-700" />
                                                </div>
                                                {canEditTeams && (
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Leader（可多選）</label>
                                                        <div className="max-h-32 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                                                            {allUsers.filter(u => u.email && u.email !== '(未填寫)').map(u => {
                                                                const leaderList = editTeamLeader.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
                                                                const isSelected = leaderList.includes(u.email.toLowerCase());
                                                                return (
                                                                    <label key={u.uid} className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setEditTeamLeader(prev => prev ? `${prev}, ${u.email}` : u.email);
                                                                                } else {
                                                                                    setEditTeamLeader(prev => prev.split(',').map(l => l.trim()).filter(l => l.toLowerCase() !== u.email.toLowerCase()).join(', '));
                                                                                }
                                                                            }}
                                                                            className="rounded border-slate-300 text-[#0075de] focus:ring-[#0075de]"
                                                                        />
                                                                        <span className="text-sm text-slate-700">{formatEmailPrefix(u.email)}</span>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">選擇成員</label>
                                                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
                                                    {(() => {
                                                        const leaderEmails = editTeamLeader.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
                                                        const memberList = editTeamMembers.split(',').map(m => m.trim().toLowerCase()).filter(Boolean);
                                                        const allUserEmails = allUsers.filter(u => u.email && u.email !== '(未填寫)').map(u => u.email.toLowerCase());

                                                        // 合併：allUsers + 現有成員（可能已不在 allUsers 中）
                                                        const orphanedMembers = memberList.filter(m => !allUserEmails.includes(m) && !leaderEmails.includes(m));

                                                        return (
                                                            <>
                                                                {/* 顯示已不存在的成員（可移除） */}
                                                                {orphanedMembers.map(m => (
                                                                    <label key={m} className="flex cursor-pointer items-center gap-2 rounded-lg bg-red-50 p-1.5 hover:bg-red-100">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={true}
                                                                            onChange={() => {
                                                                                setEditTeamMembers(prev => prev.split(',').map(p => p.trim()).filter(p => p.toLowerCase() !== m).join(', '));
                                                                            }}
                                                                            className="rounded border-red-300 text-red-600 focus:ring-red-500"
                                                                        />
                                                                        <span className="text-sm text-red-700">{formatEmailPrefix(m)} <span className="text-xs text-red-500">(已刪除)</span></span>
                                                                    </label>
                                                                ))}
                                                                {/* 顯示現有用戶 */}
                                                                {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !leaderEmails.includes(u.email.toLowerCase())).map(u => {
                                                                    const isSelected = memberList.includes(u.email.toLowerCase());
                                                                    return (
                                                                        <label key={u.uid} className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={(e) => {
                                                                                    if (e.target.checked) {
                                                                                        setEditTeamMembers(prev => prev ? `${prev}, ${u.email}` : u.email);
                                                                                    } else {
                                                                                        setEditTeamMembers(prev => prev.split(',').map(m => m.trim()).filter(m => m.toLowerCase() !== u.email.toLowerCase()).join(', '));
                                                                                    }
                                                                                }}
                                                                                className="rounded border-slate-300 text-[#0075de] focus:ring-[#0075de]"
                                                                            />
                                                                            <span className="text-sm text-slate-700">{formatEmailPrefix(u.email)}</span>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </>
                                                        );
                                                    })()}
                                                    {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !editTeamLeader.split(',').map(l => l.trim().toLowerCase()).includes(u.email.toLowerCase())).length === 0 && (
                                                        <p className="text-xs text-slate-400 p-2">沒有可選擇的成員</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleUpdateTeam(team.id)} className="flex items-center gap-1 rounded-xl bg-[#0075de] px-3 py-2 text-sm text-white transition hover:bg-[#005ec1]"><Save size={14} /> 儲存</button>
                                                <button onClick={cancelEditTeam} className="flex items-center gap-1 rounded-xl bg-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-300"><X size={14} /> 取消</button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* 顯示模式 */
                                        <>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{team.name}</h4>
                                                    <p className="text-xs text-slate-500">Leader: {getTeamLeaders(team).map(l => formatEmailPrefix(l)).join(', ')}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {canManageTeam(team) && (
                                                        <button onClick={() => startEditTeam(team)} className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-1 rounded transition" title="編輯團隊"><Edit2 size={16} /></button>
                                                    )}
                                                    {canEditTeams && (
                                                        <button onClick={() => confirmDeleteTeam(team.id, team.name)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition" title="刪除團隊"><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {team.members && team.members.length > 0 ? [...new Set(team.members)].map(m => (
                                                    <span key={m} className="rounded-full bg-[#eaf3ff] px-2 py-1 text-xs text-[#0075de]">{formatEmailPrefix(m)}</span>
                                                )) : <span className="text-xs text-slate-400">尚無成員</span>}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}

            {activeSettingsTab === 'dropdowns' && (
            <div className={`${SETTINGS_PANEL_CLASS} p-8`} data-testid="settings-global-options">
                <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-full ${canEditDropdowns ? 'bg-violet-100' : 'bg-slate-100'}`}>
                        {canEditDropdowns ? <ShieldCheck className="text-violet-700" size={24} /> : <Lock className="text-slate-500" size={24} />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">全域下拉選單管理</h2>
                        <p className="text-sm text-slate-500 mt-1">把不同頁面的下拉選單集中在同一區塊設定。</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <section className={SETTINGS_SUBSECTION_CLASS}>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">待辦事項</h3>
                        <div className="space-y-5">
                            <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2">來源清單</div>
                                {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newTaskSource} onChange={(e) => setNewTaskSource(e.target.value)} placeholder="輸入新來源名稱" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('taskSources', newTaskSource, taskSources, setTaskSources, setNewTaskSource)} /><button onClick={() => handleAddItem('taskSources', newTaskSource, taskSources, setTaskSources, setNewTaskSource)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">新增</button></div>)}
                                <div className="flex flex-wrap gap-2">{taskSources.map((src, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{src}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('taskSources', src, taskSources)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2">狀態清單</div>
                                {canEditTaskStatuses && (<div className="flex gap-2 mb-4"><input value={newTaskStatus} onChange={(e) => setNewTaskStatus(e.target.value)} placeholder="輸入新狀態名稱" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('taskStatuses', newTaskStatus, taskStatuses, setTaskStatuses, setNewTaskStatus)} /><button onClick={() => handleAddItem('taskStatuses', newTaskStatus, taskStatuses, setTaskStatuses, setNewTaskStatus)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">新增</button></div>)}
                                <div className="flex flex-wrap gap-2">{taskStatuses.map((st, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{st}</span>{canEditTaskStatuses && <button onClick={() => confirmDeleteItem('taskStatuses', st, taskStatuses)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
                            </div>
                        </div>
                    </section>

                    <section className={SETTINGS_SUBSECTION_CLASS}>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">會議記錄</h3>
                        <div>
                            <div className="text-sm font-semibold text-slate-600 mb-2">會議分類</div>
                            {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="輸入新分類名稱" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('meetingCategories', newCategory, categories, setCategories, setNewCategory)} /><button onClick={() => handleAddItem('meetingCategories', newCategory, categories, setCategories, setNewCategory)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">新增</button></div>)}
                            <div className="flex flex-wrap gap-2">{categories.map((cat, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{cat}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('meetingCategories', cat, categories)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
                        </div>
                    </section>

                    <section className={SETTINGS_SUBSECTION_CLASS}>
                        <h3 className="text-lg font-bold text-slate-800 mb-4">問題管理</h3>
                        <div className="space-y-5">
                            <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2">問題來源</div>
                                {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newIssueSource} onChange={(e) => setNewIssueSource(e.target.value)} placeholder="輸入新問題來源" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('issueSources', newIssueSource, issueSources, setIssueSources, setNewIssueSource)} /><button onClick={() => handleAddItem('issueSources', newIssueSource, issueSources, setIssueSources, setNewIssueSource)} className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700">新增</button></div>)}
                                <div className="flex flex-wrap gap-2">{issueSources.map((item, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{item}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('issueSources', item, issueSources)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2">問題定位</div>
                                {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newIssueLocation} onChange={(e) => setNewIssueLocation(e.target.value)} placeholder="輸入新問題定位" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('issueLocations', newIssueLocation, issueLocations, setIssueLocations, setNewIssueLocation)} /><button onClick={() => handleAddItem('issueLocations', newIssueLocation, issueLocations, setIssueLocations, setNewIssueLocation)} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">新增</button></div>)}
                                <div className="flex flex-wrap gap-2">{issueLocations.map((item, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{item}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('issueLocations', item, issueLocations)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-slate-600 mb-2">問題上升</div>
                                {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newIssueEscalation} onChange={(e) => setNewIssueEscalation(e.target.value)} placeholder="輸入新問題上升對象" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('issueEscalations', newIssueEscalation, issueEscalations, setIssueEscalations, setNewIssueEscalation)} /><button onClick={() => handleAddItem('issueEscalations', newIssueEscalation, issueEscalations, setIssueEscalations, setNewIssueEscalation)} className="px-4 py-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-700">新增</button></div>)}
                                <div className="flex flex-wrap gap-2">{issueEscalations.map((item, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{item}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('issueEscalations', item, issueEscalations)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
            )}
        </div>
    );
};

export default SettingsPage;
