# Trial 3.6.109.03 — settings stability

Based on trial 8f187bb (3.6.109.01); no merge of the superseded 3.6.109.20 branch.

- Preserve currency input DOM and unsaved edits when another currency saves or refreshes, including edits during asynchronous storage.
- Exclude searchable account controls from monetary input filtering and settings fields from forced text selection.
- Keep optional settings finder outside reordered card slots to prevent observer feedback loops. No finder UI was reintroduced.
- Check PWA updates on return, recover from activation timeout, require explicit reload after another tab activates an update, and protect unsaved currency settings.
- Bump visible version, module URLs and service-worker cache to 3.6.109.03.

Validation: seven of nine test programs passed: release identity, accounting, account autocomplete (8 cases), report output (16 cases), offline shell, stable currency/update lifecycle, and real sidebar observer. The two statement suites fail on their pre-existing Latin-digit expectation (`3,200` versus `٣٬٢٠٠`); both failures reproduced on unchanged baseline 8f187bb. They were not hidden or removed.

No accounting formula, historical exchange rate, local user data, cloud configuration, main branch or APK was changed. This publication was tested programmatically; no new physical-phone acceptance test is claimed. Deployment verification is performed separately after push.
