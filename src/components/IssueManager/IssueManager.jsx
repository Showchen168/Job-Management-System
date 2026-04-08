import React, { useState, useEffect, useMemo } from 'react';
import {
    collection, collectionGroup, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import {
    Plus, Search, Download, Sparkles, AlertCircle, Info
} from 'lucide-react';
import IssueForm from './IssueForm';
import IssueRow from './IssueRow';
import { ISSUE_STATUSES } from './issueConstants';
import Modal from '../common/Modal';
import AIConversationModal from '../AIConversationModal';
import CollapsibleDoneSection from '../common/CollapsibleDoneSection';
import { useTeamAccess } from '../../hooks/useTeamAccess';
import { useModal } from '../../hooks/useModal';
import { formatEmailPrefix, getTeamLeaders, checkIsLeader, getLeaderTeamMembers } from '../../utils/permissions';
import { exportToCSV } from '../../utils/csv-export';
import { DEFAULT_ISSUE_SOURCES, DEFAULT_ISSUE_LOCATIONS, DEFAULT_ISSUE_ESCALATIONS } from '../../constants';
import logger from '../../utils/logger';

const IssueManager = ({ db, user, canAccessAll, isAdmin, teams = [], geminiApiKey, geminiModel, canUseAI }) => {
    const [issues, setIssues] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentIssue, setCurrentIssue] = useState(null);
    const [issueSources, setIssueSources] = useState(DEFAULT_ISSUE_SOURCES);
    const [issueLocations, setIssueLocations] = useState(DEFAULT_ISSUE_LOCATIONS);
    const [issueEscalations, setIssueEscalations] = useState(DEFAULT_ISSUE_ESCALATIONS);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showAIModal, setShowAIModal] = useState(false);
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
        if (!db) return;
        const usersRef = collection(db, 'artifacts', 'work-tracker-v1', 'public', 'data', 'users');
        const q = query(usersRef, orderBy('lastSeen', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const opts = Array.from(new Set(
                snapshot.docs.map(d => d.data()?.email).filter(Boolean).map(e => formatEmailPrefix(e))
            )).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
            setAssigneeOptions(opts);
        });
        return () => unsubscribe();
    }, [db]);

    // 讀取問題列表
    useEffect(() => {
        if (!db || !user) return;
        const q = query(collectionGroup(db, 'issues'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(d => ({ id: d.id, path: d.ref.path, ...d.data() }));
            if (!canAccessAll) {
                if (isLeader && teamMemberEmails.length > 0) {
                    data = data.filter(issue =>
                        issue.createdByEmail === user.email ||
                        teamMemberEmails.includes(issue.createdByEmail)
                    );
                } else {
                    data = data.filter(issue => issue.createdByEmail === user.email);
                }
            }
            data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setIssues(data);
        }, err => logger.error('Issues error:', err));
        return () => unsubscribe();
    }, [db, user, canAccessAll, isLeader, teamMemberEmails]);

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

    // 統計數字
    const stats = useMemo(() => ({
        total: issues.length,
        open: issues.filter(i => i.status !== '已解決').length,
        overdue: issues.filter(i => i.dueDate && i.status !== '已解決' && new Date(i.dueDate) < new Date()).length,
        resolved: issues.filter(i => i.status === '已解決').length,
    }), [issues]);

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
            const teamName = teams.find(t => t.id === formData.teamId)?.name || '';
            const payload = {
                ...formData,
                client: formData.issueSource,
                teamName,
                updatedAt: serverTimestamp()
            };
            if (formData.id && formData.path) {
                await updateDoc(doc(db, formData.path), payload);
            } else {
                const colRef = collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'issues');
                await addDoc(colRef, { ...payload, createdByEmail: user.email, createdAt: serverTimestamp() });
            }
            setIsEditing(false);
            setCurrentIssue(null);
        } catch (e) {
            showError('儲存失敗', e.message);
        }
    };

    const handleDelete = (issue) => {
        showConfirm('確認刪除', `確定要刪除「${issue.title}」？`, async () => {
            try {
                await deleteDoc(doc(db, issue.path));
            } catch (e) {
                showError('刪除失敗', e.message);
            }
        });
    };

    const handleGenerateReport = () => {
        if (!filteredIssues.length) {
            showError('無資料', '目前列表為空。');
            return;
        }
        setShowAIModal(true);
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
            <AIConversationModal
                isOpen={showAIModal}
                onClose={() => setShowAIModal(false)}
                rawData={filteredIssues}
                geminiApiKey={geminiApiKey}
                geminiModel={geminiModel}
                dataType="tasks"
            />

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

            {/* 頁首 */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold text-slate-800">問題管理</h2>
                        {canAccessAll && (
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${isAdmin ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                {isAdmin ? 'Admin View' : 'Editor View'}
                            </span>
                        )}
                    </div>
                    <button onClick={() => { setCurrentIssue(null); setIsEditing(true); }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0075de] px-4 py-2 text-sm text-white shadow-md transition hover:bg-[#005bab] sm:w-auto">
                        <Plus size={16} /> 新增問題
                    </button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex w-full items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm sm:w-auto">
                        <Search size={16} className="text-slate-400" />
                        <input className="w-full min-w-0 bg-transparent text-sm outline-none sm:w-32" placeholder="搜尋..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm sm:w-auto">
                        <option value="All">全部狀態</option>
                        {ISSUE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {(isAdmin || canUseAI) && <button onClick={handleGenerateReport} className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white shadow-sm transition hover:bg-purple-700 sm:w-auto"><Sparkles size={16} /> AI 總結</button>}
                    <button onClick={handleExport} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition hover:bg-slate-50 sm:w-auto">
                        <Download size={16} /> 匯出
                    </button>
                </div>
            </div>

            {/* 統計卡片 - 有資料才顯示 */}
            {stats.total > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: '全部問題', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
                    { label: '未解決', value: stats.open, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
                    { label: '已逾期', value: stats.overdue, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
                    { label: '已解決/關閉', value: stats.resolved, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
                ].map(card => (
                    <div key={card.label} className={`${card.bg} border ${card.border} rounded-xl p-4`}>
                        <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
                        <div className="text-sm text-slate-500 mt-1">{card.label}</div>
                    </div>
                ))}
            </div>
            )}

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
                                <IssueRow key={issue.id} issue={issue} onEdit={i => { setCurrentIssue(i); setIsEditing(true); }} onDelete={handleDelete} canEdit={canAccessAll || issue.createdByEmail === user?.email} />
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
                                        <IssueRow key={issue.id} issue={issue} onEdit={i => { setCurrentIssue(i); setIsEditing(true); }} onDelete={handleDelete} canEdit={canAccessAll || issue.createdByEmail === user?.email} />
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
