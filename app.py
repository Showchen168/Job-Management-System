import re

APP_VERSION = "v2.4.0"

TRAD_TO_SIMP = {
    "臺": "台",
    "灣": "湾",
    "測": "测",
    "試": "试",
    "體": "体",
    "後": "后",
    "處": "处",
    "項": "项",
    "轉": "转",
}
SIMP_TO_TRAD = {value: key for key, value in TRAD_TO_SIMP.items()}


def get_version():
    return APP_VERSION


def validate_version(version):
    if not re.fullmatch(r"v\d+\.\d+\.[0-9]", version):
        raise ValueError("版本格式不正確")
    return True


def convert_text(text, mode):
    if not isinstance(text, str):
        raise TypeError("文字必須是字串")
    if mode not in {"t2s", "s2t"}:
        raise ValueError("轉換模式不正確")
    mapping = TRAD_TO_SIMP if mode == "t2s" else SIMP_TO_TRAD
    return "".join(mapping.get(char, char) for char in text)

if __name__ == "__main__":
    validate_version(APP_VERSION)
    print(f"Version: {APP_VERSION}")
