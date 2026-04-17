import React, { useState, useEffect, useMemo } from 'react';
import {
    collection, collectionGroup, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import {
    Plus, Search, Filter, Download, AlertCircle, Info
} from 'lucide-react';
import IssueForm from './IssueForm';
import IssueRow from './IssueRow';
import { ISSUE_STATUSES } from './issueConstants';
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
import { useModal } from '../../hooks/useModal';
import { canPerformAction, formatEmailPrefix, getTeamLeaders, checkIsLeader, getLeaderTeamMembers } from '../../utils/permissions';
import {
    buildAssignmentNotification,
    buildNotificationTargetKey,
    buildUserDirectoryMap,
    resolveDirectoryUser,
} from '../../utils/notifications-center';
import { pushNotification } from '../../utils/notification-store';
import { exportToCSV } from '../../utils/csv-export';
import { DEFAULT_ISSUE_SOURCES, DEFAULT_ISSUE_LOCATIONS, DEFAULT_ISSUE_ESCALATIONS } from '../../constants';
import logger from '../../utils/logger';
import { deleteDemoEntity, upsertDemoEntity } from '../../mock/demo-store';

const IssueManager = ({
    db,
    user,
    canAccessAll,
    teams = [],
    focusTarget,
    onFocusHandled,
    demoMode = false,
    demoState = null,
    onDemoStateChange = () => {},
    unreadCommentCountMap = {},
    permissionContext = null,
}) => {
    const [issues, setIssues] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentIssue, setCurrentIssue] = useState(null);
    const [issueSources, setIssueSources] = useState(DEFAULT_ISSUE_SOURCES);
    const [issueLocations, setIssueLocations] = useState(DEFAULT_ISSUE_LOCATIONS);
    const [issueEscalations, setIssueEscalations] = useState(DEFAULT_ISSUE_ESCALATIONS);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const { modalConfig, showError, showConfirm } = useModal();

    // 權限相關
    const isLeader = useMemo(() => checkIsLeader(user, teams), [user, teams]);
    const teamMemberEmails = useMemo(() => getLeaderTeamMembers(user, teams), [user, teams]);

    // 可選擇的團隊（Admin/Editor 全部，其他人只看自己所屬的）
    const userSelectableTeams = useMemo(() => {
        if (canAccessAll) return teams;
        if (!user?.email) return [];
        const userEmail = user.email.toLowerCase();
        return teams.filter(team => {
            const leaders = getTeamLeaders(team).map(l => l.toLowerCase());
            const members = (team.members || []).map(m => m.toLowerCase());
            return leaders.includes(userEmail) || members.includes(userEmail);
        });
    }, [canAccessAll, user, teams]);

    const [assigneeOptions, setAssigneeOptions] = useState([]);
    const [userDirectoryMap, setUserDirectoryMap] = useState({});
    const canCreateIssue = canPerformAction(permissionContext, 'issue.create');
    const canEditIssue = canPerformAction(permissionContext, 'issue.edit');
    const canDeleteIssue = canPerformAction(permissionContext, 'issue.delete');

    // 讀取負責人選項
    useEffect(() => {
        if (!db) {
            setIssueSources(DEFAULT_ISSUE_SOURCES);
            setIssueLocations(DEFAULT_ISSUE_LOCATIONS);
            setIssueEscalations(DEFAULT_ISSUE_ESCALATIONS);
            return;
        }
        const settingsRef = doc(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'settings', 'options');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            const data = docSnap.exists() ? docSnap.data() : {};
            setIssueSources(data.issueSources || DEFAULT_ISSUE_SOURCES);
            setIssueLocations(data.issueLocations || DEFAULT_ISSUE_LOCATIONS);
            setIssueEscalations(data.issueEscalations || DEFAULT_ISSUE_ESCALATIONS);
        });
        return () => unsubscribe();
    }, [db]);

    useEffect(() => {
        if (demoMode) {
            if (!demoState) return;
            const users = demoState.users || [];
            const opts = Array.from(new Set(
                users.map((entry) => entry.email).filter(Boolean).map((email) => formatEmailPrefix(email))
            )).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
            setAssigneeOptions(opts);
            setUserDirectoryMap(buildUserDirectoryMap(users));
            return;
        }
        if (!db) return;
        const usersRef = collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users');
        const q = query(usersRef, orderBy('lastSeen', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(d => ({ uid: d.id, ...d.data() }));
            const opts = Array.from(new Set(
                snapshot.docs.map(d => d.data()?.email).filter(Boolean).map(e => formatEmailPrefix(e))
            )).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
            setAssigneeOptions(opts);
            setUserDirectoryMap(buildUserDirectoryMap(users));
        });
        return () => unsubscribe();
    }, [db, demoMode, demoState]);

    // 讀取問題列表
    useEffect(() => {
        if (demoMode) {
            if (!demoState || !user) return;
            let data = [...(demoState.issues || [])];
            const userPrefix = formatEmailPrefix(user.email);
            if (!canAccessAll) {
                if (isLeader && teamMemberEmails.length > 0) {
                    const teamPrefixes = teamMemberEmails.map(email => formatEmailPrefix(email));
                    data = data.filter(issue => {
                        const isOwn = issue.createdByEmail === user.email;
                        const isAssignedToMe = issue.assignee === userPrefix || issue.assigneeEmail === user.email;
                        const isCreatedByMember = teamMemberEmails.includes(issue.createdByEmail);
                        const isAssignedToMember = teamPrefixes.includes(issue.assignee) || teamMemberEmails.includes(issue.assigneeEmail);
                        return isOwn || isAssignedToMe || isCreatedByMember || isAssignedToMember;
                    });
                } else {
                    data = data.filter(issue =>
                        issue.createdByEmail === user.email ||
                        issue.assignee === userPrefix ||
                        issue.assigneeEmail === user.email
                    );
                }
            }
            data.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setIssues(data);
            return;
        }
        if (!db || !user) return;
        const q = query(collectionGroup(db, 'issues'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(d => ({ id: d.id, path: d.ref.path, ...d.data() }));
            const userPrefix = formatEmailPrefix(user.email);
            if (!canAccessAll) {
                if (isLeader && teamMemberEmails.length > 0) {
                    const teamPrefixes = teamMemberEmails.map(email => formatEmailPrefix(email));
                    data = data.filter(issue => {
                        const isOwn = issue.createdByEmail === user.email;
                        const isAssignedToMe = issue.assignee === userPrefix || issue.assigneeEmail === user.email;
                        const isCreatedByMember = teamMemberEmails.includes(issue.createdByEmail);
                        const isAssignedToMember = teamPrefixes.includes(issue.assignee) || teamMemberEmails.includes(issue.assigneeEmail);
                        return isOwn || isAssignedToMe || isCreatedByMember || isAssignedToMember;
                    });
                } else {
                    data = data.filter(issue =>
                        issue.createdByEmail === user.email ||
                        issue.assignee === userPrefix ||
                        issue.assigneeEmail === user.email
                    );
                }
            }
            data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setIssues(data);
        }, err => logger.error('Issues error:', err));
        return () => unsubscribe();
    }, [db, user, canAccessAll, isLeader, teamMemberEmails, demoMode, demoState]);

    useEffect(() => {
        if (!focusTarget || focusTarget.targetType !== 'issue') return;
        setFilterStatus('All');
        setSearchQuery('');
    }, [focusTarget]);

    const filteredIssues = useMemo(() => {
        let res = issues;
        if (filterStatus !== 'All') res = res.filter(i => i.status === filterStatus);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            res = res.filter(i =>
                i.itemName?.toLowerCase().includes(q) ||
                i.title?.toLowerCase().includes(q) ||
                i.description?.toLowerCase().includes(q) ||
                (i.issueSource || i.client)?.toLowerCase().includes(q) ||
                i.issueLocation?.toLowerCase().includes(q) ||
                i.issueEscalation?.toLowerCase().includes(q) ||
                i.nvBugId?.toLowerCase().includes(q) ||
                i.assignee?.toLowerCase().includes(q)
            );
        }
        return res;
    }, [issues, filterStatus, searchQuery]);

    const handleSave = async (formData) => {
        if (
            !formData.itemName?.trim() ||
            !formData.title?.trim() ||
            !formData.description?.trim() ||
            !formData.issueSource?.trim() ||
            !formData.issueLocation?.trim() ||
            !formData.issueEscalation?.trim() ||
            !formData.status ||
            !formData.dueDate ||
            !formData.progress?.trim() ||
            !formData.assignee ||
            !formData.teamId ||
            (formData.issueEscalation === 'Nvidia' && !formData.nvBugId?.trim())
        ) {
            showError('驗證錯誤', '請填寫所有必填欄位');
            return;
        }
        try {
            if (demoMode) {
                const assigneeRecord = resolveDirectoryUser(userDirectoryMap, formData.assignee);
                const teamName = teams.find(t => t.id === formData.teamId)?.name || '';
                onDemoStateChange((current) => upsertDemoEntity(current, {
                    entityType: 'issue',
                    actorEmail: user.email,
                    formData: {
                        ...formData,
                        client: formData.issueSource,
                        assigneeEmail: assigneeRecord?.email || '',
                        teamName,
                    },
                }));
                setIsEditing(false);
                setCurrentIssue(null);
                return;
            }
            const assigneeRecord = resolveDirectoryUser(userDirectoryMap, formData.assignee);
            const teamName = teams.find(t => t.id === formData.teamId)?.name || '';
            const payload = {
                ...formData,
                client: formData.issueSource,
                assigneeEmail: assigneeRecord?.email || '',
                teamName,
                updatedAt: serverTimestamp()
            };
            let notification = null;
            if (formData.id && formData.path) {
                await updateDoc(doc(db, formData.path), payload);
                const previousAssigneeEmail = currentIssue?.assigneeEmail || resolveDirectoryUser(userDirectoryMap, currentIssue?.assignee)?.email || '';
                if (payload.assigneeEmail && payload.assigneeEmail !== previousAssigneeEmail) {
                    notification = buildAssignmentNotification({
                        entityType: 'issue',
                        item: { ...currentIssue, ...payload, id: formData.id, path: formData.path },
                        actorEmail: user.email,
                        receiverEmail: payload.assigneeEmail,
                    });
                }
            } else {
                const colRef = collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'issues');
                const docRef = await addDoc(colRef, { ...payload, createdByEmail: user.email, createdAt: serverTimestamp() });
                notification = buildAssignmentNotification({
                    entityType: 'issue',
                    item: { ...payload, id: docRef.id, path: docRef.path },
                    actorEmail: user.email,
                    receiverEmail: payload.assigneeEmail,
                });
            }
            if (notification) {
                await pushNotification({ db, userDirectoryMap, notification });
            }
            setIsEditing(false);
            setCurrentIssue(null);
        } catch (e) {
            showError('儲存失敗', e.message);
        }
    };

    const handleDelete = (issue) => {
        showConfirm('確認刪除', `確定要刪除「${issue.title}」？`, async () => {
            if (demoMode) {
                onDemoStateChange((current) => deleteDemoEntity(current, {
                    entityType: 'issue',
                    itemId: issue.id,
                }));
                return;
            }
            try {
                await deleteDoc(doc(db, issue.path));
            } catch (e) {
                showError('刪除失敗', e.message);
            }
        });
    };

    const handleExport = () => {
        const headers = [
            { key: 'itemName', label: '項目名稱' },
            { key: 'title', label: '標題' },
            { key: 'issueSource', label: '問題來源' },
            { key: 'issueLocation', label: '問題定位' },
            { key: 'issueEscalation', label: '問題上升' },
            { key: 'nvBugId', label: 'NV_Bug_ID' },
            { key: 'status', label: '狀態' },
            { key: 'assignee', label: '負責人' },
            { key: 'teamName', label: '所屬團隊' },
            { key: 'dueDate', label: '截止日期' },
            { key: 'description', label: '描述' },
            { key: 'progress', label: '進度更新' },
        ];
        exportToCSV(filteredIssues, 'Issues', headers);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <Modal {...modalConfig} />

            {/* 新增/編輯 Modal */}
            {isEditing && (
                <IssueForm
                    initialData={currentIssue}
                    onSave={handleSave}
                    onCancel={() => { setIsEditing(false); setCurrentIssue(null); }}
                    assigneeOptions={assigneeOptions}
                    teams={userSelectableTeams}
                    issueSources={issueSources}
                    issueLocations={issueLocations}
                    issueEscalations={issueEscalations}
                />
            )}

            <StandardToolbar
                testId="issue-toolbar"
                actions={(
                    <>
                        <StandardToolbarButton type="button" onClick={handleExport}>
                            <Download size={16} /> 匯出
                        </StandardToolbarButton>
                        <StandardToolbarButton type="button" variant="primary" onClick={() => { setCurrentIssue(null); setIsEditing(true); }} disabled={!canCreateIssue}>
                            <Plus size={16} /> 新增問題
                        </StandardToolbarButton>
                    </>
                )}
            >
                <StandardToolbarField icon={<Search size={16} />}>
                    <StandardToolbarInput
                        placeholder="搜尋..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="sm:w-40"
                    />
                </StandardToolbarField>
                <StandardToolbarField icon={<Filter size={16} />}>
                    <StandardToolbarSelect value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="sm:w-28">
                        <option value="All">全部狀態</option>
                        {ISSUE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </StandardToolbarSelect>
                </StandardToolbarField>
            </StandardToolbar>

            {/* 問題列表 */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-xs text-slate-400 flex items-center gap-1"><Info size={12} /> 點擊列可展開詳情</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3">狀態</th>
                                <th className="px-4 py-3 min-w-[200px]">標題</th>
                                <th className="px-4 py-3">問題來源</th>
                                <th className="px-4 py-3">問題定位</th>
                                <th className="px-4 py-3">負責人</th>
                                <th className="px-4 py-3">建立日期</th>
                                <th className="px-4 py-3">截止日期</th>
                                <th className="px-4 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredIssues.filter(i => i.status !== '已解決').map(issue => (
                                <IssueRow
                                    key={issue.id}
                                    issue={issue}
                                    onEdit={i => { setCurrentIssue(i); setIsEditing(true); }}
                                    onDelete={handleDelete}
                                    canEdit={canEditIssue && (canAccessAll || issue.createdByEmail === user?.email)}
                                    canDelete={canDeleteIssue && (canAccessAll || issue.createdByEmail === user?.email)}
                                    db={db}
                                    user={user}
                                    userDirectoryMap={userDirectoryMap}
                                    focusTarget={focusTarget}
                                    onFocusHandled={onFocusHandled}
                                    demoMode={demoMode}
                                    onDemoStateChange={onDemoStateChange}
                                    unreadCommentCount={unreadCommentCountMap[buildNotificationTargetKey({
                                        targetType: 'issue',
                                        targetId: issue.id,
                                        targetPath: issue.path,
                                    })] || 0}
                                />
                            ))}
                            {filteredIssues.filter(i => i.status !== '已解決').length === 0 && (
                                <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400"><AlertCircle size={32} className="mx-auto mb-2 opacity-30" />沒有符合條件的問題</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {filteredIssues.some(i => i.status === '已解決') && (
                <CollapsibleDoneSection title="已解決" defaultExpanded={false}>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden opacity-75">
                        <div className="overflow-x-auto">
                            <table className="min-w-[900px] w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">狀態</th>
                                        <th className="px-4 py-3 min-w-[200px]">標題</th>
                                        <th className="px-4 py-3">問題來源</th>
                                        <th className="px-4 py-3">問題定位</th>
                                        <th className="px-4 py-3">負責人</th>
                                        <th className="px-4 py-3">建立日期</th>
                                        <th className="px-4 py-3">截止日期</th>
                                        <th className="px-4 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredIssues.filter(i => i.status === '已解決').map(issue => (
                                        <IssueRow
                                            key={issue.id}
                                            issue={issue}
                                            onEdit={i => { setCurrentIssue(i); setIsEditing(true); }}
                                            onDelete={handleDelete}
                                            canEdit={canEditIssue && (canAccessAll || issue.createdByEmail === user?.email)}
                                            canDelete={canDeleteIssue && (canAccessAll || issue.createdByEmail === user?.email)}
                                            db={db}
                                            user={user}
                                            userDirectoryMap={userDirectoryMap}
                                            focusTarget={focusTarget}
                                            onFocusHandled={onFocusHandled}
                                            demoMode={demoMode}
                                            onDemoStateChange={onDemoStateChange}
                                            unreadCommentCount={unreadCommentCountMap[buildNotificationTargetKey({
                                                targetType: 'issue',
                                                targetId: issue.id,
                                                targetPath: issue.path,
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

export default IssueManager;
