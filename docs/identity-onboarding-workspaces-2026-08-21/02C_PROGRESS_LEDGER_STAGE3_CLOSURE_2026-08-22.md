# LOADIFY MARKET — STAGE 3 SELLER ONBOARDING V2 CLOSURE LEDGER

**Date:** 22 August 2026  
**Workstream:** Identity / Onboarding / Workspaces  
**Rule:** append-only continuation of `02B_PROGRESS_LEDGER_CONTINUATION_2026-08-21.md`; earlier chronology is not rewritten.

---

## STAGE 3 — FINAL STATUS

**Status:** **PASS + MERGED + DEPLOYED + HOSTED VERIFIED**

### Exact implementation and merge evidence

- Stage 3 implementation branch: `identity/seller-onboarding-v2-stage3-20260822`
- validated Stage 3 head: `a1ce88e9bf694609129b3da7dc3a6c4a8feeb90e`
- tested base main: `dcd54b061352d3062d29f9a6903b439eb3586358`
- Branch Guard: ahead 10 / behind 0
- exact validated diff: 9 files
- implementation PR: #576 — `Stage 3: Seller Onboarding V2`
- PR #576 merge commit: `1668521c86c7d76b01cf6d5c599b1c12fcb49bc1`
- hosted-data truth hotfix PR: #577 — `Stage 3: close legacy onboarding truth bypass`
- PR #577 validated head: `7cca800b21354dea8c75a6b4d1b0cd164ed49216`
- PR #577 merge commit / current main at closure: `eb290b586121cbb9c763789655ecd1004b00895b`

No Workspace/Admin/Super Admin visual redesign was introduced. Supplier Commerce was not activated.

### Stage 3 functional contract delivered

Stage 3 now separates Marketplace Seller setup from commercial activation:

- canonical seller types are `individual`, `sole_trader`, `company`;
- legal/business profile is separate from public store identity;
- catalogue readiness is based on a real product/draft catalogue row, not legacy service semantics;
- Stripe is a payment/commercial-readiness signal and is not represented as Loadify identity/KYC verification;
- browser code no longer owns onboarding-completion flags;
- `profileCompleted`, `storeCreated`, `firstProductCreated`, `users.onboardingCompleted` and `users.onboardingStep` are protected/server-managed projections;
- draft/submitted/active-but-incomplete sellers may access only the narrow catalogue create/edit route needed to prepare a draft;
- full Seller Workspace access requires active Seller lifecycle plus canonical live onboarding truth;
- legacy Supplier/Service/skip-to-active wording and completion semantics were removed from the Stage 3 onboarding flow.

Marketplace Seller remains distinct from Supplier Partner / Fulfilment Provider. Supplier Partner/Avasam relationships remain private Supplier Commerce concerns and are not exposed as a Seller account type.

### Final local validation evidence

The exact Stage 3 final local gate passed on `a1ce88e9...`:

- targeted Stage 3 tests: **PASS**;
- delta ESLint: **PASS**;
- exact TypeScript + production build: **PASS**;
- legacy semantics guard: **PASS**;
- direct-URL onboarding bypass guard: **PASS**;
- browser completion ownership guard: **PASS**;
- isolated local Supabase DB contract for exact migration `672_seller_onboarding_v2_truth.sql`: **PASS**;
- production was **not modified** by local validation.

Netlify deploy preview for PR #576 completed successfully on exact head `a1ce88e9...` before merge.

GitHub Actions run #1592 remained non-diagnostic because the reported failed jobs had no executable steps/logs and downstream jobs were skipped; it was not treated as evidence of a Stage 3 software regression.

### Production preflight discovery and PR #577 closure

Before deploying migration 672, hosted-data preflight found historical Seller rows where `users.onboardingCompleted=true` existed without a canonical Stage 3 `sellerType` and full profile/store/catalogue truth.

The first Stage 3 route guard could reuse that historical hydrated boolean. This created a narrow legacy-data bypass for full Seller Workspace access even though the new onboarding contract itself was stricter.

Production migration 672 was therefore held before DDL mutation.

PR #577 closed the bypass before deployment by requiring live canonical truth for full Seller Workspace access:

