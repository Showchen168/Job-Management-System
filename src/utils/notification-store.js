import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { formatEmailPrefix } from './permissions';
import { resolveDirectoryUser } from './notifications-center';

export const pushNotification = async ({ db, userDirectoryMap, notification }) => {
    if (!db || !notification?.receiverEmail) return null;

    const receiver = resolveDirectoryUser(userDirectoryMap, notification.receiverEmail);
    if (!receiver?.uid) return null;

    const notificationsRef = collection(
        db,
        'artifacts',
        'work-tracker-v1',
        'public',
        'data',
        'users',
        receiver.uid,
        'notifications'
    );

    return addDoc(notificationsRef, {
        ...notification,
        receiverUid: receiver.uid,
        actorName: formatEmailPrefix(notification.actorEmail),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
};
