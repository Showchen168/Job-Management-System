import React, { useMemo, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { countUnreadNotifications } from '../../utils/notifications-center';

const NotificationBell = ({
    notifications = [],
    onOpenTarget = () => {},
    onMarkAsRead = () => {},
}) => {
    const [open, setOpen] = useState(false);
    const unreadCount = useMemo(
        () => countUnreadNotifications(notifications),
        [notifications]
    );

    const handleNotificationClick = (notification) => {
        onOpenTarget(notification);
        if (!notification?.read) {
            onMarkAsRead(notification);
        }
        setOpen(false);
    };

    return (
        <div className="relative">
            <button
                type="button"
                aria-label="通知鈴鐺"
                onClick={() => setOpen((value) => !value)}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border-soft)] bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 hover:shadow"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-[1.25rem] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
                        {unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-14 z-50 w-[22rem] overflow-hidden rounded-3xl border border-[color:var(--border-soft)] bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <p className="text-sm font-semibold text-slate-800">通知</p>
                            <p className="text-xs text-slate-500">查看被指派與留言提醒</p>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                            <CheckCheck size={12} />
                            未讀 {unreadCount}
                        </div>
                    </div>

                    <div className="max-h-[24rem] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="px-4 py-10 text-center text-sm text-slate-400">
                                目前沒有新通知
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {notifications.map((notification) => (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${
                                            notification.read ? 'bg-white' : 'bg-blue-50/60'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {notification.title}
                                                </p>
                                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-500">
                                                    {notification.message}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
