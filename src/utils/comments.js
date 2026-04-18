import { formatEmailPrefix } from './permissions';

const COMMENT_PREVIEW_LIMIT = 30;

export const buildCommentPreview = (content) => {
    const rawPreview = String(content || '').trim();
    return rawPreview.length > COMMENT_PREVIEW_LIMIT
        ? `${rawPreview.slice(0, COMMENT_PREVIEW_LIMIT)}...`
        : rawPreview;
};

export const buildCommentPayload = ({ content, entityType, user }) => ({
    content: String(content || '').trim(),
    entityType,
    createdByEmail: user?.email || '',
    createdByName: formatEmailPrefix(user?.email),
});

export const buildCommentSummary = ({ existingCount = 0, comment }) => {
    return {
        commentCount: existingCount + 1,
        lastCommentBy: formatEmailPrefix(comment?.createdByEmail),
        lastCommentPreview: buildCommentPreview(comment?.content),
    };
};

export const buildCommentThreadSummary = (comments = []) => {
    const latestComment = comments.at(-1);

    if (!latestComment) {
        return {
            commentCount: 0,
            lastCommentBy: '',
            lastCommentPreview: '',
            lastCommentAt: null,
        };
    }

    return {
        commentCount: comments.length,
        lastCommentBy: formatEmailPrefix(latestComment.createdByEmail),
        lastCommentPreview: buildCommentPreview(latestComment.content),
        lastCommentAt: latestComment.createdAt || null,
    };
};

export const mergeCommentMetadata = (item = {}, summary = {}) => ({
    ...item,
    ...summary,
});
