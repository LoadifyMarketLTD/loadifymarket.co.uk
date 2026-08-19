# DEEP BASELINE AUDIT — SUPPLIER COMMERCE PREPARATION

Status: PREPARATION SNAPSHOT ONLY.

Baseline audited: `main` at `b3cc07d182a60ca5d1ab80217c63b62e50015c1f` plus read-only inspection of the current production schema on 19 August 2026.

This file records factual constraints of the current marketplace runtime so future Supplier Commerce work does not accidentally treat legacy marketplace assumptions as the target architecture.

It MUST be re-audited against the Foundation Baseline Freeze before Gate B is converted to schema or runtime work.

## 1. Current marketplace is structurally seller-centric

Verified current facts:

- `products.sellerId` is mandatory in the live schema;
- `orders.sellerId` is mandatory in the live schema;
- `order_items` point to current `products`;
- current checkout resolves exactly one seller for the basket;
- current checkout rejects carts containing products from more than one seller;
- current checkout requires that seller's Stripe Connect state to be active before payment is allowed.

Engineering consequence:

The existing meaning of `sellerId` cannot be blindly reused for Supplier Commerce.

Gate B must define the commercial actor for:

- Marketplace Seller;
- Loadify-operated offer;
- Loadify Supplier-Fulfilled offer.

Do NOT create fake supplier users merely to satisfy the existing mandatory `sellerId` contract unless Gate B explicitly decides that a supplier is also a marketplace seller in that commercial model.

Do NOT create a second checkout/order system to avoid this constraint.

Required future approach:

CURRENT SELLER-CENTRIC CONTRACT
→ reconcile commercial responsibilities
→ preserve existing marketplace history
→ extend canonical commerce vertically.

## 2. Current checkout is single-seller by design

Verified in both web checkout and server payment paths:

- web UI blocks multi-seller checkout;
- `create-checkout.ts` verifies one unique seller;
- `create-payment-intent.ts` verifies one unique seller;
- payment/order fulfilment logic expects a single seller.

This is a valid current marketplace invariant, but it is not automatically the final Supplier Commerce invariant.

The canonical target contract states:

ONE CUSTOMER ORDER
→ potentially multiple internal fulfilment legs.

Therefore the future orchestrator must evolve the current checkout/order contract without creating parallel buyer orders.

Gate B must decide which combinations are permitted in one customer order, for example:

- one marketplace seller only;
- Loadify Supplier-Fulfilled products from one or multiple suppliers;
- mixed Marketplace Seller + Supplier-Fulfilled;
- Loadify-operated offers with multiple fulfilment sources.

No answer is assumed in this preparation snapshot.

## 3. Current payment truth is server-authoritative and must be preserved

Verified current strengths:

- client item price is not trusted as canonical price;
- current product price is read from DB before payment;
- client shipping amount is intentionally ignored;
- shipping rate is resolved server-side from configured shipping method data;
- web and mobile payment creation use server-authoritative totals;
- webhook checks paid amount/currency against stored payment-session metadata;
- webhook processing is idempotency-aware via Stripe event storage;
- order creation is tied to completed Stripe payment evidence.

Supplier Commerce must extend these boundaries rather than bypass them.

Future supplier cost, supplier shipping cost and margin checks are NOT a reason to let the browser define financial truth.

## 4. Current payment session is a useful pre-order seam

Current `payment_sessions` stores:

- buyer/user;
- Stripe session/payment-intent references;
- pending/completed state;
- amount/currency;
- order link after completion;
- metadata containing verified checkout economics and reservation context.

This proves the platform already has a pre-order commercial staging seam.

Do not assume the future Supplier Commerce design needs a second payment staging system.

After Gate B, audit whether the existing payment-session responsibility can be extended safely or whether a distinct canonical reservation/orchestration responsibility is required.

Conceptual responsibility must be decided before any table design.

## 5. Current product reservation is NOT a Supplier Stock Engine

Verified current behavior in `create-checkout.ts` and `create-payment-intent.ts`:

- physical products are checked for `stockQuantity`;
- a product is reserved by changing its `listingStatus` to `reserved`;
- a `reservationToken` and `reservedUntil` are written on the product;
- the reservation is released on terminal/expired payment paths.

This is current marketplace listing protection.

It must NOT be relabelled as Supplier Commerce stock architecture.

Supplier Commerce needs separate responsibility for:

