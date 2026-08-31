# Loadify Market — Full E2E Release Gate Continuity Update

**Checkpoint update:** 2026-08-31 13:25 Europe/London  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Parent canonical checkpoint:** `docs/checkpoints/LOADIFY_FULL_E2E_RELEASE_GATE_CONTINUITY_CHECKPOINT_2026-08-31_1232.md`  
**Purpose:** additive authoritative update after current-main Auth reconciliation. Read the parent checkpoint first, then this file. Where P1-01 state differs, this update supersedes the older P1-01 status only. The overall release order remains unchanged.

---

## 1. NON-NEGOTIABLE RELEASE RULE — UNCHANGED

Loadify Market MUST NOT be declared finished, production-ready or release-complete until every mandatory P0/P1 release gate is CLOSED / PASS and the final evidence-backed verdict is:

> **🟢 VERY GOOD / PRODUCTION READY**

A successful build, merged Auth PR, successful Deploy Preview, isolated unit tests or implemented code does not by itself satisfy the final release gate.

---

## 2. CANONICAL EXECUTION ORDER — UNCHANGED

1. **P1-01 — Auth cutover**
2. **P1-02 — Credentialed E2E harness and role-isolation certification**
3. **P1-03 — Stripe TEST-mode full vertical transaction slice**
4. **P1-04 — Legacy financial/order reconciliation**
5. **P1-05 — Issue #656 fresh-db bootstrap / clean rebuild / restore proof**
6. **P1-06 — PR #619 Buyer profile convergence**
7. **P1-07 — Android certification / PR #618**
8. **P1-08 — Phase O Supplier Commerce external evidence / issue #672**
9. **FINAL RELEASE GATE — Full platform E2E, security, recovery and production smoke certification**

Any newly discovered P0 overrides this order immediately. Otherwise continue from the first incomplete gate.

---

# 3. P1-01 AUTH — CURRENT AUTHORITATIVE STATE

**State:** OPEN / IN PROGRESS.  
**Do not advance to P1-02 as the canonical active gate until P1-01 is CLOSED / PASS.**

## 3.1 Historical PR #599

PR #599 — `Repair role-first Auth signup and provider-bound Google registration`

- branch: `fix/auth-signup-autonomous-20260827`
- last head: `8fa346b0275ceca882d8e7271074070896f513bd`
- state now: **CLOSED / NOT MERGED / SUPERSEDED**
- reason: branch became heavily divergent from current `main` and retained four obsolete 25–26 Aug Auth migration identities that correspond to hosted-canonical 29 Aug migrations already reconciled into repository history.

Do not reopen or merge #599.

The obsolete migration identities that MUST NOT be reintroduced are:

- `20260825200500_signup_intent_auth_foundation.sql`
- `20260825201000_auth_signup_cutover_control.sql`
- `20260825201500_auth_signup_intent_consumption.sql`
- `20260826070000_auth_before_user_created_hook.sql`

Canonical hosted/repository Auth history instead includes:

- `20260829080642_auth_signup_intent_foundation_676.sql`
- `20260829080831_auth_signup_cutover_control_676a.sql`
- `20260829080844_enable_auth_signup_cutover_overlap.sql`
- `20260829080911_auth_signup_intent_consumption_677_cutover_safe.sql`
- `20260829080941_auth_before_user_created_hook_678_cutover_safe.sql`
- subsequent hosted validation/repair migrations already reconciled in `main`.

## 3.2 Current-main reconciliation PR #674

PR #674 — `Reconcile role-first Auth signup onto current main`

- branch: `fix/auth-signup-current-main-reconcile-20260831`
- head: `0ba96a1fff82bbc951cb9ae4576183efab2a4267`
- built directly from release-checkpoint `main` `bd0086baf6ecfaa3c83299ad6752cc9f7c11cd25`
- `behind_by=0` before merge preparation
- 20 intended Auth/runtime/UI/test files
- **zero migration files**
- Netlify Deploy Preview: SUCCESS on exact head
- state now: **CLOSED / NOT MERGED / SUPERSEDED BY #676**

