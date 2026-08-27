# Loadify Supplier Commerce — E2E Remediation Execution Plan

Date: 2026-08-27
Branch: `fix/supplier-commerce-e2e-remediation-20260827`
Baseline `main`: `c8f956ddee676253316156079eece4f509c2da7e`
Continuity checkpoint: `docs/canonical/loadify-supplier-commerce-2026-08-19/15_E2E_AUDIT_CONTINUITY_CHECKPOINT_2026-08-27.md`
Checkpoint commit: `932dec55e78e5d281a38c89478b64067dd2ac3d3`

## Mission

Close the remaining Supplier Commerce fragmentation as one continuous E2E remediation programme. Do not create a parallel commerce stack. Preserve the existing canonical customer order/payment truth and connect the existing Supplier Commerce engine to the public marketplace, checkout, payment, tracking, return/refund and reconciliation paths.

## Non-negotiable safety rules

1. No Supplier Commerce production control is enabled during remediation.
2. No real supplier, supplier offer, adapter registration, provider capability record or pilot programme is created during remediation.
3. No Avasam capability is activated until the verified provider contract/evidence gate is complete.
4. The previous Avasam permission matrix is evidence only, not a final decision.
5. `public.orders` remains the one customer-order truth; no second customer-order system is introduced.
6. `public.payment_sessions` / Stripe remain the canonical customer-payment truth.
7. Supplier raw stock is not buyer sellable stock; supplier raw price is not buyer price truth.
8. Supplier order success remains independent from customer payment success.
9. Customer refund remains independent from supplier recovery.
10. Every remediation stage must fail closed and must pass its own tests before the next stage.
11. No production DDL/config/runtime activation is performed until the branch is fully reviewed and explicitly authorized for deployment.

## Final audit verdict that governs implementation

- KEEP: Supplier Foundation, provider-neutral adapter contract, canonical supplier catalog, supplier offers, economics, stock/price observations, sellability decisions, reservation/orchestrator, payment-to-supplier handshake, tracking/exception engine, returns/recovery, financial reconciliation, simulator/replay and Phase O controlled-pilot model.
- REPAIR: product identity bridge, import kill-switch continuity, reservation identity closure, publish path, checkout integration, shipping runtime, cancellation runtime, refund evidence bridge, customer tracking projection and server-runtime type gate.
- CONSOLIDATE: Supplier Commerce runtime with existing marketplace product/order/payment/refund/tracking truth. No duplicate systems.
- REMOVE: no Supplier Commerce foundation is removed. The already-retired legacy fixed-price marketplace offer engine must not be reused as Supplier Commerce supplier offers.

---

# Execution stages

## Stage 1 — Canonical Product Identity Bridge [P1 BLOCKER]

Goal: make it impossible for a public marketplace order item for product A to be routed to a supplier offer for canonical product B.

Work:
- introduce an explicit, immutable relationship between the buyer-facing `public.products` listing and `private.canonical_products`;
- add integrity constraints/indexes needed for one authoritative mapping;
- close `supplier_fulfilment_leg_items.canonical_product_id` integrity against canonical supplier product truth;
- update reservation/route guards so the order item's public product must resolve to the exact canonical product carried by the supplier offer;
- retain existing marketplace-seller and Loadify-direct identities unchanged.

Acceptance:
- cross-product supplier reservation is impossible at DB boundary;
- replay/idempotency remains valid;
- no Supplier Commerce control is enabled;
- migration/test coverage proves negative and positive paths.

Status: **IN PROGRESS**

## Stage 2 — Immutable Commercial-Mode Order Truth [P1 BLOCKER]

Goal: one `public.orders` truth can correctly represent `marketplace_seller`, `loadify_direct` and `loadify_supplier_fulfilled` without fake seller identities.

Work:
- add explicit order-time commercial-mode snapshot;
- add legal seller / merchant-of-record / invoice-issuer / payment-recipient truth required by Gate B;
- preserve backward compatibility with existing marketplace orders;
- make order-time commercial identity immutable after payment/creation boundary;
- ensure order item snapshots retain public product identity and supplier-route identity separately.

