# -*- coding: utf-8 -*-
"""
Job Management System - 通知服務
版本: v2.8.4
"""
from datetime import date
import re
import sys

APP_VERSION = "v2.8.4"
ON_GOING_KEYWORDS = ("on-going", "ongoing", "進行")
NOTIFICATION_EMAIL_DOMAIN = "@aivres.com"


def get_version():
    """取得應用程式版本"""
    return APP_VERSION


def validate_version(version):
    """驗證版本格式 (vX.X.X)"""
    if not re.fullmatch(r"v\d+\.\d+\.\d+", version):
        raise ValueError("版本格式不正確")
    return True


def is_on_going(status):
    """檢查任務狀態是否為進行中"""
    if not status:
        return False
    normalized = status.strip().lower()
    return any(keyword in normalized for keyword in ON_GOING_KEYWORDS)


def extract_email_prefix(value):
    """從 Email 或帳號中提取前綴"""
    if not value:
        return None
    if "@" in value:
        prefix = value.split("@", 1)[0]
    else:
        prefix = value
    prefix = prefix.strip()
    return prefix or None


def resolve_assignee_email(assignee, user_emails):
    """解析負責人 Email"""
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
    """建立 On-going 通知清單"""
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
    """格式化通知郵件內容"""
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
    lines.append("此郵件為系統 On-going 通知，如有更新請至系統填寫。")
    return subject, "\n".join(lines)


def prepare_notification_payloads(tasks, user_emails, notify_date=None):
    """準備通知郵件內容"""
    notify_date = notify_date or date.today()
    notifications = build_on_going_notifications(tasks, user_emails)
    payloads = []
    for assignee_email, assignee_tasks in notifications.items():
        subject, body = format_notification_email(assignee_email, assignee_tasks, notify_date)
        payloads.append({"to": assignee_email, "subject": subject, "body": body})
    return payloads


if __name__ == "__main__":
    # 驗證版本
    validate_version(APP_VERSION)
    print(f"Starting Notification Service {APP_VERSION}...")
    print("每日提醒功能已移除，請改用系統內手動觸發 On-going 通知。")
    sys.exit(0)
