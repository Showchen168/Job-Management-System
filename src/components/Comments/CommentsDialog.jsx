import React from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X } from 'lucide-react';
import CommentsThread from './CommentsThread';

const entityLabelMap = {
    task: '任務',
    issue: '問題',
};

const CommentsDialog = ({
    isOpen,
    onClose,
    item,
    entityType,
    db,
    user,
    userDirectoryMap,
    demoMode = false,
    onDemoStateChange = () => {},
}) => {
    if (!isOpen || !item || typeof document === 'undefined') return null;

    const entityLabel = entityLabelMap[entityType] || '卡片';

    return createPortal(
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/55 p-4"
            role="dialog"
            aria-modal="true"
            aria-label={`${entityLabel}留言視窗`}
            onClick={onClose}
        >
            <div
                className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            <MessageSquare size={14} />
                            {entityLabel}留言
                        </div>
                        <h2 className="mt-3 truncate text-lg font-bold text-slate-800" title={item.title || item.itemName || item.id}>
                            {item.title || item.itemName || '未命名卡片'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            在這裡查看留言、回覆內容與追蹤討論。
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="關閉留言視窗"
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto px-6 py-5">
                    <CommentsThread
                        db={db}
                        item={item}
                        entityType={entityType}
                        user={user}
                        userDirectoryMap={userDirectoryMap}
                        demoMode={demoMode}
                        onDemoStateChange={onDemoStateChange}
                    />
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                            關閉
                        </button>
                    </div>
                </div>
            </div>
        </div>
        ,
        document.body
    );
};

export default CommentsDialog;
