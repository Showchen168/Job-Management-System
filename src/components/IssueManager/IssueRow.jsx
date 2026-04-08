import React, { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { ISSUE_STATUSES, issueStatusConfig } from './issueConstants';

const IssueRow = ({ issue, onEdit, onDelete, canEdit }) => {
    const [expanded, setExpanded] = useState(false);
    // 舊資料可能有「待處理」/「已關閉」，統一對應到新狀態
    const normalizedStatus = ISSUE_STATUSES.includes(issue.status) ? issue.status : '處理中';
    const sta = issueStatusConfig[normalizedStatus];
    const isOverdue = issue.dueDate && normalizedStatus !== '已解決' && new Date(issue.dueDate) < new Date();
    const createdDate = issue.createdAt?.seconds
        ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString('zh-TW')
        : issue.createdDateStr || '—';

    return (
        <>
            <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setExpanded(e => !e)}>
                <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${sta.color}`}>
                        {sta.icon}{normalizedStatus}
                    </span>
                </td>
                <td className="px-4 py-3 min-w-[200px]">
                    <div className="text-xs font-semibold text-slate-400">{issue.itemName || '—'}</div>
                    <div className="font-medium text-slate-800 text-sm">{issue.title}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{issue.issueSource || issue.client || '—'}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{issue.issueLocation || <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{issue.assignee || <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{createdDate}</td>
                <td className={`px-4 py-3 text-sm whitespace-nowrap ${isOverdue ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>
                    {issue.dueDate || <span className="text-slate-300">—</span>}
                    {isOverdue && <span className="ml-1 text-[10px] bg-red-100 text-red-600 px-1 rounded">逾期</span>}
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    {canEdit && (
                        <div className="flex justify-end gap-2">
                            <button onClick={() => onEdit(issue)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Edit2 size={14} /></button>
                            <button onClick={() => onDelete(issue)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={14} /></button>
                        </div>
                    )}
                </td>
            </tr>
            {expanded && (issue.description || issue.progress || issue.issueEscalation || issue.nvBugId) && (
                <tr className="bg-slate-50">
                    <td colSpan={8} className="px-6 py-4 text-sm text-slate-600 border-t border-slate-100 space-y-2">
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                            <span><span className="font-semibold text-slate-500 mr-1">問題上升：</span>{issue.issueEscalation || '—'}</span>
                            {issue.nvBugId && <span><span className="font-semibold text-slate-500 mr-1">NV_Bug_ID：</span>{issue.nvBugId}</span>}
                        </div>
                        {issue.description && <div><span className="font-semibold text-slate-500 mr-2">描述：</span>{issue.description}</div>}
                        {issue.progress && <div><span className="font-semibold text-slate-500 mr-2">進度更新：</span><span className="whitespace-pre-wrap">{issue.progress}</span></div>}
                    </td>
                </tr>
            )}
        </>
    );
};

export default IssueRow;
