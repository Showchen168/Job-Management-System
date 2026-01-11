from datetime import date, datetime, time
from zoneinfo import ZoneInfo

import pytest

from app import (
    NotificationSettings,
    build_on_going_notifications,
    is_scheduled_day,
    normalize_days_of_week,
    parse_notification_time,
    prepare_notification_payloads,
    parse_allow_repeat,
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
    with pytest.raises(ValueError):
        parse_notification_time(930)


def test_parse_notification_time_accepts_datetime_and_time():
    sample_datetime = datetime(2024, 1, 1, 9, 30, tzinfo=ZoneInfo("Asia/Taipei"))
    assert parse_notification_time(sample_datetime) == time(9, 30, tzinfo=sample_datetime.tzinfo)
    assert parse_notification_time(time(18, 5)) == time(18, 5)


def test_parse_allow_repeat_parses_truthy_values():
    assert parse_allow_repeat("1") is True
    assert parse_allow_repeat("true") is True
    assert parse_allow_repeat("YES") is True
    assert parse_allow_repeat(None) is False
    assert parse_allow_repeat("0") is False


def test_build_on_going_notifications_groups_by_assignee():
    tasks = [
        {"title": "修正報表", "status": "On-going", "assignee": "alice"},
        {"title": "資料同步", "status": "Done", "assignee": "alice"},
        {"title": "前端優化", "status": "進行中", "assignee": "bob"},
    ]
    user_emails = ["alice@aivres.com", "bob@aivres.com"]
    notifications = build_on_going_notifications(tasks, user_emails)
    assert list(notifications.keys()) == ["alice@aivre.com", "bob@aivre.com"]
    assert [task["title"] for task in notifications["alice@aivre.com"]] == ["修正報表"]


def test_resolve_assignee_email_prefers_explicit_email():
    assert resolve_assignee_email("bob@example.com", ["bob@aivres.com"]) == "bob@aivre.com"


def test_resolve_assignee_email_returns_none_when_not_registered():
    assert resolve_assignee_email("carol", ["bob@aivres.com"]) is None


def test_prepare_notification_payloads_formats_subject_and_body():
    tasks = [{"title": "狀態更新", "status": "On-going", "assignee": "alice", "dueDate": "2024-12-31"}]
    payloads = prepare_notification_payloads(tasks, ["alice@aivres.com"], notify_date=date(2024, 1, 1))
    assert payloads[0]["to"] == "alice@aivre.com"
    assert "2024-01-01" in payloads[0]["subject"]
    assert "狀態更新" in payloads[0]["body"]


def test_should_send_notification_respects_daily_schedule():
    now = datetime(2024, 1, 1, 9, 0, tzinfo=ZoneInfo("Asia/Taipei"))
    assert should_send_notification(now, "09:00") is True
    assert should_send_notification(now, "09:00", last_sent_date=date(2024, 1, 1)) is False
    assert should_send_notification(now, "09:00", last_sent_date="2024-01-01") is False
    assert should_send_notification(now, "09:00", last_sent_date="2024-01-01", allow_repeat=True) is True


def test_should_send_notification_respects_selected_weekdays():
    now = datetime(2024, 1, 1, 9, 0, tzinfo=ZoneInfo("Asia/Taipei"))
    assert should_send_notification(now, "09:00", days_of_week=["mon", "tue"]) is True
    assert should_send_notification(now, "09:00", days_of_week=["tue", "wed"]) is False


def test_is_scheduled_day_handles_empty_selection():
    now = datetime(2024, 1, 1, 9, 0, tzinfo=ZoneInfo("Asia/Taipei"))
    assert is_scheduled_day(now, []) is False
    assert normalize_days_of_week(["mon", "fri"]) == {"mon", "fri"}
    assert normalize_days_of_week("Mon") == {"mon"}


def test_trigger_daily_notifications_returns_payloads_when_enabled():
    # Fixed: Use dailyTime instead of daily_time
    settings = NotificationSettings(
        dailyTime="09:00",
        enabled=True,
        daysOfWeek=("mon",),
    )
    tasks = [{"title": "狀態更新", "status": "On-going", "assignee": "alice"}]
    payloads = trigger_daily_notifications(
        settings,
        tasks,
        ["alice@aivres.com"],
        now=datetime(2024, 1, 1, 9, 30, tzinfo=ZoneInfo("Asia/Taipei")),
    )
    assert payloads
    assert payloads[0]["to"] == "alice@aivre.com"


def test_trigger_daily_notifications_allows_repeat_when_requested():
    settings = NotificationSettings(
        dailyTime="09:00",
        enabled=True,
        daysOfWeek=("mon",),
    )
    tasks = [{"title": "狀態更新", "status": "On-going", "assignee": "alice"}]
    payloads = trigger_daily_notifications(
        settings,
        tasks,
        ["alice@aivres.com"],
        now=datetime(2024, 1, 1, 9, 30, tzinfo=ZoneInfo("Asia/Taipei")),
        last_sent_date=date(2024, 1, 1),
        allow_repeat=True,
    )
    assert payloads


def test_trigger_daily_notifications_skips_when_disabled():
    # Fixed: Use dailyTime instead of daily_time
    settings = NotificationSettings(
        dailyTime="09:00",
        enabled=False,
        daysOfWeek=("mon",),
    )
    tasks = [{"title": "狀態更新", "status": "On-going", "assignee": "alice"}]
    payloads = trigger_daily_notifications(
        settings,
        tasks,
        ["alice@aivres.com"],
        now=datetime(2024, 1, 1, 9, 30, tzinfo=ZoneInfo("Asia/Taipei")),
    )
    assert payloads == []
