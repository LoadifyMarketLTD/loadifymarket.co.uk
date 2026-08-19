# DATA OWNERSHIP AND BOUNDARY MATRIX

Status: PREPARATION ONLY. No schema/table names are mandated here.

Purpose: define which responsibility owns which fact so Supplier Commerce does not create duplicate truths or leak provider-specific state into the commerce core.

## 1. Core rule

Every important fact must have exactly one canonical owner.

Other subsystems may reference, project, cache, or derive from that truth, but must not become competing sources of truth.

## 2. Product identity

Canonical owner: Canonical Product responsibility.

Owns:
- what the product is;
- normalized factual attributes;
- variant identity;
- category mapping;
- verified evidence references;
- canonical identity/dedup state.

Does not own:
- supplier price;
- supplier stock;
- supplier private terms;
- supplier lifecycle;
- provider credentials;
- buyer transaction economics.

## 3. Supplier identity and capability

Canonical owner: Supplier Registry / Supplier Qualification responsibility.

Owns:
- legal/operational supplier identity as permitted by Gate B;
- capability declarations;
- qualification state;
- active/paused/suspended state;
- territory capability;
- SLA/compliance/provenance references;
- integration capability metadata.

Does not own buyer product identity or buyer order truth.

## 4. Supplier Offer

Canonical owner: Supplier Offer responsibility.

Owns supplier-specific commercial and operational facts for one Canonical Product:
- supplier product reference/SKU;
- source/provider reference;
- cost;
- currency;
- supplier shipping cost;
- stock evidence;
- price evidence;
- freshness timestamps;
- territory;
- dispatch/SLA capability;
- return/recovery capability;
- offer status/version;
- risk/compliance linkage.

A Supplier Offer is not the buyer order.

## 5. Discovery intelligence

Canonical owner: Product Discovery / Opportunity Intelligence responsibility.

Owns:
- observations;
- trend/demand signals;
- scoring inputs;
- evidence links;
- confidence;
- recommendation;
- freshness.

Does not own:
- product facts;
- supplier legal role;
- stock truth;
- price truth;
- financial truth;
- publish state.

## 6. Operator import

Canonical owner: Import/Normalisation workflow responsibility.

Owns:
- import attempt identity;
- source submitted by operator;
- extraction result;
- normalization state;
- match/candidate state;
- review state;
- error/retry history;
- provenance/rights/compliance handoff state.

Import does not directly own published product truth. Publication references approved Canonical Product + approved offer/merchandising state.

## 7. Merchandising / AI Product Builder

Canonical owner: Merchandising responsibility.

Owns:
- presentation copy;
- SEO wording;
- approved generated title/description variants;
- page composition metadata;
- review/approval state.

Does not own factual claims. Facts must resolve to verified canonical evidence under AI Facts Lock.

## 8. Sellability

Canonical owner: Sellability/Offer Selection responsibility.

Sellability is a derived decision from canonical evidence, not raw supplier stock.

Inputs may include:
- supplier qualification;
- offer state;
- product approval;
- rights/compliance state;
- stock freshness;
- stock confidence;
- reservation;
- price freshness;
- margin floor;
- territory;
- risk/incident/kill switch;
- feature flags.

Output must be deterministic for the same effective policy/version and inputs.

## 9. Customer commercial offer

Canonical owner: buyer-facing commerce pricing responsibility determined after Gate B.

Must separate:
- product sell price;
- customer shipping charge;
- tax/VAT presentation;
- discounts;
- delivery promise;
- return promise.

Supplier cost and customer price must never be treated as the same field/value by implication.

## 10. Customer order

Canonical owner: existing Loadify customer Order responsibility, extended vertically after Gate B.

Rule:
ONE CUSTOMER ORDER.

Owns buyer-facing transaction identity and lifecycle.

Internal supplier/fulfilment records may reference the customer order but must not become a second customer-order truth.

## 11. Fulfilment leg

Canonical owner: Order Orchestrator / Fulfilment responsibility.

Owns internal execution for a portion of one customer order:
- selected supplier/fulfiller responsibility;
- selected offer snapshot/reference;
- reservation state;
- submission state;
- acknowledgement state;
- external supplier order reference;
- operational fulfilment status;
- tracking handoff;
- exception state.

Does not redefine customer total.

## 12. Payment evidence

Canonical owner: Loadify payment integration + payment-session/order financial evidence.

Owns:
- provider transaction references;
- amount/currency evidence;
- success/failure/cancellation evidence;
- idempotency/reconciliation evidence.

Supplier submission must consume payment evidence; it must not infer payment merely from order status text.

## 13. Supplier payable/cost

Canonical owner: Financial Ledger / Supplier Financial responsibility after Gate B.

Must be distinct from current marketplace seller payout semantics unless Gate B explicitly proves equivalence for a given model.

Owns:
- amount owed/incurred to supplier;
- product cost;
- supplier shipping;
- approved adjustments;
- reimbursement/recovery;
- reconciliation status.

## 14. Customer refund

Canonical owner: customer refund/payment responsibility.

Owns what was returned to buyer and payment-provider evidence.

Supplier reimbursement is separate.

## 15. Supplier recovery

Canonical owner: supplier recovery responsibility.

Owns:
- requested recovery;
- accepted/rejected recovery;
- supplier credit/refund/replacement evidence;
- amount recovered;
- amount unrecovered;
- reconciliation state.

CUSTOMER REFUND != SUPPLIER RECOVERY.

## 16. Shipment / tracking

Canonical owner: Loadify shipment/fulfilment event responsibility.

Provider/carrier statuses are inputs to normalization.

Buyer-facing Loadify state must not expose provider-specific status strings as the core lifecycle.

Operational shipping cost must not rewrite customer shipping charge after payment.

## 17. Compliance/provenance/rights

Canonical owner: compliance/provenance evidence responsibility.

Owns:
- source evidence;
- content/image rights evidence;
- product compliance evidence;
- review outcome;
- expiry/freshness where applicable;
- blocking reason.

No publish/sellability decision may manufacture missing evidence.

## 18. Risk

Canonical owner: Commerce Risk responsibility.

Owns:
- risk signals;
- rule/policy version;
- resulting decision (ALLOW/REVIEW/HOLD/RESTRICT/BLOCK where applicable);
- rationale/evidence;
- override/audit history.

Risk does not silently mutate financial history.

## 19. Incident / kill switch

Canonical owner: Platform Control / Incident responsibility.

Owns:
- incident identity;
- affected capability/provider/supplier scope;
- severity;
- state;
- mitigation;
- kill-switch state;
- recovery evidence.

Kill switches stop future actions according to policy but preserve history.

## 20. Admin/Super Admin

Admin is a governed control surface, not a new source of business truth.

Admin actions must call canonical boundaries and produce audit evidence.

Do not create admin-only shadow copies of supplier, order, finance or compliance state.

## 21. Mobile/Web

WEB BUSINESS CONTRACT = MOBILE BUSINESS CONTRACT.

Both consume the same canonical service responsibilities. No mobile-only supplier/order/payment truth.

## 22. Source-of-truth precedence

When reconciling after Foundation Freeze:

1. canonical execution contract;
2. frozen runtime/business contract;
3. Gate B decisions;
4. current official provider/legal rules;
5. this preparation matrix.

If this preparation matrix conflicts with 1-4, update this document. Do not bend the runtime merely to preserve a preparation assumption.
