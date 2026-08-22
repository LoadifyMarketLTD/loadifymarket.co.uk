# LOADIFY MARKET — IDENTITY / ONBOARDING / WORKSPACES PROGRESS LEDGER CONTINUATION

**Created:** 21 August 2026  
**Rule:** append-safe continuation. Do not rewrite earlier ledger history to hide chronology.

---

## 2026-08-21 — DOCUMENTATION REFRESH AFTER HOMEPAGE BASELINE MERGE

**Workstream:** Identity / Onboarding / Workspaces  
**Docs PR:** #560  
**Status:** IN PROGRESS — documentation refresh before promotion/merge

### Why refresh was required

The original Stage 0/Stage 1 documents were written against `main@50302455a6c8afcd52da45150f7de6f0ce91d942` while PR #529 was still an unmerged visual lane.

Since then `main` advanced materially. Most importantly:

- PR #529 merged after explicit owner approval;
- PR #563 merged navbar/live-inventory synchronization;
- PR #564 merged mobile footer three-column compaction;
- PR #565 merged Seller-card separation plus footer hardening;
- `docs/HOMEPAGE_VISUAL_EXECUTION_LEDGER_2026-08-21.md` was added to `main`;
- Stage 2 implementation has already started in PR #561.

Therefore earlier references to #529 as unmerged and Stage 2 as not started are historical, not current execution truth.

### Current-main reference at refresh

`a0fe19b6f6b3867e1c34ddbe5445666e26233940`

### Documentation action

Added:

- `05_CURRENT_EXECUTION_STATE_2026-08-21.md` — current status/supersession pointer;
- `02B_PROGRESS_LEDGER_CONTINUATION_2026-08-21.md` — this continuation ledger.

README is to be updated so future contributors read the current-state override and continuation ledger before relying on old time-sensitive statements.

### Stage status at refresh

- Stage 0: PASS
- Stage 1: PASS
- Stage 2: **IN PROGRESS — PR #561**
- Stage 3+: not started
- Final visual polish: deferred

### Active next work

1. finish #560 docs refresh and Branch Guard;
2. audit #561 against current `main`;
3. repair/sync #561 where needed;
4. validate migration/RLS/auth/registration/route behaviour and CI/build;
5. record Stage 2 as PASS/FAIL/HOLD only from real evidence.

### Guardrails retained

- Marketplace Seller ≠ Supplier Partner;
- no public Supplier role;
- no Loadify warehouse/store assumption;
- no Supplier Commerce control activation;
- Admin remains privileged/fail-closed;
- Seller readiness remains lifecycle-based, not UI-step-based;
- no Workspace/Admin/Super Admin visual redesign by implication;
- merged #529 visual baseline is preserved;
- final polish remains deferred.

---

## 2026-08-22 — STAGE 2 EXACT-HEAD LOCAL VALIDATION CLOSED

**Workstream:** Identity / Onboarding / Workspaces  
**Implementation PR:** #561 — `identity/account-capabilities-stage2-20260821`  
**Tested implementation HEAD:** `8fbff9ccb9cf7f4d67fa29bda4dd42668f7abf91`  
**Tested current main:** `503be5de6b39915fcb7d40ce73d0f94ba92f4b9f`  
**Branch Guard:** ahead 36 / behind 0  
**Stage 2 local validation status:** **PASS**  
**Merge/deployment status:** **NOT MERGED / NOT DEPLOYED**

### Exact Stage 2 scope validated

The exact diff against tested `main` remained 14 files:

- `netlify/functions/__tests__/platformFlags.test.ts`;
- `netlify/functions/__tests__/register.test.ts`;
- `netlify/functions/__tests__/set-account-role.test.ts`;
- `netlify/functions/__tests__/start-seller-activation.test.ts`;
- `netlify/functions/_shared/platformFlags.ts`;
- `netlify/functions/register.ts`;
- `netlify/functions/set-account-role.ts`;
- `netlify/functions/start-seller-activation.ts`;
- `src/components/auth/RequireBuyer.tsx`;
- `src/lib/roleUtils.ts`;
- `src/pages/onboarding/RoleSelection.tsx`;
- `src/pages/pixel-perfect/Signup.tsx`;
- `supabase/669_account_capabilities_foundation.sql`;
- `supabase/670_identity_seller_provisioning_hardening.sql`.

