import React, { useState, useMemo } from 'react';
import { Edit2, Plus, X, Save, ImageIcon } from 'lucide-react';
import { getTeamLeaders, formatEmailPrefix } from '../../utils/permissions';

const TaskForm = ({ initialData, onSave, onCancel, taskSources, taskStatuses, assigneeOptions, teams = [] }) => {
    const [formData, setFormData] = useState({
        title: '', assignee: '', status: 'Pending', source: '', assignedDate: new Date().toISOString().split('T')[0], dueDate: '', delayReason: '', progress: '', teamId: '', ...initialData
    });
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    // 根據選擇的團隊過濾負責人選項
    const filteredAssignees = useMemo(() => {
        if (!formData.teamId) return assigneeOptions || [];
        const selectedTeam = teams.find(t => t.id === formData.teamId);
        if (!selectedTeam) return assigneeOptions || [];
        const teamEmails = [...getTeamLeaders(selectedTeam), ...(selectedTeam.members || [])];
        const teamPrefixes = teamEmails.map(e => formatEmailPrefix(e));
        return (assigneeOptions || []).filter(a => teamPrefixes.includes(a));
    }, [formData.teamId, teams, assigneeOptions]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden transform scale-100 transition-all flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                        {initialData ? <Edit2 size={20} className="text-blue-600" /> : <Plus size={20} className="text-green-600" />}
                        {initialData ? '編輯待辦事項' : '新增待辦事項'}
                    </h3>
                    <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">事項內容 <span className="text-red-500">*</span></label><input name="title" value={formData.title} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required /></div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">所屬團隊 <span className="text-red-500">*</span></label>
                            {teams.length > 0 ? (
                                <select name="teamId" value={formData.teamId} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required>
                                    <option value="" disabled>請選擇團隊</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            ) : (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <p className="text-sm text-amber-800">您尚未被加入任何團隊</p>
                                    <p className="text-xs text-amber-600 mt-1">請聯繫 <strong>Doris Kuo</strong> 或 <strong>Team Leader</strong></p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">負責人 <span className="text-red-500">*</span></label>
                            <select name="assignee" value={formData.assignee} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" data-testid="assignee-input" required>
                                <option value="">請選擇負責人</option>
                                {filteredAssignees.map((assignee) => (
                                    <option key={assignee} value={assignee}>{assignee}</option>
                                ))}
                            </select>
                        </div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">來源 <span className="text-red-500">*</span></label><select name="source" value={formData.source} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required><option value="" disabled>請選擇來源</option>{taskSources.map((s, i) => <option key={i} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">狀態 <span className="text-red-500">*</span></label><select name="status" value={formData.status} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required><option value="" disabled>請選擇狀態</option>{taskStatuses.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">交辦日期 <span className="text-red-500">*</span></label><input type="date" name="assignedDate" value={formData.assignedDate} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required /></div>
                        <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">預計完成 <span className="text-red-500">*</span></label><input type="date" name="dueDate" value={formData.dueDate} onChange={handleChange} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" required /></div>
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">進展更新 <span className="text-red-500">*</span></label><p className="text-xs text-red-500 mb-1">務必按照日期+內容的格式填寫，如：1/1 完成OOXX</p><textarea name="progress" value={formData.progress} onChange={handleChange} rows="3" className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="例：1/20 完成需求分析" required /></div>
                        <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 text-slate-400">延遲原因 (選填)</label><input name="delayReason" value={formData.delayReason} onChange={handleChange} className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg" placeholder="非必填" /></div>
                    </div>
                </div>
                <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-lg transition font-medium">取消</button>
                    <button onClick={() => onSave(formData)} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm"><Save size={18} /> 儲存</button>
                </div>
            </div>
        </div>
    );
};

export default TaskForm;