SUPPLIER RAW STOCK
→ evidence/freshness/confidence
→ safety policy
→ Loadify reservation
→ LOADIFY SELLABLE STOCK.

Current `products.listingStatus` may remain relevant to marketplace listing availability, but supplier-offer stock and quantity reservation must be designed from Gate B + frozen schema audit rather than inferred from this legacy mechanism.

## 6. Current product table mixes several responsibilities

Live `products` currently contains factual/product-like fields such as:

- title;
- description;
- category;
- condition;
- dimensions;
- weight;
- specifications;
- images.

It also contains marketplace/commercial/listing fields such as:

- `sellerId`;
- price;
- VAT rate;
- stock quantity/status;
- listing status;
- reservation fields;
- approval/active/featured flags;
- marketplace classification fields.

This confirms the canonical contract warning:

DO NOT dump Supplier Commerce data into `products`.

Future migration/reconciliation must separate responsibilities without destroying existing seller-listing history.

## 7. No Supplier Commerce canonical data structures exist live yet

Read-only live schema inspection found no current public table names matching supplier/catalog/ledger/fulfilment/inventory/stock responsibility families.

Interpretation:

- Supplier Commerce has not already been implemented under an obvious canonical schema;
- there is no obvious existing supplier ledger/catalog structure to adopt blindly;
- final names still MUST NOT be invented before Gate B + schema audit.

This finding does NOT prove no related legacy responsibility exists under another name; frozen-baseline semantic audit is still mandatory.

## 8. Current order model is commercial-history critical

Live `orders` includes current buyer/seller/product references and financial fields including:

- subtotal;
- VAT;
- shipping amount;
- discount;
- total;
- commission;
- status;
- escrow state;
- shipping/billing addresses;
- payment reference;
- tracking/delivery information.

Current order creation also creates `order_items`.

Supplier Commerce must not replace this with a supplier-specific customer order table.

Target:

ONE CUSTOMER ORDER
→ canonical items/commercial snapshot
→ internal operational fulfilment responsibilities.

Supplier external order IDs belong to fulfilment execution, not buyer-order identity.

## 9. Commercial-history shipping defect is a foundation concern, not preparation work

Verified current runtime:

- checkout determines buyer shipping price before payment;
- `create-shipment.ts` currently accepts seller/admin `shipping_cost` input;
- that function can update `orders.shippingAmount` after payment;
- invoice generation reads current `orders.shippingAmount`.

This creates a real commercial-history integrity risk and is already owned by the active Checkpoint A agent.

Supplier Commerce design must preserve the separation:

CUSTOMER SHIPPING CHARGE
≠ SUPPLIER FULFILMENT SHIPPING COST
≠ CARRIER COST
≠ LATER FINANCIAL ADJUSTMENT/RECOVERY.

This parallel branch must not repair the live defect.

## 10. Current shipment model is seller/order oriented

Live `shipments` currently identifies:

- customer order;
- seller;
- buyer;
- courier/service;
- tracking number/url;
- shipment status;
- POD data;
- estimated/dispatched/delivered timestamps.

`shipment_events` records status/event history and source.

This is a useful integration surface for buyer-visible tracking.

Supplier Commerce must not expose provider-native lifecycle directly to the buyer.

Future responsibility:

SUPPLIER/FULFILMENT EVENT
→ canonical fulfilment/shipment mapping
→ existing/new canonical Loadify tracking experience.

Supplier identity/offer/fulfilment-leg ownership is not represented by the current shipment contract and must be designed after Gate B.

## 11. Current returns are buyer/seller-centric

Live `returns` currently links:

- order;
- buyer;
- seller;
- reason/description/evidence;
- status;
- refund amount;
- buyer/seller tracking references;
- resolution fields.

This is customer return workflow responsibility.

Supplier Commerce must extend, not replace it.

Mandatory future separation:

CUSTOMER RETURN / CUSTOMER REFUND
≠
SUPPLIER RETURN / SUPPLIER REIMBURSEMENT / RECOVERY.

No Loadify warehouse destination may be assumed.

## 12. Current refund path already demonstrates refund/recovery separation

Verified in `create-refund.ts`:

- buyer Stripe refund is the primary customer-side financial operation;
- seller transfer reconciliation/reversal is attempted separately;
- buyer refund can succeed while transfer recovery fails;
- failure of seller-transfer recovery creates a warning/manual-review condition rather than undoing the buyer refund.