#674 was not abandoned for a code problem. The GitHub connector's `mark ready` mutation failed because it requested the nonexistent GraphQL field `Repository.fullDatabaseId`. A replacement non-draft PR was therefore created from the exact same branch/head.

## 3.3 Diagnostic PR #675

PR #675 — `Diagnostic: current-main Auth gates for #674`

- diagnostic only
- created from exact #674 head
- added only temporary Netlify prebuild verification plus a diagnostic trigger
- final diagnostic head: `20f1e263a996095515d4caabd9f6a996075fc177`
- Netlify Deploy Preview: **SUCCESS**
- state: **CLOSED / NOT MERGED**

The diagnostic prebuild ran before the normal production build:

- `auth-signup-current-main-contract.test.ts`
- `buyer-onboarding-alignment.test.ts`
- `register-intent.test.ts`
- `register-social-intent-contract.test.ts`
- `register.test.ts`
- `signup-native-auth-contract.test.ts`
- `signup-newsletter-preference-contract.test.ts`
- `signup-role-first-google-web-contract.test.ts`
- `src/__tests__/netlify-modern-wrapper-guard.test.ts`
- targeted ESLint across the changed Auth runtime/UI/tests
- `npm run verify:migrations`
- normal Netlify `tsc -b && vite build`

Verdict:

**P1-01 current-main code / targeted contract / migration-health / production-build gate = PASS.**

Do not merge diagnostic #675.

## 3.4 Merge PR #676

PR #676 — `Merge current-main role-first Auth signup cutover runtime`

- exact code head inherited from #674: `0ba96a1fff82bbc951cb9ae4576183efab2a4267`
- state before merge: OPEN / non-draft / mergeable=true
- Netlify Deploy Preview on #676: **SUCCESS**
- merged successfully
- merge commit: **`d884b8ef30f8b9891306d8910a90d160345e7d19`**

Current authoritative `main` immediately after this merge:

**`d884b8ef30f8b9891306d8910a90d160345e7d19`**

This merge does NOT close P1-01.

---

# 4. AUTH RUNTIME NOW MERGED TO MAIN

The merged current-main Auth runtime includes:

- `/.netlify/functions/register-intent` as server-owned registration-intent boundary;
- `/.netlify/functions/register-social-intent` for provider-bound Google registration authorization;
- repository-standard `functions-modern` wrappers;
- legacy `/.netlify/functions/register` retired fail-closed with HTTP 410;
- public email signup uses `register-intent → supabase.auth.signUp`;
- password is handled by Supabase Auth and is not sent to the Loadify Netlify registration endpoint;
- only opaque `intent_id` plus non-authority user preferences such as newsletter enter Auth user metadata;
- web registration is role-first: Buyer or Marketplace Seller only;
- Admin is never a public signup option;
- Supplier Partner remains a separate commercial relationship, not a public user role;
- Google web registration verifies credential signature/server trust using official JWKS, RS256, issuer, audience, `azp`, expiry/token age, SHA-256 nonce binding, verified email and provider subject;
- Google web GIS remains outside Capacitor/native registration presentation;
- Trade Account uses canonical Buyer account types:
  - `individual`
  - `sole_trader`
  - `limited_company`
  - `partnership`
  - `charity`
  - `other`;
- fresh Facebook creation remains fail-closed pending a dedicated provider-bound registration implementation.

Do not reintroduce client-controlled role authority or the old password-receiving registration endpoint.

---

# 5. HOSTED AUTH HOOK — VERIFIED ACTIVE

The older checkpoint statement that hosted Before User Created binding was unproven is superseded.

Hosted project:

`fwdfpmfvgygvqciecesx`

Read-only verification confirms:

- `public.before_user_created_validate_signup_intent(jsonb)` exists;
- `supabase_auth_admin` has EXECUTE;
- `anon` does not;
- `authenticated` does not;
- `service_role` does not;
- private compatibility overlap is currently **ON**;
- Auth logs contain actual `run_hook` events for:
  `pg-functions://postgres/public/before_user_created_validate_signup_intent`
- those events report `success=true` / `Hook ran successfully`.

Therefore:

**Hosted Before User Created Auth Hook binding = VERIFIED ACTIVE.**

Do not run `supabase config push` merely to recreate an already-active hook binding.

