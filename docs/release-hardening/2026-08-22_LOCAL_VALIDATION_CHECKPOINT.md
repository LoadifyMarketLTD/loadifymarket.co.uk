# LOADIFY MARKET — RELEASE-HARDENING LOCAL VALIDATION CHECKPOINT

**Date:** 22 August 2026  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Lane:** `release-hardening/audit-20260822`  
**Reason for checkpoint:** repository implementation/static Branch Guard is complete enough to enter the mandatory local PowerShell gate, but this chat cannot execute commands on the owner's Windows machine. No PASS is claimed before that local evidence exists.

---

## 1. CURRENT GITHUB TRUTH

At the last verification before this checkpoint:

- `main = aca0d19c1cad7fe047ca1e591df790cf2280b840`
- hardening branch = `release-hardening/audit-20260822`
- hardening compare = **ahead 23 / behind 0** before adding this checkpoint document
- merge-base = exact current `main`
- expected hardening HEAD immediately before this checkpoint commit = `667550dadcb0405e9ae6f02c453ad4d83d994d09`
- only open PR = **#575 — Plan Seller Workspace capability expansion**
- PR #575 remains untouched
- hardening branch has no PR

Adding this checkpoint document intentionally adds one docs-only commit to the hardening branch. Re-verify current main/head/ahead/behind before local validation; repository truth wins if anything moved.

---

## 2. OWNER VALIDATION POLICY

This lane must remain:

- **NO GitHub Actions / CI**
- **NO Netlify preview/build validation**
- **NO PR opened just to obtain CI**
- **NO production Supabase migration / db push**
- **NO production Auth config mutation**
- **NO merge into main without separate authorization**
- **NO modification of PR #575**
- **NO Workspace/Admin/Super Admin redesign**
- **NO Supplier Commerce activation**

Validation is local PowerShell only.

---

## 3. OWNER LOCAL ANDROID WORKTREE — ABSOLUTE PRESERVATION RULE

The owner's working copy has local Android modifications that must survive untouched:

- `android/app/capacitor.build.gradle`
- `android/capacitor.settings.gradle`

Never run destructive cleanup/reset/restore on those files.

The validator therefore does **not** checkout the hardening branch into the owner's working tree. It creates a disposable detached `git worktree` under `%TEMP%` at the exact remote branch SHA, validates there, then removes it.

---

## 4. ORIGINAL RELEASE-HARDENING IMPLEMENTATION

The branch originally contained the historical replay/security closure:

- `supabase/09_zz_legacy_transport_replay_compat.sql`
- `supabase/456_00_remove_legacy_transport_replay_compat.sql`
- `supabase/673_public_seller_projection_security_closure.sql`
- `supabase/674_server_only_privilege_closure.sql`
- `netlify/functions/__tests__/legacy-transport-replay-envelope.test.ts`
- `netlify/functions/__tests__/release-hardening-security-contract.test.ts`
- release-hardening audit ledger

Purpose:

1. allow historical numeric migration replay to pass the removed `delivery_requests` / `transport_quotes` references without restoring those product surfaces permanently;
2. close the owner-rights `seller_profiles_public` view Security Advisor debt by replacing it with a curated read-only RLS projection table;
3. revoke unnecessary ordinary-client CRUD privileges on server-only rate-limit state and `category_filter_definitions` where present;
4. revoke direct API execution of the trigger-only seller-suspension helper.

---

## 5. TEST-HARNESS RECONCILIATION COMPLETED IN BRANCH

The previous local full run reported `23 failures / 7 suites`. Investigation confirmed several stale fixtures and Windows-only path fragility. Runtime security was not weakened to satisfy tests.

Repairs made:

- `commercial-history-consumers.test.ts` now reads repo files via `path.resolve(process.cwd(), ...)`;
- `commercial-snapshot-cutover.test.ts` uses the same deterministic repo-root reading;
- `marketplace-tax-evidence.test.ts` uses the same deterministic repo-root reading;
- `delete-product.test.ts` now supplies canonical active-account fixture fields: `id`, `role`, `isActive=true`;
- `update-product.test.ts` now supplies current seller activation + commercial/tax declaration + product tax evidence + shipping readiness fixtures;
- `checkout-safety.test.ts` now supplies current active buyer/seller, immutable buyer identity, seller business identity, GB non-VAT declaration truth, product P1 tax evidence and shipping truth;
- `create-checkout.test.ts` now has current active-account fixtures and stale-buyer/inactive-seller regression coverage;
- `create-payment-intent.test.ts` now has both inactive-seller and stale-buyer mobile regression coverage.

The old `8/8 targeted PASS` result predates these changes and is historical evidence only. Current branch must be rerun.

---

## 6. REAL P1 FOUND DURING FIXTURE AUDIT — REPAIRED

The failing checkout fixtures exposed a real trusted-server authorization gap, not merely a stale test.

### Root cause

- checkout/payment handlers use a Supabase service-role client;
- browser RLS is therefore not the authority at that server boundary;
- the old handlers validated the JWT but did not re-read current `public.users.isActive` for the buyer before product reservations / Stripe payment side effects;
- seller readiness relied on denormalized `seller_profiles` even though canonical account suspension truth lives in `public.users.isActive`.

A stale JWT therefore required an explicit current-account server check.

### Repair

`netlify/functions/create-checkout.ts` and `netlify/functions/create-payment-intent.ts` now:

