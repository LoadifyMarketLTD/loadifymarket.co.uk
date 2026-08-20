# LOADIFY MARKET — PR EXECUTION PLAN

**Version:** 1.0  
**Date:** 20 August 2026  
**Purpose:** Controlled Pull Request execution map for the Loadify Market Consolidated Master Plan V2.

## 1. Principle

The 46 Master Plan steps are **not** 46 PRs. The target is **12 major implementation PR packages**. A package can contain multiple commits and tightly coupled vertical slices while it remains coherent, testable and safely reversible.

- **Target:** 12 major PRs.
- **Safety-adjusted ceiling:** normally 13–14 only when a real production cutover, data-compatibility requirement, irreversible external side effect or rollback risk makes an A/B split safer.
- **Runtime policy:** normally one primary implementation PR on the critical path at a time.
- Do not open all 12 PRs in advance.
- Documentation/reference branches do not count as runtime implementation PRs.

## 2. Global PR Rules

Every PR must preserve one customer-order truth, one financial truth, server-side authority, commercial history and provider isolation. No unrelated visual redesign, opportunistic cleanup, provider-specific commerce core, client-side critical-state bypass, destructive history rewrite or fake supplier-as-seller model.

Every new data family receives explicit authorization/RLS/grant design. Money, inventory, order, supplier-submission and refund mutations receive idempotency/concurrency analysis. A green build alone never authorizes merge.

Required evidence includes base/head SHA, exact changed paths, migrations, server/RPC changes, affected web/mobile/Admin consumers, build/tests, DB privilege/RLS/constraint evidence where relevant, critical E2E, deployment/migration state, Branch Guard result and intentionally deferred work.

## 3. Internal Workflow for Every PR

**DISCOVER → CONTRACT → EXPAND → PRODUCERS → CONSUMERS → VERIFY → CUTOVER → CLEANUP → BRANCH GUARD → MERGE**

- **DISCOVER:** refetch current `main`, production schema, relevant PRs, boundaries and consumers.
- **CONTRACT:** define exact business/data/security invariant.
- **EXPAND:** add backward-compatible schema/API capability first.
- **PRODUCERS:** move authoritative server/RPC/event writers to the new truth.
- **CONSUMERS:** migrate required Web/Mobile/Admin readers/writers.
- **VERIFY:** success, failure, retry, duplicate, unauthorized, stale and concurrency paths.
- **CUTOVER:** change authority only after compatibility is proven.
- **CLEANUP:** remove old bypasses/constraints only after cutover evidence.
- **BRANCH GUARD:** exact diff, security, history, financial/data impact, consumers and rollback safety.

---

# 4. THE 12 MAJOR PR PACKAGES

## PR 1 — Supplier Foundation & Control Plane

**Master Plan:** Steps 1–7 where runtime implementation is required.

Build/reconcile the safe base for Supplier Commerce: factual baseline, only blocking foundation P0/P1 closure, commercial responsibility matrix sufficient for schema decisions, Supplier Commerce feature controls/kill switch, structured events/correlation IDs, canonical idempotency conventions, Supplier Registry, Supplier Accounts, capabilities, lifecycle, server-only credential references, Supplier Adapter V1, Qualification, versioned SLA, operational risk, RLS and server authorization.

**Not included:** canonical catalog, checkout change, supplier-order submit, full Admin redesign, mobile completion.

**PASS:** a supplier is a first-class, auditable, controllable operational entity independent from marketplace Seller identity; private supplier data/credentials are inaccessible to unauthorized clients.

## PR 2 — Canonical Catalog / Supplier Offers / Compliance

**Master Plan:** Steps 8–10.

Canonical Product identity and match confidence; relationship with existing seller `products`; Supplier Product/Variant/Offer; supplier SKU, cost/currency, raw stock reference, MOQ, lead time, shipping capability, effective/freshness state; provenance; content/media rights; product compliance and review/publication gate; required Admin review surfaces and security.

