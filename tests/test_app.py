from pathlib import Path
import sys

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(PROJECT_ROOT))

from app import APP_VERSION, get_version, validate_version


def test_get_version_returns_app_version():
    assert get_version() == APP_VERSION


def test_validate_version_accepts_current_version():
    assert validate_version(APP_VERSION) is True


def test_validate_version_rejects_invalid_format():
    with pytest.raises(ValueError):
        validate_version("v2.3")
