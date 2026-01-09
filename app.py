from dataclasses import dataclass
from datetime import date, datetime, time
import re

APP_VERSION = "v2.4.3"
ON_GOING_KEYWORDS = ("on-going", "ongoing", "進行")


@dataclass(frozen=True)
class NotificationSettings:
    daily_time: str
    enabled: bool = True


def get_version():
    return APP_VERSION


def validate_version(version):
    if not re.fullmatch(r"v\d+\.\d+\.[0-9]", version):
        raise ValueError("版本格式不正確")
    return True


def parse_notification_time(value):
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value):
        raise ValueError("通知時間格式不正確")
    hour, minute = value.split(":")
    return time(hour=int(hour), minute=int(minute))


def is_on_going(status):
    if not status:
        return False
    normalized = status.strip().lower()
    return any(keyword in normalized for keyword in ON_GOING_KEYWORDS)


def resolve_assignee_email(assignee, user_emails):
    if not assignee:
        return None
    if "@" in assignee:
        return assignee
    assignee_prefix = assignee.strip()
    for email in user_emails:
        prefix = email.split("@", 1)[0]
        if prefix == assignee_prefix:
            return email
    return None


def build_on_going_notifications(tasks, user_emails):
    notifications = {}
    for task in tasks:
        if not is_on_going(task.get("status")):
            continue
        assignee_email = resolve_assignee_email(task.get("assignee"), user_emails)
        if not assignee_email:
            continue
        notifications.setdefault(assignee_email, []).append(task)
    return notifications


def format_notification_email(assignee_email, tasks, notify_date):
    display_date = notify_date.isoformat()
    subject = f"待辦更新提醒 ({display_date})"
    lines = [
        f"您好，以下為 {display_date} 仍在處理中的待辦事項，請協助更新進度：",
        "",
    ]
    for task in tasks:
        title = task.get("title", "未命名事項")
        due_date = task.get("dueDate") or "未設定"
        lines.append(f"- {title}（預計完成：{due_date}）")
    lines.append("")
    lines.append("此郵件為系統每日提醒通知，如有更新請至系統填寫。")
    return subject, "\n".join(lines)


def should_send_notification(now, daily_time, last_sent_date=None):
    scheduled_time = parse_notification_time(daily_time)
    target = datetime.combine(now.date(), scheduled_time)
    if now < target:
        return False
    if last_sent_date and last_sent_date == now.date():
        return False
    return True


def prepare_notification_payloads(tasks, user_emails, notify_date=None):
    notify_date = notify_date or date.today()
    notifications = build_on_going_notifications(tasks, user_emails)
    payloads = []
    for assignee_email, assignee_tasks in notifications.items():
        subject, body = format_notification_email(assignee_email, assignee_tasks, notify_date)
        payloads.append({"to": assignee_email, "subject": subject, "body": body})
    return payloads


if __name__ == "__main__":
    validate_version(APP_VERSION)
    print(f"Version: {APP_VERSION}")
