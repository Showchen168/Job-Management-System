import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import CommentsPanel from './CommentsPanel';
import { buildCommentPayload, buildCommentSummary } from '../../utils/comments';
import { buildCommentNotifications } from '../../utils/notifications-center';
import { pushNotification } from '../../utils/notification-store';
import logger from '../../utils/logger';
import { addDemoComment } from '../../mock/demo-store';

const formatCommentTimestamp = (timestamp) => {
    if (!timestamp) return '剛剛';

    const date = typeof timestamp === 'string'
        ? new Date(timestamp)
        : timestamp?.seconds
            ? new Date(timestamp.seconds * 1000)
            : new Date();

    return date.toLocaleString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const CommentsThread = ({
    db,
    item,
    entityType,
    user,
    userDirectoryMap,
    demoMode = false,
    onDemoStateChange = () => {},
}) => {
    const [comments, setComments] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (demoMode) {
            setComments((item?.comments || []).map((comment) => ({
                ...comment,
                createdAtLabel: comment.createdAtLabel || formatCommentTimestamp(comment.createdAt),
            })));
            return undefined;
        }
        if (!db || !item?.path) return undefined;

        const commentsQuery = query(
            collection(db, item.path, 'comments'),
            orderBy('createdAt', 'asc')
        );

        return onSnapshot(
            commentsQuery,
            (snapshot) => {
                setComments(snapshot.docs.map((commentDoc) => ({
                    id: commentDoc.id,
                    ...commentDoc.data(),
                    createdAtLabel: formatCommentTimestamp(commentDoc.data()?.createdAt),
                })));
            },
            (error) => logger.error('Comments subscription error:', error)
        );
    }, [db, item?.path, item?.comments, demoMode]);

    const sortedComments = useMemo(() => comments, [comments]);

    const handleSubmit = async (content) => {
        if (demoMode) {
            onDemoStateChange((current) => addDemoComment(current, {
                entityType,
                itemId: item.id,
                actorEmail: user.email,
                content,
            }));
            return;
        }
        if (!db || !item?.path || !user?.email) return;

        const payload = buildCommentPayload({ content, entityType, user });
        const summary = buildCommentSummary({
            existingCount: item.commentCount || comments.length,
            comment: payload,
        });

        setSubmitting(true);
        try {
            await addDoc(collection(db, item.path, 'comments'), {
                ...payload,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await updateDoc(doc(db, item.path), {
                ...summary,
                lastCommentAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            const notifications = buildCommentNotifications({
                entityType,
                item,
                actorEmail: user.email,
                commentPreview: summary.lastCommentPreview,
            });

            await Promise.all(
                notifications.map((notification) => pushNotification({
                    db,
                    userDirectoryMap,
                    notification,
                }))
            );
        } catch (error) {
            logger.error('Submit comment error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <CommentsPanel
            comments={sortedComments}
            onSubmit={handleSubmit}
            submitting={submitting}
        />
    );
};

export default CommentsThread;