---

# 6. REAL EMAIL AUTH-SERVICE EVIDENCE

Two hosted signup intents from the controlled runtime validation remain as consumed historical evidence:

1. Buyer email intent
   - created around `2026-08-30 15:01:31 UTC`
   - `requested_role=buyer`
   - `auth_provider=email`
   - consumed successfully
   - corresponding Auth log shows successful Before User Created hook dispatch.

2. Seller email intent
   - created around `2026-08-30 15:14:53 UTC`
   - `requested_role=seller`
   - `auth_provider=email`
   - consumed successfully
   - corresponding Auth log shows successful Before User Created hook dispatch
   - Seller remains fail-closed: `sellerStatus=draft`, `isApproved=false`, store inactive.

Historical #599 evidence also recorded that the Buyer runtime probe initially created Buyer capability without a Seller profile. Later current-state capability/profile data must not be used to rewrite that historical signup-time fact because accounts can legitimately gain Seller capability later.

Verdict:

**Buyer email Auth-service dispatch = PASS.**  
**Seller email Auth-service dispatch = PASS.**

---

# 7. GOOGLE / SOCIAL HOSTED EVIDENCE

Hosted canonical migrations include applied validation records for:

- `20260829113708_validate_auth_signup_social_fail_closed_20260829`
- `20260829113746_validate_auth_signup_strict_mode_20260829`
- `20260829130531_validate_google_provider_bound_success_20260829`

The Google positive provisioning validation proves:

- provider-bound Google Buyer intent projects Buyer role/capability and consumes the intent;
- provider-bound Google Seller intent projects Seller with Buyer + Seller capabilities;
- Google Seller remains draft/unapproved with inactive store;
- probe data is cleaned after validation.

The social negative validation proves:

- fresh Google identity without provider-bound authorization is rejected;
- fresh Facebook account creation is rejected.

The strict validation proves while overlap is temporarily OFF:

- email signup without intent is rejected;
- legacy app-metadata role registration is rejected;
- validation then restores overlap ON.

Important distinction:

These migrations prove the database/provisioning and fail-closed contracts. The current-main server code tests prove Google JWKS/issuer/audience/azp/nonce verification logic. A **real interactive Google credential through the public OAuth flow** must not be claimed merely from SQL provisioning or unit tests. Do not fabricate a Google credential.

---

# 8. CURRENT OVERLAP STATE — DO NOT CHANGE PREMATURELY

`private.auth_signup_cutover_control.allow_legacy_server_registration = true`

This remains intentionally ON until the merged Auth runtime is proven live in the production Netlify deployment.

STOP CONDITION:

**Do not turn overlap OFF unless the exact merged production deployment is verified live.**

The merge to `main` alone is not enough evidence that Netlify production has completed deployment.

---

# 9. STRICT CUTOVER BRANCH PREPARED

Prepared branch:

`fix/auth-strict-cutover-20260831`

Initial base at creation:

`d884b8ef30f8b9891306d8910a90d160345e7d19`

No cutover migration has been created or applied yet.

Migration governance remains mandatory:

- any new migration file MUST first be created by Supabase CLI:
  `supabase migration new <name>`
- do not manually invent a timestamp filename;
- do not use `migration repair` casually;
- do not perform an untracked production `UPDATE` merely for convenience;
- dry-run linked migration push before applying;
- exact migration count/content must be reviewed;
- no hosted destructive reset.

Expected migration purpose after production deploy evidence:

`auth_signup_disable_legacy_overlap`

It should make the intended final state persistent/auditable:

`allow_legacy_server_registration=false`

with assertions that the singleton exists and strict mode is active.

Do not create/apply this migration until production deploy truth is established.

---

# 10. P1-01 REMAINING GATES — EXACT ORDER

Continue from here. Do not restart Auth audit from zero.

1. Verify exact production Netlify deployment for merge commit:
   `d884b8ef30f8b9891306d8910a90d160345e7d19`.
