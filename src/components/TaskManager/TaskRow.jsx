import React, { useEffect, useRef, useState } from 'react';
import { Edit2, Trash2, AlertCircle, User, MessageSquare } from 'lucide-react';
import { formatEmailPrefix } from '../../utils/permissions';
import CommentsDialog from '../Comments/CommentsDialog';

const TaskRow = ({
    task,
    canEdit = true,
    canDelete = true,
    onEdit,
    onDelete,
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

    useEffect(() => {
        const isFocused = focusTarget?.targetType === 'task'
            && (focusTarget?.targetPath === task.path || focusTarget?.targetId === task.id);

        if (!isFocused) return;

        setExpanded(true);
        rowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        onFocusHandled?.();
    }, [focusTarget, task.id, task.path, onFocusHandled]);

    const getStatusColor = (status) => {
        const s = status.toLowerCase();
        if (s.includes('done') || s.includes('complete') || s.includes('完成')) return 'bg-green-100 text-green-700 border-green-200';
        if (s.includes('on-going') || s.includes('process') || s.includes('進行')) return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s.includes('pending') || s.includes('wait') || s.includes('待')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const handleToggleExpanded = () => setExpanded((current) => !current);
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.status.toLowerCase().includes('done');
    return (
        <>
        <tr ref={rowRef} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={handleToggleExpanded}>
            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(task.status)}`}>{task.status}</span></td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{task.source || '-'}</td>
            <td className="px-6 py-4">
                <div className="font-medium text-slate-800 max-w-xs truncate" title={task.title}>{task.title}</div>
                {task.createdByEmail && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><User size={10} /> {formatEmailPrefix(task.createdByEmail)}</div>}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">{task.assignee || '-'}</td>
            <td className="px-6 py-4 whitespace-nowrap">{task.assignedDate}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className={isOverdue ? 'text-red-600 font-bold' : ''}>{task.dueDate || '-'}</div>
            </td>
            <td className="px-6 py-4 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
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
                        <button
                            type="button"
                            aria-label="編輯任務"
                            onClick={onEdit}
                            className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                        >
                            <Edit2 size={14} />
                            編輯
                        </button>
                    )}
                    {canDelete && (
                        <button
                            type="button"
                            aria-label="刪除任務"
                            onClick={onDelete}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                        >
                            <Trash2 size={14} />
                            刪除
                        </button>
                    )}
                </div>
            </td>
        </tr>
        {expanded && (
            <tr className="bg-slate-50">
                <td colSpan={7} className="px-6 py-4 text-sm text-slate-600 border-t border-slate-100">
                    <div className="space-y-3">
                        {task.progress && <div><span className="font-semibold text-slate-500 mr-2">進度：</span><span className="whitespace-pre-wrap">{task.progress}</span></div>}
                        {task.delayReason && <div className="flex items-start gap-1 text-red-600"><AlertCircle size={14} className="mt-0.5 flex-shrink-0" /><span><span className="font-semibold mr-1">延遲原因：</span>{task.delayReason}</span></div>}
                        {!task.progress && !task.delayReason && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
                                這張卡目前還沒有進度摘要
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        )}
        <CommentsDialog
            isOpen={commentsOpen}
            onClose={() => setCommentsOpen(false)}
            item={task}
            entityType="task"
            db={db}
            user={user}
            userDirectoryMap={userDirectoryMap}
            demoMode={demoMode}
            onDemoStateChange={onDemoStateChange}
        />
        </>
    );
};

export default TaskRow;
