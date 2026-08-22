# 02D — Progress Ledger: Stage 4 + Stage 5 Closure

Date: 2026-08-22

This file is an append-only continuation of the repository-native identity / onboarding / workspace execution ledger. It does not replace or rewrite `02_PROGRESS_LEDGER_2026-08-21.md`, `02B_PROGRESS_LEDGER_CONTINUATION_2026-08-21.md`, or `02C_PROGRESS_LEDGER_STAGE3_CLOSURE_2026-08-22.md`.

## Stage 4 — Buyer onboarding alignment

### Result

**PASS + MERGED**

### Implementation PR

- PR: #578 — `Stage 4: Buyer onboarding alignment`
- implementation head: `a81ee7190d404238186b54269c2afeaa73a979e6`
- merge commit: `2c0e0b40f80e617329a8e328e0f993c179cfa441`
- base before merge: `eb290b586121cbb9c763789655ecd1004b00895b`
- exact implementation diff: 5 files

### Closed contract points

- ordinary Buyer registration remains the short path;
- optional Trade Account remains a Buyer path, not a new public role;
- Trade Account registration now preserves verify-first semantics instead of implying immediate sign-in readiness;
- explicitly requested business Buyer profile persistence is treated as part of successful registration rather than a silent non-fatal side write;
- unsupported B2B pricing / ex-VAT / automatic reverse-charge promises were removed from Buyer-facing copy;
- Buyer Space remains capability-based;
- Admin remains isolated from ordinary Buyer/Seller commerce capabilities;
- no Supplier Partner public account/workspace was introduced.

### Validation evidence

Before merge:

- Branch Guard: PASS — ahead 1 / behind 0;
- exact diff: 5 files;
- targeted tests: PASS;
- delta lint: PASS;
- production build: PASS;
- Netlify Deploy Preview: SUCCESS;
- review threads: 0;
- GitHub Actions failure observed on the PR was non-diagnostic infrastructure behaviour with failed jobs exposing no steps/logs;
- no Supabase migration;
- production database not modified;
- Supplier Commerce not modified.

### Stage 4 hosted status

The implementation was merged. No database deployment was required. A separate production-hosted content deployment proof was not recorded at the moment of this ledger entry, so this ledger does **not** upgrade Stage 4 to a stronger `HOSTED VERIFIED` claim without evidence.

---

## Stage 5 — Workspace destination & readiness alignment

### Result

**PASS + MERGED**

Production-hosted verification is tracked separately and must not be inferred solely from merge success.

### Implementation PR

- PR: #579 — `Stage 5: workspace destination and readiness alignment`
- implementation head: `4c133d3f9392d17503e92edbdbc7289ef9b6ce98`
- merge commit: `a7db80ed17bfaf40a865af1e66a25aabd9587ebe`
- base before merge: `2c0e0b40f80e617329a8e328e0f993c179cfa441`
- exact implementation diff: 9 files

### Closed contract points

- Seller Workspace dashboard no longer derives onboarding/readiness from legacy service-era checklist truth;
- dashboard readiness now uses canonical `seller-onboarding-status` server truth;
- legacy `/seller/setup` is retained only as a compatibility bridge into canonical `/onboarding`;
- new Stripe Connect return/refresh URLs point directly to canonical onboarding;
- canonical onboarding refreshes Stripe status on supported return states before re-reading seller readiness;
- `RequireSellerAny` uses the shared seller-access boundary instead of raw `user.role === 'seller'` logic;
- Seller Workspace exposes an explicit Buyer Space switch;
- Buyer Space exposes Seller Workspace only when seller access is permitted;
- incomplete sellers remain outside the full Seller Workspace via the existing canonical `RequireSeller` truth gate;
- Admin isolation is preserved;
- no Supplier Partner workspace was introduced;
- no Supplier Commerce change;
- no Admin/Super Admin visual redesign.

### Local gate evidence

Final local validation log recorded:

- main: `2c0e0b40f80e617329a8e328e0f993c179cfa441`
- Stage 5 head: `4c133d3f9392d17503e92edbdbc7289ef9b6ce98`
- Branch Guard: PASS — ahead 1 / behind 0;
- exact diff: 9 files;
- targeted test files: 3/3 PASS;
- targeted tests: 18/18 PASS;
- delta lint: PASS;
- exact production build: PASS;
- canonical readiness: PASS;
- legacy setup bridge: PASS;
- Stripe return truth: PASS;
- Buyer/Seller workspace switch: PASS;
- Admin isolation: PASS;
- Supplier boundary: PASS;
- production database: NOT MODIFIED;
- Supplier Commerce: NOT MODIFIED.

### PR gate evidence

Before merge:

- PR #579 open and mergeable;
- exact head remained `4c133d3f9392d17503e92edbdbc7289ef9b6ce98`;
- Branch Guard remained ahead 1 / behind 0;
- review threads: 0;
- Netlify Deploy Preview: SUCCESS;
- GitHub Actions #1599 repeated the known non-diagnostic infrastructure failure pattern: failed jobs had `steps=null` and `logs_url=null`, while production build / smoke jobs were skipped; this was not treated as code-regression evidence because the exact local Stage 5 test/lint/build gate was PASS.

The user authorised merge only if PASS. The gate was re-checked immediately before merge and remained PASS. PR #579 was then promoted from Draft to Ready and merged with expected head protection.

### Stage 5 production-hosted status

At this ledger point, GitHub exposes no production status on merge commit `a7db80ed17bfaf40a865af1e66a25aabd9587ebe`. Therefore:

- **MERGED is confirmed**;
- **production database is unchanged by Stage 5**;
- **production-hosted web deployment verification remains pending evidence**;
- do not claim `DEPLOYED + HOSTED VERIFIED` until a production deployment/content check proves the merged Stage 5 code is live.

---

## Current main after Stage 5 merge

`a7db80ed17bfaf40a865af1e66a25aabd9587ebe`

## Resume point

Continue from current `main` after Stage 5 merge.

Next execution work must preserve all canonical invariants already established:

1. Marketplace Seller is not Supplier Partner / Fulfilment Provider.
2. Loadify Direct is a commercial mode, not a public account type.
3. Buyer + Marketplace Seller capabilities may coexist on one ordinary identity.
4. Admin remains an isolated privileged role and must not simultaneously hold active ordinary Buyer/Seller capabilities.
5. Supplier Commerce stays OFF/fail-closed until separately authorised real pilot activation.
6. No Workspace/Admin/Super Admin visual redesign unless separately authorised.
7. Stage 3 canonical seller onboarding/readiness truth remains the sole onboarding truth source; do not re-introduce legacy service-era onboarding semantics.
8. Do not infer production deployment from PR merge alone.

The next roadmap gate is cross-platform / release-candidate alignment, while the reserved Seller Workspace capability-expansion plan in PR #575 remains deferred and must not interrupt the canonical release sequence.
