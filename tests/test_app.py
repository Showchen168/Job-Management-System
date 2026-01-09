from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from app import APP_VERSION, convert_text, get_version, validate_version


def test_get_version_returns_app_version():
    assert get_version() == APP_VERSION


def test_validate_version_accepts_current_version():
    assert validate_version(APP_VERSION) is True


def test_validate_version_rejects_invalid_format():
    with pytest.raises(ValueError):
        validate_version("v2.3")


def test_convert_text_traditional_to_simplified():
    assert convert_text("測試繁體台灣後", "t2s") == "测试繁体台湾后"


def test_convert_text_simplified_to_traditional():
    assert convert_text("测试繁体台湾后", "s2t") == "測試繁體臺灣後"


def test_convert_text_rejects_invalid_mode():
    with pytest.raises(ValueError):
        convert_text("測試", "invalid")


def test_convert_text_rejects_non_string():
    with pytest.raises(TypeError):
        convert_text(123, "t2s")
