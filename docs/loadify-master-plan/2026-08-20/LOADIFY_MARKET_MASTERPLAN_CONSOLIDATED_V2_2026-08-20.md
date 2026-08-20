# LOADIFY MARKET — CONSOLIDATED MASTER PRODUCT & EXECUTION PLAN V2

**Version:** 2.0  
**Baseline date:** 20 August 2026  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Purpose:** Permanent product direction, implementation sequence, engineering guardrails and cross-chat continuity contract for Loadify Market.

> This document is the GitHub working copy of the Loadify Market Master Plan. It is not a rigid historical checklist. The product goal is authoritative; dated SHAs, PR states and migration heads are snapshots and must be re-fetched before any write.

---

## 0. HOW TO USE THIS PLAN

This plan separates two kinds of truth:

1. **Stable product direction** — the target architecture, commercial invariants, safety rules and completion criteria.
2. **Dated implementation state** — current commits, PRs, migrations, production schema and blockers. These expire and must be verified again.

A new agent must not continue merely because an old brief says “Phase X”. It must recover factual state, compare it with this target architecture, classify what is implemented, and continue from the first genuinely incomplete dependency.

Status vocabulary:

- **NOT STARTED** — no reliable runtime implementation exists.
- **DESIGN READY** — architecture exists, runtime does not.
- **IN PROGRESS** — active implementation exists.
- **BLOCKED** — a real dependency prevents safe continuation.
- **PASS** — implementation plus required evidence satisfy exit criteria.
- **DEFERRED** — intentionally postponed because it does not block the current target.
- **SUPERSEDED** — replaced by a newer canonical implementation.

Documented, compiled, green CI, or “not failing” are not automatically PASS.

---

# 1. FINAL PRODUCT DIRECTION

Loadify Market must become one coherent UK multi-category commerce platform supporting multiple commercial modes without becoming multiple disconnected products.

### Marketplace Seller
Independent sellers list and sell products through Loadify. The existing marketplace remains a first-class product and is not replaced by Supplier Commerce.

### Loadify Direct
Loadify may act as the commercial seller where deliberately enabled. This commercial role does **not** imply that Loadify owns or operates a warehouse. Inventory and fulfilment responsibilities are modeled separately.

### Loadify Supplier-Fulfilled
The customer buys inside Loadify while an approved supplier/fulfilment provider may hold stock and ship directly to the customer. Loadify remains a digital commerce platform; no Loadify-owned warehouse, consolidation hub or open-box centre is assumed by the architecture.

The target Supplier Commerce flow is:

**External Discovery / Operator Sourcing**  
→ **Product Identification**  
→ **Source / Supplier Matching**  
→ **Normalization**  
→ **Canonical Product**  
→ **Multiple Supplier Offers**  
→ **Provenance / Rights / Compliance**  
→ **True Landed Cost / Margin**  
→ **AI Product Builder under Facts Lock**  
→ **Review where required**  
→ **Loadify Listing / Offer Selection**  
→ **Loadify Cart / Checkout / Payment**  
→ **One Customer Order**  
→ **Internal Fulfilment Leg(s)**  
→ **Supplier Submission / Acknowledgement**  
→ **Tracking / Exceptions**  
→ **Returns / Customer Refund / Supplier Recovery**  
→ **Financial Reconciliation**.

The customer remains inside the Loadify experience for discovery, product detail, cart, checkout, payment, orders, messaging, tracking, support, returns and refunds.

---

# 2. NON-NEGOTIABLE PRODUCT INVARIANTS

1. **One customer-order truth.** A buyer sees one Loadify order. Internal fulfilment legs and supplier external IDs are operational evidence, not competing customer orders.
2. **One canonical financial truth.** Money converges on one append-safe ledger/event truth. Admin, Orders, Seller, Supplier and Analytics must not calculate contradictory economics.
3. **One Canonical Product → N Supplier Offers.** Product facts are separate from commercial offers.
4. **Discovery Source ≠ Catalog Source ≠ Supplier ≠ Fulfilment Provider ≠ Carrier.** A provider may perform several roles only when its capabilities and contract justify them.
5. **Merchant model ≠ fulfilment model.** Never reduce architecture to `type=dropshipping`.
6. **Supplier raw stock ≠ Loadify sellable stock.** Freshness, confidence, buffers, reservations, supplier reliability and policy determine sellability.
7. **Payment success ≠ supplier-order success.** Customer payment, supplier submit, acknowledgement, external order ID and reconciliation remain separate evidence states.
8. **Customer Return ≠ Customer Refund ≠ Supplier Recovery.** These are separate operational and financial facts.
9. **Order completed ≠ financially reconciled.** Delivery does not prove processor, ledger, supplier payable, refunds, recoveries and chargebacks reconcile.
10. **Web and mobile use the same business contract.** No mobile-only order/payment/stock/privacy truth.
11. **Security is server authoritative.** UI hiding is never authorization.
12. **Commercial history is not destructively rewritten.** New architecture must preserve paid-order and historical truth.
13. **Provider-specific logic stays behind adapters.** Amazon, TikTok, Alibaba, AliExpress, wholesalers, carriers or future providers do not own Loadify’s core model.
14. **No fake operational data.** Unknown/stale/error is not displayed as fabricated zero or success.
15. **No fake seller to represent a supplier.** Supplier identity is its own operational entity.
16. **Marketplace buyer/seller negotiation offers are not Supplier Offers.** Existing `offers`/`product_offers` keep their marketplace meaning.
17. **Verified product facts are versioned and auditable.** Historical commercial snapshots are immutable; current factual truth may be corrected with evidence and history.

