# Trial 3.6.109.04 — Muyassar UI synchronization

- Ported the approved 14px screen typography, enlarged favorite star (38px in its existing square), uniform 44px controls, compound/opening layouts, and date presentation from the Android source.
- Preserved original input nodes, ISO date values, events and native picker. Kept browser OAuth, backup and biometric implementations; no Android-only service adapters were copied.
- Prevented repeated orientation-label DOM mutations and released the opening-dialog input lock through its original close handler.
- Updated release labels and service-worker cache. No main changes, accounting formulas, record migrations or production user data changes.

Validation:
- Passed date value/update/reset/relocation, compound mode transitions and 400 stable orientation refreshes.
- Passed accounting, voucher draft choices, print/PDF/share output, settings interaction, offline-cache and release consistency regressions.
- Browser: applied an actual local PWA update; verified visible 3.6.109.04, 14px text, 38px favorite icon, 44px date field and preserved ISO date value.
- Full legacy suite was also attempted. Three existing checks remain failing on BOTH the unmodified b07e331 baseline and this release: statement-3.6.60 and statement-3.6.79 expect Latin-formatted text under the host Arabic locale; background-resume-3.6.106.02 has an outdated source assertion. They are not reported as passing. One output-suite startup timeout passed when rerun independently.
- Automated headless browser launch was unavailable in this session; visual checks used the in-app browser. No real-phone web-browser test or real cloud restore was performed for this web release.
