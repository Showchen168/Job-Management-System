import { isOnGoingStatus, resolveAssigneeEmail, formatLocalDate } from './helpers';

export const buildNotificationPayloads = (tasks, userEmails, notifyDate = new Date()) => {
    const displayDate = formatLocalDate(notifyDate);
    const notifications = {};
    tasks.forEach((task) => {
        if (!isOnGoingStatus(task.status)) return;
        const assigneeEmail = resolveAssigneeEmail(task.assignee, userEmails);
        if (!assigneeEmail) return;
        notifications[assigneeEmail] = notifications[assigneeEmail] || [];
        notifications[assigneeEmail].push(task);
    });
    return Object.entries(notifications).map(([email, items]) => {
        const subject = `待辦更新提醒 (${displayDate})`;
        const lines = [
            `您好，以下為 ${displayDate} 仍在處理中的待辦事項，請協助更新進度：`,
            "",
        ];
        items.forEach((task) => {
            const title = task.title || "未命名事項";
            const dueDate = task.dueDate || "未設定";
            lines.push(`- ${title}（預計完成：${dueDate}）`);
        });
        lines.push("", "此郵件為系統 On-going 通知，如有更新請至系統填寫。");
        return { to: email, subject, body: lines.join("\n") };
    });
};

export const sendEmailJsNotification = async (config, payload) => {
    if (!config?.serviceId || !config?.templateId || !config?.publicKey) {
        throw new Error("尚未完成 EmailJS 設定");
    }
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            service_id: config.serviceId,
            template_id: config.templateId,
            user_id: config.publicKey,
            template_params: {
                to_email: payload.to,
                subject: payload.subject,
                message: payload.body,
                from_name: config.fromName || "Job Management System"
            }
        })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "EmailJS 發送失敗");
    }
    return true;
};