---

# 3. PRODUCT EXPERIENCE DIRECTION

### Public marketplace
Multi-category browse, categories, search, filters, product detail, seller/customer-relevant identity, availability, delivery information, trusted checkout and transparent tracking.

### Seller experience
Onboarding, profile, listings, inventory, orders, shipments, returns, payouts/revenue, messages, notifications and relevant analytics remain seller-owned and isolated.

### Buyer experience
Account, addresses, cart, checkout, orders, payment visibility, messages, notifications, wishlist/favourites where supported, disputes, returns, refunds and tracking must tell the same truth as server and Admin.

### Supplier Commerce experience
Supplier cost, credentials, risk scores, purchasing negotiations and internal notes remain private operational data unless customer disclosure is legally or commercially required.

### Admin / Super Admin
Extend the existing administrative architecture vertically. Do not create a disconnected second admin product.

### Visual direction
Preserve the established Loadify visual system and current Workspace/Admin design unless an explicit redesign is separately approved. Functional implementation must not import stale visual work from unrelated branches.

### Mobile
Mobile consumes the same canonical APIs and lifecycles as web. Native Google sign-in, Firebase, push and deep links are integrations around the same platform, not a second business system.

---

# 4. ENGINEERING MODEL — CREATOR + BRANCH GUARD

Every agent operates simultaneously as:

### LOADIFY MARKET CREATOR / ENGINEER
Investigate, determine root cause, design the canonical solution, implement, integrate affected consumers, validate, repair and continue autonomously. Do not ask the owner for ordinary technical micro-decisions that can be derived from runtime, schema, evidence and product direction.

### LOADIFY MARKET BRANCH GUARD
After every material change:

**IMPLEMENT → INSPECT EXACT DIFF → VERIFY CONTRACT → VERIFY E2E IMPACT → VERIFY SECURITY/PRIVACY → VERIFY FINANCIAL/DATA EFFECT → VERIFY WEB/MOBILE/ADMIN CONSUMERS → REPAIR/REVERT ON FAIL → RECHECK → CONTINUE ONLY AFTER PASS.**

Branch Guard specifically checks for unrelated visuals, scope drift, accidental migrations, direct client bypasses, stale JWT authorization, widened RLS/grants, unnecessary service-role access, destructive history changes, duplicate business contracts, provider-specific core logic, stale consumers, inconsistent money calculations, web/mobile divergence, fake data, retry/race/idempotency failures and secret exposure.

---

# 5. SOURCE OF TRUTH HIERARCHY

When sources disagree, use:

1. Current explicit business decision and stable product invariants.
2. Current commercial/legal contract for the relevant model.
3. Effective production/runtime behavior.
4. Canonical server API/RPC/service boundary.
5. Effective DB schema, constraints, triggers, grants and RLS.
6. Current web/mobile/Admin consumers.
7. Current tests.
8. Legacy documentation, old branches and superseded PRs.

Changing external rules — Stripe, Stripe Connect, UK VAT, customs, product regulation, UK GDPR, provider/carrier APIs and supplier terms — must be checked against current official sources during implementation.

---

# 6. CONTINUITY PROTOCOL FOR A NEW CHAT / AGENT

Before any write:

1. Read this Master Plan and the PR Execution Plan.
2. Confirm repository, default branch and current `main` SHA.
3. Fetch all open PRs and relevant recent merged PRs; classify runtime, migration, docs/preparation, superseded or unrelated.
4. Read production Supabase migration history and compare it with migration files on current `main`.
5. Inspect effective tables, columns, indexes, constraints, functions, triggers, grants and RLS for the current area.
6. Map canonical server APIs/RPCs/functions.
7. Search all web/mobile/Admin consumers that read/write the same state.
8. Classify relevant Master Plan steps as PASS / IN PROGRESS / BLOCKED / NOT STARTED / DEFERRED / SUPERSEDED with evidence.
9. Continue from the first incomplete dependency that affects the target product.
10. Refetch HEAD before writing if parallel work is possible.
11. After every material write, run Branch Guard and record exact diff/evidence/deploy/migration state.

A handoff must include: exact `main` SHA, active branch/PR/head, migration head, completed steps, current step/subtask, production changes, unmerged work, evidence, blockers, explicit out-of-scope areas and the next safe action.

