import React from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, MessageSquare, User, X } from 'lucide-react';

const badgeStyles = {
    task: 'bg-blue-100 text-blue-700',
    issue: 'bg-amber-100 text-amber-700',
};

const statusStyles = {
    done: 'bg-green-100 text-green-700 border-green-200',
    ongoing: 'bg-blue-100 text-blue-700 border-blue-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    default: 'bg-slate-100 text-slate-700 border-slate-200',
};

const getStatusStyle = (status = '') => {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus.includes('done') || normalizedStatus.includes('complete') || normalizedStatus.includes('已解決') || normalizedStatus.includes('完成')) {
        return statusStyles.done;
    }
    if (normalizedStatus.includes('on-going') || normalizedStatus.includes('process') || normalizedStatus.includes('處理中') || normalizedStatus.includes('進行')) {
        return statusStyles.ongoing;
    }
    if (normalizedStatus.includes('pending') || normalizedStatus.includes('wait') || normalizedStatus.includes('待')) {
        return statusStyles.pending;
    }
    return statusStyles.default;
};

const renderField = (label, value) => (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
        <div className="mt-2 text-sm text-slate-700">{value || '—'}</div>
    </div>
);

const TeamBoardItemDialog = ({
    isOpen,
    item,
    onClose,
    onNavigateToItem,
}) => {
    if (!isOpen || !item || typeof document === 'undefined') return null;

    const title = item.title || item.itemName || '未命名卡片';
    const typeLabel = item.type === 'issue' ? '問題' : '任務';
    const dueDateLabel = item.type === 'issue' ? '截止日期' : '預計完成';

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`${typeLabel}內容視窗`}
            onClick={onClose}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeStyles[item.type] || badgeStyles.task}`}>
                                {typeLabel}
                            </span>
                            內容預覽
                        </div>
                        <h2 className="mt-3 text-lg font-bold text-slate-800">{title}</h2>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1">
                                <User size={14} />
                                {item.assigneeName || item.assignee || '未指派'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <CalendarDays size={14} />
                                {item.dueDate || '未排日期'}
                            </span>
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusStyle(item.status)}`}>
                                {item.status || '未設定狀態'}
                            </span>
                            <span>最後編輯 {item.lastEditedLabel || '—'}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="關閉內容視窗"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    <div className="grid gap-3 md:grid-cols-2">
                        {renderField('負責人', item.assigneeName || item.assignee)}
                        {renderField(dueDateLabel, item.dueDate)}
                        {item.type === 'issue'
                            ? renderField('問題來源', item.issueSource || item.client)
                            : renderField('來源', item.source)}
                        {item.type === 'issue'
                            ? renderField('問題定位', item.issueLocation)
                            : renderField('交辦日期', item.assignedDate)}
                    </div>

                    <div className="mt-5 space-y-4">
                        {item.type === 'issue' && (
                            <>
                                {renderField('問題上升', item.issueEscalation)}
                                {renderField('描述', item.description)}
                                {renderField('進度更新', item.progress)}
                            </>
                        )}
                        {item.type === 'task' && (
                            <>
                                {renderField('進度摘要', item.progress)}
                                {renderField('延遲原因', item.delayReason)}
                            </>
                        )}
                    </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                            <MessageSquare size={16} />
                            {item.commentCount || 0} 則留言
                        </div>
                        <div className="flex justify-end gap-3">
                            {typeof onNavigateToItem === 'function' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onNavigateToItem(item);
                                        onClose();
                                    }}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                                >
                                    在原頁面查看
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-2xl bg-[#0075de] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#005bab]"
                            >
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TeamBoardItemDialog;
