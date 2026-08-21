# LOADIFY MARKET — IDENTITY / ONBOARDING / WORKSPACES PROGRESS LEDGER

**Created:** 21 August 2026  
**Rule:** append-safe execution record. Do not convert partial evidence into PASS.

---

## Status summary

| Stage | Name | Status |
|---|---|---|
| 0 | Documented baseline + execution governance | **PASS** |
| 1 | Identity / role / relationship contract | **PASS** |
| 2 | Public entrypoint & registration architecture | **CURRENT NEXT STAGE — NOT STARTED** |
| 3 | Marketplace Seller activation / onboarding V2 | NOT STARTED |
| 4 | Buyer onboarding alignment | NOT STARTED |
| 5 | Workspace destination & readiness contract | NOT STARTED |
| 6 | Supplier Partner pilot boundary | NOT STARTED |
| 7 | Cross-platform auth/security/commerce validation | NOT STARTED |
| 8 | Documentation closeout & continuity | CONTINUOUS / final closeout pending |

---

## 2026-08-21 15:46 BST — STAGE 0 — DOCUMENTED BASELINE + EXECUTION GOVERNANCE

**Status:** PASS

**Baseline main before work:** `50302455a6c8afcd52da45150f7de6f0ce91d942`  
**Branch:** `docs/identity-onboarding-workspaces-plan-20260821`  
**PR:** `#560 — Docs: define Loadify identity, onboarding and workspace execution plan`  
**Verified plan HEAD before ledger closeout:** `8e13627f10ae475caac58029ea3752575906fdd2`  
**Closeout:** ledger-only commit follows the verified four-file plan diff.

### Implemented

Documentation-only workstream created with:

- durable README / mandatory read order / continuity rules;
- factual current-state baseline;
- master execution plan with Stages 0–8;
- append-safe progress ledger;
- explicit relationship to canonical Supplier Commerce and homepage PR #529;
- explicit legacy-document warning.

### Exact changed surfaces

Documentation only:

- `docs/identity-onboarding-workspaces-2026-08-21/README.md`
- `docs/identity-onboarding-workspaces-2026-08-21/00_CURRENT_STATE_BASELINE_2026-08-21.md`
- `docs/identity-onboarding-workspaces-2026-08-21/01_MASTER_EXECUTION_PLAN_2026-08-21.md`
- `docs/identity-onboarding-workspaces-2026-08-21/02_PROGRESS_LEDGER_2026-08-21.md`

### Evidence used for baseline

Inspected on current `main`:

- canonical Supplier Commerce README / current Phase O pointer;
- Gate B Business Contract;
- product-direction clarifications;
- current `App.tsx` route map;
- current `Signup.tsx` registration UI/runtime seam;
- current `register.ts` server registration contract;
- current `SellerOnboarding.tsx`;
- current `RoleSelection.tsx`;
- current `SellerShell.tsx`;
- historical `docs/onboarding_flow.md` / `docs/ONBOARDING_AUTH_AUDIT.md` as legacy evidence only.

### Key baseline decisions recorded

- Marketplace Seller and Supplier Partner remain separate factual relationships.
- Loadify Direct is not a public account type.
- no Loadify physical warehouse/store is assumed.
- Buyer Space, Seller Workspace and Admin/Operations already exist and should not be rebuilt from zero without evidence.
- Seller onboarding exists but contains legacy seams and must be evolved.
- public `supplier` is not a current registration role in `register.ts`.
- Supplier Partner self-service portal is not assumed during Phase O Controlled Pilot.
- #529 remains a separate draft homepage lane and is not merged/changed by this docs branch.

### Branch Guard / evidence

Pre-closeout compare against `main`:

- branch status: ahead only;
- ahead by: 4 commits;
- behind by: 0;
- changed files: exactly 4;
- all 4 files under `docs/identity-onboarding-workspaces-2026-08-21/`;
- runtime source changes: NONE;
- DB/migration changes: NONE;
- auth changes: NONE;
- UI changes: NONE;
- Supplier Commerce control changes: NONE;
- PR #529 changes: NONE.

