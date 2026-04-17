import { formatEmailPrefix } from './permissions';

const COMMENT_PREVIEW_LIMIT = 30;

export const buildCommentPayload = ({ content, entityType, user }) => ({
    content: String(content || '').trim(),
    entityType,
    createdByEmail: user?.email || '',
    createdByName: formatEmailPrefix(user?.email),
});

export const buildCommentSummary = ({ existingCount = 0, comment }) => {
    const rawPreview = String(comment?.content || '').trim();
    const lastCommentPreview = rawPreview.length > COMMENT_PREVIEW_LIMIT
        ? `${rawPreview.slice(0, COMMENT_PREVIEW_LIMIT)}...`
        : rawPreview;

    return {
        commentCount: existingCount + 1,
        lastCommentBy: formatEmailPrefix(comment?.createdByEmail),
        lastCommentPreview,
    };
};

export const mergeCommentMetadata = (item = {}, summary = {}) => ({
    ...item,
    ...summary,
});