**Invariants:** marketplace `offers`/`product_offers` remain buyer-seller negotiation; they are not Supplier Offers. One Canonical Product may have N Supplier Offers. Uncertain matches are never destructively merged.

**PASS:** the same factual product can be sourced from multiple independently changing suppliers without polluting product fact truth or rewriting historical marketplace orders.

## PR 3 — Import Pipeline / AI Facts Lock / Discovery Foundation

**Master Plan:** Steps 11–13.

Governed URL/feed/catalog/operator import; source/supplier identification; raw evidence vs normalized truth; canonical matching; resumable/idempotent jobs; duplicate prevention; category/provenance/compliance/economics gates; AI Product Builder under Facts Lock; fact-to-copy traceability and review; Product Discovery/Opportunity Intelligence foundation with explainable recommendations.

**PASS:** no URL/source/AI bypass can directly create unverified live commercial truth, and core commerce remains functional without Discovery.

## PR 4 — Commerce Economics: Landed Cost / Tax / Pricing

**Master Plan:** Steps 14–16.

True Landed Cost, supplier shipping/cost, processor/provider fees, applicable tax/VAT/customs/duty evidence, FX/effective timestamps where relevant, configured return/failure allowances, explicit unknown-cost handling, versioned tax rules, commercial-model price authority, margin floors/targets, margin guard, safe automatic adjustments and anomaly/review behavior.

**PASS:** every Supplier-Fulfilled price used for a new transaction is backed by evidenced economics and a current policy/rule version; missing critical evidence fails closed.

## PR 5 — Canonical Commerce Financial Ledger

**Master Plan:** Step 17 plus affected consumers.

Append-safe ledger/event model for customer money, VAT, processor fees, Loadify revenue/commission, supplier payable/cost/shipping, seller-payout relationship, refunds, supplier recovery, chargebacks, write-offs, corrections/reversals, external references and reconciliation state. Progressively migrate Admin/analytics/order financial consumers to ledger truth.

**Invariant:** Seller Payout ≠ Supplier Payable.

**PASS:** one canonical representation exists for each financial event and multiple dashboards cannot silently calculate different money truth.

## PR 6 — Supplier Inventory / Sellability / Price Health

**Master Plan:** Steps 18–19.

Raw stock observation, source/freshness/confidence, safety buffer, reservations, Loadify sellable state/quantity, stale/unknown behavior, optional backorder policy, supplier price observation/sync, freshness/anomalies, margin breach handling, Admin health/alerts and checkout-facing proof.

**PASS:** raw stock is never treated as automatically sellable and checkout can atomically prove acceptable stock/price evidence.

## PR 7 — Supplier Commerce Checkout / Customer Order / Fulfilment Legs

**Master Plan:** Steps 20–21.

Extend existing Checkout/PaymentIntent rather than build parallel checkout. Pre-payment server validation of model/offer/supplier/compliance/stock/price/delivery/landed-cost/margin/tax; immutable commercial evidence; preserve Marketplace Seller flow; one Customer Order; internal Fulfilment Legs; order-item responsibility; compatibility for seller/Direct/Supplier-Fulfilled legs; controlled evolution of shipment identity.

**Critical seam:** do not simply remove `shipments_one_per_order`. Use EXPAND → compatible producers/consumers → VERIFY → CUTOVER → CLEANUP and preserve shipment history.

**PASS:** customer still sees one Loadify order while internal legs progress independently and client code cannot override authoritative commercial data.

## PR 8 — Payment → Supplier Execution / ACK Recovery

**Master Plan:** Step 22.

Per-leg supplier submission, required stock/price recheck, permanent business idempotency for irreversible submit, acknowledgement contract, external supplier order ID, duplicate submit/ACK protection, timeout classification, accepted-but-response-lost reconciliation-before-retry, safe failover only to contract-equivalent offers where allowed, audit and simulator coverage.

**PASS:** retries cannot accidentally buy the same fulfilment leg twice; payment success and supplier failure coexist in explicit recoverable states.

## PR 9 — Tracking / Exceptions / Customer Communication

**Master Plan:** Steps 23–25.