Tests:

- TypeScript: N/A — documentation-only
- Lint: N/A — documentation-only
- Build: N/A — documentation-only
- Runtime/DB writes: NONE

### Residual risks / deferred

- PR #560 is intentionally DRAFT and unmerged until owner/plan review permits promotion/merge.
- Stage 1 may discover that the present single-role account model requires a migration; no such migration is assumed or authorised by Stage 0.
- no Seller/Buyer/Supplier/Admin implementation has started in this workstream.

### Exact resume point

**STAGE 1 — IDENTITY / ROLE / RELATIONSHIP CONTRACT.**

Before any Stage 1 write:

1. refetch `main`;
2. refetch PR #560 / this ledger;
3. re-audit current auth role sources, route guards, seller status/approval state, role-transition endpoint(s), RLS/ownership and Supplier Commerce supplier identity entities;
4. create `03_IDENTITY_ROLE_RELATIONSHIP_CONTRACT.md`;
5. do not modify registration/onboarding UI until the Stage 1 contract reaches PASS.

---

## 2026-08-21 — PR #529 VISUAL BASELINE / MAIN SYNCHRONISATION CHECKPOINT

**Status:** PASS  
**Repository synchronisation:** PASS  
**Deploy-preview validation:** PASS  
**Merge to `main`:** NOT AUTHORISED / NOT PERFORMED

### Purpose

Synchronise the saved #529 public-homepage visual workstream with the current `main` foundation before any later stabilisation or final-polish work, while preserving the accepted visual baseline exactly.

### Baselines before synchronisation

- `main`: `50302455a6c8afcd52da45150f7de6f0ce91d942`
- PR #529 previous HEAD: `d1dfa6ad7de2df7927d802393b2f04f2c40ee57c`
- saved immutable-direction checkpoint branch: `checkpoint/pr529-visual-baseline-20260821-1608`
- divergence before sync: #529 ahead 67 / behind 223

### Conflict analysis

Compared the common ancestor `e3e336dd1e0167eca9ac07fb514077d39a3bb644` to current `main` and compared the same ancestor to #529.

Result:

- current `main` advanced by 223 commits;
- none of those 223 commits modified any of the 13 files changed by #529;
- therefore the homepage surface had no overlapping file conflict with the accumulated `main` work;
- the 223 commits were primarily Supplier Commerce/backend/migration/test/documentation work plus unrelated seller-profile work, not 223 missing homepage revisions.

### Synchronisation implementation

Created a merge tree from current `main` and overlaid the exact 13 #529 visual/public-surface blobs without altering their contents.

Merge commit:

`98679ca49983541544ceea977894f3183f0d2cff`

Parents:

1. previous #529 HEAD `d1dfa6ad7de2df7927d802393b2f04f2c40ee57c`
2. current `main` `50302455a6c8afcd52da45150f7de6f0ce91d942`

Branch updated by fast-forward only; no force update.

### Post-sync Branch Guard

Compared current `main` to new #529 HEAD:

- branch status: ahead only;
- ahead by: 68 commits;
- behind by: **0**;
- merge base: current `main@50302455a6c8afcd52da45150f7de6f0ce91d942`;
- changed files: **exactly 13**;
- additions/deletions remain `903 / 1181`;
- no Supplier Commerce/backend/migration/Admin/Workspace file appears in the PR diff.

Exact #529 diff remains:

- `src/components/FeaturedProducts.tsx`
- `src/components/FeaturesGrid.tsx`
- `src/components/Footer.tsx`
- `src/components/Header.tsx`
- `src/components/HeroSection.tsx`
- `src/components/HowItWorksSection.tsx`
- `src/components/MobileAppHeader.tsx`
- `src/components/MobileDrawer.tsx`
- `src/components/MobileHeroBanner.tsx`
- `src/components/SecurityTrust.tsx`
- `src/components/SellerCTA.tsx`
- `src/components/TrustStrip.tsx`
- `src/pages/Home.tsx`

