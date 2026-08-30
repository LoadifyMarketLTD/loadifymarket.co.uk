# Main Branch Protection Policy — P0 Governance

Status: PREPARED / NOT YET ACTIVATED
Date: 30 August 2026
Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
Target branch: `main`

## Canonical decision

Loadify Market does **not** use GitHub Actions as a code-quality, compile, test, E2E or production-build gate while GitHub Actions credits/runners are unavailable.

The verification model is now:

1. **Local CLI gate before push**.
2. **Netlify Build / Deploy Preview gate on every PR**.
3. **PR-only governance for `main`**.
4. **No required GitHub Actions checks**.

Do not re-introduce automatic GitHub Actions verification without an explicit governance decision.

## Observed GitHub state

- `main` currently reports `protected: false`.
- no active branch-protection/ruleset write path is exposed through the connected in-chat GitHub integration.
- therefore this document describes the target policy; it is not evidence that protection is already active.

## Target `main` protection

When a protection write path is available, configure `main` with:

1. changes through pull requests only;
2. direct pushes blocked, except an explicitly documented emergency owner bypass if one is deliberately retained;
3. force pushes blocked;
4. branch deletion blocked;
5. conversation resolution required before merge;
6. no GitHub Actions job required as a status check.

Netlify Deploy Preview is the remote build/test evidence used during PR review. It may later be made a required external status if desired and proven stable, but this policy does not depend on GitHub Actions.

## Local CLI gate

Before a branch is pushed for review, the development environment should run:

```bash
npm ci
npm run e2e:setup
npm run verify:local
```

`verify:local` covers:

- frontend TypeScript;
- ESLint;
- Vitest suite;
- migration inventory/health guard;
- Playwright E2E TypeScript;
- Playwright browser E2E;
- production build.

Credentialed Buyer/Seller/Admin Playwright cases remain fixture-gated. Secretless guest and unauthenticated BOLA cases must still execute.

## Netlify remote gate

`netlify.toml` runs the repository-owned `verify:netlify` command before a Deploy Preview is published.

The Netlify gate covers:

- frontend TypeScript;
- ESLint;
- Vitest suite;
- migration inventory/health guard;
- Playwright E2E TypeScript;
- Playwright test discovery;
- production Vite build.

Browser Playwright execution is intentionally local rather than executed in Netlify.

A PR is not considered remotely green until its exact HEAD has a successful Netlify Deploy Preview.

## GitHub Actions

Automatic GitHub Actions workflows for web CI, role-isolation E2E and Android compilation are removed from the active repository configuration. Historical workflow implementations remain recoverable through Git history if ever needed.

No failed/queued GitHub Actions run is to be interpreted as a code-quality verdict under this governance model.

## Financial side-effect boundary

No routine E2E test may trigger a live:

- checkout payment;
- Stripe Transfer;
- escrow release;
- refund;
- irreversible fulfillment mutation.

Any future mutation E2E must use dedicated test-mode identities/data and explicit enablement.

## Activation verification

Branch protection is ACTIVE only after a fresh GitHub read reports `main.protected === true` or an equivalent active ruleset.

A policy file, Netlify success or merged PR alone does not prove GitHub branch protection is enabled.