Whitespace and visual-boundary checks passed. No Workspace/Admin/Super Admin visual redesign entered the Stage 2 diff.

### Application validation evidence

Verified on the exact immutable heads above:

- current-main focused auth/registration baseline: **16/16 PASS**;
- Stage 2 critical identity/registration suite: **41/41 PASS**;
- static security contract checks: **PASS**;
- ESLint: **PASS**;
- TypeScript + production build (`tsc -b && vite build`): **PASS**;
- dependency install audit during validation: **0 vulnerabilities**.

GitHub Actions run #1585 remained non-diagnostic because the reported failed jobs had no executable steps/logs and downstream jobs were skipped. That runner-level result was not used as evidence of a Stage 2 software regression.

### Normalized full-suite regression comparison

The final full-suite comparator normalized suite paths to repository-relative identities before comparing main and Stage worktrees.

Results:

- current main: **27 failed / 483 passed / 510 total**;
- Stage 2: **23 failed / 503 passed / 526 total**;
- normalized Stage-only failures: **0**;
- baseline failures resolved by Stage 2: **4**.

The four failures present on main but absent on Stage 2 were the stale legacy `set-account-role.test.ts` cases whose main harness did not mock the already-existing active-account database lookup. The normalized comparison therefore closed the earlier false `commercial-history-consumers.test.ts` HOLD caused by absolute worktree paths.

**FULL-SUITE REGRESSION COMPARATOR: PASS.**

### Identity database contract validation

A fresh isolated local Supabase database was created specifically for the Stage 2 identity dependency contract. The test did not claim to repair or reproduce the full historical repository migration chain.

The exact Stage 2 migrations were applied natively through `supabase db reset` in this order:

1. minimal factual identity dependency baseline;
2. exact `669_account_capabilities_foundation.sql` from `8fbff9cc...`;
3. exact `670_identity_seller_provisioning_hardening.sql` from `8fbff9cc...`;
4. behavioural acceptance assertions.

Verified PASS:

- `public.account_capabilities` creation and RLS;
- authenticated capability reads without authenticated INSERT/UPDATE/DELETE rights;
- service-role-only `server_start_seller_activation_v1(uuid)` execution boundary;
- Buyer capability backfill;
- Seller retains Buyer + Seller capabilities under one identity;
- Admin retains no active ordinary Buyer/Seller capability;
- `is_seller()` consumes the capability helper;
- active Seller lifecycle is not incorrectly demoted;
- inactive/Admin/draft Seller stores fail closed;
- new Seller provisioning starts `sellerStatus='draft'`, `isApproved=false`, store inactive;
- new Buyer provisioning remains valid;
- Buyer → Seller activation preserves Buyer + Seller and initializes Seller draft/inactive state;
- Admin self-service Seller activation is rejected fail-closed.

`supabase db reset` completed successfully and the identity behavioural acceptance gate passed.

**STAGE 2 IDENTITY DB CONTRACT: PASS.**

### Supplier Commerce / Phase O isolation

Stage 2 did not activate or mutate Supplier Commerce controls.

The Phase O source migration `669_supplier_controlled_pilot_adapter_territory_guard.sql` was verified unchanged between tested main and Stage 2. Both refs resolved to blob:

`421bef234164e9250695baeaca5cfc6cf4788804`.

The duplicate numeric prefix `669` is therefore intentional in the current repository inventory:

- Phase O `669_supplier_controlled_pilot_adapter_territory_guard.sql`;
- Identity `669_account_capabilities_foundation.sql`.

Identity `670_identity_seller_provisioning_hardening.sql` remains the only Stage 2 `670` migration.

Supplier Commerce controls remained OFF/fail-closed throughout validation. No hosted supplier pilot was started and simulator/infrastructure evidence is not treated as real Controlled Pilot PASS.

