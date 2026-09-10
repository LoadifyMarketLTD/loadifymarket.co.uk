# Loadify Market — Audit Master Framework

**Purpose:** provide a repeatable audit system without freezing stale route, CI, provider or product assumptions.  
**Scope:** public platform, marketplace, Buyer/Seller/Admin surfaces, Android, Netlify functions, Supabase/RLS, Stripe, Supplier Commerce, privacy/Google Play, SEO and production operations.  
**Reconciled:** 2026-09-10.

---

## 1. Audit principle

An audit is credible only when its claims are tied to the exact repository/runtime state being evaluated.

Every audit must record:

1. exact `main`/branch SHA;
2. affected surface and user role;
3. controlling business/canonical contract where applicable;
4. current code/database/runtime evidence;
5. tests/checks actually executed;
6. production/external evidence actually observed;
7. known unverified areas;
8. next action or release gate.

Do not reuse a historical PASS, route inventory or gap matrix as current evidence.

---

## 2. Source-of-truth hierarchy

When audit sources disagree:

1. controlling canonical contract;
2. newest controlling clarification;
3. current repository code and migrations;
4. current verified production evidence;
5. current official external evidence where relevant;
6. preparation documents;
7. historical audits/plans;
8. assumptions.

Historical audit documents are useful only as dated evidence of what was observed at that time.

---

## 3. Current audit surfaces

| Surface | Typical scope |
|---|---|
| Public platform | `/`, Platform, Buyers, Sellers, Business/Trade, Suppliers, Technology, Integrations, Partners, Developers, How It Works, Trust |
| Marketplace | Marketplace home, catalogue, category, product, cart, checkout, tracking |
| Buyer | profile, addresses, payments/account, orders, favourites, reviews, messages, notifications, returns/disputes |
| Seller | activation/onboarding, listings, stock, orders, shipments, returns, messages, reviews, payments/balance |
| Admin | users, sellers/approvals, products/moderation, orders, disputes, support, settings, payouts, Stripe events |
| Native Android | marketplace-first navigation, Sell, Inbox, Profile, Orders, safety/account/privacy flows |
| Platform API | Netlify functions and modern wrappers |
| Data/security | Supabase schema, migrations, RLS, RPC/service-role boundaries, storage |
| Payments | Stripe checkout, webhooks, Connect, payouts/refunds/disputes/reconciliation boundaries |
| Supplier Commerce | canonical products/offers, provider capability, sourcing/import, fulfilment, finance/compliance, Phase O controls |
| Messaging/UGC | conversations, reviews, reports, blocking/moderation |
| Privacy/release | account deletion, Data Safety, Android permissions, Google Play declarations, release artifacts |
| SEO/discovery | metadata, sitemap, feeds, crawlable public surfaces |
| Operations | error reporting, CSP, logs, scheduled jobs, recovery/rollback evidence |

The route/component inventory must be generated from current `src/AppRoutes.tsx` and current code during the audit, not copied from January/March 2026 inventories.

---

## 4. Evidence levels

### L0 — Static/build integrity

Examples: typecheck, lint, migration verification, production build.

This proves compilation/static gates only.

### L1 — Unit/integration behavior

Vitest or equivalent tests for exact functions/components/contracts.

This proves only the scenarios asserted by those tests.

### L2 — E2E/user-flow behavior

Playwright, controlled browser/device flow, or equivalent end-to-end evidence.

This proves the tested environment/flow, not unrelated roles or production state.

### L3 — Security/data boundary

RLS/privilege/migration/storage/webhook/idempotency/auth checks with exact evidence.

### L4 — Production/external evidence

Production smoke checks, logs, provider API evidence, Stripe/Supabase/Netlify state, Google Play Console state, or other external authoritative observations.

### L5 — Business/legal/canonical gate

Required where product behavior depends on Merchant/Seller of Record, tax/VAT/customs, supplier rights, content rights, product safety, provider commercial capability or other business/legal truth.

A lower-level PASS cannot substitute for a higher-level gate.

---

## 5. Current validation surfaces

The authoritative local commands are defined in `package.json`. At the time of reconciliation these include:

```bash
npm run typecheck
npm run lint
npm test
npm run verify:migrations
npm run e2e
npm run build
npm run verify:local
```

Netlify Deploy Preview currently runs install + lint + tests + production build according to `netlify.toml`.

Do not cite `.github/workflows/ci.yml` unless that workflow actually exists on the audited branch; it did not exist when this framework was reconciled.

---

## 6. Audit rules for sensitive domains

### Identity and authorization

Verify server-governed capabilities, Admin isolation, active/suspended-account behavior, action-level readiness and RLS. UI visibility is not authorization evidence.

### Payments and tax

Verify canonical amount/tax evidence, Stripe boundary, webhook verification/idempotency and financial-state separation. Never infer universal VAT, payout timing or Merchant-of-Record truth from historical docs.

### Supplier Commerce

Read the controlling canonical Supplier Commerce README and continuation plan. Current phase is Phase O — Controlled Pilot; provider activation remains capability/evidence dependent.

### Android / Google Play

Audit what is actually exposed in the APK. Verify Android manifest/dependencies, permissions, privacy/Data Safety/account deletion, signing/version, bundle and Console declarations separately from the wider web platform.

### UGC and safety

Verify reporting/blocking/moderation, review provenance and privacy/security boundaries. Do not convert external ratings into Loadify verified-purchase reviews.

---

## 7. No Fake PASS

Never equate:

- build PASS with E2E PASS;
- test existence with test execution;
- preview READY with visual approval;
- migration file with production migration applied;
- documented provider capability with authenticated current provider evidence;
- API authentication with commercial permission;
- simulator with controlled pilot;
- Android build with Play approval;
- old audit report with current state.

Every PASS statement must name the evidence and its boundary.

---

## 8. Coverage matrix maintenance

`docs/audit/COVERAGE_MATRIX.md` is a living control map, not a frozen inventory.

Before using it for a release decision:

- compare it with current routes/functions/tests;
- update changed surfaces;
- remove resolved/stale assumptions;
- record exact evidence for the audited SHA;
- distinguish current repository evidence from production evidence.

---

## 9. Historical audit material

Dated checkpoints/ledgers may be preserved to maintain traceability. They must remain clearly historical and must never silently override current product direction.

Obsolete one-off transformation roadmaps, stale route inventories and superseded design concepts should not remain as current-looking guidance once they no longer represent Loadify.

---

## 10. Default audit loop

**READ REAL STATE → IDENTIFY CONTROLLING CONTRACT → INVENTORY CURRENT SURFACES → MAP RISKS → RUN STATIC/TEST/E2E/SECURITY CHECKS → VERIFY PRODUCTION/EXTERNAL STATE WHERE REQUIRED → BRANCH GUARD → RECORD WHAT IS AND IS NOT PROVEN.**
