# Admin payout legacy execute closure — 2026-09-05

## Canonical production gate
- Loadify Market only: `LoadifyMarketLTD/loadifymarket.co.uk`.
- Server boundary merged in PR #761.
- Production main before closure: `13aebe6eadfc59389d9d490d0f3392c55f9c83e6`.
- Canonical Netlify Production deploy: `6a9c6b028583d700080be311`, READY.
- `admin-payout-action` is present in the Production function manifest.
- Safe GET probe reached the Production function and returned `Method not allowed`, proving the route is live without performing a payout mutation.
- Default-branch code search confirms `AdminPayouts.tsx` no longer calls `approve_payout`, `complete_payout` or `reject_payout` directly.

## Production migration applied
Supabase migration history records:
- `20260905193005_admin_payout_legacy_client_execute_closure`

The migration revokes `EXECUTE` from `authenticated` on the three legacy admin payout RPCs and asserts that `service_role` retains execute authority on `server_admin_payout_action_v1`.

## Safety
- No payout request was executed during validation.
- No Stripe mutation.
- No balance mutation.
- No UI redesign.
- No XDrive change.
- This branch reconciles repository migration history to the already-applied Production closure.