Acceptance:
- all three commercial modes can be represented without overloading `sellerId` semantics;
- old marketplace orders remain readable and valid;
- service-role paths cannot silently mutate commercial mode after order truth is frozen.

Status: PENDING

## Stage 3 — Supplier Publish + Buyer Listing Projection [P1 BLOCKER]

Goal: an approved Supplier Commerce canonical product/offer can be projected into the existing buyer-facing `public.products` model without inventing a marketplace seller.

Work:
- implement provider-neutral publish/unpublish runtime using the existing `publish` control;
- map canonical product content and approved supplier offer into buyer listing truth;
- preserve exact supplier-offer identity privately;
- ensure public listing state never treats raw supplier stock/price as authoritative;
- define fail-closed publish eligibility and unpublish/hold behavior.

Acceptance:
- publish path uses the canonical control plane;
- no duplicate public product is created on replay;
- kill switch can prevent new publish operations;
- buyer-facing listing is traceable to one canonical product and approved supplier offer.

Status: PENDING

## Stage 4 — Web + Mobile Checkout Consolidation [P1 BLOCKER]

Goal: `create-checkout` and `create-payment-intent` route supplier-fulfilled items through Supplier Commerce guards while preserving current marketplace seller checkout.

Work:
- resolve each checkout item to its commercial mode;
- call Supplier Commerce checkout/stock/price guard for supplier-fulfilled items;
- remove dependence on raw `public.products.stockQuantity` for supplier-fulfilled lines;
- use authoritative commercial-mode shipping/tax/payment truth;
- preserve existing marketplace-seller Stripe Connect behavior;
- reject mixed/unsupported carts explicitly rather than degrading silently.

Acceptance:
- same public checkout endpoint can safely distinguish marketplace seller vs supplier-fulfilled truth;
- supplier-fulfilled checkout cannot proceed on stale/missing stock or pricing evidence;
- web and mobile paths behave identically at the business-contract boundary.

Status: PENDING

## Stage 5 — Reservation + Shipping + Cancellation Runtime Closure [P1]

Goal: close the remaining pre-payment and fulfilment capability gaps.

Work:
- wire atomic supplier reservation into the real checkout/order path;
- enforce the Stage 1 identity bridge at reservation time;
- implement provider-neutral shipping quote selection using `SupplierAdapterV1.quoteShipping`;
- persist immutable shipping decision/evidence needed at order time;
- implement provider-neutral cancellation runtime with explicit allowed states, idempotency and query-before-retry where required;
- keep Avasam methods fail-closed until verified.

Acceptance:
- no oversell through concurrent reservations;
- shipping evidence is replay-safe and attributable;
- cancellation cannot produce duplicate supplier side effects;
- unsupported provider capability fails closed.

Status: PENDING

## Stage 6 — Payment → Supplier Submission Vertical Slice [P1]

Goal: a paid canonical customer order automatically and idempotently advances the correct supplier fulfilment leg through submission/acknowledgement.

Work:
- connect canonical payment completion to Supplier Commerce orchestration;
- retain existing payment evidence snapshot and handshake invariants;
- invoke the exact registered adapter/provider version;
- preserve `query-before-retry` for unknown/pending outcomes;
- ensure payment success never fabricates supplier success;
- add operational reconciliation/exception creation on non-terminal outcomes.

Acceptance:
- exactly-once supplier side-effect behavior under replay/retry;
- accepted, pending, rejected, rate-limited, configuration-failed and unknown outcomes all remain distinct;
- no supplier call is possible without canonical payment evidence and active reservation.

Status: PENDING

## Stage 7 — Customer Tracking Projection + Exception Consolidation [P1]

Goal: project supplier leg tracking into the one customer order experience while retaining private per-leg evidence.

Work:
- fix recovery-state / tracking taxonomy mismatches;
- project canonical supplier tracking state to customer-facing order tracking;
- preserve one customer order with internal per-leg shipments;
- define aggregation rules for partial/multi-leg outcomes;
- route no-tracking, delayed dispatch, failed delivery and supplier-suspension cases into the existing exception engine;
- never let raw provider status become buyer truth without approved mapping.

