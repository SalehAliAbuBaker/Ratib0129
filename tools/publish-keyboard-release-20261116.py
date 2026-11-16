#!/usr/bin/env python3
"""Publish the Android keyboard fix as Ratib 3.6.209 (no financial data writes)."""
from pathlib import Path
import json
import re

OLD = "3.6.208"
NEW = "3.6.209"
OLD_BUILD = "p20800"
NEW_BUILD = "p20900"
HIGHLIGHT = "إظهار حقل الكتابة أعلى لوحة المفاتيح تلقائيًا أثناء الإدخال"
DETAIL = "إبقاء حقول السندات والبحث والكشوف مرئية فوق لوحة مفاتيح الهاتف، مع استعادة موضع الصفحة بعد إغلاقها"

root = Path(__file__).resolve().parents[1]

index_path = root / "index.html"
index = index_path.read_text(encoding="utf-8")
assert f'"version":"{OLD}"' in index
assert f"?v={OLD}" in index
index = index.replace(OLD, NEW).replace(OLD_BUILD, NEW_BUILD)

def patch_release(source: str, variable: str) -> str:
    pattern = r"(\bconst\s+" + re.escape(variable) + r"\s*=\s*)(\{[^\n;]*\})(\s*;)"
    match = re.search(pattern, source)
    assert match, f"{variable} release definition is missing"
    data = json.loads(match.group(2))
    assert data["version"] == NEW, (variable, data["version"])
    assert data["build"] == NEW_BUILD
    data["highlights"] = [HIGHLIGHT] + [item for item in data.get("highlights", []) if item != HIGHLIGHT][:2]
    data["changes"] = [DETAIL] + [item for item in data.get("changes", []) if item != DETAIL][:5]
    replacement = match.group(1) + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + match.group(3)
    return source[:match.start()] + replacement + source[match.end():]

index = patch_release(index, "RATIB_RELEASE")
index_path.write_text(index, encoding="utf-8")

sw_path = root / "sw.js"
sw = sw_path.read_text(encoding="utf-8")
assert f'"version":"{OLD}"' in sw
sw = sw.replace(OLD, NEW).replace(OLD_BUILD, NEW_BUILD)
sw = patch_release(sw, "APP_RELEASE")
assert "keyboard-focus" not in sw
sw = sw.replace(f"-{NEW}';", f"-{NEW}-keyboard-focus';", 1)
assert "keyboard-focus" in sw
sw_path.write_text(sw, encoding="utf-8")

pkg_path = root / "package.json"
pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
assert pkg["version"] == OLD
pkg["version"] = NEW
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# The tests verify a consistent advertised version and preserve all existing
# test filenames, historic feature paths and their independent assertions.
test_updates = 0
for path in root.glob("test-*.cjs"):
    original = path.read_text(encoding="utf-8")
    updated = original.replace(OLD, NEW).replace(OLD_BUILD, NEW_BUILD)
    # Preserve JavaScript regex escapes while updating the asserted release.
    updated = updated.replace(r"3\.6\.208", r"3\.6\.209")
    updated = updated.replace("test-voice-first-3.6.209.cjs", "test-voice-first-3.6.208.cjs")
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        test_updates += 1

assert f'"version":"{NEW}"' in index
assert f'"version":"{NEW}"' in sw
assert f"?v={NEW}" in index
assert f"-{NEW}-keyboard-focus" in sw
assert (root / "ratib-voice-dictation-3.6.117.js").read_text(encoding="utf-8").count("ratib-keyboard-open") >= 2
print(f"Release {NEW} prepared. Test expectations updated in {test_updates} files.")