Normalize provider/carrier statuses; retain raw evidence; deduplicate/out-of-order events; exception engine for timeout/delay/missing tracking/partial fulfilment/loss/failed delivery/cancellation/suspension; owner/next-action/customer/financial impact; Loadify tracking page; Admin visibility; canonical web/email/push notifications; account isolation and deep-link/order/conversation association; proactive delay policy hooks.

**PASS:** provider-specific status vocabularies become one deterministic Loadify tracking contract and high-risk failures become managed exceptions.

## PR 10 — Returns / Customer Refund / Supplier Recovery / Reconciliation

**Master Plan:** Steps 26–27.

Extend existing return/refund flows; contract/capability-driven return destination; customer return state; processor/customer refund evidence; supplier return/reimbursement/recovery; shipping recovery; unrecovered loss; ledger integration; reconciliation across processor ↔ ledger ↔ supplier payable/payment ↔ refund ↔ recovery ↔ chargeback.

**Invariants:** Customer Return ≠ Customer Refund ≠ Supplier Recovery. Operational completion ≠ Financial Reconciliation. No Loadify warehouse/hub is assumed.

**PASS:** customer remedy can complete even while supplier recovery is pending/failed and Loadify can quantify remaining exposure.

## PR 11 — Operations / Simulator / Supplier Control Centre / Growth Layer

**Master Plan:** Steps 28–43 in coherent internal sub-slices behind feature controls where necessary.

Mandatory operational layer: Supplier Control Centre inside existing Admin/Super Admin; qualification/SLA/risk; compliance/provenance queues; catalog/stock/price health; margin and submit/ACK/tracking/recovery/reconciliation exceptions; incidents; observability; privacy/retention review; backup/restore/replay; simulator; pilot/kill-switch controls; performance scoring and controlled scale.

Commercial/growth capabilities can be included behind flags when mature: Buy Box; canonical social-proof continuity; Supplier Self-Service Onboarding; B2B/Trade evolution using existing B2B foundations; Dynamic Pricing/Margin Strategy; contract-equivalent Supplier Arbitrage; cross-source bundles; Visual Search foundation; personalized discovery; branded Loadify post-purchase experience; proactive retention; fraud/chargeback evidence; policy-bounded AI operations; territory/multi-currency/FX/tax expansion foundations.

**Safety:** if this package becomes unreviewable or contains independent production cutovers, split only then into 11A/11B.

**PASS:** operations can control Supplier Commerce without direct DB editing; simulator/recovery is proven; pilot/scale controls exist; commercial intelligence consumes canonical truth.

## PR 12 — Mobile Parity / Full Platform Hardening / Production Readiness

**Master Plan:** Steps 44–46.

Reconcile Android #514 or successor with final code state; production config/signing/Firebase/Google; login/logout/account switch; push token/session isolation; real-device notification/deep-link acceptance; mobile consumption of final APIs; full Auth/Buyer/Seller/Supplier/Marketplace/Direct/Supplier-Fulfilled E2E; catalog/search/product/cart/checkout/payment/order/tracking/returns/refunds/disputes/messages/notifications/Admin/Super Admin; DB/migrations/RLS/security/privacy/retention; observability/incidents/backup/restore/replay; performance/accessibility/concurrency; release baseline/runbook/accepted risks.

**PASS:** no open P0/relevant P1 for launch scope, no critical data leak, no parallel order/financial/mobile business truth, web/mobile agree and critical recovery paths are proven.

---

# 5. Dependency Map

```text
PR 1  Supplier Foundation & Control Plane
  ↓
PR 2  Canonical Catalog / Supplier Offers / Compliance
  ↓
PR 3  Import / AI Facts Lock / Discovery Foundation
  ↓
PR 4  Landed Cost / Tax Rules / Pricing
  ↓
PR 5  Financial Ledger
  ↓
PR 6  Stock / Sellability / Price Health
  ↓
PR 7  Checkout / Customer Order / Fulfilment Legs
  ↓
PR 8  Supplier Execution / ACK Recovery
  ↓
PR 9  Tracking / Exceptions / Communications
  ↓
PR 10 Returns / Refund / Recovery / Reconciliation
  ↓
PR 11 Operations / Simulator / Control Centre / Growth
  ↓
PR 12 Mobile / Full E2E Hardening / Production Readiness
```

