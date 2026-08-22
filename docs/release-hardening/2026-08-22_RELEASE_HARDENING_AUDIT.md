# Loadify Market — Release Hardening Audit

**Date:** 22 August 2026  
**Base:** `main@aca0d19c1cad7fe047ca1e591df790cf2280b840`  
**Branch:** `release-hardening/audit-20260822`  
**Mode:** repository implementation + production read-only audit. No production DDL/config mutation. Local validation only; no GitHub Actions/Netlify for this lane.

## 1. Why this lane exists

Identity / Onboarding / Workspaces Stages 0–8 are closed. Real Supplier Commerce Phase O cannot start because production still has no real supplier/provider evidence and all Supplier Commerce controls remain fail-closed.

The next safe release-oriented work is therefore historical migration replay closure plus evidence-driven project security hardening. This lane is separate from deferred PR #575 and contains no Workspace/Admin/Super Admin visual redesign.

## 2. Production state re-verified before mutation

Supabase project: `fwdfpmfvgygvqciecesx`.

Read-only verification at branch start:

- Supplier Commerce controls enabled: `0/11`;
- global `pilot=false`;
- suppliers: `0`;
- adapter registrations: `0`;
- provider capabilities: `0`;
- pilot programmes: `0`;
- pilot offers: `0`;
- pilot cohort members: `0`;
- pilot evidence: `0`;
- latest production migration at branch start: `20260822185156 / seller_onboarding_v2_truth`.

Conclusion: real Phase O Controlled Pilot has not started. No Supplier Commerce control was changed by this audit.

## 3. Historical fresh-rebuild debt — confirmed

### Finding

The legacy numeric bootstrap chain references `delivery_requests` and `transport_quotes` after those relations stopped being part of the canonical base schema.

Verified historical references:

- `10_rls_policies.sql` enables RLS and creates policies on both relations;
- `20_fix_users_table.sql` grants legacy delivery-request access;
- `100_fix_users_permissions.sql` repeats a legacy delivery-request grant;
- `455_fix_missing_triggers_functions.sql` creates updated-at triggers on both relations.

The canonical timestamped removal later explicitly drops both obsolete relations:

`supabase/migrations/20260818102000_remove_unused_transport_surfaces_20260818.sql`

Therefore the correct product architecture is **not** to restore the old delivery-request/transport-quote subsystem.

### Repository fix

Added a narrow replay-only compatibility envelope:

- `09_zz_legacy_transport_replay_compat.sql`
  - creates only the minimal columns needed by historical RLS/grant/trigger statements;
  - explicitly marks both relations as legacy replay compatibility only.
- `456_00_remove_legacy_transport_replay_compat.sql`
  - drops both relations immediately after migration 455, the final numeric bootstrap file with legacy references;
  - verifies both are absent after cleanup.

This preserves the historical statements without leaving obsolete product surfaces in the final replay state.

### Regression guard

Added `netlify/functions/__tests__/legacy-transport-replay-envelope.test.ts`.

It locks:

- compatibility opens before migration 10;
- compatibility closes after migration 455;
- canonical timestamped removal remains aligned;
- no numeric migration after 456 may reintroduce either retired relation.

Status: **IMPLEMENTED IN BRANCH / VALIDATION PENDING**.

## 4. Security hardening — current factual findings

### 4.1 Public seller profile view — real Security Advisor finding

Security Advisor reports:

`security_definer_view / public.seller_profiles_public`

The current relation is an owner-rights view over `private.seller_profiles_public_data`. This was intentional in migrations 598/602 to keep the backing cache outside the exposed schema, but it still triggers a valid Security Advisor error because queries run with creator privileges.

Important boundary verified before redesign:

- anon/authenticated have no direct grants on `private.seller_profiles_public_data`;
- anon/authenticated have no USAGE on schema `private`;
- raw `public.seller_profiles` remains owner/admin scoped by current RLS.

Simply setting `security_invoker=true` on the existing private-backed view would require weakening the private-schema boundary and was rejected.

### Repository fix: migration 673

Added `673_public_seller_projection_security_closure.sql`.

The migration:

1. fails closed unless the expected legacy view/private cache are present;
2. replaces the owner-rights view with a real `public.seller_profiles_public` projection table;
3. preserves the same API relation name used by existing frontend consumers;
4. exposes only the already-approved public fields;
5. keeps business address limited to city/country;
6. constrains `contactPhone` permanently to `NULL`;
7. enables RLS;
8. grants only SELECT to anon/authenticated/service_role;
9. keeps INSERT/UPDATE/DELETE closed to ordinary API roles;
10. repoints the existing private trigger function to synchronize the read-only projection;
11. removes the obsolete private cache;
12. verifies the postconditions before commit.

