import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import { ChevronRight, User } from 'lucide-react';
import { formatEmailPrefix } from '../../utils/permissions';

const MeetingRow = ({ meeting, onEdit, onDelete, canEdit = true, canDelete = true }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden group">
        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50" onClick={() => setExpanded(!expanded)}>
            <div className="flex items-center gap-4 flex-1">
            <div className="flex flex-col items-center justify-center bg-emerald-50 text-emerald-700 w-16 h-16 rounded-lg border border-emerald-100 flex-shrink-0"><span className="text-xs font-bold uppercase">{new Date(meeting.date).toLocaleString('default', { month: 'short' })}</span><span className="text-xl font-bold">{new Date(meeting.date).getDate()}</span></div>
            <div><div className="flex items-center gap-2">{meeting.category && <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">{meeting.category}</span>}<h3 className="font-bold text-slate-800">{meeting.topic}</h3></div><p className="text-sm text-slate-500 flex gap-2 mt-1"><span>{meeting.host}</span><span>•</span><span className="line-clamp-1 max-w-[200px]">{meeting.attendees}</span></p>{meeting.createdByEmail && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><User size={10} /> {formatEmailPrefix(meeting.createdByEmail)}</div>}</div>
            </div>
            <div className="flex items-center gap-4"><ChevronRight size={20} className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} /></div>
        </div>
        {expanded && (
            <div className="p-4 pt-0 border-t border-slate-100 bg-slate-50">
            <div className="mt-4 text-sm text-slate-700 leading-relaxed bg-white p-4 rounded border border-slate-200 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(meeting.content || "無詳細內容") }} />
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-200 pt-3">
                {canEdit && <button onClick={onEdit} className="px-3 py-1.5 text-sm bg-white border border-slate-300 rounded hover:bg-slate-100 text-slate-600">編輯</button>}
                {canDelete && <button onClick={onDelete} className="px-3 py-1.5 text-sm bg-red-50 border border-red-200 rounded hover:bg-red-100 text-red-600">刪除</button>}
            </div>
            </div>
        )}
        </div>
    );
};

export default MeetingRow;