---

# 7. CURRENT-STATE RECOVERY CHECKLIST

### Repository
Current main/tree, open/draft PRs, recent merges, branch comparison, changed files/diff, build/test config, migration ordering and environment workflows.

### Database
Migration history plus effective contract for users/profiles, products/categories, orders/order_items, payment_sessions, shipments/shipment_events, returns/disputes, payouts/seller_balance, messages/notifications/push_tokens, platform_settings and any Supplier Commerce tables. Verify RLS, grants, security-definer functions and indexes encoding business invariants.

### Server runtime
Auth/account status, seller onboarding, product CRUD, checkout/PaymentIntent, Stripe webhook/idempotency, order materialization/history, refunds/disputes/returns, shipment/POD, messaging/notifications, push registration/logout, Admin mutations, flags/kill switches and Supplier Adapter/Commerce functions.

### Consumers
Routes/protected routes, buyer/seller/admin dashboards, catalog/search/product, checkout, order/history/tracking, messages/notifications, mobile counterparts and direct Supabase writes that may bypass server contracts.

### Production evidence
Deployment evidence, rollback-safe DB probes, real-device evidence for native-only behavior, and no persistent production test rows unless deliberately part of a controlled test environment.

---

# 8. DATED BASELINE SNAPSHOT — 20 AUGUST 2026

**Historical snapshot only — re-fetch before acting.**

- `main`: `3a510821a4a3cefd0fed3ce855c1601ef68745ee`.
- Observed production migration head: `20260820083335 / reconcile_payment_safety_hold`.
- Foundation already integrated before this plan included listing-history protection, push/session hardening, server-authoritative shipment boundary, active-account authorization, Storage write boundaries, immutable order/order-item commercial snapshots and payment safety-hold reconciliation.
- Open reference/work observed: #514 Android Firebase release hardening; #516 Supplier Commerce documentation; #518 preparation-only Supplier Commerce architecture.
- Live production remained structurally seller-centric: seller-owned `products`, buyer/seller `orders`, seller-oriented `payouts`, and one shipment per order. Dedicated Supplier Registry/Offers/SLA/Provenance/Risk/Fulfilment-Leg/Commerce-Ledger runtime families were not yet live.
- Important future seam: `shipments_one_per_order` must evolve through a controlled compatibility cutover when fulfilment legs are introduced.
- Preserve existing Workspace/Admin visual direction.

---

# 9. ARCHITECTURE MAP — KEEP / EVOLVE / BUILD

### KEEP / EXTEND
Supabase Auth; buyer/seller profiles and onboarding; public marketplace; category/search/product surfaces; Cart/Checkout; server-authoritative Stripe/payment sessions; existing customer `orders`; immutable commercial snapshots; shipment/POD foundation; returns/disputes/refunds/support/messaging; notifications/push; Admin/Super Admin; current mobile app; `platform_settings` control plane.

### EVOLVE
Seller-centric `products`; single-seller checkout assumptions; `orders.sellerId` assumptions; one shipment per order; seller payout semantics; dashboard financial calculations; current stock fields; feature flags/kill switches.

### BUILD
Supplier Registry/Account; capabilities; Adapter V1/versioning; Qualification/SLA/Risk; Canonical Product; Supplier Product/Variant/Offer; provenance/rights/compliance; governed import; AI Facts Lock/Product Builder; Discovery/Opportunity Intelligence; Landed Cost; tax/VAT/customs rule versioning; Commerce Financial Ledger; supplier stock/sellability/price sync; fulfilment legs; payment-to-supplier handshake; tracking normalization; exception engine; supplier recovery/reconciliation; Supplier Control Centre; observability/incidents; simulator/replay; pilot/scale controls; Buy Box and selected growth features.

---

# 10. STEP-BY-STEP EXECUTION PLAN

## STEP 1 — Factual Baseline Reconciliation
Refetch current reality before new runtime work. Produce a dated baseline of main SHA, migrations, effective schema/RLS/grants/functions, canonical APIs, consumers, open PRs, current P0/P1 and deferred work. **PASS:** no unresolved uncertainty about the canonical foundation needed for the next dependency.

## STEP 2 — Foundation Risk Closure
Close only foundation defects that could corrupt, leak or block future commerce: auth/session isolation, ownership/RLS, commercial history, payment/order integrity, shipment/POD authority, Storage, push privacy, account suspension and safety controls. Mobile release polish does not block server Supplier Commerce unless it exposes a true foundation privacy/security defect. **PASS:** no known P0/relevant P1 in the foundation required by the next work.

## STEP 3 — Commercial Model Contract
For Marketplace Seller, Loadify Direct and Loadify Supplier-Fulfilled define seller of record, merchant/payment role, invoice issuer, recipient, commission, supplier payable, VAT/tax, chargeback/refund/return responsibility, product liability, support, stock and fulfilment ownership. Verify volatile law/payment rules from official sources. **PASS:** every relevant money/obligation event has an accountable owner and system of record.

