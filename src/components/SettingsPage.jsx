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
    DEFAULT_ISSUE_SOURCES, DEFAULT_ISSUE_LOCATIONS, DEFAULT_ISSUE_ESCALATIONS
} from '../constants';
import { formatEmailPrefix, normalizePermissionEmail, getTeamLeaders, checkIsLeader } from '../utils/permissions';
import { buildNotificationPayloads, sendEmailJsNotification } from '../utils/notifications';
import Modal from './common/Modal';
import logger from '../utils/logger';

const SettingsPage = ({ db, user, isAdmin, isEditor, cloudAdmins, cloudEditors, cloudAIUsers, rootAdmins, onSaveGeminiSettings, testConfig, geminiApiKey, geminiModel, teams = [] }) => {
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
    const canEditDropdowns = isAdmin || isEditor || isLeader;
    const canEditTaskStatuses = isAdmin || isEditor; // 待辦狀態不開放給 Leader
    const canEditTeams = isAdmin || isEditor;
    const canViewTeamPanel = isAdmin || isEditor || isLeader;
    const [allUsers, setAllUsers] = useState([]);
    const [isUserListLoading, setIsUserListLoading] = useState(false);
    const [userListError, setUserListError] = useState('');
    const [isUserListExpanded, setIsUserListExpanded] = useState(false);
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
    const userTableColSpan = isAdmin ? 4 : 3;

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
        if (!db || !canViewTeamPanel) return;
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
    }, [db, canViewTeamPanel]);

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
        <div className="max-w-3xl mx-auto space-y-8 pb-12">
            <Modal {...modalConfig} />

            {/* User Registry List - Admin/Editor Only */}
            {(isAdmin || isEditor) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200" data-testid="registered-users">
                <button
                    onClick={() => setIsUserListExpanded(e => !e)}
                    className="w-full flex items-center justify-between p-8 text-left hover:bg-slate-50 transition-colors rounded-xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-blue-100 rounded-full"><Users className="text-blue-700" size={24} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">已註冊使用者列表</h2>
                            <p className="text-sm text-slate-500">檢視所有登入過系統的帳號</p>
                        </div>
                    </div>
                    <ChevronRight size={20} className={`text-slate-400 transition-transform flex-shrink-0 ${isUserListExpanded ? 'rotate-90' : ''}`} />
                </button>
                {isUserListExpanded && (
                <div className="px-8 pb-8 border-t border-slate-100">
                <div className="overflow-x-auto mt-6">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">使用者</th>
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
                            ) : allUsers.length === 0 ? (
                                <tr><td colSpan={userTableColSpan} className="px-4 py-4 text-center text-slate-400">尚無資料</td></tr>
                            ) : (
                                allUsers.map((u) => {
                                    const lastSeenDate = u.lastSeen?.toDate
                                        ? u.lastSeen.toDate()
                                        : (u.lastSeen?.seconds ? new Date(u.lastSeen.seconds * 1000) : null);
                                    const isSelf = user?.email && u.email === user.email;
                                    const isRootAdmin = rootAdmins.includes(u.email);
                                    const canDelete = isAdmin && !isSelf && !isRootAdmin;
                                    return (
                                        <tr key={u.uid} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-800">{formatEmailPrefix(u.email)}</td>
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
                </div>
                )}
            </div>
            )}

            {/* Gemini Settings - Admin Only */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200" data-testid="gemini-settings">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-full bg-purple-100">
                            <Bot className="text-purple-700" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Gemini API 設定</h2>
                            <p className="text-sm text-slate-500">提供 AI 報告與會議摘要服務</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gemini API Key</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={geminiApiKeyInput}
                                    onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                                    className="flex-1 p-2 border rounded"
                                    placeholder="請輸入 Gemini API Key"
                                    data-testid="gemini-api-key-input"
                                />
                                <button
                                    onClick={fetchAvailableModels}
                                    disabled={!geminiApiKeyInput.trim() || isLoadingModels}
                                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                                >
                                    {isLoadingModels ? '載入中...' : '偵測模型'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">模型版本</label>
                            <select
                                value={geminiModelInput}
                                onChange={(e) => setGeminiModelInput(e.target.value)}
                                className="w-full p-2 border rounded"
                            >
                                {availableModels.length > 0 ? (
                                    availableModels.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))
                                ) : (
                                    <>
                                        <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                                    </>
                                )}
                            </select>
                            <p className="text-xs text-slate-400 mt-1">
                                {availableModels.length > 0
                                    ? `已偵測到 ${availableModels.length} 個可用模型`
                                    : '輸入 API Key 後點擊「偵測模型」可獲取完整模型列表'}
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <button
                                onClick={handleSaveGeminiSettingsLocal}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={(!db && !testConfig.enabled) || isGeminiSaving}
                                data-testid="gemini-api-key-save-button"
                            >
                                {isGeminiSaving ? '儲存中...' : '儲存 Gemini 設定'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Settings - Admin Only */}
            {isAdmin && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200" data-testid="notification-settings">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 rounded-full bg-amber-100">
                            <Clock className="text-amber-700" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">郵件通知設定</h2>
                            <p className="text-sm text-slate-500">設定 EmailJS 服務並手動發送 On-going 通知</p>
                        </div>
                    </div>
                    {emailServiceError && (
                        <div className="mb-4 text-sm text-red-600">{emailServiceError}</div>
                    )}
                    <div className="flex flex-col gap-4">
                        <div className="pt-4 border-t border-slate-100 space-y-3">
                            <h3 className="text-sm font-bold text-slate-700">EmailJS 發信服務設定</h3>
                            <p className="text-xs text-slate-400">
                                需先於 EmailJS 建立服務與範本，並提供 template params：to_email / subject / message / from_name。
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service ID</label>
                                    <input
                                        type="text"
                                        value={emailServiceConfig.serviceId}
                                        onChange={(e) => handleEmailServiceChange('serviceId', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        data-testid="emailjs-service-id"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template ID</label>
                                    <input
                                        type="text"
                                        value={emailServiceConfig.templateId}
                                        onChange={(e) => handleEmailServiceChange('templateId', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        data-testid="emailjs-template-id"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Public Key</label>
                                    <input
                                        type="text"
                                        value={emailServiceConfig.publicKey}
                                        onChange={(e) => handleEmailServiceChange('publicKey', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        data-testid="emailjs-public-key"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">寄件人名稱</label>
                                    <input
                                        type="text"
                                        value={emailServiceConfig.fromName}
                                        onChange={(e) => handleEmailServiceChange('fromName', e.target.value)}
                                        className="w-full p-2 border rounded"
                                        placeholder="Job Management System"
                                        data-testid="emailjs-from-name"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveEmailServiceSettings}
                                    className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!db || isEmailServiceSaving}
                                    data-testid="emailjs-save-button"
                                >
                                    {isEmailServiceSaving ? '儲存中...' : '儲存 Email 服務'}
                                </button>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100" data-testid="notification-manual-trigger">
                            <h3 className="text-sm font-bold text-slate-700 mb-2">發送 On-going 通知</h3>
                            <p className="text-xs text-slate-400 mb-3">
                                依目前 On-going 待辦與負責人資料寄送通知，不受每日限制，且不會更新每日寄送紀錄。
                            </p>
                            <div className="flex justify-end">
                                <button
                                    onClick={handleManualOnGoingNotification}
                                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isManualNotificationSending}
                                    data-testid="notification-manual-trigger-button"
                                >
                                    {isManualNotificationSending ? '發送中...' : '立即發送 On-going 通知'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Management Panel */}
            {isAdmin && (
                <div className="bg-yellow-50 p-8 rounded-xl shadow-sm border border-yellow-200" data-testid="admin-permission-section">
                    <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-yellow-100 rounded-full"><UserCog className="text-yellow-700" size={24} /></div><div><h2 className="text-xl font-bold text-yellow-900">使用者權限管理</h2><p className="text-sm text-yellow-700">管理誰可以修改全域設定</p></div></div>
                    <div className="flex gap-2 mb-6">
                        <select
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                            className="flex-1 p-2 border border-yellow-300 rounded-lg text-sm bg-white"
                            data-testid="admin-email-input"
                        >
                            <option value="">選擇使用者</option>
                            {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !rootAdmins.includes(u.email) && !cloudAdmins.includes(u.email)).map(u => (
                                <option key={u.uid} value={u.email}>{formatEmailPrefix(u.email)}</option>
                            ))}
                        </select>
                        <button onClick={handleAddAdmin} className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm whitespace-nowrap" data-testid="admin-email-submit">新增管理員</button>
                    </div>
                    <div className="bg-white rounded-lg border border-yellow-200 overflow-hidden"><ul className="divide-y divide-yellow-100">{rootAdmins.map(email => (<li key={email} className="px-4 py-3 flex justify-between items-center text-sm"><span className="flex items-center gap-2 font-bold text-slate-700"><ShieldCheck size={14} className="text-purple-600"/> {formatEmailPrefix(email)}</span><span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">系統預設</span></li>))}{cloudAdmins.map(email => (<li key={email} className="px-4 py-3 flex justify-between items-center text-sm"><span className="flex items-center gap-2 text-slate-700"><ShieldCheck size={14} className="text-yellow-600"/> {formatEmailPrefix(email)}</span><button onClick={() => confirmRemoveAdmin(email)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"><Trash2 size={16} /></button></li>))}</ul></div>
                </div>
            )}

            {/* Editor Management Panel */}
            {isAdmin && (
                <div className="bg-blue-50 p-8 rounded-xl shadow-sm border border-blue-200" data-testid="editor-permission-section">
                    <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-blue-100 rounded-full"><User className="text-blue-700" size={24} /></div><div><h2 className="text-xl font-bold text-blue-900">編輯者權限管理</h2><p className="text-sm text-blue-700">可檢視與編輯所有資料及下拉選單設定</p></div></div>
                    <div className="flex gap-2 mb-6">
                        <select
                            value={newEditorEmail}
                            onChange={(e) => setNewEditorEmail(e.target.value)}
                            className="flex-1 p-2 border border-blue-300 rounded-lg text-sm bg-white"
                            data-testid="editor-email-input"
                        >
                            <option value="">選擇使用者</option>
                            {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !rootAdmins.includes(u.email) && !cloudAdmins.includes(u.email) && !cloudEditors.includes(u.email)).map(u => (
                                <option key={u.uid} value={u.email}>{formatEmailPrefix(u.email)}</option>
                            ))}
                        </select>
                        <button onClick={handleAddEditor} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap" data-testid="editor-email-submit">新增編輯者</button>
                    </div>
                    <div className="bg-white rounded-lg border border-blue-200 overflow-hidden"><ul className="divide-y divide-blue-100">{cloudEditors.length === 0 ? (<li className="px-4 py-3 text-sm text-slate-400">尚無編輯者</li>) : cloudEditors.map(email => (<li key={email} className="px-4 py-3 flex justify-between items-center text-sm"><span className="flex items-center gap-2 text-slate-700"><ShieldCheck size={14} className="text-blue-600"/> {formatEmailPrefix(email)}</span><button onClick={() => confirmRemoveEditor(email)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"><Trash2 size={16} /></button></li>))}</ul></div>
                </div>
            )}

            {/* AI User Management Panel */}
            {isAdmin && (
                <div className="bg-purple-50 p-8 rounded-xl shadow-sm border border-purple-200">
                    <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-purple-100 rounded-full"><Bot className="text-purple-700" size={24} /></div><div><h2 className="text-xl font-bold text-purple-900">AI 使用權限管理</h2><p className="text-sm text-purple-700">授予一般使用者 AI 總結功能的使用權限</p></div></div>
                    <div className="flex gap-2 mb-6">
                        <select
                            value={newAIUserEmail}
                            onChange={(e) => setNewAIUserEmail(e.target.value)}
                            className="flex-1 p-2 border border-purple-300 rounded-lg text-sm bg-white"
                        >
                            <option value="">選擇使用者</option>
                            {allUsers.filter(u => u.email && u.email !== '(未填寫)' && !(cloudAIUsers || []).includes(u.email)).map(u => (
                                <option key={u.uid} value={u.email}>{formatEmailPrefix(u.email)}</option>
                            ))}
                        </select>
                        <button onClick={handleAddAIUser} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm whitespace-nowrap">新增 AI 使用者</button>
                    </div>
                    <div className="bg-white rounded-lg border border-purple-200 overflow-hidden"><ul className="divide-y divide-purple-100">{(!cloudAIUsers || cloudAIUsers.length === 0) ? (<li className="px-4 py-3 text-sm text-slate-400">尚無 AI 使用者</li>) : cloudAIUsers.map(email => (<li key={email} className="px-4 py-3 flex justify-between items-center text-sm"><span className="flex items-center gap-2 text-slate-700"><Sparkles size={14} className="text-purple-600"/> {formatEmailPrefix(email)}</span><button onClick={() => confirmRemoveAIUser(email)} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"><Trash2 size={16} /></button></li>))}</ul></div>
                </div>
            )}

            {/* Team Management Panel */}
            {canViewTeamPanel && (
                <div className="bg-teal-50 p-8 rounded-xl shadow-sm border border-teal-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-teal-100 rounded-full"><Users className="text-teal-700" size={24} /></div>
                        <div>
                            <h2 className="text-xl font-bold text-teal-900">團隊管理</h2>
                            <p className="text-sm text-teal-700">
                                {canEditTeams ? '設定團隊讓 Leader 可查看成員待辦事項' : '管理你的團隊成員'}
                            </p>
                        </div>
                    </div>
                    {/* 新增團隊表單 - 僅 Admin/Editor 可見 */}
                    {canEditTeams && (
                        <div className="bg-white p-4 rounded-lg border border-teal-200 mb-4">
                            <h3 className="font-bold text-slate-700 mb-3">新增團隊</h3>
                            <div className="mb-3">
                                <label className="block text-xs text-slate-500 mb-1">團隊名稱</label>
                                <input value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="輸入團隊名稱" className="w-full p-2 border border-teal-300 rounded-lg text-sm" />
                            </div>
                            <div className="mb-3">
                                <label className="block text-xs text-slate-500 mb-1">選擇 Leader（可多選）</label>
                                <div className="max-h-32 overflow-y-auto border border-teal-200 rounded-lg p-2 bg-white">
                                    {allUsers.filter(u => u.email && u.email !== '(未填寫)').map(u => {
                                        const leaderList = newTeamLeader.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
                                        const isSelected = leaderList.includes(u.email.toLowerCase());
                                        return (
                                            <label key={u.uid} className="flex items-center gap-2 p-1.5 hover:bg-teal-50 rounded cursor-pointer">
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
                                                    className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
                                                />
                                                <span className="text-sm text-slate-700">{formatEmailPrefix(u.email)}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <p className="text-xs text-teal-600 mb-3">團隊成員由 Leader 自行管理。</p>
                            <button onClick={handleAddTeam} className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm">建立團隊</button>
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
                                <div key={team.id} className="bg-white p-4 rounded-lg border border-teal-200">
                                    {editingTeamId === team.id ? (
                                        /* 編輯模式 */
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">團隊名稱</label>
                                                    <input value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} placeholder="團隊名稱" className="w-full p-2 border border-teal-300 rounded-lg text-sm" />
                                                </div>
                                                {canEditTeams && (
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1">Leader（可多選）</label>
                                                        <div className="max-h-32 overflow-y-auto border border-teal-200 rounded-lg p-2 bg-white">
                                                            {allUsers.filter(u => u.email && u.email !== '(未填寫)').map(u => {
                                                                const leaderList = editTeamLeader.split(',').map(l => l.trim().toLowerCase()).filter(Boolean);
                                                                const isSelected = leaderList.includes(u.email.toLowerCase());
                                                                return (
                                                                    <label key={u.uid} className="flex items-center gap-2 p-1.5 hover:bg-teal-50 rounded cursor-pointer">
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
                                                                            className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
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
                                                <div className="max-h-40 overflow-y-auto border border-teal-200 rounded-lg p-2 bg-white">
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
                                                                    <label key={m} className="flex items-center gap-2 p-1.5 hover:bg-red-50 rounded cursor-pointer bg-red-50">
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
                                                                        <label key={u.uid} className="flex items-center gap-2 p-1.5 hover:bg-teal-50 rounded cursor-pointer">
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
                                                                                className="rounded border-teal-300 text-teal-600 focus:ring-teal-500"
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
                                                <button onClick={() => handleUpdateTeam(team.id)} className="px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm flex items-center gap-1"><Save size={14} /> 儲存</button>
                                                <button onClick={cancelEditTeam} className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 text-sm flex items-center gap-1"><X size={14} /> 取消</button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* 顯示模式 */
                                        <>
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{team.name}</h4>
                                                    <p className="text-xs text-teal-600">Leader: {getTeamLeaders(team).map(l => formatEmailPrefix(l)).join(', ')}</p>
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
                                                    <span key={m} className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">{formatEmailPrefix(m)}</span>
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

            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200" data-testid="settings-global-options">
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
                    <section className="rounded-xl border border-slate-200 p-5">
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

                    <section className="rounded-xl border border-slate-200 p-5">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">會議記錄</h3>
                        <div>
                            <div className="text-sm font-semibold text-slate-600 mb-2">會議分類</div>
                            {canEditDropdowns && (<div className="flex gap-2 mb-4"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="輸入新分類名稱" className="flex-1 p-2 border border-slate-300 rounded-lg" onKeyDown={(e) => e.key === 'Enter' && handleAddItem('meetingCategories', newCategory, categories, setCategories, setNewCategory)} /><button onClick={() => handleAddItem('meetingCategories', newCategory, categories, setCategories, setNewCategory)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">新增</button></div>)}
                            <div className="flex flex-wrap gap-2">{categories.map((cat, idx) => (<div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 border border-slate-200"><span>{cat}</span>{canEditDropdowns && <button onClick={() => confirmDeleteItem('meetingCategories', cat, categories)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>}</div>))}</div>
                        </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 p-5">
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
        </div>
    );
};

export default SettingsPage;