This is directionally aligned with the canonical Supplier Commerce invariant:

CUSTOMER REFUND ≠ SUPPLIER RECOVERY.

Future supplier recovery should extend this responsibility model into canonical financial reconciliation, not collapse the two states.

## 13. Current finance is distributed, not yet a canonical commerce ledger

Current financial truth is represented across several responsibilities, including:

- Stripe objects/events;
- `payment_sessions`;
- `orders` monetary fields;
- commission;
- payouts/transfers;
- escrow status;
- refunds/disputes.

No obvious canonical commerce-ledger table currently exists live.

Therefore Phase G Financial Ledger is a genuine new canonical responsibility, but it must reconcile existing commercial history rather than compete with it.

Do not create a dashboard-only ledger.

Do not recalculate historical money differently from Stripe/order evidence.

## 14. Current seller payout semantics cannot be reused as supplier payable by assumption

Current `payouts` is keyed to seller responsibility and Stripe transfer/payout semantics.

A Supplier Commerce supplier may or may not be a marketplace seller.

Therefore:

SELLER PAYOUT
≠ automatically SUPPLIER PAYABLE.

Gate B must define:

- who receives supplier payment;
- when supplier liability is created;
- whether supplier is paid through Stripe, invoice settlement, external provider charge, wallet, or another approved mechanism;
- how supplier cost/recovery reconciles to customer payment.

Only then can financial schema/API design begin.

## 15. Current Stripe Connect dependency is a major Gate B seam

Current marketplace checkout requires active Stripe Connect seller readiness.

This is appropriate for Marketplace Seller flow.

It must not force Supplier Commerce into the false assumption that every external supplier needs a Loadify seller account + Stripe Connect account.

Gate B must define payment/settlement responsibility separately for:

- marketplace seller proceeds;
- Loadify commercial revenue;
- supplier cost/payable;
- processor fees;
- refunds/recoveries.

Current official Stripe/Connect rules must be re-verified immediately before implementation.

## 16. Web/mobile should continue sharing server commercial truth

Current mobile payment path uses a PaymentIntent equivalent of web checkout and applies the same key server validations:

- DB product price;
- stock/listing availability;
- seller readiness;
- server shipping rate;
- single-seller rule;
- payment-session metadata.

This is the correct architectural direction.

Future Supplier Commerce should create one canonical API/business contract and let web/mobile consume it.

Do not build a mobile-only sourcing/order lifecycle.

## 17. Admin should evolve vertically

Current `admin-orders.ts` already:

- reads order/payment evidence;
- applies guarded status transitions;
- blocks manual refund/cancel shortcuts where dedicated financial paths are required.

Future Supplier Control Centre should extend existing admin governance vertically.

Do not create an independent supplier admin application with separate truth.

## 18. Mandatory reconciliation decisions after Checkpoint A

After the Foundation Baseline Freeze, re-audit and classify each current responsibility:

### KEEP AS CANONICAL
Existing responsibility can remain and be extended safely.

### EXTEND VERTICALLY
Existing responsibility remains but needs Supplier Commerce dimensions/relationships.

### SPLIT RESPONSIBILITIES
Current table/function mixes product, offer, fulfilment or finance concepts that must be separated while preserving history.

### LEGACY COMPATIBILITY ONLY
Existing field/path must remain for historical/backwards compatibility but must not control new architecture.

### REMOVE/REPLACE LATER
Only if canonical migration plan proves it safe and preserves commercial history.

No classification is final before frozen-baseline audit.

## 19. Baseline engineering conclusion

The current platform already has valuable canonical foundations:

- server-authoritative checkout money;
- Stripe payment evidence;
- order commercial history;
- order items;
- shipment/tracking surfaces;
- return/refund flows;
- admin governance;
- shared web/mobile backend concepts.

But Supplier Commerce cannot be implemented merely by adding supplier fields to current marketplace tables.

The critical evolution is:

CURRENT SELLER-CENTRIC MARKETPLACE
→ preserve commercial truth
→ introduce canonical product/offer/supplier responsibilities
→ introduce sellable-stock + landed-cost + ledger responsibilities
→ evolve one customer-order contract into internal fulfilment orchestration
→ preserve one payment truth
→ add supplier submission/tracking/recovery behind adapters
→ extend existing admin/mobile vertically.

This is preparation evidence, not implementation authorisation.