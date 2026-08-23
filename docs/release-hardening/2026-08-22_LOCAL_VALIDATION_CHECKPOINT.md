# LOADIFY MARKET — RELEASE-HARDENING LOCAL VALIDATION CHECKPOINT

**Updated:** 23 August 2026  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Lane:** `release-hardening/audit-20260822`  
**Reason for checkpoint:** repository implementation and static Branch Guard have reached the mandatory owner-local PowerShell/Docker/Supabase validation boundary. This chat cannot execute commands on the owner's Windows machine, and the assistant container cannot clone GitHub because outbound GitHub DNS/network access is unavailable. **No PASS is claimed before real local evidence exists.**

---

## 1. CURRENT GITHUB TRUTH AT THIS CHECKPOINT

Immediately before this checkpoint update:

- `main = aca0d19c1cad7fe047ca1e591df790cf2280b840`
- hardening branch = `release-hardening/audit-20260822`
- hardening HEAD = `e5b637590d18f3500b035d85ae364608871e89f5`
- compare = **ahead 30 / behind 0**
- merge-base = exact current `main`
- open PR **#581 — Release hardening/audit 20260822** now exists with this hardening branch as head and `main` as base
- open draft PR **#575 — Plan Seller Workspace capability expansion** remains separate and untouched
- PR #581 is repository reality only; this checkpoint does **not** authorize merge, CI, Netlify, deployment, or production mutation

This checkpoint update itself creates one additional docs-only commit, so the branch SHA/ahead count must be re-read after the commit and again by the local validator before evidence is accepted.

---

## 2. OWNER POLICY / HARD GUARDS

This lane remains:

- **NO GitHub Actions / CI**
- **NO Netlify preview/build validation**
- **NO merge to main without separate owner authorization**
- **NO production deployment**
- **NO production Supabase migration / `db push`**
- **NO production Auth configuration mutation**
- **NO modification of deferred PR #575**
- **NO Supplier Commerce Phase O activation or control changes**
- **NO Workspace/Admin/Super Admin visual redesign**
- **NO homepage modification**

The homepage is explicitly frozen. `src/pages/Home.tsx` is **not** in the hardening diff.

---

## 3. OWNER LOCAL ANDROID WORKTREE — PRESERVE ABSOLUTELY

The owner's source working copy contains local Android changes that must survive untouched:

- `android/app/capacitor.build.gradle`
- `android/capacitor.settings.gradle`

Never reset, restore, checkout over, stash/drop, or otherwise mutate those files.

The validator therefore does not validate inside the dirty source worktree. It fetches the remote refs, creates a disposable detached Git worktree under `%TEMP%` at the exact remote hardening SHA, validates there, and removes only that disposable worktree afterwards.

---

## 4. EXACT CURRENT `src/*` SCOPE — HOMEPAGE FROZEN

At the last exact `main...release-hardening/audit-20260822` compare, the **only** `src/*` files in this branch were:

1. `src/lib/authorizedFetch.ts`
2. `src/lib/authorizedFetch.test.ts`
3. `src/pages/onboarding/SellerOnboarding.tsx`
4. `src/pages/onboarding/SellerOnboarding.test.tsx`

There is no homepage file, no Admin file, no Seller Workspace visual file, no Buyer Workspace visual file, no `public/*`, and no `android/*` file in the current hardening diff.

The validator now uses these four paths as a strict `src/*` allowlist and rejects every other changed `src/*` path. It also contains an explicit veto for `src/pages/Home.tsx`.

---

## 5. ORIGINAL RELEASE-HARDENING IMPLEMENTATION RETAINED

The branch still contains the historical replay/security closure:

- `supabase/09_zz_legacy_transport_replay_compat.sql`
- `supabase/456_00_remove_legacy_transport_replay_compat.sql`
- `supabase/673_public_seller_projection_security_closure.sql`
- `supabase/674_server_only_privilege_closure.sql`
- `netlify/functions/__tests__/legacy-transport-replay-envelope.test.ts`
- `netlify/functions/__tests__/release-hardening-security-contract.test.ts`
- `supabase/tests/release_hardening_contract.sql`

