import re

APP_VERSION = "v2.3.8"


def get_version():
    return APP_VERSION


def validate_version(version):
    if not re.fullmatch(r"v\d+\.\d+\.[0-9]", version):
        raise ValueError("版本格式不正確")
    return True

if __name__ == "__main__":
    validate_version(APP_VERSION)
    print(f"Version: {APP_VERSION}")
