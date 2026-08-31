# LOADIFY MARKET FULL E2E RELEASE GATE — P1-01 CLOSED UPDATE

Date: 2026-08-31

This file is an additive authoritative update to:

- `docs/checkpoints/LOADIFY_FULL_E2E_RELEASE_GATE_CONTINUITY_CHECKPOINT_2026-08-31_1232.md`
- `docs/checkpoints/LOADIFY_FULL_E2E_RELEASE_GATE_UPDATE_2026-08-31_1325.md`

## Canonical continuation rule

Do not restart the platform audit from zero.

The release-gate sequence remains:

1. P1-01 Auth
2. P1-02 Credentialed E2E harness
3. P1-03 Stripe TEST-mode vertical slice
4. P1-04 Legacy financial reconciliation
5. P1-05 #656 clean rebuild / restore
6. P1-06 #619 Buyer
7. P1-07 Android certification
8. P1-08 Phase O Supplier evidence
9. Final Release Gate

Loadify Market must not be declared complete until the final verdict is **🟢 VERY GOOD / PRODUCTION READY**, with zero open P0/P1 release blockers.

---

# P1-01 AUTH — CLOSED / PASS

## Code convergence

Historical PR #599 was not merged because it had diverged heavily from current `main` and contained obsolete/duplicated migration history.

Current-main Auth runtime was reconciled and merged through replacement PR #676.

The legacy server registration endpoint is retired fail-closed with HTTP 410. Current registration uses intent-first flow and direct Supabase Auth signup rather than sending passwords through the legacy Netlify registration endpoint.

## Hosted Auth Hook evidence

Hosted Supabase Before User Created hook binding is confirmed active for:

`public.before_user_created_validate_signup_intent(jsonb)`

Runtime logs showed successful hook dispatches for real Buyer and Seller email signup tests.

Hook EXECUTE privilege remains:

- `supabase_auth_admin = true`
- `anon = false`
- `authenticated = false`
- `service_role = false`

## Production runtime evidence

Production `https://loadifymarket.co.uk` was probed after the current-main Auth runtime deployment:

- `POST /.netlify/functions/register` → **410 Gone**
- `GET /.netlify/functions/register-intent` → **405 Method Not Allowed**
- `GET /.netlify/functions/register-social-intent` → **405 Method Not Allowed**

This proves the current Auth surface is live in production.

## Strict cutover

CLI-generated migration:

`supabase/migrations/20260831123232_auth_signup_disable_legacy_overlap.sql`

was validated in disposable Postgres and through a single-migration hosted dry-run, merged in PR #678, and applied to hosted Supabase through the canonical CLI migration path.

Hosted post-cutover truth:

- migration `20260831123232` tracked = true
- `private.auth_signup_cutover_control.allow_legacy_server_registration = false`
- live, unconsumed signup intents = 0
- hook ACL unchanged and auth-admin-only

Therefore legacy server registration overlap is OFF and the platform is in strict intent-bound Auth mode.

## P1-01 verdict

**P1-01 AUTH — CLOSED / PASS**

Do not reopen P1-01 unless a new regression is demonstrated.

---

# ACTIVE GATE NOW: P1-02 CREDENTIALED E2E

## Existing harness truth

The repo already contains Playwright role-isolation coverage:

- guest cannot enter Buyer/Seller/Admin workspaces
- unauthenticated admin API = 401
- unauthenticated seller-order mutation = 401
- Buyer workspace + Buyer→Admin API isolation
- Seller orders/shipments workspace
- optional seller foreign-order mutation = 403
- Admin orders/payouts workspace

However current credentialed tests intentionally `skip` when credentials are missing. A release certification must not treat skipped credentialed tests as PASS.

## P1-02 objective

Create and execute a fail-closed release E2E gate that requires dedicated credentials for:

- Buyer
- Seller
- Admin

and a valid foreign-order fixture for Seller BOLA coverage.

Missing credential/fixture inputs must fail the release gate before Playwright execution rather than silently skipping credentialed tests.

## Fixture safety

Historical branch `test/e2e-role-fixtures-20260830` contains a useful dedicated-test-account provisioner, but it is not canonical yet.

It must not be ported unchanged because it guards the web `E2E_BASE_URL` against production but does not independently prevent the supplied `SUPABASE_URL` from pointing at the hosted production project.

Current hosted truth at this checkpoint:

- dedicated Auth users marked `e2e_fixture=true` = 0

Do not create, reuse, or mutate production fixture identities until the provisioning safety contract is explicit and reversible.

## P1-02 acceptance criteria

P1-02 may close only when all of the following are true on the exact release target:

1. Buyer credentialed login PASS.
2. Buyer Orders PASS.
3. Buyer Checkout route PASS.
4. Buyer→Admin API isolation = 403.
5. Seller credentialed login PASS.
6. Seller Orders PASS.
7. Seller Shipments PASS.
8. Seller foreign-order mutation = 403 using a controlled valid foreign fixture.
9. Admin credentialed login PASS.
10. Admin Orders PASS.
11. Admin Payouts PASS.
12. Guest workspace isolation PASS.
13. Unauthenticated privileged API checks PASS.
14. No credentialed test was skipped.
15. Exact target SHA/base URL recorded.
16. No purchase, refund, payout, Stripe transfer, escrow release, or fulfillment mutation is performed by P1-02.

Financial mutation belongs only to P1-03 Stripe TEST-mode vertical slice.

## Next action

Continue only with **P1-02 Credentialed E2E**.

Do not skip forward to Stripe vertical-slice certification until P1-02 is CLOSED / PASS.