Purpose remains unchanged:

1. replay historical statements that still mention retired `delivery_requests` / `transport_quotes` without restoring those surfaces permanently;
2. replace the owner-rights `seller_profiles_public` view with a curated read-only RLS projection table;
3. remove unnecessary ordinary-client CRUD privileges from server-only rate-limit state and `category_filter_definitions` where present;
4. revoke direct API execution of the trigger-only seller-suspension helper;
5. prove final disposable-schema security invariants with pgTAP.

No production DDL was applied.

---

## 6. TEST-HARNESS RECONCILIATION RETAINED

The earlier local full run reported `23 failures / 7 suites`. Investigation separated stale fixtures/path assumptions from real runtime defects; runtime security was not weakened merely to satisfy tests.

Repairs already present include:

- deterministic repo-root source reads for static contract tests;
- current active-account fixture shapes;
- seller commercial/tax declaration evidence fixtures;
- current product tax evidence and shipping readiness fixtures;
- checkout active-buyer / active-seller truth;
- stale-buyer and inactive-seller regression coverage;
- shipment boundary active-account fixture reconciliation.

The historical `8/8 targeted PASS` predates later changes and is not current evidence. All gates must be rerun on the final locked branch SHA.

---

## 7. REAL P1 SERVICE-ROLE CHECKOUT DEFECT — REPAIRED

`create-checkout.ts` and `create-payment-intent.ts` use service-role database access, so browser RLS is not sufficient at their trusted server boundary.

The repaired handlers now:

1. call `authenticateActiveAccount(event, supabase)` before reservation/payment side effects;
2. re-read current `public.users.isActive` for the authenticated buyer;
3. reject stale JWT access from an inactive buyer with 403;
4. preserve `buyerId` = authenticated actor identity matching;
5. re-read the listing seller from `public.users`;
6. require current `role='seller' AND isActive=true` before seller profile / Stripe readiness can authorize payment;
7. preserve existing prices, tax resolver, payment amounts, transfer group, payment-session snapshots, order materialization and payout semantics.

No unrelated product/UI redesign was introduced.

---

## 8. SELLER ONBOARDING INFINITE-SPINNER REGRESSION — REPAIRED

### Demonstrated root cause

`SellerOnboarding.tsx` previously rendered the full-page spinner whenever `loading || !status`.

On an initial canonical-status failure:

- `loading` became `false` in `finally`;
- `status` remained `null`;
- the component therefore rendered the spinner forever even though the request had already failed.

Additionally, shared `authorizedFetch()` had no finite deadline, so a stalled Supabase session lookup, refresh, or network fetch could also leave a caller waiting indefinitely.

### Runtime repair

`src/lib/authorizedFetch.ts` now:

- has one finite **30-second** deadline across session lookup, token refresh, and network fetch;
- uses an internal `AbortController`;
- propagates a caller-provided `AbortSignal`;
- returns `Request timed out. Please try again.` for its own timeout;
- preserves the existing Capacitor URL rewrite, proactive token refresh, auth header, and missing-session behavior.

`src/pages/onboarding/SellerOnboarding.tsx` now:

- stores the initial load failure in `loadError`;
- only shows the initial full-page spinner while `loading === true`;
- when no status is available after failure, renders a stable `Seller setup unavailable` state;
- exposes an explicit `Retry Seller setup` action;
- clears the error when canonical status loads successfully;
- retains the existing toast and onboarding lifecycle behavior.

### Regression tests added

`src/lib/authorizedFetch.test.ts` locks:

1. stalled fetch => finite timeout;
2. stalled Supabase session lookup => finite timeout before fetch begins;
3. caller abort remains caller abort rather than being mislabeled as internal timeout.

`src/pages/onboarding/SellerOnboarding.test.tsx` locks:

1. failed initial load exits the spinner and exposes an actionable error state;
2. Retry can recover the page after a temporary failure.

These tests have been committed but **have not yet been proven PASS by the mandatory local run**.

---

## 9. CAPABILITY FOUNDATION AUDIT — NO NEW BYPASS FOUND

