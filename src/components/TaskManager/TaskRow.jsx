import React, { useState } from 'react';
import { Edit2, Trash2, AlertCircle, User } from 'lucide-react';
import { formatEmailPrefix } from '../../utils/permissions';

const TaskRow = ({ task, onEdit, onDelete }) => {
    const [expanded, setExpanded] = useState(false);
    const getStatusColor = (status) => {
        const s = status.toLowerCase();
        if (s.includes('done') || s.includes('complete') || s.includes('完成')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('on-going') || s.includes('process') || s.includes('進行')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s.includes('pending') || s.includes('wait') || s.includes('待')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.status.toLowerCase().includes('done');
    return (
        <>
        <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpanded(e => !e)}>
            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(task.status)}`}>{task.status}</span></td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{task.source || '-'}</td>
            <td className="px-6 py-4">
                <div className="font-medium text-slate-800 max-w-xs truncate" title={task.title}>{task.title}</div>
                {task.createdByEmail && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><User size={10} /> {formatEmailPrefix(task.createdByEmail)}</div>}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">{task.assignee || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap">{task.assignedDate}</td>
            <td className="px-6 py-4 whitespace-nowrap"><span className={isOverdue ? 'text-red-600 font-bold' : ''}>{task.dueDate || '-'}</span></td>
            <td className="px-6 py-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}><div className="flex justify-end gap-2"><button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Edit2 size={16} /></button><button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={16} /></button></div></td>
        </tr>
        {expanded && (task.progress || task.delayReason) && (
            <tr className="bg-slate-50">
                <td colSpan={7} className="px-6 py-4 text-sm text-slate-600 border-t border-slate-100 space-y-2">
                    {task.progress && <div><span className="font-semibold text-slate-500 mr-2">進度：</span><span className="whitespace-pre-wrap">{task.progress}</span></div>}
                    {task.delayReason && <div className="flex items-start gap-1 text-red-600"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" /><span><span className="font-semibold mr-1">延遲原因：</span>{task.delayReason}</span></div>}
                </td>
            </tr>
        )}
        </>
    );
};

export default TaskRow;
