from dataclasses import dataclass
from datetime import date, datetime, time
import re

APP_VERSION = "v2.5.5"  # Updated version
ON_GOING_KEYWORDS = ("on-going", "ongoing", "進行")
DEFAULT_DAYS_OF_WEEK = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
WEEKDAY_LOOKUP = {key: index for index, key in enumerate(DEFAULT_DAYS_OF_WEEK)}
NOTIFICATION_EMAIL_DOMAIN = "@aivre.com"


@dataclass(frozen=True)
class NotificationSettings:
    dailyTime: str  # Fixed: Aligned with frontend field name (dailyTime)
    enabled: bool = True
    daysOfWeek: tuple = DEFAULT_DAYS_OF_WEEK


def get_version():
    return APP_VERSION


def validate_version(version):
    if not re.fullmatch(r"v\d+\.\d+\.[0-9]+", version): # Slightly improved regex for patch versions
        raise ValueError("版本格式不正確")
    return True


def normalize_last_sent_date(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def parse_notification_time(value):
    if isinstance(value, datetime):
        return value.time()
    if isinstance(value, time):
        return value
    if not isinstance(value, str):
        raise ValueError("通知時間格式不正確")
    normalized = value.strip()
    if not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", normalized):
        raise ValueError("通知時間格式不正確")
    hour, minute = normalized.split(":")
    return time(hour=int(hour), minute=int(minute))


def normalize_days_of_week(days_of_week):
    if days_of_week is None:
        return set(DEFAULT_DAYS_OF_WEEK)
    if not days_of_week:
        return set()
    if isinstance(days_of_week, str):
        days_of_week = [days_of_week]
    normalized = set()
    for item in days_of_week:
        if isinstance(item, int) and 0 <= item <= 6:
            normalized.add(DEFAULT_DAYS_OF_WEEK[item])
            continue
        if isinstance(item, str):
            key = item.strip().lower()
            if key in WEEKDAY_LOOKUP:
                normalized.add(key)
    return normalized


def is_scheduled_day(now, days_of_week=None):
    normalized = normalize_days_of_week(days_of_week)
    if not normalized:
        return False
    weekday_key = DEFAULT_DAYS_OF_WEEK[now.weekday()]
    return weekday_key in normalized


def is_on_going(status):
    if not status:
        return False
    normalized = status.strip().lower()
    return any(keyword in normalized for keyword in ON_GOING_KEYWORDS)


def extract_email_prefix(value):
    if not value:
        return None
    if "@" in value:
        prefix = value.split("@", 1)[0]
    else:
        prefix = value
    prefix = prefix.strip()
    return prefix or None


def resolve_assignee_email(assignee, user_emails):
    assignee_prefix = extract_email_prefix(assignee)
    if not assignee_prefix:
        return None
    registered_prefixes = {
        email.split("@", 1)[0] for email in user_emails if email
    }
    if assignee_prefix in registered_prefixes:
        return f"{assignee_prefix}{NOTIFICATION_EMAIL_DOMAIN}"
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


def should_send_notification(now, daily_time, last_sent_date=None, days_of_week=None):
    # Note: Keep argument name as daily_time for internal logic, 
    # but the value will come from settings.dailyTime
    if not is_scheduled_day(now, days_of_week):
        return False
    scheduled_time = parse_notification_time(daily_time)
    target = datetime.combine(now.date(), scheduled_time)
    if now.tzinfo and target.tzinfo is None:
        target = target.replace(tzinfo=now.tzinfo)
    if now < target:
        return False
    normalized_last_sent_date = normalize_last_sent_date(last_sent_date)
    if normalized_last_sent_date and normalized_last_sent_date == now.date():
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


def trigger_daily_notifications(settings, tasks, user_emails, now=None, last_sent_date=None):
    if not settings or not settings.enabled:
        return []
    now = now or datetime.now()
    # Fixed: Access .dailyTime instead of .daily_time
    if not should_send_notification(now, settings.dailyTime, last_sent_date, settings.daysOfWeek):
        return []
    return prepare_notification_payloads(tasks, user_emails, notify_date=now.date())


if __name__ == "__main__":
    validate_version(APP_VERSION)
    print(f"Version: {APP_VERSION}")
