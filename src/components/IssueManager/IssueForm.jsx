import React, { useState, useMemo } from 'react';
import { X, Save } from 'lucide-react';
import { getTeamLeaders, formatEmailPrefix } from '../../utils/permissions';
import { ISSUE_STATUSES } from './issueConstants';

const IssueForm = ({ initialData, onSave, onCancel, assigneeOptions, teams, issueSources, issueLocations, issueEscalations }) => {
    const [form, setForm] = useState({
        itemName: initialData?.itemName || '',
        title: '',
        description: '',
        issueSource: initialData?.issueSource || initialData?.client || '',
        issueLocation: initialData?.issueLocation || '',
        issueEscalation: initialData?.issueEscalation || '',
        nvBugId: initialData?.nvBugId || '',
        status: '處理中',
        assignee: '',
        teamId: '',
        dueDate: '',
        progress: '',
        ...initialData,
    });

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    // 根據選擇的團隊過濾負責人（跟 TaskForm 一樣）
    const filteredAssignees = useMemo(() => {
        if (!form.teamId) return assigneeOptions || [];
        const selectedTeam = teams.find(t => t.id === form.teamId);
        if (!selectedTeam) return assigneeOptions || [];
        const teamEmails = [...getTeamLeaders(selectedTeam), ...(selectedTeam.members || [])];
        const teamPrefixes = teamEmails.map(e => formatEmailPrefix(e));
        return (assigneeOptions || []).filter(a => teamPrefixes.includes(a));
    }, [form.teamId, teams, assigneeOptions]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 animate-in fade-in">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">{initialData?.id ? '編輯問題' : '新增問題'}</h3>
                    <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">項目名稱 <span className="text-red-500">*</span></label>
                        <input data-testid="issue-form-item-name" value={form.itemName} onChange={e => set('itemName', e.target.value)} placeholder="項目名稱" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">標題 <span className="text-red-500">*</span></label>
                        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="問題標題" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">描述 <span className="text-red-500">*</span></label>
                        <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="詳細描述問題..." rows={3} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">問題來源 <span className="text-red-500">*</span></label>
                        <select data-testid="issue-form-source" value={form.issueSource} onChange={e => set('issueSource', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">請選擇問題來源</option>
                            {(issueSources || []).map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">問題定位 <span className="text-red-500">*</span></label>
                        <select data-testid="issue-form-location" value={form.issueLocation} onChange={e => set('issueLocation', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">請選擇問題定位</option>
                            {(issueLocations || []).map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">問題上升 <span className="text-red-500">*</span></label>
                        <select data-testid="issue-form-escalation" value={form.issueEscalation} onChange={e => set('issueEscalation', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">請選擇問題上升</option>
                            {(issueEscalations || []).map(item => <option key={item} value={item}>{item}</option>)}
                        </select>
                    </div>
                    {form.issueEscalation === 'Nvidia' && (
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">NV_Bug_ID <span className="text-red-500">*</span></label>
                            <input data-testid="issue-form-nv-bug-id" value={form.nvBugId} onChange={e => set('nvBugId', e.target.value)} placeholder="請輸入 NV Bug ID" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">狀態 <span className="text-red-500">*</span></label>
                        <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {ISSUE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">負責人 <span className="text-red-500">*</span></label>
                        <select value={form.assignee} onChange={e => set('assignee', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">請選擇負責人</option>
                            {filteredAssignees.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">所屬團隊 <span className="text-red-500">*</span></label>
                        {teams.length > 0 ? (
                            <select value={form.teamId} onChange={e => set('teamId', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">請選擇團隊</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        ) : (
                            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">尚未加入團隊，請聯繫 Team Leader</div>
                        )}
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">截止日期 <span className="text-red-500">*</span></label>
                        <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">進度更新 <span className="text-red-500">*</span></label>
                        <p className="text-xs text-red-500 mb-1">務必按照日期+內容的格式填寫，如：1/1 完成OOXX</p>
                        <textarea value={form.progress} onChange={e => set('progress', e.target.value)} placeholder="記錄最新處理進度，例：5/20 已聯繫客戶確認需求..." rows={4} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                    <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition">取消</button>
                    <button onClick={() => onSave(form)} className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm flex items-center gap-2"><Save size={15} /> 儲存</button>
                </div>
            </div>
        </div>
    );
};

export default IssueForm;
