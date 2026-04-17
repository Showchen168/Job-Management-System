import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Trash2, MessageSquare } from 'lucide-react';
import { ISSUE_STATUSES, issueStatusConfig } from './issueConstants';
import CommentsDialog from '../Comments/CommentsDialog';

const IssueRow = ({
    issue,
    onEdit,
    onDelete,
    canEdit,
    db,
    user,
    userDirectoryMap,
    focusTarget,
    onFocusHandled,
    demoMode,
    onDemoStateChange,
    unreadCommentCount = 0,
}) => {
    const [expanded, setExpanded] = useState(false);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const rowRef = useRef(null);
    const unreadLabel = unreadCommentCount > 99 ? '99+' : unreadCommentCount;
    // 舊資料可能有「待處理」/「已關閉」，統一對應到新狀態
    const normalizedStatus = ISSUE_STATUSES.includes(issue.status) ? issue.status : '處理中';
    const sta = issueStatusConfig[normalizedStatus];
    const isOverdue = issue.dueDate && normalizedStatus !== '已解決' && new Date(issue.dueDate) < new Date();
    const createdDate = issue.createdAt?.seconds
        ? new Date(issue.createdAt.seconds * 1000).toLocaleDateString('zh-TW')
        : issue.createdDateStr || '—';

    useEffect(() => {
        const isFocused = focusTarget?.targetType === 'issue'
            && (focusTarget?.targetPath === issue.path || focusTarget?.targetId === issue.id);

        if (!isFocused) return;

        setExpanded(true);
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        onFocusHandled?.();
    }, [focusTarget, issue.id, issue.path, onFocusHandled]);

    const handleToggleExpanded = () => setExpanded((current) => !current);

    return (
        <>
            <tr ref={rowRef} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={handleToggleExpanded}>
                <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-bold whitespace-nowrap ${sta.color}`}>
                        {normalizedStatus}
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
                    <div className="flex flex-wrap justify-end gap-2">
                        <button
                            type="button"
                            aria-label="開啟留言視窗"
                            onClick={() => setCommentsOpen(true)}
                            className="relative inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                            <MessageSquare size={14} />
                            留言
                            {unreadCommentCount > 0 && (
                                <span
                                    aria-label={`新留言 ${unreadCommentCount}`}
                                    className="absolute -right-2 -top-2 min-w-[1.25rem] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white"
                                >
                                    {unreadLabel}
                                </span>
                            )}
                        </button>
                        {canEdit && (
                            <>
                                <button
                                    type="button"
                                    aria-label="編輯問題"
                                    onClick={() => onEdit(issue)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                                >
                                    <Edit2 size={14} />
                                    編輯
                                </button>
                                <button
                                    type="button"
                                    aria-label="刪除問題"
                                    onClick={() => onDelete(issue)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                >
                                    <Trash2 size={14} />
                                    刪除
                                </button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
            {expanded && (
                <tr className="bg-slate-50">
                    <td colSpan={8} className="px-6 py-4 text-sm text-slate-600 border-t border-slate-100">
                        <div className="space-y-3">
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                <span><span className="font-semibold text-slate-500 mr-1">問題上升：</span>{issue.issueEscalation || '—'}</span>
                                {issue.nvBugId && <span><span className="font-semibold text-slate-500 mr-1">NV_Bug_ID：</span>{issue.nvBugId}</span>}
                            </div>
                            {issue.description && <div><span className="font-semibold text-slate-500 mr-2">描述：</span>{issue.description}</div>}
                            {issue.progress && <div><span className="font-semibold text-slate-500 mr-2">進度更新：</span><span className="whitespace-pre-wrap">{issue.progress}</span></div>}
                            {!issue.description && !issue.progress && (
                                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
                                    這張問題卡目前還沒有補充說明
                                </div>
                            )}
                        </div>
                    </td>
                </tr>
            )}
            <CommentsDialog
                isOpen={commentsOpen}
                onClose={() => setCommentsOpen(false)}
                item={issue}
                entityType="issue"
                db={db}
                user={user}
                userDirectoryMap={userDirectoryMap}
                demoMode={demoMode}
                onDemoStateChange={onDemoStateChange}
            />
        </>
    );
};

export default IssueRow;