Dependencies are authoritative, not the PR number itself. Non-blocking design may be prepared early, but runtime authority moves only when its dependencies are proven.

---

# 6. When a PR May Be Split

Split only for a real safety reason:

1. old/new DB/runtime cannot safely coexist without separate expand/cutover releases;
2. financial rollback coupling makes independent rollback unsafe;
3. irreversible external side effects require containment;
4. a large data migration/backfill/constraint needs its own evidence window;
5. the branch becomes unreviewable and Branch Guard can no longer isolate impact.

Likely safety-split candidates: PR 7 shipment/fulfilment cutover, PR 11 operations/growth, or a major financial cutover in PR 5/10.

**Expected:** 12.  
**Acceptable safety-adjusted:** 13–14.  
**Not acceptable:** a PR for every table, endpoint, page or test.

---

# 7. Active PR Policy

- Do not pre-open all PRs.
- Create the next critical runtime PR only when its base/dependency is stable.
- Refetch `main` before each branch.
- Reconcile if another agent changed the base.
- Never evolve competing versions of the same schema/API/business contract in parallel.

Dated 20 Aug 2026 treatment:
- **#514:** real Android release-safety code; ultimately belongs to PR 12/final mobile release state unless its small fail-closed repair is safely merged earlier. It does not control the whole Supplier Commerce server roadmap.
- **#516:** documentation/reference only; useful direction is absorbed into Master Plan V2.
- **#518:** preparation-only architecture; useful contracts are inputs to PR 1–11 and must be revalidated against current `main`.

---

# 8. Branch Naming

```text
loadify/pr01-supplier-foundation
loadify/pr02-canonical-catalog
loadify/pr03-import-ai-discovery
loadify/pr04-commerce-economics
loadify/pr05-financial-ledger
loadify/pr06-inventory-price-health
loadify/pr07-checkout-order-fulfilment
loadify/pr08-supplier-execution
loadify/pr09-tracking-exceptions
loadify/pr10-returns-reconciliation
loadify/pr11-operations-growth
loadify/pr12-mobile-production-hardening
```

Safety split example: `loadify/pr07a-fulfilment-expand`, then `loadify/pr07b-fulfilment-cutover`.

---

# 9. Required PR Description

Every implementation PR records Purpose, exact Base SHA, Contract/invariants, Scope, Out of scope, Database/Migrations + compatibility/cutover/rollback, Server Boundaries, Web/Mobile/Admin Consumers, Security/Privacy, Financial/Inventory impact, Evidence, Branch Guard, Production State and Remaining Work.

---

# 10. Merge Gate

A PR merges only when its target capability is complete for that package, migrations are compatible/verified, canonical producers and required consumers agree, no critical direct-write bypass remains, auth/RLS/grants are correct, idempotency/concurrency is addressed, history is preserved, required evidence passes, production state is accurate, Branch Guard passes and the diff contains no unrelated scope.

If any criterion is missing, status is **IN PROGRESS** or **BLOCKED**, never PASS.

---

# 11. What Does Not Get Its Own PR

Normally no standalone PR for one migration, one table, one RPC, one Admin page, one mobile page, one test, evidence-only update, documentation-only update, a bug found and fixed inside the active capability, or pilot evidence with no code change. Standalone remediation is justified only for a merged/production defect that cannot safely wait.

Pilot and Scale are evidence/operational phases, not ceremonial PR numbers. Controls/simulator/observability are primarily delivered in PR 11; real pilot runs against merged code under feature flags.

---

# 12. Final Execution Summary

**12 major PR packages; approximately 14 maximum only when real cutover safety requires it. One critical runtime PR at a time. The objective is to finish Loadify Market as one coherent platform — not maximize PR count, and not minimize PR count at the expense of safety.**
