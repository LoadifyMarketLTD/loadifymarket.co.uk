# Loadify Market — P1-01 Post-Cutover Evidence Update

Date: 2026-09-03
Repository baseline: `main@83a7adfcdf6f0c296f74e0ae2c3df2d5bf6fbf30`

This is an additive evidence update to the canonical Full E2E release-gate checkpoints. It does not supersede the release order and does not close P1-01 by itself.

The baseline advanced after the initial evidence draft by one unrelated migration commit, `Restore public product checkout-readiness helper access`; that change does not alter the Auth evidence or P1-01 verdict recorded here.

## Verified hosted state

Read-only hosted verification on Supabase project `fwdfpmfvgygvqciecesx` confirms:

- project status is healthy;
- strict cutover migration `20260831123232` is tracked;
- `private.auth_signup_cutover_control.allow_legacy_server_registration = false`;
- `public.before_user_created_validate_signup_intent(jsonb)` exists;
- hook EXECUTE privilege remains `supabase_auth_admin=true`, `anon=false`, `authenticated=false`, `service_role=false`;
- `public.create_social_signup_intent(...)` is executable by `service_role` and not by `anon` or `authenticated`;
- direct client SELECT access to `private.signup_intents` remains unavailable to `anon` and `authenticated`;
- current feature flags allow Buyer and Seller registration;
- live unconsumed signup intents = 0;
- live Google signup intents = 0;
- dedicated users marked `e2e_fixture=true` = 0.

## Google runtime / identity evidence

Repository runtime at the exact baseline confirms that `register-social-intent`:

- accepts Google only for this social-registration path;
- requires a Google credential, nonce and requested role;
- permits only requested roles `buyer` and `seller`;
- verifies RS256 signature against Google JWKS;
- verifies issuer, audience, authorized party where applicable, expiry/token age, SHA-256 nonce binding, verified email and provider subject;
- creates a server-governed `create_social_signup_intent` row only after credential verification;
- requires valid Seller legal type for Seller registration;
- rejects Buyer requests carrying Seller identity.

Hosted identity inspection confirms that real Google identities exist and include Buyer and Seller-capable accounts. A real Buyer account exists with Google as its primary provider. Existing Seller Google identity evidence predates the final strict role-first cutover, so it must not be misrepresented as a new post-cutover Seller registration certification.

User-supplied operational evidence on 2026-09-03 states that Google login / sign-up on the public site is currently functioning. This is treated as real-user functional evidence, but it is not sufficient by itself to prove a fresh post-cutover role-bound Seller creation.

## Post-cutover security truth

The deployed hook definition was read back from hosted Postgres and confirms fail-closed logic:

- client `role` metadata is rejected;
- Google registration requires a matching, live, unconsumed Google signup authorization bound to provider subject and email;
- Facebook fresh signup is rejected pending explicit registration authorization;
- email signup without a valid intent is rejected while strict overlap is OFF;
- accepted signup intent roles are limited to `buyer` and `seller`;
- Buyer/Seller feature flags are checked server-side;
- Seller intent requires one of the permitted Seller legal types.

An attempt to invoke the auth hook directly through the normal SQL connector role was rejected with `permission denied`, which is consistent with the intended auth-admin-only EXECUTE boundary. The connector cannot `SET ROLE supabase_auth_admin`, so a direct hosted hook invocation cannot be used from this execution environment as the final runtime probe.

## Google intent persistence finding

Current `private.signup_intents` contains no Google rows. The repository implementation does not delete historical rows as part of `create_social_signup_intent`; therefore there is no retained hosted row that can retrospectively prove a fresh post-cutover Google Buyer/Seller registration event at this checkpoint.

This means existing Google identity presence and the user's confirmed functioning Google experience must not be upgraded into a claim that both fresh post-cutover Buyer and Seller role-first registrations have been independently certified.

## Current P1-01 verdict

Confirmed / PASS evidence now includes:

- strict overlap OFF;
- strict cutover migration tracked;
- auth hook ACL still restricted correctly;
- private signup-intent table remains client-inaccessible;
- social-intent RPC remains service-role-only;
- Buyer/Seller registration flags enabled;
- no live unconsumed signup intents;
- no dedicated E2E fixture users;
- Google integration is operational in real use;
- real Google identities exist, including a Google-primary Buyer;
- deployed source and hosted hook definition preserve the intended fail-closed role/provider contracts.

Still not independently proven:

1. fresh post-cutover provider-bound Google Buyer registration with retained/correlated evidence;
2. fresh post-cutover provider-bound Google Seller registration with retained/correlated evidence;
3. final credentialed runtime certification of those two role-first flows through the public production surface.

Therefore:

> **P1-01 AUTH — OPEN / STRICT CUTOVER VERIFIED / GOOGLE OPERATIONAL / FRESH ROLE-BOUND BUYER+SELLER CERTIFICATION STILL UNPROVEN**

Do not activate P1-02 canonically until the remaining P1-01 certification evidence is genuinely produced. Do not fabricate credentials, synthetic success evidence or retained production users merely to satisfy the gate.
