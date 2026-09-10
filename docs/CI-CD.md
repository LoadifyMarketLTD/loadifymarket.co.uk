# CI/CD — Loadify Market

**Status:** current repository/deployment guidance  
**Authority:** current repository configuration and hosting/runtime evidence win if this document drifts.

---

## 1. Branch and change discipline

`main` is the production source branch.

Repository operating policy requires meaningful changes to be reviewed on a branch/PR rather than written casually to `main`, even if GitHub branch-protection settings do not currently enforce that policy mechanically.

Before a write or merge:

- verify current `main` HEAD;
- inspect open/conflicting PRs and relevant branches;
- inspect the exact diff;
- verify migration head when database work is involved;
- run the applicable validation gate;
- perform Branch Guard review for cross-platform/security/commerce regressions.

Do not claim that direct pushes are technically blocked unless GitHub protection/rulesets are verified at that time.

---

## 2. Current validation commands

The authoritative commands are defined in `package.json`.

Important current commands include:

```bash
npm run typecheck
npm run lint
npm test
npm run verify:migrations
npm run e2e:setup
npm run e2e:typecheck
npm run e2e
npm run build
npm run verify:local
```

`npm run build` itself includes migration verification, focused security tests, TypeScript build and Vite production build according to the current `package.json`.

Do not rely on an old diagram of GitHub Actions jobs as current truth.

---

## 3. Netlify build and Deploy Preview

The current `netlify.toml` is the deployment configuration source.

### Production build

```text
npm ci && npm run build
```

Publish directory:

```text
dist
```

### Deploy Preview validation

Current Deploy Preview command:

```text
npm ci && npm run lint && npm test && npm run build
```

A READY Deploy Preview is useful validation evidence, but it does **not** by itself prove:

- production database state;
- production environment-variable correctness;
- external provider capability;
- Stripe financial state;
- a Supplier Commerce controlled-pilot PASS;
- visual owner approval;
- full production E2E correctness.

---

## 4. GitHub Actions status

Do not document `.github/workflows/ci.yml` as an active repository workflow unless that file exists on the current branch.

At the time of this reconciliation, the repository does **not** contain `.github/workflows/ci.yml`; therefore older documentation describing mandatory `lint → typecheck → test → build` GitHub Actions jobs is historical, not current configuration.

If GitHub Actions is reintroduced, document the actual checked-in workflow and its required-check enforcement rather than copying the historical model.

---

## 5. Database migrations

`supabase/migrations/` is the authoritative ordered repository migration source.

Rules:

- do not edit an already-applied production migration to redefine history;
- create a new corrective migration;
- run `npm run verify:migrations` as applicable;
- verify current production migration history/head before production DDL;
- review destructive operations and RLS/security implications;
- preserve service-role and canonical ownership boundaries;
- capture real production evidence when the release gate requires it.

Legacy numbered SQL copies, old schema-audit files and historical migration instructions do not override `supabase/migrations/` plus current production migration history.

---

## 6. Sensitive release categories

The following require more than a normal static build check:

### Payments / Stripe / payouts / refunds

Verify the exact server boundary, idempotency/webhook behavior, environment and transaction impact. Do not execute real financial mutations merely to prove a docs or UI change.

### Database / RLS / auth

Verify migration ordering, production drift, privilege/RLS impact, inactive-account behavior and rollback/recovery implications.

### Supplier Commerce / external providers

Follow the controlling canonical phase and provider capability evidence. A provider API, scaffold or authenticated read test is not authority for write/order activation.

### Android / Google Play

Verify package/version/signing, production assets/config, Android build, applicable privacy/Data Safety declarations and the release artifact itself. A web Deploy Preview does not certify the Android bundle.

---

## 7. Environment variables and secrets

Environment-specific secrets belong in the authorised hosting/service configuration, not in the repository.

Current code/config references include Supabase, Stripe, transactional email, internal server-secret and other integration variables. The exact required set must be derived from current code and deployment configuration for the affected flow.

Never expose server-only secrets through `VITE_*` client variables.

---

## 8. Rollback and recovery

Netlify deploy history may support application rollback, but application rollback and database rollback are separate concerns.

Never describe “Publish previous deploy” as a complete rollback strategy when a release also changed:

- database schema/data;
- Stripe/provider configuration;
- external webhooks;
- mobile app releases;
- other irreversible external state.

For such releases, use the applicable tested recovery plan and evidence.

---

## 9. Definition of a credible PASS

A PASS statement must identify what actually ran and what it proves.

Do not equate:

- documentation with runtime verification;
- build success with full E2E success;
- preview availability with visual approval;
- historical CI results with current HEAD;
- migration file existence with production application;
- provider connectivity with production activation;
- APK/AAB build success with Google Play approval.

State unverified areas explicitly.

---

*Reconciled with current repository configuration: 2026-09-10.*
