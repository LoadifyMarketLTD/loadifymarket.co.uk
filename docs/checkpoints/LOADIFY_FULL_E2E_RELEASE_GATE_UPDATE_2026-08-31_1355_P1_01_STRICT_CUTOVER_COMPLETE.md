# LOADIFY MARKET FULL E2E RELEASE GATE — P1-01 STRICT CUTOVER COMPLETE

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

# P1-01 AUTH — STRICT CUTOVER COMPLETE, GATE STILL OPEN

## Completed / PASS

### Code convergence

Historical PR #599 was not merged because it had diverged heavily from current `main` and contained obsolete/duplicated migration history.

Current-main Auth runtime was reconciled and merged through replacement PR #676.

The legacy server registration endpoint is retired fail-closed with HTTP 410. Current registration uses intent-first flow and direct Supabase Auth signup rather than sending passwords through the legacy Netlify registration endpoint.

### Hosted Auth Hook evidence

Hosted Supabase Before User Created hook binding is confirmed active for:

`public.before_user_created_validate_signup_intent(jsonb)`

Runtime logs showed successful hook dispatches for real Buyer and Seller email signup tests.

Hook EXECUTE privilege remains:

- `supabase_auth_admin = true`
- `anon = false`
- `authenticated = false`
- `service_role = false`

### Production runtime evidence

Production `https://loadifymarket.co.uk` was probed after the current-main Auth runtime deployment:

- `POST /.netlify/functions/register` → **410 Gone**
- `GET /.netlify/functions/register-intent` → **405 Method Not Allowed**
- `GET /.netlify/functions/register-social-intent` → **405 Method Not Allowed**

This proves the current Auth surface is live in production.

### Strict overlap-off cutover

CLI-generated migration:

`supabase/migrations/20260831123232_auth_signup_disable_legacy_overlap.sql`

was validated in disposable Postgres and through a single-migration hosted dry-run, merged in PR #678, and applied to hosted Supabase through the canonical CLI migration path.

Hosted post-cutover truth:

- migration `20260831123232` tracked = true
- `private.auth_signup_cutover_control.allow_legacy_server_registration = false`
- live, unconsumed signup intents = 0
- hook ACL unchanged and auth-admin-only

Therefore legacy server registration overlap is OFF and the platform is in strict intent-bound Auth mode.

---

# P1-01 STILL OPEN — REQUIRED EVIDENCE BEFORE CLOSE

The previous authoritative checkpoint remains controlling. P1-01 must NOT be declared CLOSED until all of the following are executed and recorded:

1. Verify Google production configuration:
   - `VITE_GOOGLE_CLIENT_ID` is available to the production web build;
   - server `GOOGLE_CLIENT_ID` / intended fallback is available;
   - Supabase Google provider configuration is consistent.
2. Perform a **real interactive provider-bound Google Buyer certification** with an authorized Google credential/session.
3. Perform a **real interactive provider-bound Google Seller certification** with an authorized Google credential/session.
4. Re-run strict post-cutover fail-closed probes:
   - missing email intent rejected;
   - client-controlled role metadata rejected;
   - public Admin/internal role provisioning rejected;
   - fresh unauthorized Google rejected;
   - fresh Facebook rejected;
   - valid Buyer intent flow remains functional;
   - valid Seller intent flow remains functional.
5. Recheck hook ACLs and private-table access after those probes.
6. Confirm no unsafe synthetic users/intents remain.
7. Record the final Auth evidence in repo.
8. Only then declare `P1-01 AUTH — CLOSED / PASS` and activate P1-02 canonically.

## Current P1-01 verdict

> **P1-01 AUTH — OPEN / STRICT CUTOVER COMPLETE / FINAL GOOGLE + POST-CUTOVER CERTIFICATION PENDING**

Do not advance the canonical release gate to P1-02 yet.

---

# P1-02 PREPARATION STATUS — NOT ACTIVE YET

A branch/PR may prepare fail-closed credentialed E2E infrastructure, but it must not be merged or treated as the active release gate until P1-01 closes under the criteria above.

Historical branch `test/e2e-role-fixtures-20260830` is not canonical and must not be ported unchanged because it does not independently guard the supplied Supabase project from pointing at production.

Current hosted truth at this checkpoint:

- dedicated Auth users marked `e2e_fixture=true` = 0

No production fixture identities should be created as part of P1-01.

---

## Next action

Continue only with **P1-01 final Google + post-cutover Auth certification**.

Do not skip forward to P1-02, Stripe, financial reconciliation, restore, Buyer, Android, Supplier Phase O, or Final Release Gate until P1-01 is CLOSED / PASS.
