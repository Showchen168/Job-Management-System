from datetime import date
import re
import sys

APP_VERSION = "v2.6.2"  # Updated version
ON_GOING_KEYWORDS = ("on-going", "ongoing", "閫茶")
NOTIFICATION_EMAIL_DOMAIN = "@aivres.com"


def get_version():
    return APP_VERSION


def validate_version(version):
    if not re.fullmatch(r"v\d+\.\d+\.[0-9]", version):
        raise ValueError("鐗堟湰鏍煎紡涓嶆纰?)
    return True


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
    subject = f"寰呰睛鏇存柊鎻愰啋 ({display_date})"
    lines = [
        f"鎮ㄥソ锛屼互涓嬬偤 {display_date} 浠嶅湪铏曠悊涓殑寰呰睛浜嬮爡锛岃珛鍗斿姪鏇存柊閫插害锛?,
        "",
    ]
    for task in tasks:
        title = task.get("title", "鏈懡鍚嶄簨闋?)
        due_date = task.get("dueDate") or "鏈ō瀹?
        lines.append(f"- {title}锛堥爯瑷堝畬鎴愶細{due_date}锛?)
    lines.append("")
    lines.append("姝ら兊浠剁偤绯荤当 On-going 閫氱煡锛屽鏈夋洿鏂拌珛鑷崇郴绲卞～瀵€?)
    return subject, "\n".join(lines)


def prepare_notification_payloads(tasks, user_emails, notify_date=None):
    notify_date = notify_date or date.today()
    notifications = build_on_going_notifications(tasks, user_emails)
    payloads = []
    for assignee_email, assignee_tasks in notifications.items():
        subject, body = format_notification_email(assignee_email, assignee_tasks, notify_date)
        payloads.append({"to": assignee_email, "subject": subject, "body": body})
    return payloads


if __name__ == "__main__":
    # 1. 椹楄瓑鐗堟湰
    validate_version(APP_VERSION)
    print(f"Starting Notification Service {APP_VERSION}...")
    print("姣忔棩鎻愰啋鍔熻兘宸茬Щ闄わ紝璜嬫敼鐢ㄧ郴绲卞収鎵嬪嫊鐧奸€?On-going 閫氱煡銆?)
    sys.exit(0)