## STEP 4 — Platform Control Foundations
Extend `platform_settings` into server-enforced feature/model/supplier/category/territory controls where justified. Establish kill switches, correlation IDs, structured events/errors, idempotency conventions, retry/replay ownership, adapter/API versioning and audit metadata. **PASS:** Supplier Commerce can be enabled/disabled/contained safely without rewriting customer data.

## STEP 5 — Supplier Registry & Account Model
Represent supplier legal/operational identity, account/integration status, territories/origins where relevant, contacts, capabilities, credential references, evidence and lifecycle candidate/verification/approved/restricted/suspended/banned or equivalent. **PASS:** Supplier identity is independent of Seller identity and can be suspended/audited without fake users.

## STEP 6 — Supplier Adapter Interface & Versioning
Define SupplierAdapter V1 contracts for capabilities, catalog/product/variant mapping, stock, price, shipping, order submission, acknowledgement, tracking, cancellation, return and reimbursement where supported. Normalize errors, idempotency, timeout/ack semantics, retryability and compatibility. **PASS:** simulator and real adapter can satisfy the same interface without changing commerce core.

## STEP 7 — Supplier Qualification, SLA & Risk
Qualification covers identity, delivery capability, feed/API quality, stock/price accuracy, tracking, returns, documentation, compliance/rights and commercial terms. SLA is versioned/effective-dated. Keep Supplier Compliance separate from operational risk. **PASS:** approval, SLA and risk version are auditable and referenceable by orders/events.

## STEP 8 — Canonical Product Identity
Separate verified product facts from commercial offers. Use GTIN/EAN/UPC/ISBN/MPN, manufacturer/model and verified attributes where relevant. Support confident/possible/distinct/manual-review matching; never destructively merge uncertainty. Map current seller `products` without rewriting historical orders. **PASS:** one factual product can support multiple sellers/suppliers while legacy history remains valid.

## STEP 9 — Supplier Product / Variant / Offer
Represent supplier SKU, variant mapping, cost, currency, raw availability, MOQ, lead time, shipping evidence, effective period, freshness, restrictions, SLA link and state. Existing buyer/seller `offers` and `product_offers` remain separate. **PASS:** N Supplier Offers can change independently behind one Canonical Product.

## STEP 10 — Provenance, Rights & Product Compliance
Track source, original reference, supplier, import time, rights, transformations, evidence and review. Build category/claim/material/territory compliance rules and review states. Public internet availability is not publication permission. **PASS:** Supplier Commerce cannot publish without required provenance/rights/compliance or explicit approved exception.

## STEP 11 — Governed Operator Import Pipeline
`URL / FEED / CATALOG → EXTRACT → SOURCE → SUPPLIER → NORMALIZE → MATCH → CATEGORY → PROVENANCE → COMPLIANCE → ECONOMICS → AI ENRICHMENT → REVIEW → PUBLISH`. Jobs are resumable/idempotent and cannot duplicate products/offers/assets on retry. **PASS:** no direct URL-to-live-product bypass exists.

## STEP 12 — AI Facts Lock & Product Builder
AI may improve title, description, benefits, SEO, FAQ and presentation using verified evidence. It must not invent certifications, materials, dimensions, origin, compatibility, warranty, safety/medical or technical claims. Keep fact-to-copy traceability and operator review where policy requires it. **PASS:** generated claims are auditable to evidence.

## STEP 13 — Product Discovery / Opportunity Intelligence
Use legitimate external/internal signals such as demand, trend, competition, supplier reliability, stock/price stability, landed cost, margin, delivery, returns, seasonality and compliance risk. Produce explainable recommendations; Discovery never writes directly to live truth and never blocks core commerce. **PASS:** commerce works if Discovery is unavailable.

## STEP 14 — True Landed Cost
Model supplier cost + shipping + applicable tax/VAT + customs/duty + FX + processor/provider fees + returns/operational/failure allowances and other attributable costs. Preserve source/effective date. Unknown critical inputs produce REVIEW/HOLD, never fake zero. **PASS:** expected contribution is evidenced.

## STEP 15 — Tax / VAT / Customs Rule Versioning
Represent jurisdiction, commercial model, thresholds, effective dates, version/source/evidence and behavior as versioned rules where needed. Orders reference applied rule/evidence. **PASS:** later rule changes do not rewrite historical tax truth.

## STEP 16 — Pricing & Margin Guard
Define price authority by commercial model, margin floor/target, safe automatic adjustments, abnormal-price review, promotions and loss-prevention. Missing/stale price or margin breach fails closed for new sales. **PASS:** every Supplier-Fulfilled checkout price has a valid pricing decision/policy version.

