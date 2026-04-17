import React, { useState, useEffect } from 'react';
import {
    collection, collectionGroup, query, onSnapshot
} from 'firebase/firestore';
import {
    AlertCircle, Users, BarChart3, PieChart, Briefcase
} from 'lucide-react';

const Dashboard = ({ db, user, canAccessAll }) => {
    const [taskStats, setTaskStats] = useState({ total: 0, byStatus: {}, bySource: {}, byAssignee: {}, byAssigneeStatus: {}, statusOrder: [] });
    const [meetingStats, setMeetingStats] = useState({ total: 0, byCategory: {} });
    const [issueStats, setIssueStats] = useState({ total: 0, open: 0, overdue: 0, resolved: 0, byStatus: {}, byClient: {} });

    useEffect(() => {
        if (!db || !user) return;
        const qTasks = canAccessAll
            ? query(collectionGroup(db, 'tasks'))
            : query(collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'tasks'));
        const unsubTasks = onSnapshot(qTasks, (snapshot) => {
            let t = 0; let sources = {}; let statuses = {}; let assignees = {}; let assigneeStatuses = {};
            snapshot.forEach(doc => {
                const data = doc.data(); t++;
                const status = data.status || '未定義'; statuses[status] = (statuses[status] || 0) + 1;
                const src = data.source || '未分類'; sources[src] = (sources[src] || 0) + 1;
                const owner = data.assignee || data.createdByEmail || '未指定'; assignees[owner] = (assignees[owner] || 0) + 1;
                if (!assigneeStatuses[owner]) { assigneeStatuses[owner] = {}; }
                assigneeStatuses[owner][status] = (assigneeStatuses[owner][status] || 0) + 1;
            });
            const statusOrder = Object.entries(statuses).sort((a, b) => b[1] - a[1]).map(([status]) => status);
            setTaskStats({ total: t, byStatus: statuses, bySource: sources, byAssignee: assignees, byAssigneeStatus: assigneeStatuses, statusOrder });
        });
        const qMeetings = canAccessAll
            ? query(collectionGroup(db, 'meetings'))
            : query(collection(db, 'artifacts', 'work-tracker-v1', 'users', user.uid, 'meetings'));
        const unsubMeetings = onSnapshot(qMeetings, (snapshot) => {
            let t = 0; let cats = {};
            snapshot.forEach(doc => {
                const data = doc.data(); t++;
                const c = data.category || '未分類'; cats[c] = (cats[c] || 0) + 1;
            });
            setMeetingStats({ total: t, byCategory: cats });
        });
        const qIssues = query(collectionGroup(db, 'issues'));
        const unsubIssues = onSnapshot(qIssues, (snapshot) => {
            let total = 0; let byStatus = {}; let byClient = {};
            const now = new Date();
            let open = 0; let overdue = 0; let resolved = 0;
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!canAccessAll && data.createdByEmail !== user.email) return;
                total++;
                const st = data.status || '未定義';
                byStatus[st] = (byStatus[st] || 0) + 1;
                const cl = data.client || '未分類';
                byClient[cl] = (byClient[cl] || 0) + 1;
                const isDone = st === '已解決';
                if (!isDone) {
                    open++;
                    if (data.dueDate && new Date(data.dueDate) < now) overdue++;
                } else {
                    resolved++;
                }
            });
            setIssueStats({ total, open, overdue, resolved, byStatus, byClient });
        });
        return () => { unsubTasks(); unsubMeetings(); unsubIssues(); };
    }, [db, user, canAccessAll]);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)]"><div className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">總待辦事項</div><div className="text-4xl font-bold tracking-[-0.04em] text-slate-800">{taskStats.total}</div></div>
                {Object.entries(taskStats.byStatus).slice(0, 3).map(([status, count], i) => {
                    const colors = ['bg-[#fff8eb] border-yellow-200 text-yellow-800', 'bg-[#eef6ff] border-blue-200 text-blue-800', 'bg-[#eff8f1] border-green-200 text-green-800'];
                    return (<div key={status} className={`rounded-[24px] border p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)] ${colors[i % colors.length]}`}><div className="mb-2 text-sm font-bold uppercase tracking-[0.16em] opacity-80">{status}</div><div className="text-4xl font-bold tracking-[-0.04em]">{count}</div></div>);
                })}
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><BarChart3 size={20}/> 待辦事項來源分析</h3>
                    <div className="space-y-3">{Object.keys(taskStats.bySource).length === 0 ? <p className="text-sm text-slate-400">暫無資料</p> : Object.entries(taskStats.bySource).map(([src, count]) => (<div key={src}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{src}</span><span className="font-bold text-slate-800">{count}</span></div><div className="h-2 w-full rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${(count / taskStats.total) * 100}%` }}></div></div></div>))}</div>
                </div>
                <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><PieChart size={20}/> 會議類型統計</h3>
                    <div className="mb-6 flex items-center justify-between"><div><div className="text-3xl font-bold text-slate-800">{meetingStats.total}</div><div className="text-xs text-slate-500">總會議場次</div></div><div className="rounded-full bg-emerald-100 p-3 text-emerald-600"><Users size={24}/></div></div>
                    <div className="space-y-2">{Object.keys(meetingStats.byCategory).length === 0 ? <p className="text-sm text-slate-400">暫無資料</p> : Object.entries(meetingStats.byCategory).map(([cat, count]) => (<div key={cat} className="flex items-center justify-between rounded border border-transparent p-2 text-sm hover:border-slate-100 hover:bg-slate-50"><span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500"></div>{cat}</span><span className="font-mono font-bold text-slate-700">{count}</span></div>))}</div>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><AlertCircle size={20} className="text-red-500"/> 問題管理概覽</h3>
                    <div className="mb-4 grid grid-cols-2 gap-3">
                        {[
                            { label: '全部問題', value: issueStats.total, color: 'text-slate-700', bg: 'bg-slate-50', border: 'border-slate-200' },
                            { label: '未解決', value: issueStats.open, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
                            { label: '已逾期', value: issueStats.overdue, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
                            { label: '已解決/關閉', value: issueStats.resolved, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
                        ].map(card => (
                            <div key={card.label} className={`${card.bg} border ${card.border} rounded-[20px] p-4`}>
                                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                                <div className="mt-1 text-xs text-slate-500">{card.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        {Object.keys(issueStats.byStatus).length === 0 ? <p className="text-sm text-slate-400">暫無資料</p> : Object.entries(issueStats.byStatus).map(([st, count]) => (
                            <div key={st} className="flex items-center justify-between rounded border border-transparent p-2 text-sm hover:border-slate-100 hover:bg-slate-50">
                                <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-400"></div>{st}</span>
                                <span className="font-mono font-bold text-slate-700">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.04)]">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800"><Briefcase size={20} className="text-orange-500"/> 客戶/產線問題分佈</h3>
                    <div className="space-y-3">
                        {Object.keys(issueStats.byClient).length === 0 ? <p className="text-sm text-slate-400">暫無資料</p> : Object.entries(issueStats.byClient).sort((a, b) => b[1] - a[1]).map(([client, count]) => (
                            <div key={client}>
                                <div className="mb-1 flex justify-between text-sm">
                                    <span className="text-slate-600">{client}</span>
                                    <span className="font-bold text-slate-800">{count}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-slate-100">
                                    <div className="h-2 rounded-full bg-orange-400" style={{ width: `${(count / issueStats.total) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