Acceptance:
- buyer can see coherent order-level tracking from supplier leg evidence;
- delivered terminality cannot regress silently;
- malformed/wrong-order provider events remain blocked.

Status: PENDING

## Stage 8 — Return / Refund / Supplier Recovery Financial Bridge [P1 BLOCKER]

Goal: connect the existing real Stripe customer refund path to Supplier Commerce return/recovery/reconciliation evidence without duplicating money movement.

Work:
- branch refund behavior by commercial mode;
- for supplier-fulfilled orders, record Stripe refund evidence through canonical Supplier Commerce RPCs after the real payment side effect;
- preserve marketplace seller transfer reversal behavior for marketplace orders;
- connect supplier return authorization/reimbursement/recovery evidence;
- close partial refund, unrecoverable loss and chargeback reconciliation paths;
- make replay/idempotency safe across Stripe and DB boundaries.

Acceptance:
- a customer refund can never be counted twice;
- supplier recovery can never be confused with customer refund;
- financial reconciliation can explain payment, supplier payable/paid, refunds, recoveries, chargebacks and unrecovered loss from real evidence.

Status: PENDING

## Stage 9 — Import Control Continuity + Server Runtime Type Gate [P1]

Goal: remove remaining control-plane and build-gate blind spots.

Work:
- distinguish new supplier acquisition/ingestion from review/recovery of already captured evidence;
- recheck `import` control on side-effecting acquisition writes where appropriate;
- keep review/reconciliation possible without enabling ingestion;
- add a dedicated TypeScript configuration/script for `netlify/functions`;
- include Supplier Commerce server runtime in CI/build acceptance;
- fail CI on invalid runtime taxonomy/types.

Acceptance:
- disabling import blocks new acquisition side effects but does not destroy recovery capability;
- all Supplier Commerce server TypeScript is typechecked in CI;
- no known runtime enum/taxonomy mismatch remains.

Status: PENDING

## Stage 10 — Full E2E Replay, Branch Guard and Release Readiness [FINAL SOFTWARE GATE]

Goal: prove the complete software path before any provider activation.

Work:
- run unit/integration suites for all Supplier Commerce phases;
- run real PostgreSQL migration/apply/replay validation on disposable/approved environment;
- run simulator failure/recovery/replay scenarios;
- verify web/mobile checkout equivalence;
- verify database constraints and privileges;
- verify production controls still OFF and production Supplier Commerce data still empty unless separately authorized;
- run security/performance advisors and classify any new findings;
- produce exact changed-file/diff ledger and Branch Guard verdict.

Acceptance:
- all tests/typechecks/builds PASS;
- no control enabled;
- no real supplier/provider side effect;
- no unresolved P0/P1 defect;
- release-readiness verdict is explicit PASS/FAIL.

Status: PENDING

---

# Provider Evidence + Controlled Pilot (only after Stage 10 PASS)

This is deliberately outside the software-remediation gate.

1. Verify Avasam official provider contract: auth, base URL, endpoint paths, payloads, permissions, rate limits, idempotency, shipping, order lookup/ack, tracking, cancellation, return and reimbursement semantics.
2. Implement only verified Avasam capabilities in the existing adapter/client boundary.
3. Register one verified adapter version carrying the complete capability set needed for the chosen pilot.
4. Create a minimal real supplier/product/cohort pilot only with explicit authorization.
5. Keep global Supplier Commerce OFF.
6. Run bounded Phase O real-order pilot and collect real evidence.
7. Pilot PASS must come from real orders/evidence; simulator PASS is not Pilot PASS.

---

# Completion definition

Supplier Commerce is considered software-complete only when Stages 1–10 are PASS and the system can demonstrate, without enabling production commerce, this single coherent path:

`provider evidence -> import -> canonical product -> supplier offer -> stock/price/economics -> public listing -> checkout guard -> reservation -> customer payment -> supplier submission -> acknowledgement -> tracking/exceptions -> return/refund -> supplier recovery -> financial reconciliation`

All of it must remain connected to one Loadify customer order/payment truth and one provider-neutral Supplier Commerce engine.