## STEP 17 — Commerce Financial Ledger
Create append-safe money truth for customer gross/net, VAT, processor fees, Loadify revenue/commission, supplier payable/cost/shipping, FX/customs, refunds, supplier recovery, chargebacks, fees, write-offs, adjustments and contribution. Corrections are reversals/adjustments, not silent rewrites. Seller payout remains distinct from Supplier Payable. **PASS:** one canonical representation exists for every material financial event.

## STEP 18 — Supplier Stock Observation & Loadify Sellability
Track raw supplier stock, source, freshness, confidence, buffers, reservations and stale/unknown state. Compute Loadify sellable quantity/state separately. **PASS:** checkout can atomically prove sellability; stale/unknown cannot masquerade as available.

## STEP 19 — Supplier Price Sync
Implement idempotent price observations/sync, freshness and anomaly classification. Normal moves may update under policy; spikes/margin breach/missing evidence route to review/pause. Never mutate paid snapshots. **PASS:** live offers have trustworthy price freshness.

## STEP 20 — Supplier Commerce Checkout Integration
Extend existing checkout/PaymentIntent rather than create a parallel flow. Server validates commercial model, selected offer, buyer/supplier eligibility, compliance, stock/price freshness, delivery, landed cost/margin and tax before payment. Persist immutable commercial evidence. **PASS:** web/mobile submit the same canonical request and clients cannot override commercial authority.

## STEP 21 — Customer Order Orchestrator & Fulfilment Legs
Keep one customer order. Add internal legs for seller, Loadify Direct or Supplier-Fulfilled responsibility. Each leg carries item/quantity responsibility, state, external evidence, shipment(s), exceptions and financial links. Evolve `shipments_one_per_order` through expand/compatibility/cutover/cleanup while preserving history. **PASS:** multi-source order is one buyer order with independently progressing internal legs.

## STEP 22 — Payment → Supplier Handshake
Flow: validated reservation/order → payment evidence → stock/price recheck when required → supplier submit → acknowledgement → external order ID → operational reconciliation. Use permanent business idempotency for irreversible submissions. Accepted-but-response-lost becomes an explicit unknown/reconcile state; never blindly retry. **PASS:** duplicate purchasing is prevented and failures are recoverable.

## STEP 23 — Tracking Normalization
Map provider/carrier events to canonical Loadify shipment states, retain raw evidence, deduplicate and handle out-of-order events. **PASS:** different providers produce one deterministic customer tracking contract.

## STEP 24 — Commerce Exception Engine
Model supplier timeout, accepted-response-lost, duplicate ACK, stock/price change, provider unavailable, partial fulfilment, delayed dispatch, missing tracking, loss, cancellation, failed delivery, returns/refunds/reimbursement failure and supplier suspension mid-order. Every exception has owner, next action, customer/financial impact, audit and resolution. **PASS:** high-risk failures have deterministic containment/recovery.

## STEP 25 — Notifications & Customer Communication
Canonical events drive web/email/push notifications with correct recipient, order/conversation link and account isolation. Supplier-private economics are not leaked. **PASS:** event → recipient → content → channel → deep link is deterministic and cross-account tested.

## STEP 26 — Returns / Refunds / Supplier Recovery
Extend existing returns/refunds and track return destination, customer return, processor/customer refund, supplier return, supplier reimbursement/recovery, shipping recovery, unrecovered loss and final contribution. No Loadify warehouse is assumed. **PASS:** customer remedy works independently of supplier recovery state and exposure is visible.

## STEP 27 — Financial Reconciliation
Compare customer payment ↔ processor ↔ ledger ↔ supplier payable/payment ↔ refunds ↔ recovery ↔ chargebacks. Use RECONCILED / PARTIALLY RECONCILED / EXCEPTION / UNRECOVERED or equivalent. **PASS:** operational completion can coexist correctly with unresolved financial exposure.

## STEP 28 — Supplier Control Centre
Extend existing Admin/Super Admin with Supplier Registry, Qualification, SLA, compliance/provenance queues, offer/catalog/stock/price health, margin alerts, submit/ACK/tracking/return/recovery/reconciliation exceptions, incidents, performance and kill switch. Critical writes remain server-authoritative/audited. **PASS:** operators control the supplier lifecycle without direct DB editing.

## STEP 29 — Security, Commercial Privacy & Retention
Credentials remain server-only. Customer/seller payloads never expose supplier cost, margin, purchasing negotiations, internal risk or private notes. Define retention/minimization by data class; privacy deletion reconciles with legally required commercial history. **PASS:** negative auth/RLS tests prove cross-user/seller/supplier isolation.

## STEP 30 — Observability & Incident Management
Metrics/logs/alerts cover adapter errors, sync age, stock/price mismatch, acknowledgement latency, supplier timeouts, tracking lag, shipment exceptions, refund/recovery failures, ledger mismatches, notification failures and auth anomalies. Incidents track severity, scope, owner, containment, remediation and resolution. **PASS:** P0/P1 issues create actionable evidence before customer complaints become the monitoring system.