The Stage 2 identity/capability foundation was audited without changing it.

Verified contract:

- `public.has_account_capability(text)` requires the current authenticated identity, a non-revoked capability, `public.users.isActive=true`, and excludes admin from ordinary Buyer/Seller capabilities;
- `public.is_seller()` delegates to `has_account_capability('seller')`;
- `server_start_seller_activation_v1(uuid)` is service-role-only and atomically initializes Buyer+Seller capability truth / Seller relationship state;
- current UI `hasSellerAccess()` continues to use `users.role='seller'` only as the temporary compatibility/default routing context while DB authorization consumes the capability foundation;
- identity function execute privileges remain explicitly closed according to the Stage 2 privilege migration.

No change was required in this slice.

---

## 10. FRESH HISTORICAL REPLAY BOOTSTRAP — ROOT CAUSE CORRECTED

A second real validator defect was found during static audit.

Historical root file `01_users_profiles.sql` explicitly depends on the helper functions created by `PART_1_extensions_helpers.sql`, including `update_updated_at_column()`.

`00_reset.sql` explicitly drops those helper functions.

The previous validator therefore had an invalid historical replay sequence because it could execute:

`00_reset.sql -> 01_users_profiles.sql`

without recreating the required helpers first.

The corrected disposable diagnostic order is now:

1. `00_reset.sql`
2. `PART_1_extensions_helpers.sql`
3. ordered numeric root SQL from `01+` using numeric prefix + filename tie-break
4. ordered timestamped `supabase/migrations/*.sql`
5. DB lint
6. pgTAP release-hardening DB contract

Important distinction: root standalone `supabase/*.sql` files are historical/modular material, while repository guidance says normal executable database changes belong under `supabase/migrations/`. The validator therefore labels this root-chain execution explicitly as a **disposable historical replay diagnostic**, not a production bootstrap/deploy procedure.

`00_consolidated_schema.sql` remains explicitly excluded.

---

## 11. CURRENT STRICT POWERSHELL VALIDATOR

`scripts/validate-release-hardening-local.ps1` now performs, in order:

1. source-worktree status read only; no mutation;
2. fetch origin;
3. lock exact current `origin/main` and hardening SHA;
4. require merge-base=current main and behind=0;
5. create disposable detached worktree;
6. `npm ci`;
7. targeted hardening tests, including the new timeout/onboarding tests;
8. repaired/regression test group, including checkout/payment, shipment and seller-activation boundaries;
9. complete Vitest suite;
10. ESLint;
11. TypeScript;
12. production build with placeholder public Vite values;
13. only after all Node/TS/build gates are green, start isolated local Supabase;
14. refuse to reuse/stop a pre-existing `supabase_db_*` stack;
15. hold timestamp migrations aside for explicit replay sequencing;
16. apply `00_reset.sql`;
17. apply `PART_1_extensions_helpers.sql`;
18. apply numeric root SQL `01+` in deterministic order;
19. apply timestamped migrations;
20. run `supabase db lint --local --schema public --level error --fail-on error`;
21. run `supabase test db supabase/tests/release_hardening_contract.sql --local`;
22. re-fetch origin;
23. invalidate evidence if main or branch changed during the run;
24. require final behind=0;
25. inspect exact final diff;
26. reject all `android/*` and `public/*` changes;
27. allow only the four explicitly listed onboarding/timeout `src/*` paths;
28. explicitly reject `src/pages/Home.tsx`;
29. print PASS only after every preceding gate succeeds;
30. stop isolated Supabase and remove disposable worktree in `finally`.

---

## 12. PRODUCTION READ-ONLY STATE — NO MUTATION

The last production read-only verification remains:

- migration head: `20260822185156 / seller_onboarding_v2_truth`;
- `public.seller_profiles_public` still the pre-673 PostgreSQL view (`relkind='v'`), owner `postgres`, RLS false;
- `private.seller_profiles_public_data` still exists;
- `public.delivery_requests` absent;
- `public.transport_quotes` absent;
- `category_filter_definitions` still exposes historical ordinary-client grants;
- 9 public `*_rate_limits` tables still expose at least one anon/authenticated CRUD grant.