No frontend route or visual change is required.

Status: **IMPLEMENTED IN BRANCH / PRODUCTION UNCHANGED / VALIDATION PENDING**.

### 4.2 Trigger-only SECURITY DEFINER helper exposed as RPC

Security Advisor reports direct API execution for `public.sync_seller_suspension_from_user_activity()`.

This function is a trigger helper and has no legitimate public RPC contract. Migration 673 revokes direct EXECUTE from PUBLIC, anon, authenticated and service_role. The database trigger continues to own the lifecycle behavior.

Status: **IMPLEMENTED IN BRANCH / VALIDATION PENDING**.

### 4.3 SECURITY DEFINER helpers intentionally used by RLS/runtime

Not every advisor warning is automatically a vulnerability.

Live RLS inspection confirms public/authenticated policies currently depend on helpers including:

- `is_admin()`;
- `is_active_user()`;
- `is_seller()`;
- `is_seller_checkout_ready(uuid)`;
- `owns_product(uuid)`.

Examples:

- public product visibility calls `is_seller_checkout_ready("sellerId")`;
- public review visibility calls `owns_product("productId")`;
- multiple public/admin policies call `is_admin()`;
- active-account policies call `is_active_user()`.

Blindly revoking EXECUTE would risk breaking RLS evaluation. These warnings remain **REVIEWED / INTENTIONAL OR REQUIRING POLICY REDESIGN**, not mechanically patched in this slice.

Admin payout RPCs (`approve_payout`, `complete_payout`, `reject_payout`, `log_admin_action`) also self-check `is_admin()` and use an empty `search_path`. Seller `request_payout` authenticates the caller and validates Seller/balance/Stripe state. Their advisor warnings require contract review, not automatic removal.

### 4.4 Service-role checkout stale-account boundary — real P1 found during fixture audit

While reconciling the previously failing checkout tests, a runtime defect was demonstrated rather than assumed to be stale test harness:

- `payment_sessions` has restrictive active-account RLS;
- web/mobile checkout use a service-role Supabase client, so browser RLS is not the authority at that server boundary;
- the handlers authenticated the JWT but did not re-read `public.users.isActive` for the buyer before reservation/payment side effects;
- seller readiness relied on denormalized `seller_profiles` even though the canonical database contract independently treats `public.users.isActive` as the suspension authority.

A stale JWT for an inactive buyer therefore required an explicit trusted-server guard before product reservation / Stripe creation. Existing seller regression tests also showed the intended live seller-account invariant.

Repository repair:

- `create-checkout.ts` now calls `authenticateActiveAccount(event, supabase)` before any reservation/payment side effect;
- `create-payment-intent.ts` applies the same boundary;
- both handlers re-read the listing seller from `public.users` and require `role='seller' AND isActive=true` before using seller profile readiness;
- payment amounts, tax resolver, order lifecycle and Stripe transfer semantics are unchanged;
- inactive buyer/seller regression coverage is locked in tests and in `release-hardening-security-contract.test.ts`.

Status: **P1 REPAIRED IN BRANCH / PRODUCTION UNCHANGED / LOCAL VALIDATION PENDING**.

## 5. Server-only table privilege debt

Security Advisor reports many `RLS enabled, no policy` INFO findings.

Direct grant audit found two groups.

### Already server-only

Most newer `*_rate_limits` tables expose no CRUD privilege to anon/authenticated. With RLS enabled and no policies they are fail-closed as intended.

### Historical grant debt

Several older rate-limit tables still inherited CRUD grants for anon/authenticated. RLS currently blocks those operations because no client policies exist, so this is not evidence of an active data breach, but the grants are unnecessary and increase future risk.

`category_filter_definitions` also retained broad client CRUD grants while having no client RLS policy and no current frontend consumer.

### Repository fix: migration 674

Added `674_server_only_privilege_closure.sql`.

It:

- revokes all ordinary-client privileges from every public `*_rate_limits` table;
- restores explicit server/service-role CRUD;
- revokes ordinary-client privileges from `category_filter_definitions`;
- keeps it service-role managed until a future explicit public contract exists;
- fails closed if any ordinary client CRUD privilege remains.

No policies are added merely to silence INFO notices.

Status: **IMPLEMENTED IN BRANCH / VALIDATION PENDING**.

## 6. Leaked-password protection

Security Advisor reports `Leaked Password Protection Disabled`.

This is a Supabase Auth project configuration change, not a repository SQL migration. It remains **HOLD — PRODUCTION CONFIG MUTATION**, pending separately authorized application after repository hardening is validated.

No Auth configuration was changed during this audit.

## 7. Test-harness reconciliation and validation assets

