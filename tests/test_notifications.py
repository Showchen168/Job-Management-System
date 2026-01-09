from datetime import date, datetime

import pytest

from app import (
    NotificationSettings,
    build_on_going_notifications,
    parse_notification_time,
    prepare_notification_payloads,
    resolve_assignee_email,
    should_send_notification,
    trigger_daily_notifications,
)


def test_parse_notification_time_valid():
    parsed = parse_notification_time("09:30")
    assert parsed.hour == 9
    assert parsed.minute == 30


def test_parse_notification_time_invalid():
    with pytest.raises(ValueError):
        parse_notification_time("9:30")


def test_build_on_going_notifications_groups_by_assignee():
    tasks = [
        {"title": "修正報表", "status": "On-going", "assignee": "alice"},
        {"title": "資料同步", "status": "Done", "assignee": "alice"},
        {"title": "前端優化", "status": "進行中", "assignee": "bob"},
    ]
    user_emails = ["alice@example.com", "bob@example.com"]
    notifications = build_on_going_notifications(tasks, user_emails)
    assert list(notifications.keys()) == ["alice@example.com", "bob@example.com"]
    assert [task["title"] for task in notifications["alice@example.com"]] == ["修正報表"]


def test_resolve_assignee_email_prefers_explicit_email():
    assert resolve_assignee_email("bob@example.com", ["bob@example.com"]) == "bob@example.com"


def test_prepare_notification_payloads_formats_subject_and_body():
    tasks = [{"title": "狀態更新", "status": "On-going", "assignee": "alice", "dueDate": "2024-12-31"}]
    payloads = prepare_notification_payloads(tasks, ["alice@example.com"], notify_date=date(2024, 1, 1))
    assert payloads[0]["to"] == "alice@example.com"
    assert "2024-01-01" in payloads[0]["subject"]
    assert "狀態更新" in payloads[0]["body"]


def test_should_send_notification_respects_daily_schedule():
    now = datetime(2024, 1, 1, 9, 0)
    assert should_send_notification(now, "09:00") is True
    assert should_send_notification(now, "09:00", last_sent_date=date(2024, 1, 1)) is False
    assert should_send_notification(now, "09:00", last_sent_date="2024-01-01") is False


def test_trigger_daily_notifications_returns_payloads_when_enabled():
    # Fixed: Use dailyTime instead of daily_time
    settings = NotificationSettings(dailyTime="09:00", enabled=True)
    tasks = [{"title": "狀態更新", "status": "On-going", "assignee": "alice"}]
    payloads = trigger_daily_notifications(
        settings,
        tasks,
        ["alice@example.com"],
        now=datetime(2024, 1, 1, 9, 30),
    )
    assert payloads
    assert payloads[0]["to"] == "alice@example.com"


def test_trigger_daily_notifications_skips_when_disabled():
    # Fixed: Use dailyTime instead of daily_time
    settings = NotificationSettings(dailyTime="09:00", enabled=False)
    tasks = [{"title": "狀態更新", "status": "On-going", "assignee": "alice"}]
    payloads = trigger_daily_notifications(
        settings,
        tasks,
        ["alice@example.com"],
        now=datetime(2024, 1, 1, 9, 30),
    )
    assert payloads == []