- canonical `sellerType`;
- `profileCompleted=true`;
- `storeCreated=true`;
- `firstProductCreated=true`;
- `users.onboardingCompleted=true`;
- commercial Seller status remains separately governed.

PR #577 changed exactly one file, `src/components/auth/RequireSeller.tsx`, was ahead 1 / behind 0 from its base, had no review threads, and its Netlify deploy preview passed before the separately authorized merge.

Historical completion booleans are therefore not trusted by themselves and do not grandfather access.

### Controlled production deployment

Production Supabase project: `fwdfpmfvgygvqciecesx`.

After #577 merged, exact source migration `supabase/672_seller_onboarding_v2_truth.sql` from `main@eb290b586121cbb9c763789655ecd1004b00895b` was applied as a discrete hosted migration rather than by blind bulk `db push`.

Hosted migration history now includes:

- `20260822185156 seller_onboarding_v2_truth`.

The migration completed successfully.

### Hosted Stage 3 database verification

Post-deploy verification confirmed:

- `private.protect_seller_onboarding_flags_v2()` exists;
- `private.protect_user_onboarding_flags_v2()` exists;
- `public.sync_seller_onboarding_completed()` is the Stage 3 completion function;
- seller onboarding protection trigger exists and is enabled;
- user onboarding protection trigger exists and is enabled;
- `anon` cannot execute either private protection helper;
- `authenticated` cannot execute either private protection helper;
- `service_role` can execute both private protection helpers;
- `anon` cannot execute `public.sync_seller_onboarding_completed()`;
- `authenticated` cannot execute `public.sync_seller_onboarding_completed()`;
- `service_role` can execute `public.sync_seller_onboarding_completed()`.

Factual legacy projection reconciliation on the four current Seller profiles produced:

- Seller profiles: **4**;
- factual stores projected to `storeCreated=true`: **4**;
- Seller profiles with factual products projected to `firstProductCreated=true`: **2**;
- current rows satisfying complete canonical Stage 3 truth: **0** because the historical Seller profiles still have `sellerType=NULL` until they complete the canonical setup;
- historical rows with `onboardingCompleted=true` but incomplete canonical truth: **2**.

Those two historical completion flags are retained as historical data rather than silently rewritten. They cannot independently grant full Seller Workspace access because merged PR #577 now requires live canonical profile/store/catalogue truth as well.

### Supplier Commerce isolation

Supplier Commerce remained fail-closed throughout Stage 3 validation, merge, hotfix and deployment:

- Supplier Commerce controls total: **11**;
- enabled controls: **0**;
- no real Phase O supplier pilot was activated;
- no Avasam/provider contract or capability was invented;
- Stage 3 did not modify Supplier Commerce control state.

### Security Advisor after Stage 3 DDL

The post-672 Supabase Security Advisor did not report anonymous/authenticated EXECUTE exposure for the new Stage 3 protection/completion functions.

Known project-wide debt remains open for Phase Q / final Release Gate, including:

- `public.seller_profiles_public` security-definer-view ERROR;
- older security-definer RPC exposure warnings requiring individual review;
- RLS-enabled/no-policy informational findings;
- leaked-password protection disabled;
- repository-wide historical fresh-bootstrap migration-order debt previously recorded at `10_rls_policies.sql` / `delivery_requests`.

These items are not hidden or reclassified as Stage 3 failures, but remain unresolved release-hardening debt.

### Stage 3 final verdict

**STAGE 3: PASS + MERGED + DEPLOYED + HOSTED VERIFIED.**

Stage 3 Seller Onboarding V2 is closed.

### Exact next resume point

Continue from `main@eb290b586121cbb9c763789655ecd1004b00895b` in the canonical order:

1. Stage 4 — Buyer alignment against the merged identity/capability model;
2. Stage 5 — Workspace readiness/alignment without visual redesign;
3. preserve the Seller Workspace expansion reservation in draft PR #575 for Listings Manager, Finance/Invoices, Analytics and Help/Support work when its execution point is reached;
4. Stage 7 — web + Android identity/session/Buyer+Seller/Admin isolation and commerce-flow validation;
5. keep Supplier Commerce OFF until the separately governed real Phase O pilot requirements are satisfied;
6. Phase P / Phase Q hardening and final release governance remain later gates;
7. historical fresh-bootstrap debt remains a final Release Gate blocker until repaired.