The earlier local full suite produced `23 failures / 7 suites`. Inspection confirmed several failures were stale harness rather than permission to weaken runtime guards.

Reconciled test-only issues include:

- active-account mocks now expose the canonical `id / role / isActive` shape;
- seller commercial/tax truth fixtures now represent current published-listing requirements;
- Windows-fragile source reads using `new URL(..., import.meta.url)` were replaced with deterministic repo-root `path.resolve(process.cwd(), ...)` reads in the affected static contract suites;
- checkout safety fixtures now contain current product tax evidence and seller declaration truth.

Tests/guards added or strengthened include:

- `legacy-transport-replay-envelope.test.ts`;
- `release-hardening-security-contract.test.ts`;
- `create-checkout.test.ts` inactive-buyer and inactive-seller protection;
- existing mobile inactive-seller regression remains authoritative;
- `supabase/tests/release_hardening_contract.sql` for final disposable-DB schema/privilege assertions.

The earlier targeted hardening run was **8/8 PASS**, but those tests changed afterwards and therefore that old result is historical evidence only. The current branch must be re-run before any PASS claim.

## 8. Local validation policy

Owner direction for this lane is explicit:

- no GitHub Actions;
- no Netlify preview/build credit consumption;
- no PR opened merely to obtain CI;
- no production Supabase mutation;
- use local PowerShell in an isolated Git worktree;
- preserve the owner's existing Android working-copy modifications.

Added:

`scripts/validate-release-hardening-local.ps1`

The validator:

1. fetches and locks current `origin/main` and the hardening branch SHA;
2. requires hardening merge-base to equal current main (`behind=0`);
3. does not require or modify the owner's source worktree;
4. creates a disposable detached worktree at the exact hardening SHA;
5. runs `npm ci`;
6. runs targeted hardening suites;
7. runs repaired/regression suites;
8. runs the complete Vitest suite;
9. runs ESLint, TypeScript and production build with placeholder public build vars;
10. only after Node/TS/build green, starts an isolated local Supabase stack;
11. replays numeric `supabase/*.sql` migrations in numeric order with filename tie-break;
12. then replays timestamped `supabase/migrations/*.sql`;
13. runs DB lint;
14. runs `supabase/tests/release_hardening_contract.sql`;
15. re-fetches origin and invalidates evidence if main or the branch moved during the run;
16. rejects any `src/`, `public/` or `android/` contamination in this hardening diff;
17. removes the disposable worktree/local stack in `finally`.

The script intentionally does **not** use `supabase db push`, production credentials, GitHub Actions or Netlify.

## 9. Current acceptance state

### Implemented

- replay compatibility envelope;
- replay cleanup invariant;
- seller public projection redesign migration;
- trigger-only RPC privilege closure;
- server-only rate-limit/category-filter privilege closure;
- checkout live-account service-role boundary repair;
- stale test-harness reconciliation identified so far;
- cross-platform static test file reading repairs;
- disposable DB contract;
- strict local PowerShell validator;
- this reconciled audit ledger.

### Still required before PASS

1. run the new targeted hardening suites locally;
2. run the repaired/regression suite group locally;
3. full Vitest suite PASS;
4. ESLint PASS;
5. TypeScript PASS;
6. production build PASS;
7. fresh isolated numeric + timestamped database replay PASS;
8. DB lint PASS;
9. release-hardening pgTAP DB contract PASS;
10. final Branch Guard with `behind=0` and exact diff audit;
11. re-run Security Advisor only after controlled production DDL, if/when separately authorized;
12. separately decide/apply leaked-password protection configuration;
13. no production mutation until merge/deployment authorization.

No item above is considered PASS merely because the script exists.

## 10. No-change assertions

This branch does not intentionally change:

- Supplier Commerce controls;
- Avasam/provider capabilities;
- real Phase O state;
- marketplace pricing/tax calculation semantics;
- Stripe/payment amounts;
- transfer/payout semantics;
- order lifecycle;
- homepage baseline;
- Workspace/Admin/Super Admin visuals;
- Android project files;
- PR #575 scope.

The only runtime behavior intentionally tightened in this release-hardening continuation is the current-account authorization boundary before service-role checkout/payment side effects.

## 11. Exact resume point

Run `scripts/validate-release-hardening-local.ps1` from the owner's repository. The script creates and removes its own disposable worktree, so the existing local Android modifications remain outside the validation worktree.

If any step fails: **STOP at the first failure, repair the root cause in `release-hardening/audit-20260822`, then rerun from the start.**

If all local evidence is green: perform one final exact-diff/Branch Guard review and stop. **Do not open a PR, merge, deploy, use Netlify, run GitHub Actions or mutate production until separately authorized.**
