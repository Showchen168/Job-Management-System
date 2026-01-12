from datetime import date

from app import (
    build_on_going_notifications,
    prepare_notification_payloads,
    resolve_assignee_email,
)


def test_build_on_going_notifications_groups_by_assignee():
    tasks = [
        {"title": "修正報表", "status": "On-going", "assignee": "alice"},
        {"title": "資料同步", "status": "Done", "assignee": "alice"},
        {"title": "前端優化", "status": "進行中", "assignee": "bob"},
    ]
    user_emails = ["alice@aivres.com", "bob@aivres.com"]
    notifications = build_on_going_notifications(tasks, user_emails)
    assert list(notifications.keys()) == ["alice@aivres.com", "bob@aivres.com"]
    assert [task["title"] for task in notifications["alice@aivres.com"]] == ["修正報表"]


def test_resolve_assignee_email_prefers_explicit_email():
    assert resolve_assignee_email("bob@example.com", ["bob@aivres.com"]) == "bob@aivres.com"


def test_resolve_assignee_email_returns_none_when_not_registered():
    assert resolve_assignee_email("carol", ["bob@aivres.com"]) is None


def test_prepare_notification_payloads_formats_subject_and_body():
    tasks = [{"title": "狀態更新", "status": "On-going", "assignee": "alice", "dueDate": "2024-12-31"}]
    payloads = prepare_notification_payloads(tasks, ["alice@aivres.com"], notify_date=date(2024, 1, 1))
    assert payloads[0]["to"] == "alice@aivres.com"
    assert "2024-01-01" in payloads[0]["subject"]
    assert "狀態更新" in payloads[0]["body"]


def test_prepare_notification_payloads_returns_empty_when_no_on_going():
    tasks = [{"title": "已完成", "status": "Done", "assignee": "alice"}]
    payloads = prepare_notification_payloads(tasks, ["alice@aivres.com"], notify_date=date(2024, 1, 1))
    assert payloads == []
