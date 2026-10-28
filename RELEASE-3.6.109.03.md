# Trial 3.6.109.03 — Ratib Muyassar source alignment

User approved replacing the reset trial baseline with the delivered Ratib Muyassar M 1.0.2 web source. Source: trial 3.6.109.20 plus the local settings fixes recorded as 3.6.109.21. Public version remains 3.6.109.03 as requested, with a new v254 cache identity.

Verified exact text matches against the delivered M1.0.2 source, allowing only the requested version substitution: index.html, sidebar, gold style, theme JS/CSS, Cash Pulse, home layout, payment layout, feedback settings, button/font settings, and manifest. Browser voice implementation remains the original web path; native Android speech integration requires the APK bridge and is not injected into the website.

19 targeted test programs passed: release consistency; currency/update stability; observer stability; settings interactions; settings functional audit; settings input guard; direct vouchers; payment layout; retired commerce; accounting; offline shell; Cash Pulse selection; edit return; palettes; payment ordering; cloud auth/upload mocks; Android-touch simulation; account autocomplete (8 scenarios); report output (16 scenarios).

Two test expectations were corrected: normalize Windows line endings in the edit-return test, and allow appended release notes without hardcoding the old note count. No accounting implementation was altered for these tests.

No new real-phone test, real cloud upload, or user-data restoration was performed in this publication. The wider historical statement-format test failures reported previously are outside this targeted run. Main, signing material and APK builds were not changed. No user storage migration or deletion was introduced. Web deployment verification follows push.