### Deploy-preview evidence

Netlify deploy-preview status for HEAD `98679ca49983541544ceea977894f3183f0d2cff`: **SUCCESS**.

Stable preview:

`https://deploy-preview-529--loadifymarketcouk.netlify.app`

The successful deploy consumed the synchronized current-main foundation while retaining the exact #529 public visual blobs. No build failure was introduced by synchronisation.

### No-change assertions

- no visual polish was performed;
- no homepage semantic/copy change was performed during sync;
- no Workspace/Admin/Super Admin visual change;
- no DB/migration write;
- no Supplier Commerce control change;
- PR #529 remains DRAFT and unmerged;
- saved visual checkpoint remains untouched.

### Residual / deferred

- final visual polish remains intentionally deferred until platform functional completion/release-candidate stability;
- inventory-aware category merchandising and other previously audited visual/UX refinements remain deferred to the appropriate later stabilisation/polish stage unless needed for functional correctness;
- registration/onboarding destination remains a separate functional workstream and must be corrected before any release decision involving the premium seller CTA journey.

### Exact resume point

Return execution priority to **STAGE 1 — IDENTITY / ROLE / RELATIONSHIP CONTRACT**.

Before Stage 1 implementation writes, produce the controlling identity/role/relationship contract and prove whether the current single-role model can safely support buyer→seller activation without destructive role replacement. Final visual polish remains deferred.

---

## 2026-08-21 — STAGE 1 — IDENTITY / ROLE / RELATIONSHIP CONTRACT

**Status:** PASS  
**Baseline `main`:** `50302455a6c8afcd52da45150f7de6f0ce91d942`  
**Docs branch:** `docs/identity-onboarding-workspaces-plan-20260821`  
**PR:** `#560`  
**Contract commit:** `244a4ee4c5c057389e29ef1090f468e654a4eb09`

### Purpose

Resolve the account model before registration/onboarding implementation so Loadify can support one identity with Buyer and Marketplace Seller contexts without confusing Supplier Commerce, weakening Admin authority or relying on destructive role replacement.

### Evidence audited

Current runtime/schema evidence included:

- `src/types/index.ts` — strict `buyer | seller | admin` UserRole and canonical SellerStatus;
- `supabase/280_three_role_system.sql` — DB CHECK constraint and singular role helpers;
- `supabase/340_sync_role_to_auth_metadata.sql` — live DB role mirrored into server-controlled Auth app metadata;
- `netlify/functions/set-account-role.ts` — current self-service Buyer/Seller replacement behaviour;
- `src/pages/onboarding/RoleSelection.tsx` — UI currently treats Buyer/Seller as replaceable account type;
- `src/components/auth/RequireBuyer.tsx` — Buyer Space rejects Seller role;
- `src/components/auth/RequireSellerAny.tsx` — Seller onboarding rejects Buyer role;
- `src/components/auth/RequireSeller.tsx` — active Seller Workspace fail-closed lifecycle guard;
- `src/lib/roleUtils.ts` — current role-only access helpers;
- `src/App.tsx` — auth hydration, app_metadata fallback and role-based dashboard routing;
- `netlify/functions/register.ts` — current server-validated buyer/seller account creation;
- `netlify/functions/recheck-activation.ts` and `_shared/sellerActivation.ts` — canonical Seller activation readiness;
- `supabase/410_fix_role_escalation.sql` — direct authenticated role escalation blocked by RLS;
- `supabase/608_enforce_active_account_authorization.sql` — live account activity is global fail-closed truth;
- `supabase/10_rls_policies.sql` / product RLS — Buyer ownership is often role-independent, while Seller creation remains role-sensitive;
- `supabase/617_supplier_foundation.sql` — Supplier is a separate private commercial entity/lifecycle, not a public Seller user role;
- `src/pages/pixel-perfect/Signup.tsx` — current Seller CTA destination still labels Seller as Supplier/Trade Supplier.

### Key findings

