# Loadify Market — Auth / Onboarding Chain Evidence

Date: 2026-09-02
Branch: `audit/full-platform-e2e-20260902`
Baseline main: `1f512abaf2425dc22a5cb24017fadf03a5b59188`
Status: SOURCE CHAIN CONFIRMED / RUNTIME E2E NOT YET DECLARED PASS

## Email registration chain

1. Public Buyer/Seller registration and Trade Account use `POST /.netlify/functions/register-intent` before calling `supabase.auth.signUp(...)`.
2. `register-intent.ts` is POST-only and fails with 503 when Supabase server configuration is missing.
3. It validates required identity fields, role (`buyer|seller`), Seller legal type, and Buyer account type.
4. It applies IP-based registration rate limiting and checks authoritative platform feature flags before intent creation.
5. It creates a 15-minute signup authorization through the service-role-only RPC `public.create_signup_intent`.
6. The SQL RPC persists the authorization in `private.signup_intents`, normalizes email, validates role/type constraints, and is revoked from PUBLIC/anon/authenticated; EXECUTE is granted to service_role only.
7. Client password does not pass through `register-intent`; password handling stays with Supabase Auth.
8. `public.handle_new_auth_user()` is the Auth INSERT trigger boundary. It rejects client-supplied role metadata, requires a valid signup intent for email registration, verifies provider/email/expiry/replay, derives the effective role server-side, rechecks registration feature flags, inserts `public.users`, and consumes the intent.
9. `public.handle_new_user_profile()` provisions the ordinary relationship rows after `public.users` creation: Buyer -> `buyer_profiles`; Seller -> `seller_profiles` with `sellerStatus='draft'`, `isApproved=false`, and `seller_stores.isActive=false`.
10. The later Buyer schema repair updates the Buyer profile with `accountType`, `companyName`, `vatNumber`, and `businessAddress` from the consumed intent.
11. Seller registration remains fail-closed at creation: new Seller profile is draft and store inactive; it is not automatically commercially active.
12. Admin is not a public selectable registration relationship in this chain.

## Confirmed security properties from source

- Public caller cannot choose `admin` via the signup intent role contract.
- Client `raw_user_meta_data.role` is explicitly rejected by the Auth trigger.
- Signup intent replay and expired intent are rejected.
- Email mismatch is rejected.
- Buyer intent cannot carry Seller legal identity; Seller intent cannot carry Buyer account type.
- Registration availability is checked both at Netlify Function level and again at DB Auth-trigger level.
- `create_signup_intent` is service-role-only.
- New Seller store starts inactive and Seller status starts draft.

## Not yet runtime-proven in this audit

The source chain above is not an E2E PASS. Still required:
- exact deployed Netlify runtime for `register-intent` on the current production/main deployment;
- hosted database confirmation that the current canonical functions/triggers and migration versions are actually present;
- a controlled Buyer signup execution through email confirmation and subsequent Buyer Space login;
- a controlled Seller signup execution through confirmation and onboarding entry, without auto-activation;
- Trade Account execution verifying persisted account/business fields;
- Google registration authorization runtime execution;
- password reset and inactive-account paths;
- exact PASS/FAIL/SKIP evidence from automated tests.

## Audit note

Historical onboarding documents in the repository may describe older flows. They are not authoritative for current runtime behavior unless they match current source and hosted state. Current conclusions above are derived from the active `register-intent` function and the latest signup-intent migration chain inspected in this audit.
