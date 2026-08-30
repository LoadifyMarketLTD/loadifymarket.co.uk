# Main Branch Protection Policy — P0 Governance

Status: PREPARED / NOT YET ACTIVATED
Date: 30 August 2026
Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
Target branch: `main`
Baseline commit: `327b61e21feea91d432664337d9a818a9566b6f1`

## Observed GitHub state

At the start of this P0 work:

- `main` reports `protected: false`.
- no repository rulesets are configured.
- the connected GitHub integration exposes admin repository permission, but the available in-chat branch-protection/ruleset API is read-only; no protection write action is exposed.

Therefore this document is the canonical activation contract. Do not claim Branch Protection is active until GitHub reports `protected: true` (or an active matching ruleset) after an actual settings write.

## Required main policy

When the protection write path is available and CI runner health is confirmed, configure `main` with:

1. Pull-request-only changes to `main`.
2. Block direct pushes except a deliberately configured emergency bypass if the repository owner decides one is required.
3. Block force pushes.
4. Block branch deletion.
5. Require branches to be up to date before merge (`strict` status checks).
6. Require conversation resolution before merge.
7. Do not require an external approval count by default for the current owner-operated workflow; the PR boundary plus required checks is the P0 safety invariant. Review requirements can be increased later without changing runtime code.

## Required status checks

The current canonical CI workflow exposes the following job names. The P0 protection target is:

- `Lint`
- `Type Check`
- `Critical Smoke Tests`
- `Production Build`

`Production Build` already depends on lint, typecheck, unit tests, migration health, and critical smoke tests, but the explicit checks above make the intended governance surface visible in GitHub.

Do not activate required checks while GitHub Actions is unable to start jobs for account/runner/billing reasons. Doing so would create a governance deadlock where correct PRs cannot be merged for infrastructure reasons unrelated to code quality.

## Playwright E2E policy

The new `Role Isolation E2E` workflow is initially an observation/non-required check until all of the following are true:

1. GitHub Actions runners start reliably.
2. Netlify Deploy Preview is consistently reachable by the predictable PR URL.
3. the secretless guest/BOLA suite has passed on real preview deployments.
4. Buyer/Seller/Admin E2E test accounts are provisioned as non-production fixtures.
5. credentialed role-flow tests are observed green without production data mutation.

After those gates, `Role Isolation E2E` may be promoted to a required status check.

## E2E secrets / fixtures

Credentialed tests use these GitHub Actions secrets when present:

- `E2E_BUYER_EMAIL`
- `E2E_BUYER_PASSWORD`
- `E2E_SELLER_EMAIL`
- `E2E_SELLER_PASSWORD`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`
- `E2E_FOREIGN_ORDER_ID` — an order owned by a seller other than the E2E seller, used only to assert a 403 BOLA denial.

The guest isolation and unauthenticated API tests run without these secrets.

## Financial side-effect boundary

No PR E2E test may trigger live escrow release, Stripe Transfer, refund, payment capture, or real fulfillment state mutation.

The canonical `escrow-release.ts` can move funds. Any future mutation E2E for escrow release must require all of:

- Stripe test mode only;
- a dedicated seeded test order;
- dedicated test seller/buyer identities;
- explicit mutation enablement;
- reconciliation/cleanup assertions.

Until then, Admin E2E verifies access to canonical order/payout reconciliation surfaces without clicking or invoking a release action.

## Activation verification

Branch protection is considered ACTIVE only after a fresh GitHub read confirms one of:

- `main.protected === true` with the expected required status checks; or
- an active ruleset targeting `main` with equivalent PR/status/force-push/deletion controls.

A policy document, workflow file, or successful PR build by itself is not evidence that GitHub branch protection has been activated.
