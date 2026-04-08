import React, { useState } from 'react';
import { X, Save, ImageIcon } from 'lucide-react';
import ContentEditor from '../common/ContentEditor';

const MeetingForm = ({ initialData, onSave, onCancel, categories, teams = [] }) => {
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], host: '', attendees: '', topic: '', content: '', category: categories[0] || '', teamId: '', ...initialData });
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleContentChange = (newContent) => setFormData(prev => ({ ...prev, content: newContent }));
    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 animate-in fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-lg text-slate-800">{initialData ? '編輯會議記錄' : '新增會議記錄'}</h3>
            <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">主題 <span className="text-red-500">*</span></label><input name="topic" value={formData.topic} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
            <div className="col-span-2 md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">分類 <span className="text-red-500">*</span></label><select name="category" value={formData.category} onChange={handleChange} className="w-full p-2 border rounded" required><option value="" disabled>請選擇分類</option>{categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}</select></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">日期 <span className="text-red-500">*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">主持人 <span className="text-red-500">*</span></label><input name="host" value={formData.host} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">所屬團隊</label>{teams.length > 0 ? (<select name="teamId" value={formData.teamId} onChange={handleChange} className="w-full p-2 border rounded"><option value="">不指定團隊</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>) : (<div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">尚未加入團隊，請聯繫 Doris Kuo 或 Team Leader</div>)}</div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">參會人員 <span className="text-red-500">*</span></label><input name="attendees" value={formData.attendees} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
            <div className="col-span-2"><label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center justify-between"><span>內容 (支援圖片貼上) <span className="text-red-500">*</span></span><span className="text-[10px] font-normal text-slate-400 flex items-center gap-1"><ImageIcon size={10}/> 貼上截圖會自動壓縮</span></label><ContentEditor value={formData.content} onChange={handleContentChange} /></div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition">取消</button>
            <button onClick={() => onSave(formData)} className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 text-sm"><Save size={16} /> 儲存</button>
        </div>
        </div>
        </div>
    );
};

export default MeetingForm;