## STEP 31 — Backup, Restore, Replay & Data Compatibility
Define RPO/RTO, backup coverage, tested restore, webhook/job/event replay, sync and reconciliation reprocessing. Every major migration includes rollforward/rollback/data-compatibility strategy and preserves commercial history. **PASS:** recovery/replay is proven without duplicate commercial effects.

## STEP 32 — Supplier Simulator & Failure Injection
Implement the same canonical adapter with scenarios for stock yes/zero, price changes, timeout/500, duplicate ACK, response lost after acceptance, partial fulfilment, dispatch, tracking, delivery, loss, cancellation, return, refund and reimbursement. **PASS:** success and failure vertical slices pass simulator E2E including idempotency/replay.

## STEP 33 — Controlled Pilot
Start small: typically one qualified provider and a small low-risk product set/territory unless business decision changes it. Prove real import, rights/compliance, pricing, stock, checkout, payment, submit/ACK, tracking, delivery, communication, return, refund, recovery and reconciliation with flags/kill-switch/observability active. **PASS:** real E2E evidence, not build/simulator alone.

## STEP 34 — Supplier Performance & Controlled Scale
Measure stock/price accuracy, acknowledgement, acceptance, dispatch, delivery, tracking, defects, cancellations, returns, recovery, complaints, margin and incidents against versioned SLA. Scores are explainable; scaling is gradual and controlled. **PASS:** scale decisions cite measurable reliability and financial/customer impact.

## STEP 35 — Buy Box & Canonical Social Proof
Select the best eligible Supplier Offer using landed cost, delivery, stock freshness, SLA/reliability, risk and margin policy without exposing confusing supplier internals to the buyer. Product reviews/social proof remain attached to Canonical Product; fulfilment/seller/supplier service quality is scored separately. **PASS:** offer changes do not destroy product identity/SEO/social proof and Buy Box decisions are explainable.

## STEP 36 — Supplier Self-Service Onboarding
Allow suppliers/manufacturers/distributors to apply and submit governed catalog/feed information without bypassing qualification, rights, compliance or operator approval. **PASS:** self-service accelerates onboarding but cannot grant itself production trading authority.

## STEP 37 — B2B / Trade Commerce Evolution
Audit and extend existing B2B foundations instead of rebuilding them. Support trade/business accounts, volume pricing/discounts, relevant tax/VAT validation and bulk purchasing where commercially approved. **PASS:** B2B uses the same canonical catalog/order/payment/ledger truth and does not become a separate marketplace.

## STEP 38 — Dynamic Pricing / Margin Strategy / Supplier Arbitrage
Use canonical economics and multiple eligible offers to optimize source and price within deterministic policy, equivalent-product/variant/delivery constraints and margin protection. **PASS:** automatic choices cannot materially change the buyer contract or create hidden loss.

## STEP 39 — Bundles & Cross-Source Merchandising
Support recommendations/bundles across marketplace sellers and Supplier Commerce while preserving one cart/checkout/customer order and internal fulfilment legs. **PASS:** bundle UX does not create parallel order/payment truth.

## STEP 40 — Visual Search & Personalized Discovery
Future/growth capability: image/screenshot-to-canonical-product search plus personalized recommendations using lawful/appropriate signals. This remains recommendation technology, not factual product authority. **PASS:** unavailable AI/search signals cannot corrupt product truth or core checkout.

## STEP 41 — Branded Post-Purchase Experience & Retention
Loadify-owned tracking/status experience, proactive delay/exception communication and configurable retention offers/vouchers. **PASS:** customer communication is evidence-driven and does not conceal failures or leak supplier-private information.

## STEP 42 — Fraud / Chargeback Evidence & AI-Assisted Operations
Build deterministic fraud/evidence collection and AI-assisted support/triage. AI may recommend; automatic money movement requires explicit policy, eligibility, audit and bounded risk. Carrier/provider evidence is used only when actually available. **PASS:** no opaque AI decision can silently create irreversible financial action outside approved policy.

## STEP 43 — Territory / Multi-Currency / FX / Tax Expansion
Prepare architecture for additional currencies/territories with explicit ISO currency facts, FX evidence/effective time, territory policy and versioned tax/customs rules. Do not hardcode EUR or any future expansion currency as universal default. **PASS:** expansion does not rewrite UK/legacy historical truth.

## STEP 44 — Mobile Parity & Native Release Completion
After the core contract is stable, reconcile Android release work with final code. Verify login/logout/account switch, buyer/seller behavior, catalog/checkout/orders/messages/notifications/deep links, production config/signing, Firebase/Google, push token/session isolation and exact real-device navigation. **PASS:** signed release plus real-device E2E proves parity and privacy; no mobile-only business truth.