2. Verify production registration surfaces/endpoints are the merged current-main implementation.
3. Keep overlap ON during that verification.
4. Where possible, perform final production-safe Buyer/Seller smoke without retaining synthetic residue.
5. Verify Google production configuration:
   - `VITE_GOOGLE_CLIENT_ID` available to web build;
   - server `GOOGLE_CLIENT_ID` / intended fallback available;
   - Supabase Google provider configuration consistent.
6. Perform real interactive provider-bound Google Buyer/Seller certification when an authorized credential/session is available. Do not invent a credential.
7. Create final overlap-disable migration using `supabase migration new auth_signup_disable_legacy_overlap` on `fix/auth-strict-cutover-20260831`.
8. Review SQL; assert singleton/control state; no unrelated DDL.
9. Run local/Netlify migration gates and linked dry-run.
10. Apply only the exact reviewed cutover migration to hosted project.
11. Verify overlap is OFF.
12. Re-run strict-mode fail-closed checks:
    - missing email intent rejected;
    - client-controlled role metadata rejected;
    - Admin/internal role cannot be publicly provisioned;
    - fresh unauthorized Google rejected;
    - fresh Facebook remains rejected;
    - valid Buyer/Seller intent flow remains functional.
13. Recheck hook ACLs and private-table access.
14. Confirm no unsafe synthetic users/intents remain.
15. Record final Auth evidence in repo.
16. Only then declare:

`P1-01 AUTH — CLOSED / PASS`

17. Then and only then make **P1-02 Credentialed E2E harness** the canonical active gate.

---

# 11. CURRENT P1-01 VERDICT

### Closed / PASS within P1-01

- stale #599 migration path eliminated;
- current-main Auth runtime reconciled;
- zero duplicate Auth migrations in runtime PR;
- exact-head targeted Auth contract suite PASS;
- targeted ESLint PASS;
- migration-health PASS;
- TypeScript/Vite production build PASS;
- Netlify Deploy Preview PASS;
- hosted canonical Auth migration ledger confirmed;
- Before User Created hook binding proven active;
- Buyer email real Auth-service hook dispatch PASS;
- Seller email real Auth-service hook dispatch PASS;
- Seller fail-closed initial state contract proven;
- Google provider-bound DB provisioning positive contract proven;
- unauthorized fresh Google fail-closed contract proven;
- fresh Facebook fail-closed contract proven;
- strict-mode missing-intent/legacy role-metadata validation previously proven;
- current-main Auth runtime merged through #676.

### Still OPEN

- exact production Netlify deployment of merge commit must be proven;
- final production configuration check for Google must be proven;
- real interactive Google credential E2E must not be claimed without actual evidence;
- persistent overlap OFF cutover not yet performed;
- strict post-cutover hosted verification not yet performed;
- final Auth cleanup/security certification not yet recorded.

Therefore current authoritative verdict remains:

> **P1-01 AUTH — OPEN / NOT YET CLOSED**

and the platform-wide verdict remains:

> **NOT YET 🟢 VERY GOOD / PRODUCTION READY**

---

# 12. FUTURE CHAT CONTINUATION COMMAND

A future chat should be told:

> CONTINUĂ LOADIFY MARKET FULL E2E EXACT DIN `docs/checkpoints/LOADIFY_FULL_E2E_RELEASE_GATE_CONTINUITY_CHECKPOINT_2026-08-31_1232.md` + `docs/checkpoints/LOADIFY_FULL_E2E_RELEASE_GATE_UPDATE_2026-08-31_1325.md`. Nu relua auditul de la zero. P1-01 Auth este gate-ul activ. #599/#674/#675 sunt CLOSED / NOT MERGED; #676 este merge-ul Auth current-main la `d884b8ef30f8b9891306d8910a90d160345e7d19`. Continuă cu production deploy truth → Google production evidence → CLI-generated strict overlap-off migration → strict hosted verification → P1-01 close → P1-02.

---

## Final guardrails

- no GitHub Actions dependency;
- no secrets in Git or chat;
- no RLS/security relaxation;
- no untracked hosted Auth mutation;
- no production Stripe money movement as a generic test;
- no Supplier Commerce commercial activation while working P1-01;
- no PR #359 visual import;
- no unnecessary Seller Workspace / Super Admin visual redesign;
- no declaration of final completion before every mandatory release gate reaches PASS.
