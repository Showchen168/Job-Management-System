import React, { useState } from 'react';
import { MessageSquare, SendHorizonal, Pencil, Trash2 } from 'lucide-react';

const CommentsPanel = ({
    comments = [],
    currentUserEmail = '',
    onSubmit = () => {},
    onEdit = () => {},
    onDelete = () => {},
    submitting = false,
}) => {
    const [draft, setDraft] = useState('');
    const [editingCommentId, setEditingCommentId] = useState('');
    const [editingDraft, setEditingDraft] = useState('');

    const handleSubmit = () => {
        const trimmed = draft.trim();
        if (!trimmed || submitting) return;
        onSubmit(trimmed);
        setDraft('');
    };

    const handleEditStart = (comment) => {
        setEditingCommentId(comment.id);
        setEditingDraft(comment.content || '');
    };

    const handleEditCancel = () => {
        setEditingCommentId('');
        setEditingDraft('');
    };

    const handleEditSave = () => {
        const trimmed = editingDraft.trim();
        if (!trimmed || submitting || !editingCommentId) return;
        onEdit(editingCommentId, trimmed);
        handleEditCancel();
    };

    return (
        <section className="rounded-3xl border border-[color:var(--border-soft)] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <MessageSquare size={16} />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">留言</h3>
                    <p className="text-xs text-slate-500">在卡片內直接討論與回覆</p>
                </div>
            </div>

            <div className="mt-4 space-y-3">
                {comments.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                        目前還沒有留言
                    </div>
                ) : (
                    comments.map((comment) => (
                        <article
                            key={comment.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                        {comment.createdByName || '匿名'}
                                    </p>
                                    {comment.createdAtLabel && (
                                        <p className="text-xs text-slate-400">{comment.createdAtLabel}</p>
                                    )}
                                </div>
                                {comment.createdByEmail === currentUserEmail && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            aria-label="編輯留言"
                                            onClick={() => handleEditStart(comment)}
                                            disabled={submitting}
                                            className="inline-flex items-center gap-1 rounded-xl border border-blue-100 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Pencil size={12} />
                                            編輯
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="刪除留言"
                                            onClick={() => onDelete(comment.id)}
                                            disabled={submitting}
                                            className="inline-flex items-center gap-1 rounded-xl border border-red-100 bg-white px-2.5 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Trash2 size={12} />
                                            刪除
                                        </button>
                                    </div>
                                )}
                            </div>
                            {editingCommentId === comment.id ? (
                                <div className="mt-3 space-y-3">
                                    <textarea
                                        value={editingDraft}
                                        onChange={(event) => setEditingDraft(event.target.value)}
                                        rows={3}
                                        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={handleEditCancel}
                                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="button"
                                            aria-label="儲存留言"
                                            onClick={handleEditSave}
                                            disabled={submitting || !editingDraft.trim()}
                                            className="rounded-xl bg-[color:var(--accent-primary)] px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            儲存
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                    {comment.content}
                                </p>
                            )}
                        </article>
                    ))
                )}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="輸入留言..."
                    rows={3}
                    className="w-full resize-none border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        aria-label="送出留言"
                        onClick={handleSubmit}
                        disabled={submitting || !draft.trim()}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[color:var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <SendHorizonal size={15} />
                        送出留言
                    </button>
                </div>
            </div>
        </section>
    );
};

export default CommentsPanel;
