# Loadify Market — Coverage Matrix

**Purpose:** living map of critical product/control areas.  
**Reconciled:** 2026-09-10.  
**Important:** this matrix is not itself proof of PASS. Exact test/runtime evidence must be collected for the SHA/release being audited.

---

## 1. Critical-flow control map

| Flow/domain | Primary surface | Required evidence before release decisions | Current audit priority |
|---|---|---|---|
| Signup / login / verification / reset | Public auth + server auth | route/auth tests, capability provisioning, inactive-account behavior, email path, E2E where release-critical | P0 |
| Buyer/Seller capability coexistence | Auth + Buyer/Seller workspaces | server authorization, DB capability state, Seller readiness separation, role-routing regression tests | P0 |
| Product create/edit/publish | Seller + API + DB/storage | auth/readiness, physical-product boundary, media/storage, tax/compliance gates, direct test/E2E | P0 |
| Marketplace browse/search/product | Public + native | current catalogue query semantics, product visibility, search/category/detail behavior, mobile/native checks | P1 |
| Cart / checkout / payment | Buyer + Stripe | pricing/tax evidence, reservation, Stripe session/payment path, webhook/idempotency, failure recovery, E2E | P0 |
| Orders | Buyer/Seller/Admin | order ownership, canonical snapshots/state transitions, role isolation, mobile/web visibility | P0 |
| Shipping / tracking / proof | Buyer/Seller/Admin + public tracking | shipment authorization, transition rules, public lookup privacy, proof upload/storage, tracking links | P0 |
| Returns / refunds / disputes | Buyer/Seller/Admin + payments | eligibility rules, money boundary, audit trail, authorization, customer/seller state consistency | P0 |
| Messaging | Buyer/Seller/native | conversation ownership, blocking, inactive-account behavior, abuse/privacy controls, realtime behavior | P0 |
| Reviews / UGC / reports | Public/Buyer/Admin/native | verified-purchase/provenance rules, report/block/moderation paths, hidden/deleted state, Play UGC requirements | P0 |
| Seller Stripe Connect / balance / payouts | Seller/Admin + Stripe | Connect readiness, server privilege boundary, payout/financial truth, no unsafe direct RPC authority | P0 |
| Support | Public/account/Admin | request validation, privacy, support-ticket permissions, escalation path, transactional email | P1 |
| Account deletion / privacy | Web/native + API/data | authenticated deletion behavior, public deletion resource, retention/anonymisation, Privacy/Data Safety consistency | P0 |
| Push notifications | Native + Supabase/Firebase | device-token ownership, logout/account switch cleanup, permissions, delivery/deep-link behavior | P1 |
| Android release | Capacitor/Gradle/Play Console | version/signing/package, production assets, permissions, Data Safety, store listing, AAB, device smoke | P0 |
| SEO / sitemap / feeds | Public/edge/functions | current physical-product filtering, canonical/meta correctness, crawlability, no unsupported service exposure | P1 |
| Admin governance | Admin + server/DB | privileged auth, least privilege, moderation/actions, no Buyer/Seller privilege leakage | P0 |
| Supplier Commerce | internal/provider/server/DB | canonical phase, provider capability/legal evidence, pilot policy, allowlists/caps/kill switch, exact runtime evidence | P0 |
| Product Discovery / AI Builder | internal | canonical supplier-data prerequisite, recommendation-only boundary, AI Facts Lock, rights/compliance provenance | P1 |
| Tax/VAT/customs | checkout/product/supplier/finance | current business contract, versioned tax evidence, fail-closed unsupported cases, no hard-coded universal rate | P0 |
| Recovery/rollback | platform/data/payments | restore/rollback evidence appropriate to changed systems, not just Netlify deploy history | P0 for sensitive releases |

---

## 2. Evidence layers

| Level | Evidence type | What it can prove |
|---|---|---|
| L0 | typecheck/lint/build/migration verification | static/build integrity only |
| L1 | unit/integration tests | asserted code/contract scenarios |
| L2 | Playwright/device/browser E2E | tested user flow in tested environment |
| L3 | RLS/privilege/webhook/idempotency/security checks | tested security/data boundary |
| L4 | production/service/provider observations | current external/runtime state observed |
| L5 | canonical/business/legal evidence | authority for business/legal/commercial behavior |

A lower level cannot silently substitute for a required higher level.

---

## 3. Current repository validation entrypoints

Use `package.json` as the authority. Current commands include:

```bash
npm run typecheck
npm run lint
npm test
npm run verify:migrations
npm run e2e
npm run build
npm run verify:local
```

Netlify Deploy Preview currently runs lint + unit tests + production build according to `netlify.toml`.

There is no current `.github/workflows/ci.yml` on `main` at the time of this reconciliation, so this matrix must not cite that historical file as current build evidence.

---

## 4. Current product-boundary corrections

The following stale assumptions have been removed from this matrix:

- RFQ/service commerce as a current Buyer critical flow;
- old `/dashboard`/`src/App.tsx` route inventory as current routing truth;
- SendGrid as the current general transactional-email dispatcher;
- a historical GitHub Actions workflow as current CI authority;
- historical fixed commission/VAT/payout models as universal current truth.

The active Google Play/native v1 commerce boundary is physical products. Legacy service/RFQ schema or query compatibility remnants must be audited as legacy seams, not advertised as active product capability.

---

## 5. Release-use rule

Before using this matrix to call a release PASS:

1. record exact branch/SHA;
2. inventory current routes/functions/tests for the affected flows;
3. collect actual L0–L5 evidence required by those flows;
4. verify production/external state where the release depends on it;
5. run Branch Guard against unrelated product/security/payment regressions;
6. record unknowns as unknowns.

A green row without current evidence is not a PASS.
