import React, { useState, useEffect, useMemo } from 'react';
import {
    collection, collectionGroup, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import {
    Plus, Search, Filter, ChevronRight, Download, Info
} from 'lucide-react';
import TaskForm from './TaskForm';
import TaskRow from './TaskRow';
import Modal from '../common/Modal';
import CollapsibleDoneSection from '../common/CollapsibleDoneSection';
import {
    StandardToolbar,
    StandardToolbarButton,
    StandardToolbarField,
    StandardToolbarInput,
    StandardToolbarSelect,
} from '../common/StandardToolbar';
import { useTeamAccess } from '../../hooks/useTeamAccess';
import { formatEmailPrefix, getTeamLeaders } from '../../utils/permissions';
import {
    buildAssignmentNotification,
    buildNotificationTargetKey,
    buildUserDirectoryMap,
    resolveDirectoryUser,
} from '../../utils/notifications-center';
import { pushNotification } from '../../utils/notification-store';
import { ROOT_ADMINS } from '../../constants';
import { exportToCSV } from '../../utils/csv-export';
import logger from '../../utils/logger';
import { deleteDemoEntity, upsertDemoEntity } from '../../mock/demo-store';

const TaskManager = ({
    db,
    user,
    canAccessAll,
    isAdmin,
    testConfig,
    teams = [],
    focusTarget,
    onFocusHandled,
    demoMode = false,
    demoState = null,
    onDemoStateChange = () => {},
    unreadCommentCountMap = {},
}) => {
    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentTask, setCurrentTask] = useState(null);
    const [modalConfig, setModalConfig] = useState({ isOpen: false });
    const [taskSources, setTaskSources] = useState(['Email', 'Meeting', 'Chat', 'Other']);
    const [taskStatuses, setTaskStatuses] = useState(['Pending', 'On-going', 'Done']);
    const [assigneeOptions, setAssigneeOptions] = useState([]);
    const [userDirectoryMap, setUserDirectoryMap] = useState({});
    const isRootAdmin = ROOT_ADMINS.includes(user?.email);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterSource, setFilterSource] = useState('All');
    const [filterAssignee, setFilterAssignee] = useState('All');
    const [filterTeam, setFilterTeam] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const { isLeader, teamMemberEmails, isRegularMember, userSelectableTeams, filterableTeams } = useTeamAccess(user, teams, canAccessAll);

    // Leader 篩選用的負責人列表（只有自己所屬團隊的成員）
    const filterableAssignees = useMemo(() => {
        if (canAccessAll) return assigneeOptions; // Admin/Editor 可選所有負責人
        if (!user?.email) return [];
        // Leader 只能篩選自己所屬團隊的成員
        const allowedEmails = new Set();
        userSelectableTeams.forEach(team => {
            const leaders = getTeamLeaders(team);
            const members = team.members || [];
            leaders.forEach(l => allowedEmails.add(formatEmailPrefix(l)));
            members.forEach(m => allowedEmails.add(formatEmailPrefix(m)));
        });
        return assigneeOptions.filter(a => allowedEmails.has(a));
    }, [canAccessAll, user, assigneeOptions, userSelectableTeams]);

    useEffect(() => {
        if (demoMode) {
            if (!demoState || !user) return;
            let data = [...(demoState.tasks || [])];
            const userEmailPrefix = formatEmailPrefix(user.email);

            if (!canAccessAll) {
                if (isLeader && teamMemberEmails.length > 0) {
                    data = data.filter(task => {
                        const isOwnTask = task.createdByEmail === user.email;
                        const isAssignedToMe = task.assignee === userEmailPrefix || task.assigneeEmail === user.email;
                        const isCreatedByMember = teamMemberEmails.includes(task.createdByEmail);
                        const isAssignedToMember = teamMemberEmails.map(e => formatEmailPrefix(e)).includes(task.assignee)
                            || teamMemberEmails.includes(task.assigneeEmail);

                        if (isOwnTask) return true;
                        if (isAssignedToMe && (isOwnTask || isCreatedByMember)) return true;
                        if (isCreatedByMember) return true;
                        if (isOwnTask && isAssignedToMember) return true;

                        return false;
                    });
                } else {
                    data = data.filter(task =>
                        task.createdByEmail === user.email ||
                        task.assignee === userEmailPrefix ||
                        task.assigneeEmail === user.email
                    );
                }
            }

            data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setTasks(data);
            return;
        }

        if (!db || !user) return;

        // 所有用戶都使用全域查詢，以便能看到被指派的任務
        const q = query(collectionGroup(db, 'tasks'));
        const userEmailPrefix = formatEmailPrefix(user.email);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(doc => ({ id: doc.id, path: doc.ref.path, ...doc.data() }));

            // 非管理員/編輯者需要篩選
            if (!canAccessAll) {
                if (isLeader && teamMemberEmails.length > 0) {
                    data = data.filter(task => {
                        const isOwnTask = task.createdByEmail === user.email;
                        const isAssignedToMe = task.assignee === userEmailPrefix;
                        const isCreatedByMember = teamMemberEmails.includes(task.createdByEmail);
                        const isAssignedToMember = teamMemberEmails.map(e => formatEmailPrefix(e)).includes(task.assignee);

                        if (isOwnTask) return true;
                        if (isAssignedToMe && (isOwnTask || isCreatedByMember)) return true;
                        if (isCreatedByMember) return true;
                        if (isOwnTask && isAssignedToMember) return true;

                        return false;
                    });
                } else {
                    data = data.filter(task =>
                        task.createdByEmail === user.email ||
                        task.assignee === userEmailPrefix
                    );
                }
            }

            data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setTasks(data);
        }, (error) => logger.error("Error tasks:", error));
        return () => unsubscribe();
    }, [db, user, canAccessAll, isLeader, teamMemberEmails, demoMode, demoState]);

    useEffect(() => {
        if (!db) return;
        const settingsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) { const data = docSnap.data(); if (data.taskSources) setTaskSources(data.taskSources); if (data.taskStatuses) setTaskStatuses(data.taskStatuses); }
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (testConfig?.enabled) {
            const params = new URLSearchParams(window.location.search);
            const rawAssignees = params.get('testAssignees') || '';
            const parsed = rawAssignees
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            if (demoMode && demoState) {
                const users = demoState.users || [];
                const options = users.map((entry) => formatEmailPrefix(entry.email));
                setAssigneeOptions(Array.from(new Set(options)).sort((a, b) => a.localeCompare(b, 'zh-Hant')));
                setUserDirectoryMap(buildUserDirectoryMap(users));
            } else {
                const uniqueAssignees = Array.from(new Set(parsed)).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
                setAssigneeOptions(uniqueAssignees);
                setUserDirectoryMap({});
            }
            return;
        }
        if (!db) return;
        const usersRef = collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users');
        const q = query(usersRef, orderBy('lastSeen', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const users = snapshot.docs.map((docSnap) => ({ uid: docSnap.id, ...docSnap.data() }));
                const options = snapshot.docs
                    .map((docSnap) => docSnap.data()?.email)
                    .filter(Boolean)
                    .map((email) => formatEmailPrefix(email));
                const uniqueOptions = Array.from(new Set(options)).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
                setAssigneeOptions(uniqueOptions);
                setUserDirectoryMap(buildUserDirectoryMap(users));
            },
            (error) => logger.error("Error assignees:", error)
        );
        return () => unsubscribe();
    }, [db, testConfig?.enabled, demoMode, demoState]);

    useEffect(() => {
        if (!focusTarget || focusTarget.targetType !== 'task') return;
        setFilterStatus('All');
        setFilterSource('All');
        setFilterAssignee('All');
        setFilterTeam('All');
        setSearchQuery('');
    }, [focusTarget]);

    useEffect(() => {
        let res = tasks;
        if (filterStatus !== 'All') { res = res.filter(t => t.status === filterStatus); }
        if (filterSource !== 'All') { res = res.filter(t => t.source === filterSource); }
        if (filterAssignee !== 'All') { res = res.filter(t => t.assignee === filterAssignee || formatEmailPrefix(t.createdByEmail) === filterAssignee); }
        if (filterTeam !== 'All') { res = res.filter(t => t.teamId === filterTeam); }
        if (searchQuery.trim()) { const lowerQ = searchQuery.toLowerCase(); res = res.filter(t => t.title.toLowerCase().includes(lowerQ) || (t.assignee && t.assignee.toLowerCase().includes(lowerQ)) || (t.createdByEmail && t.createdByEmail.toLowerCase().includes(lowerQ))); }
        setFilteredTasks(res);
    }, [tasks, filterStatus, filterSource, filterAssignee, filterTeam, searchQuery]);

    const handleSave = async (formData) => {
        if (!formData.title?.trim() || !formData.teamId || !formData.assignee?.trim() || !formData.source || !formData.status || !formData.assignedDate || !formData.dueDate || !formData.progress?.trim()) {
            setModalConfig({ isOpen: true, type: 'danger', title: '驗證錯誤', content: "請填寫所有必填欄位", onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "好", onCancel: null });
            return;
        }
        try {
        if (demoMode) {
            const assigneeRecord = resolveDirectoryUser(userDirectoryMap, formData.assignee);
            const teamName = teams.find((team) => team.id === formData.teamId)?.name || '';
            onDemoStateChange((current) => upsertDemoEntity(current, {
                entityType: 'task',
                actorEmail: user.email,
                formData: {
                    ...formData,
                    assigneeEmail: assigneeRecord?.email || '',
                    teamName,
                },
            }));
            setIsEditing(false); setCurrentTask(null);
            return;
        }

        const assigneeRecord = resolveDirectoryUser(userDirectoryMap, formData.assignee);
        const teamName = teams.find((team) => team.id === formData.teamId)?.name || '';
        const payload = {
            ...formData,
            assigneeEmail: assigneeRecord?.email || '',
            teamName,
            updatedAt: serverTimestamp(),
        };
        let notification = null;

        if (formData.id && formData.path) {
            const docRef = doc(db, formData.path);
            const previousAssigneeEmail = currentTask?.assigneeEmail || resolveDirectoryUser(userDirectoryMap, currentTask?.assignee)?.email || '';
            await updateDoc(docRef, payload);
            if (payload.assigneeEmail && payload.assigneeEmail !== previousAssigneeEmail) {
                notification = buildAssignmentNotification({
                    entityType: 'task',
                    item: { ...currentTask, ...payload, id: formData.id, path: formData.path },
                    actorEmail: user.email,
                    receiverEmail: payload.assigneeEmail,
                });
            }
        } else {
            const collectionRef = collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'tasks');
            const docRef = await addDoc(collectionRef, {
                ...payload,
                createdAt: serverTimestamp(),
                createdByEmail: user.email,
            });
            notification = buildAssignmentNotification({
                entityType: 'task',
                item: { ...payload, id: docRef.id, path: docRef.path },
                actorEmail: user.email,
                receiverEmail: payload.assigneeEmail,
            });
        }

        if (notification) {
            await pushNotification({ db, userDirectoryMap, notification });
        }
        setIsEditing(false); setCurrentTask(null);
        } catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };

    const confirmDelete = (task) => {
        setModalConfig({ isOpen: true, type: 'danger', title: '確認刪除', content: '確定要刪除此項目？', onConfirm: () => executeDelete(task), onCancel: () => setModalConfig({ isOpen: false }) });
    };

    const executeDelete = async (task) => {
        setModalConfig({ isOpen: false });
        if (demoMode) {
            onDemoStateChange((current) => deleteDemoEntity(current, {
                entityType: 'task',
                itemId: task.id,
            }));
            return;
        }
        try {
        if (task.path) { await deleteDoc(doc(db, task.path)); } else { await deleteDoc(doc(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'tasks', task.id)); }
        } catch (e) { setModalConfig({ isOpen: true, type: 'danger', title: '錯誤', content: e.message, onConfirm: () => setModalConfig({ isOpen: false }), confirmText: "關閉", onCancel: null }); }
    };

    const handleExport = () => {
        const headers = [
            {key:'status',label:'狀態'},
            {key:'source',label:'來源'},
            {key:'title',label:'事項'},
            {key:'assignee',label:'負責人'},
            {key:'createdByEmail',label:'建立者'},
            {key:'assignedDate',label:'交辦日期'},
            {key:'dueDate',label:'預計完成'},
            {key:'progress',label:'進度'},
            {key:'delayReason',label:'延遲原因'}
        ];
        exportToCSV(filteredTasks, 'WorkTasks', headers);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
        <Modal {...modalConfig} />
        <div className="flex flex-col gap-3">
            <StandardToolbar
                testId="task-toolbar"
                actions={(
                    <>
                        {!isRegularMember && (
                            <StandardToolbarButton
                                type="button"
                                onClick={() => setShowFilters(f => !f)}
                                className={showFilters ? 'bg-slate-50 text-slate-700' : ''}
                            >
                                <Filter size={14} /> 進階篩選 <ChevronRight size={14} className={`transition-transform ${showFilters ? 'rotate-90' : ''}`} />
                            </StandardToolbarButton>
                        )}
                        <StandardToolbarButton type="button" onClick={handleExport}>
                            <Download size={16} /> 匯出
                        </StandardToolbarButton>
                        <StandardToolbarButton type="button" variant="primary" onClick={() => { setCurrentTask(null); setIsEditing(true); }}>
                            <Plus size={16} /> 新增
                        </StandardToolbarButton>
                    </>
                )}
            >
                <StandardToolbarField icon={<Search size={16} />}>
                    <StandardToolbarInput
                        placeholder="搜尋..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="sm:w-40"
                    />
                </StandardToolbarField>
                <StandardToolbarField icon={<Filter size={16} />}>
                    <StandardToolbarSelect value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="sm:w-28">
                        <option value="All">全部狀態</option>
                        {taskStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </StandardToolbarSelect>
                </StandardToolbarField>
            </StandardToolbar>
            {!isRegularMember && showFilters && (
                <StandardToolbar testId="task-advanced-toolbar">
                    <StandardToolbarField icon={<Filter size={16} />}>
                        <StandardToolbarSelect value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className="sm:w-28"><option value="All">全部來源</option>{taskSources.map(s => <option key={s} value={s}>{s}</option>)}</StandardToolbarSelect>
                    </StandardToolbarField>
                    <StandardToolbarField icon={<Filter size={16} />}>
                        <StandardToolbarSelect value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="sm:w-32"><option value="All">全部負責人</option>{filterableAssignees.map(a => <option key={a} value={a}>{a}</option>)}</StandardToolbarSelect>
                    </StandardToolbarField>
                    <StandardToolbarField icon={<Filter size={16} />}>
                        <StandardToolbarSelect value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)} className="sm:w-32"><option value="All">全部團隊</option>{filterableTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</StandardToolbarSelect>
                    </StandardToolbarField>
                </StandardToolbar>
            )}
        </div>
        {isEditing && (
            <TaskForm
                initialData={currentTask}
                taskSources={taskSources}
                taskStatuses={taskStatuses}
                assigneeOptions={assigneeOptions}
                teams={userSelectableTeams}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
            />
        )}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                <span className="text-xs text-slate-400 flex items-center gap-1"><Info size={12} /> 點擊列可展開詳情</span>
            </div>
            <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                <tr><th className="px-6 py-3">狀態</th><th className="px-6 py-3">來源</th><th className="px-6 py-3 min-w-[200px]">事項內容 (建立者)</th><th className="px-6 py-3">負責人</th><th className="px-6 py-3">交辦日期</th><th className="px-6 py-3">預計完成</th><th className="px-6 py-3 text-right">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredTasks.filter(t => !t.status?.toLowerCase().includes('done') && !t.status?.toLowerCase().includes('完成')).map(task => (
                    <TaskRow
                        key={task.id}
                        task={task}
                        onEdit={() => { setCurrentTask(task); setIsEditing(true); }}
                        onDelete={() => confirmDelete(task)}
                        db={db}
                        user={user}
                        userDirectoryMap={userDirectoryMap}
                        focusTarget={focusTarget}
                        onFocusHandled={onFocusHandled}
                        demoMode={demoMode}
                        onDemoStateChange={onDemoStateChange}
                        unreadCommentCount={unreadCommentCountMap[buildNotificationTargetKey({
                            targetType: 'task',
                            targetId: task.id,
                            targetPath: task.path,
                        })] || 0}
                    />
                ))}
                {filteredTasks.filter(t => !t.status?.toLowerCase().includes('done') && !t.status?.toLowerCase().includes('完成')).length === 0 && <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-400">沒有資料</td></tr>}
                </tbody>
            </table>
            </div>
        </div>
        {filteredTasks.some(t => t.status?.toLowerCase().includes('done') || t.status?.toLowerCase().includes('完成')) && (
            <CollapsibleDoneSection title="已完成" defaultExpanded={false}>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-75">
                    <div className="overflow-x-auto">
                    <table className="min-w-[760px] w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                        <tr><th className="px-6 py-3">狀態</th><th className="px-6 py-3">來源</th><th className="px-6 py-3 min-w-[200px]">事項內容 (建立者)</th><th className="px-6 py-3">負責人</th><th className="px-6 py-3">交辦日期</th><th className="px-6 py-3">預計完成</th><th className="px-6 py-3 text-right">操作</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {filteredTasks.filter(t => t.status?.toLowerCase().includes('done') || t.status?.toLowerCase().includes('完成')).map(task => (
                            <TaskRow
                                key={task.id}
                                task={task}
                                onEdit={() => { setCurrentTask(task); setIsEditing(true); }}
                                onDelete={() => confirmDelete(task)}
                                db={db}
                                user={user}
                                userDirectoryMap={userDirectoryMap}
                                focusTarget={focusTarget}
                                onFocusHandled={onFocusHandled}
                                demoMode={demoMode}
                                onDemoStateChange={onDemoStateChange}
                                unreadCommentCount={unreadCommentCountMap[buildNotificationTargetKey({
                                    targetType: 'task',
                                    targetId: task.id,
                                    targetPath: task.path,
                                })] || 0}
                            />
                        ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            </CollapsibleDoneSection>
        )}
        </div>
    );
};

export default TaskManager;