Therefore migrations 673/674 have not been applied accidentally. Production remains unchanged.

---

## 13. EXACT OWNER COMMAND — SAFE FOR THE DIRTY SOURCE WORKTREE

Run this exact block in **PowerShell**:

```powershell
& {
    $ErrorActionPreference = "Stop"

    $Repo = "C:\Users\Danny\Desktop\LoadifyMarket-GitHub-20260820-0950"
    $RemoteBranch = "release-hardening/audit-20260822"
    $Runner = Join-Path $env:TEMP "loadify-release-hardening-validator.ps1"

    git -C $Repo fetch origin --prune
    if ($LASTEXITCODE -ne 0) {
        throw "STOP: FETCH FAILED"
    }

    $ScriptLines = @(git -C $Repo show "origin/${RemoteBranch}:scripts/validate-release-hardening-local.ps1")
    if ($LASTEXITCODE -ne 0 -or $ScriptLines.Count -eq 0) {
        throw "STOP: COULD NOT LOAD VALIDATOR FROM HARDENING BRANCH"
    }

    [System.IO.File]::WriteAllText(
        $Runner,
        ($ScriptLines -join [Environment]::NewLine),
        [System.Text.UTF8Encoding]::new($false)
    )

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Runner -RepoRoot $Repo -ExpectedBranch $RemoteBranch
    if ($LASTEXITCODE -ne 0) {
        throw "STOP: RELEASE-HARDENING VALIDATION FAILED"
    }
}
```

Why this is safe for the source worktree:

- it only fetches/reads remote Git data from the existing source repo;
- it materializes the current validator into `%TEMP%`;
- validation runs in a separate detached Git worktree;
- it does not checkout the hardening branch into the owner's working directory;
- it does not reset/restore/stash/drop the Android changes;
- it does not invoke CI, Netlify or production database mutation.

---

## 14. ACCEPTANCE GATES STILL PENDING

Do **not** declare release-hardening PASS until one exact locked branch SHA proves all of these in one complete local validator run:

- targeted hardening tests PASS;
- timeout/onboarding regression tests PASS;
- repaired/regression suites PASS;
- full Vitest suite PASS;
- ESLint PASS;
- TypeScript PASS;
- production build PASS;
- disposable historical numeric replay PASS;
- timestamped migration replay PASS;
- DB lint PASS;
- release-hardening pgTAP contract PASS;
- final branch behind=0;
- main did not move during the run;
- hardening branch did not move during the run;
- exact final diff remains scope-clean;
- homepage remains absent from the diff.

If any gate fails, stop at the **first failure**, repair only the demonstrated root cause on this hardening branch, then rerun the validator from the beginning.

---

## 15. NO-ACTION GUARD AFTER A LOCAL PASS

Even a complete local PASS does **not** by itself authorize:

- merging PR #581;
- modifying or merging PR #575;
- GitHub Actions / CI;
- Netlify preview/build/deploy;
- production deployment;
- `supabase db push`;
- applying migrations 673/674 to production;
- production Auth configuration changes;
- resetting/restoring/stashing Android local changes;
- homepage work;
- Workspace/Admin/Super Admin visual redesign;
- Supplier Commerce activation.

After local PASS, re-read GitHub truth, verify the exact printed SHA/diff, record evidence, and stop before merge/deploy/production until separately authorized.

---

## 16. EXACT RESUME POINT

1. Run the PowerShell block in section 13.
2. Return the console output beginning with the **first `STOP:` / first failing native gate**, or the complete final PASS banner if every gate succeeds.
3. Do not skip later into the validator after a failure.
4. On failure, repair only the demonstrated root cause and rerun from the beginning.
5. On PASS, verify the printed MAIN/BRANCH SHAs against live GitHub, perform the final Branch Guard/evidence review, and stop before merge/deploy/production.

**NO FAKE PASS. HOMEPAGE FROZEN. OWNER-LOCAL VALIDATION IS THE NEXT REQUIRED EVIDENCE.**