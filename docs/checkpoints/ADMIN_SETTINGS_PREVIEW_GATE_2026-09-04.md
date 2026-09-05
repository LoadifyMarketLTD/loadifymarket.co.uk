# Admin Settings Preview Gate — 2026-09-04

- Base main at workstream start: `ed5b5474733507e9425c174ef077f9b341627c0f`
- PR: #745
- Branch: `fix/admin-settings-contract-20260904`
- Required gate: Netlify Deploy Preview must run `npm ci && npm run lint && npm test && npm run build` on the exact final HEAD and every command must exit 0.
- A READY deploy produced by temporary diagnostic instrumentation is not validation evidence.
- Temporary diagnostic instrumentation must be absent from the final diff.
- Production settings/payment state must not be mutated by this PR.
- Read-only hosted audit confirmed `platform_settings.platform_config.commissionRate = 7`; no hosted configuration change is required.
- The 0% commission promotion through 31 December 2026 remains unchanged; the canonical post-promo commission is 7%.
- `save-admin-settings` must retain live active-admin authorization and validate the full value contract for each canonical settings key before any write.
- No merge is permitted until the exact final PR HEAD has a green fail-closed Netlify Deploy Preview and the final diff has been re-audited against current `main`.