1. call `authenticateActiveAccount(event, supabase)` before reservation/payment side effects;
2. fail closed with 403 when the authenticated buyer account is no longer active;
3. preserve buyerId/auth-user identity matching;
4. re-read the listing seller from `public.users`;
5. require `role='seller' AND isActive=true` before seller profile / Stripe readiness can authorize payment;
6. preserve the existing tax resolver, prices, `totalPence`, transfer group, payment-session snapshot, order materializer and payout semantics.

No unrelated UI or commercial redesign was introduced.

---

## 7. DISPOSABLE DATABASE EVIDENCE ADDED

Added:

`supabase/tests/release_hardening_contract.sql`

The pgTAP contract verifies after full local replay:

- `delivery_requests` absent;
- `transport_quotes` absent;
- `seller_profiles_public` is a real table/projection, not an owner-rights view;
- projection RLS enabled;
- anon/authenticated retain SELECT only;
- anon/authenticated cannot mutate projection;
- authenticated cannot directly execute trigger-only seller suspension helper;
- no anon/authenticated CRUD grants remain on `*_rate_limits` tables;
- `category_filter_definitions` is either absent or present with ordinary-client CRUD closed.

---

## 8. CURRENT PRODUCTION READ-ONLY RECHECK

No production mutation was made.

Latest read-only verification immediately before this checkpoint:

- migration head remains `20260822185156 / seller_onboarding_v2_truth`;
- `public.seller_profiles_public` is still a PostgreSQL view (`relkind='v'`), owner `postgres`, RLS false;
- `private.seller_profiles_public_data` still exists;
- `public.delivery_requests` is absent;
- `public.transport_quotes` is absent;
- `category_filter_definitions` still exposes historical ordinary-client grants;
- **9 public `*_rate_limits` tables** currently expose at least one anon/authenticated CRUD grant.

This confirms migrations 673/674 have **not** been applied accidentally and their production preconditions still match the audited state.

---

## 9. STRICT POWERSHELL VALIDATOR

Added:

`scripts/validate-release-hardening-local.ps1`

The validator:

1. prints but never modifies the source working tree;
2. fetches origin;
3. locks current `origin/main` and hardening SHA;
4. requires hardening merge-base = current main and behind=0;
5. creates a disposable detached worktree at the exact hardening SHA;
6. runs `npm ci`;
7. runs targeted hardening tests;
8. runs the repaired/regression suite group;
9. runs the complete Vitest suite;
10. runs ESLint;
11. runs TypeScript typecheck;
12. runs production build with placeholder public build variables;
13. only if all Node/TS/build gates are green, starts a fresh isolated local Supabase stack;
14. refuses to stop/reuse any pre-existing `supabase_db_*` container;
15. moves timestamped migrations aside during stack startup so the numeric historical replay can be tested explicitly;
16. replays executable numeric `supabase/*.sql` files in numeric-prefix / filename order;
17. explicitly excludes deprecated `00_consolidated_schema.sql` from execution;
18. replays timestamped `supabase/migrations/*.sql` afterwards;
19. runs `supabase db lint --local --schema public --level error --fail-on error`;
20. runs `supabase test db supabase/tests/release_hardening_contract.sql --local`;
21. re-fetches origin and invalidates the evidence if main or hardening branch moved during the run;
22. rejects `android/*`, `src/*` or `public/*` contamination in the final hardening diff;
23. removes the disposable worktree and local Supabase stack in `finally`.

Every native command gate checks `$LASTEXITCODE` and stops immediately on failure.

---

## 10. EXACT OWNER COMMAND — DOES NOT CHECKOUT OR MODIFY THE DIRTY SOURCE WORKTREE

Run this in PowerShell:

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

This command performs only a fetch against the existing source repo, materializes the validator into `%TEMP%`, and lets the validator create its own disposable worktree. It does not checkout/reset/stash/restore the Android files.

---

## 11. ACCEPTANCE GATES STILL PENDING

Do **not** declare release-hardening PASS until the local validator proves all of the following on the same locked branch SHA:

- targeted hardening tests PASS;
- repaired/regression suites PASS;
- full Vitest suite PASS;
- ESLint PASS;
- TypeScript PASS;
- production build PASS;
- complete fresh numeric migration replay PASS;
- timestamped migration replay PASS;
- DB lint PASS;
- release-hardening pgTAP contract PASS;
- final branch still behind 0;
- main did not move during validation;
- branch did not move during validation;
- exact diff remains scope-clean.

If any step fails, STOP at the **first failure**, repair the root cause on `release-hardening/audit-20260822`, then rerun the validator from the beginning.

---

## 12. NO-ACTION GUARD AFTER LOCAL PASS

Even if all local validation becomes green, this checkpoint does **not** authorize:

- PR creation;
- merge into main;
- GitHub Actions;
- Netlify;
- production deploy;
- `supabase db push`;
- applying 673/674 to production;
- Auth config changes;
- modifying PR #575;
- resetting/restoring/stashing Android local changes;
- Supplier Commerce activation.

After a full local PASS, perform final evidence review and wait for separate owner authorization for any merge/deploy/production action.

---

## 13. EXACT RESUME POINT

1. Owner runs the PowerShell block in section 10.
2. Capture the first failure or the final PASS banner verbatim.
3. Continue from that exact evidence; do not restart the audit.
4. If the validator fails, repair only the demonstrated root cause, then rerun from the start.
5. If it passes, perform final exact-diff/Branch Guard evidence review and stop before PR/merge/deploy/production.

**NO FAKE PASS. LOCAL VALIDATION IS THE NEXT REQUIRED EVIDENCE.**