### Repository-wide historical fresh-rebuild debt — separate baseline HOLD

During validation, an attempted fresh replay of the entire historical numeric SQL inventory from current `main` exposed a pre-existing repository migration-order/reproducibility defect before any Stage 2 migration ran.

The chain failed at `10_rls_policies.sql` because it attempts to enable RLS on `delivery_requests` before that relation exists in the reconstructed historical sequence.

This is recorded as **CURRENT-MAIN BASELINE MIGRATION DEBT**, not as a Stage 2 regression. Stage 2 does not modify `10_rls_policies.sql` or the historical table-creation ordering that causes the failure.

This debt is **not waived or hidden**. It must be repaired/reconciled before the final Loadify Release Gate can be declared PASS.

### Production / hosted state during validation

- production Supabase was **not modified by Stage 2 validation**;
- Identity migrations 669/670 remain **not deployed to production** at this checkpoint;
- PR #561 remains **open, draft, mergeable and unmerged**;
- existing source-vs-hosted Phase O territory-guard drift remains a separate deployment/governance item; controls remain OFF/fail-closed;
- separately-authorized platform contact-email correction performed earlier is not part of the Stage 2 implementation diff or validation mutation set.

### Stage 2 verdict and exact next resume point

**STAGE 2 LOCAL VALIDATION: PASS.**

This PASS means the exact Stage 2 implementation head has closed its required local application, regression and identity-database acceptance gates. It does **not** mean the implementation has been merged, deployed or hosted-verified.

Exact next order:

1. perform a separate merge-readiness evaluation for PR #561 against current `main` and all known baseline/deployment debt;
2. do **not** auto-merge;
3. only after explicit merge authorization/evaluation, merge Stage 2 if still safe;
4. deploy Identity 669/670 through the controlled production path and verify hosted capabilities, RLS/grants, Buyer+Seller coexistence, Admin isolation, Seller activation and fail-closed lifecycle state;
5. keep Supplier Commerce controls OFF;
6. Stage 3 Seller Onboarding V2 remains blocked until Stage 2 merge/deployment/hosted verification is closed;
7. repository-wide historical fresh-rebuild debt remains a required Release Gate repair item.

---

## 2026-08-22 — STAGE 2 MERGED / DEPLOYED / HOSTED VERIFIED

**Workstream:** Identity / Onboarding / Workspaces  
**Implementation PR:** #561  
**Validated implementation HEAD:** `8fbff9ccb9cf7f4d67fa29bda4dd42668f7abf91`  
**PR #561 merge commit:** `97bea01608cb3641f01c8be8b4029d2ac2dc9768`  
**Hosted security-closure PR:** #574  
**PR #574 validated head:** `ae953c0ef12d9dd12c1844f4a9d81feb64780be4`  
**PR #574 merge commit / current main at closure:** `dcd54b061352d3062d29f9a6903b439eb3586358`  
**Stage 2 final status:** **PASS + MERGED + DEPLOYED + HOSTED VERIFIED**

### Controlled production deployment order

Production project `fwdfpmfvgygvqciecesx` was updated through discrete migration applications rather than an unreviewed bulk `db push`.

Applied hosted migration history:

1. `20260822173051 supplier_controlled_pilot_adapter_territory_guard` — source Phase O `669_supplier_controlled_pilot_adapter_territory_guard.sql`;
2. `20260822173119 account_capabilities_foundation` — Identity `669_account_capabilities_foundation.sql`;
3. `20260822173133 identity_seller_provisioning_hardening` — Identity `670_identity_seller_provisioning_hardening.sql`;
4. `20260822174002 identity_function_execute_privilege_closure` — `671_identity_function_execute_privilege_closure.sql` from merged PR #574.

All four migration applications completed successfully.

### Hosted Identity verification

After 669/670 deployment, production verification confirmed:

- `public.account_capabilities` exists;
- RLS is enabled;
- `authenticated` has SELECT but not INSERT/UPDATE/DELETE on `account_capabilities`;
- `server_start_seller_activation_v1(uuid)` is not executable by `anon` or `authenticated` and remains executable by `service_role`;
- active Buyer capability rows: **4**;
- active Seller capability rows: **3**;
- current Buyer users with Buyer capability: **1/1**;
- current Seller users with Buyer capability: **3/3**;
- current Seller users with Seller capability: **3/3**;
- Admin active ordinary capabilities: **0**;
- historical non-ready active Seller stores were reconciled from **1** before 670 to **0** after 670;
- genuinely readiness-valid Seller stores were not blanket-demoted.

### Hosted function privilege closure

Post-deploy Security Advisor exposed a Stage 2-specific production-default-privilege issue: newly created public `SECURITY DEFINER` helpers inherited explicit role EXECUTE grants, so revoking only `PUBLIC` was insufficient for the intended direct-RPC boundary.

PR #574 added `671_identity_function_execute_privilege_closure.sql` and was separately authorized and merged before deployment.

After hosted 671 application, direct PostgreSQL privilege verification confirmed:

- `anon -> has_account_capability(text)`: **false**;
- `authenticated -> has_account_capability(text)`: **true**;
- `service_role -> has_account_capability(text)`: **true**;
- `anon -> is_seller()`: **false**;
- `authenticated -> is_seller()`: **true**;
- `service_role -> is_seller()`: **true**;
- `anon/authenticated -> sync_legacy_role_to_account_capabilities()`: **false / false**;
- `service_role -> sync_legacy_role_to_account_capabilities()`: **true**;
- `anon/authenticated -> handle_new_user_profile()`: **false / false**;
- `service_role -> handle_new_user_profile()`: **true**.

The post-671 Security Advisor no longer reports anonymous EXECUTE exposure for the Stage 2 `has_account_capability`, `is_seller`, or `sync_legacy_role_to_account_capabilities` functions. Authenticated warnings for the capability-query helpers remain because authenticated execution is intentional for those live authorization helpers.

### Supplier Commerce / Phase O post-deploy verification

Supplier Commerce remained fail-closed throughout deployment and verification:

- enabled Supplier Commerce controls: **0**;
- Phase O readiness function still requires `a.territory='GB'` for adapter selection;
- Phase O readiness function remains non-executable by `anon` / `authenticated` and executable by `service_role`;
- no real supplier pilot was activated;
- simulator/infrastructure evidence remains distinct from real Controlled Pilot PASS.

### Remaining security / release debt — not hidden by Stage 2 PASS

The Supabase Security Advisor still reports pre-existing project-wide debt for Phase Q, including the `public.seller_profiles_public` security-definer-view ERROR, multiple older security-definer function exposure warnings, RLS-enabled/no-policy informational items, and leaked-password protection being disabled.

The repository-wide historical fresh-rebuild defect discovered during Stage 2 validation also remains open: the historical numeric replay fails before Stage 2 at `10_rls_policies.sql` because `delivery_requests` is referenced before it exists in that reconstructed sequence.

These items do not invalidate the factual Stage 2 implementation/deployment result, but they remain blockers/debt for the final Loadify Release Gate and Phase Q governance/security work.

### Final Stage 2 verdict / next resume point

**STAGE 2: PASS + MERGED + DEPLOYED + HOSTED VERIFIED.**

Stage 3 Seller Onboarding V2 is now unblocked from the Stage 2 dependency perspective.

Exact continuation order:

1. begin Stage 3 Seller Onboarding V2 on a new branch from current `main@dcd54b061352d3062d29f9a6903b439eb3586358`;
2. remove remaining legacy Supplier/Service semantics from Seller onboarding and align progressive Seller activation / Stripe / KYC semantics without redesigning Workspace/Admin/Super Admin;
3. keep Supplier Commerce controls OFF and do not treat Phase O infrastructure as real pilot PASS;
4. preserve the accepted homepage visual baseline;
5. keep repository-wide fresh-rebuild debt and Phase Q security/governance debt explicitly open for the final Release Gate.