## STEP 45 — Full Marketplace & Platform E2E Hardening
Audit the complete product: Auth, Buyer, Seller, Supplier, Marketplace, Direct/Supplier-Fulfilled if enabled, categories/search/filters/products/cart/checkout/Stripe/payments/ledger/orders/fulfilment/tracking/returns/refunds/disputes/recovery/messages/notifications/Admin/Super Admin/Mobile/DB/migrations/RLS/security/privacy/retention/observability/incidents/backup/restore/performance/accessibility/error/concurrency. Trace every flow `UI → API → AUTH → DB → BUSINESS LOGIC → SIDE EFFECTS → OTHER CONSUMERS → FINAL OUTCOME`. **PASS:** no open P0/relevant P1, critical leak, parallel order/financial contract or unsupported financial ambiguity.

## STEP 46 — Production Readiness / Launch / Operational Handoff
Create exact release baseline: `main` SHA, migration head, deployed runtime, configuration, enabled features/suppliers, accepted risks, rollback/kill switches, monitoring, incident ownership, reconciliation schedule and runbook. **PASS:** a new engineer/operator can diagnose and recover the platform from evidence and customers can complete intended lifecycles safely.

---

# 11. VERTICAL-SLICE IMPLEMENTATION RULE

No capability is complete because a table, endpoint or UI exists.

**BUSINESS CONTRACT → DATA MODEL → AUTHORIZATION → SERVER API/RPC → DB/RLS → SIDE EFFECTS → ADMIN GOVERNANCE → WEB/MOBILE CONSUMERS → ERROR/RETRY PATHS → E2E EVIDENCE → BRANCH GUARD.**

Example: Supplier Stock is not a table. It is Adapter → ingestion → raw observation → freshness/confidence → sellability → reservation/concurrency → offer/product availability → checkout protection → Admin alert/control → observability → stale/provider failure path → E2E.

---

# 12. MIGRATION & PRODUCTION SAFETY

- Repository changes and production changes are separate events.
- Inspect live pre-state before migrations.
- Use additive/backwards-compatible expansion first.
- Persistent production DDL goes through controlled migrations, not ad-hoc SQL.
- Preserve historical unknowns as unknown/null unless factual evidence exists.
- Cutovers follow **EXPAND → PRODUCERS → CONSUMERS → VERIFY → CUTOVER → CLEANUP**.
- Avoid windows where old clients bypass new invariants.
- Prefer rollback-safe transactions/isolated tests; no persistent production test rows.
- No uncontrolled production payment mutation, credential rotation or webhook replacement.
- Storage permission changes must preserve legitimate historical objects.

---

# 13. GIT / PR EXECUTION RULES

- Refetch `main`/base before writes if parallel work is possible.
- Use coherent capability PRs, not one PR per table and not giant unrelated branches.
- Record base SHA, head SHA, changed paths/count, migrations, runtime areas, tests/evidence, production state and Branch Guard result.
- Avoid destructive convenience operations unless verified necessary and safe.
- Superseded PRs stay superseded; docs-only branches do not count as runtime implementation.
- Follow the separate `LOADIFY_MARKET_PR_EXECUTION_PLAN_V1_2026-08-20.md` for the planned 12 major PR packages.

---

# 14. TESTING & EVIDENCE MODEL

Evidence layers as applicable:

- static/source invariant checks;
- type/build/lint;
- focused unit/integration tests;
- DB privilege/RLS/constraint verification;
- rollback-safe DB contract tests;
- deployment evidence;
- simulator E2E;
- real-provider pilot evidence;
- real-device evidence for native-only behavior.

No fake PASS:

- NOT IMPLEMENTED ≠ PASS
- NOT TESTED ≠ PASS
- DOCUMENTED ≠ PASS
- BUILD PASS ≠ E2E PASS
- UNIT PASS ≠ E2E PASS
- SIMULATOR PASS ≠ PILOT PASS
- BACKUP EXISTS ≠ RESTORE PASS
- FEATURE FLAG EXISTS ≠ ROLLBACK PASS
- LOG EXISTS ≠ OBSERVABILITY PASS
- ORDER COMPLETED ≠ FINANCIAL RECONCILIATION PASS
- BLOCKED ≠ PASS

If CI infrastructure does not run, record INFRA BLOCKED / NOT RUN rather than inventing PASS/FAIL.

---

# 15. SECURITY / PRIVACY ACCEPTANCE

Every new data family must explicitly define create/read/update/delete authority, client necessity, server-only writes, suspended-account behavior, live ownership authority, service-role necessity, customer/seller/supplier/admin visibility, RLS + server authorization, deletion/suspension behavior, retention/anonymization and append-safe audit requirements.

Negative tests include cross-user, cross-seller, inactive account, direct API, stale session and privilege bypass.

---

# 16. ERROR / RETRY / CONCURRENCY MATRIX

Every critical commercial operation analyzes duplicate request/double click, refresh/reconnect, worker retry, timeout, Stripe replay, supplier submit replay, accepted-response-lost, duplicate ACK, out-of-order tracking, stale client, simultaneous stock reservation, simultaneous refund/return/status action, supplier suspension mid-operation, DB-success/side-effect-failure and side-effect-success/response-failure.