1. Current `users.role` is singular and cannot truthfully represent Buyer+Seller coexistence.
2. `set-account-role` destructively replaces Buyer with Seller or Seller with Buyer while leaving opposite profile rows behind.
3. Existing route guards make Buyer Space and Seller context mutually exclusive by role.
4. Seller readiness itself is already correctly separate and fail-closed through `sellerStatus`.
5. Buyer-owned RLS frequently uses `auth.uid()` ownership rather than Buyer role, reducing migration blast radius.
6. Seller authorization cannot safely be inferred from `seller_profiles` existence because current profile RLS permits an authenticated owner to insert their own profile row.
7. Supplier Foundation is already private and separate; no `supplier` UserRole is needed or permitted.

### Controlling decision

**ADDITIVE CAPABILITY MIGRATION REQUIRED.**

Target layers:

`Auth Identity → Loadify Account Control → server-governed Buyer/Seller capabilities → relationship readiness → dedicated workspace`

- Admin remains the privileged system role.
- Buyer becomes a normal commerce capability.
- Marketplace Seller becomes an additional server-governed capability plus existing Seller relationship/lifecycle.
- `users.role` stays temporarily for compatibility/default context; do not drop/rename it in the first migration.
- new capabilities must be stored in a server-governed additive table; profile existence is not authority.
- existing Sellers backfill Buyer + Seller capabilities;
- existing Buyers backfill Buyer capability;
- Admin gets no automatic commerce capability;
- Buyer→Seller becomes `start-seller-activation`, preserving Buyer data/capability;
- generic public role switching is retired;
- workspace switching becomes navigation preference, never authorization mutation.

### Required artifact

Created:

`docs/identity-onboarding-workspaces-2026-08-21/03_IDENTITY_ROLE_RELATIONSHIP_CONTRACT.md`

It records:

- current and target models;
- state diagram;
- role/capability/relationship matrix;
- transition rules;
- dedicated workspace rules;
- NOT-A-ROLE list;
- additive migration decision;
- RLS/security implications;
- backfill/compatibility strategy;
- Supplier Partner separation;
- Stage 2 and Stage 5 implications.

### Branch Guard

After contract creation, docs branch vs `main`:

- status: ahead only;
- ahead by: 9 commits;
- behind by: 0;
- changed files: 6;
- all changed files are under `docs/identity-onboarding-workspaces-2026-08-21/`;
- runtime source changes: NONE;
- migration/schema changes: NONE;
- registration/onboarding UI changes: NONE;
- Workspace/Admin visual changes: NONE;
- Supplier Commerce control changes: NONE;
- PR #529 runtime diff: unchanged by Stage 1.

### Tests / evidence

- TypeScript: N/A — contract-only stage
- Lint: N/A — contract-only stage
- Build: N/A — contract-only stage
- DB writes: NONE
- production changes: NONE

### Residual risks / deferred

- additive capability schema/helper/backfill has not yet been implemented; it is a Stage 2 foundation prerequisite;
- every `is_seller()` consumer must be inventoried before helper semantics change;
- Buyer+Seller coexistence introduces mandatory self-purchase validation;
- seller profile direct-write policies must not become a capability-escalation path;
- `users.role` remains compatibility debt until all consumers move to capabilities;
- Supplier external membership remains deferred until Phase O proves a real need.

### Exact resume point

**STAGE 2 — PUBLIC ENTRYPOINT & REGISTRATION ARCHITECTURE.**

Execution order inside Stage 2:

1. create isolated implementation branch from current `main`;
2. implement and test additive `account_capabilities` foundation + backfill + RLS/helper boundary;
3. replace destructive Buyer→Seller switching with a trusted idempotent Seller Activation boundary;
4. hydrate capabilities safely in app state and migrate the minimum guards required for Buyer+Seller coexistence;
5. rebuild public Buyer/Seller registration semantics against that foundation;
6. keep Supplier Partner outside public role registration;
7. run migration/security/auth tests + Branch Guard;
8. update this ledger before proceeding to Stage 3 Seller Onboarding V2.

Final visual polish remains deferred.
