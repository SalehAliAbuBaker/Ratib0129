# Ratib — isolated Cloudflare D1 outage test (2026-11-05)

This folder is a **test fixture only**. It is not the production Ratib license service,
does not use real licenses, and has no access to the production D1 database.

## Completed
- Isolated worker implementation accepting **only** \`LIC-test-only-20261105-ratib\`.
- Its own D1 table (\`sandbox_activations\`) and synthetic device IDs.
- Controlled verification errors 429/500/503 while internet remains on.
- Recovery verification with the same previously activated synthetic device.
- No modifications to \`main\`, the real Worker, user records, or issued licenses.

## Preflight on a developer computer
Run \`node tools/license-outage-sandbox/test-worker.mjs\` (Node 20+).
This test uses a mock D1 binding; it does **not** create a Cloudflare resource.

## Optional actual isolated Cloudflare deployment
Only proceed when logged in to the intended **test** Cloudflare account:
1. \`npx wrangler d1 create ratib-license-outage-sandbox-20261105\`.
2. Copy \`wrangler.example.toml\` to \`wrangler.toml\` **in this folder**.
3. Replace \`REPLACE_WITH_NEW_SANDBOX_D1_UUID\` with the UUID returned in step 1.
   **Never use a production database UUID or copy live license records.**
4. From the repository root:
   \`npx wrangler d1 execute ratib-license-outage-sandbox-20261105 --remote --config tools/license-outage-sandbox/wrangler.toml --file=tools/license-outage-sandbox/schema.sql\`
5. \`npx wrangler deploy --config tools/license-outage-sandbox/wrangler.toml\`
6. Test ONLY the newly printed test Worker URL (never \`ratib.saleh0129.workers.dev\`).
   Activate the synthetic key \`LIC-test-only-20261105-ratib\` with a synthetic
   \`device_id\` (e.g. \`sandboxdevice001\`); then verify it.
7. For the outage scenario, change **only the sandbox** \`OUTAGE_MODE\` from
   \`none\` to \`503\` (or \`429\`) in its \`wrangler.toml\`, and deploy that worker again.
   \`/api/license/verify\` now returns an error while the internet remains connected.
8. Restore \`OUTAGE_MODE="none"\` and deploy again; verify the same synthetic device.

## Important limit
The above is an isolated Worker/D1 API test. A **separate test build of the Ratib app**
must point its license API at this sandbox URL, use a synthetic activation, and run on
a disposable test profile/device to prove that the real voucher-save screen remains usable.
Do not point the installed production app at this worker or clear its local storage.
The 26 existing client tests validate \`licensed()\`; a full phone save scenario is still pending.