UI button disabling is never a data-integrity guarantee. Money, inventory, order, supplier submission and refund transitions require canonical idempotency/atomic boundaries.

---

# 17. DEFINITION OF DONE — LOADIFY MARKET

For intended launch scope, evidence must support PASS for:

AUTH; BUYER; SELLER; SUPPLIER; MARKETPLACE; LOADIFY DIRECT if enabled; SUPPLIER-FULFILLED; CATEGORIES/SEARCH/FILTERS; PRODUCTS/CANONICAL PRODUCT; SUPPLIER OFFERS; IMPORT PIPELINE; PROVENANCE/RIGHTS; PRODUCT COMPLIANCE; AI FACTS LOCK; DISCOVERY if in launch scope; LANDED COST/PRICING; TAX RULE VERSIONING; STOCK/SELLABILITY; PRICE SYNC; CART/CHECKOUT; STRIPE/PAYMENTS; FINANCIAL LEDGER; ONE CUSTOMER ORDER/FULFILMENT LEGS; SUPPLIER SUBMISSION/ACK; TRACKING; EXCEPTIONS; RETURNS; CUSTOMER REFUNDS; SUPPLIER RECOVERY; FINANCIAL RECONCILIATION; MESSAGING; NOTIFICATIONS; ADMIN/SUPER ADMIN; SUPPLIER CONTROL CENTRE; FLAGS/KILL SWITCH; OBSERVABILITY/INCIDENTS; BACKUP/RESTORE/REPLAY; MOBILE; WEB/MOBILE SYNC; DB/MIGRATIONS; RLS/SECURITY; PRIVACY/RETENTION; AUDIT HISTORY; PERFORMANCE/ACCESSIBILITY; NO CRITICAL DATA LEAK; NO PARALLEL CUSTOMER-ORDER TRUTH; NO PARALLEL FINANCIAL TRUTH; NO LEGACY BYPASS OF CRITICAL BUSINESS LOGIC; NO OPEN P0; NO RELEVANT P1.

A green build with unresolved money ambiguity, duplicate supplier-order risk, privacy leak, stale-stock oversell, broken returns or unreconciled exposure is not production-ready.

---

# 18. MASTER PLAN CHANGE CONTROL

This plan is durable, not dogmatic. Do not change stable direction because a provider API is awkward, an old test expects another shape or a temporary column is convenient.

Change it when a deliberate business model changes, authoritative law/payment/provider constraints require it, production evidence disproves an invariant, or a materially better architecture achieves the same business goal with lower risk.

When changing the plan:

1. state the old rule;
2. state new evidence/decision;
3. explain downstream effects;
4. migrate consumers/data safely;
5. mark old rule SUPERSEDED rather than leaving both active.

Do not maintain two competing canonical master plans.

---

# 19. HANDOFF STATUS FORMAT

```text
LOADIFY CURRENT STATE — [date/time]

Repository
Main: <sha>
Active PR/branch: <number/name>
Head: <sha>
Migration head: <version/name>

Master Plan Step
Current step: STEP N — ...
Status: IN PROGRESS / BLOCKED / PASS

Completed since previous handoff
- ...

Evidence
- tests/build/deploy/DB/device evidence ...

Production changes already applied
- ...

Unmerged work
- ...

Branch Guard
- exact diff scope ...
- collateral checks ...
- PASS/FAIL ...

Current blocker
- precise root cause, not symptom ...

Next safe action
- one concrete action ...

Owner action required
- NONE unless a genuine business/external/device/account decision is necessary.
```

---

# 20. QUICK START FOR THE NEXT AGENT

1. Read this Master Plan and the PR Execution Plan.
2. Fetch current `main`; if it differs from the dated snapshot, the snapshot is stale.
3. Fetch/classify open PRs.
4. Read production migration history and effective schema/RLS/functions for the active area.
5. Search canonical server boundaries and all web/mobile/Admin consumers.
6. Map Steps 1–46 to PASS / IN PROGRESS / BLOCKED / NOT STARTED / DEFERRED / SUPERSEDED.
7. Identify the first incomplete dependency affecting the target product.
8. Continue autonomously with vertical slices and Branch Guard.
9. Never revive superseded logic merely to satisfy an old brief/test.
10. At context limit produce the handoff status above.

---

# 21. FINAL NORTH STAR

The objective is not to finish tickets, satisfy a historical brief or complete an Android build. The objective is a Loadify Market where real users can safely buy and sell, Loadify can operate supplier-fulfilled products under controlled commercial models, all channels consume the same business truth, money and inventory reconcile, private data remains private, failures are recoverable, and an engineer can prove the system’s state from evidence.

**Build Loadify so it actually works as one product — not so that a dashboard can claim it works.**
