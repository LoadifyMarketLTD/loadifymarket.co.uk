# CURRENT RUNTIME INTEGRATION MAP

Baseline inspected for this preparation lane: `main` at `b3cc07d182a60ca5d1ab80217c63b62e50015c1f`.

This is a PREPARATION SNAPSHOT, not future source of truth. It MUST be re-audited against the Foundation Baseline Freeze before implementation.

## 1. Products / catalogue

Current marketplace product surfaces are the likely integration boundary for Canonical Product migration/reconciliation.

Future work must determine, after Gate B and schema audit:

- which current `products` fields are genuinely canonical product facts;
- which are marketplace-seller offer facts;
- which are fulfilment/shipping facts;
- which are legacy/provider-specific metadata;
- how current seller listings migrate/relate to Canonical Product + offer structures without destroying commercial history.

Do not rename/restructure now.

## 2. Checkout

Verified on baseline:

`netlify/functions/create-checkout.ts`

Current checkout already demonstrates an important canonical principle:

- client-submitted `shippingAmount` is intentionally ignored;
- shipping method/rate is validated server-side;
- shipping charge is resolved before payment/order creation.

Supplier Commerce must preserve this server-authoritative commercial pricing boundary.

Future Supplier-Fulfilled integration will need to determine where the selected Supplier Offer participates in:

- sellability;
- stock evidence;
- price freshness;
- supplier/fulfilment shipping cost;
- buyer delivery promise;
- reservation;
- landed-cost/margin guard.

Do not make Product Discovery a checkout dependency.

## 3. Orders

Current `orders` is part of canonical marketplace commercial history and must not be replaced by a parallel Supplier Commerce order system.

Future design must preserve:

ONE CUSTOMER ORDER
→ one or more internal fulfilment legs.

A supplier external order ID belongs to operational fulfilment, not a second buyer order truth.

## 4. Shipping / shipments

Verified on baseline:

`netlify/functions/create-shipment.ts` accepts:

- `order_id`;
- courier/tracking/dispatch fields;
- `shipping_method`;
- `shipping_cost`.

The current server boundary can update `orders.shippingMethod` and `orders.shippingAmount` from fulfilment-time input after payment-backed transition validation.

This has already been identified by the active Checkpoint A audit as a commercial-history/data-integrity risk because fulfilment-time cost input must not silently rewrite the buyer shipping charge established at checkout.

Supplier Commerce architecture must explicitly separate:

- customer shipping charge;
- supplier fulfilment shipping cost;
- carrier shipping cost;
- delivery method/promise;
- tracking metadata;
- financial adjustment/recovery.

This preparation lane MUST NOT repair this runtime issue because the active Checkpoint A agent owns the foundation repair.

## 5. Payments / Stripe

Current Stripe flows are existing canonical payment infrastructure and must be extended/reconciled, not duplicated.

Supplier Commerce must NOT create a second payment truth.

Future integration questions after Gate B:

- payment capture timing;
- supplier submission timing;
- supplier payable timing;
- refund ownership;
- chargeback ownership;
- reconciliation with supplier costs/recoveries;
- Stripe Connect implications by commercial model.

All volatile Stripe rules must be verified from current official Stripe documentation before implementation.

## 6. Invoice

Verified on baseline:

`netlify/functions/generate-invoice.ts` reads current order commercial fields including:

- subtotal;
- vatAmount;
- shippingAmount;
- total.

This reinforces the need to freeze/append commercial truth rather than allow later fulfilment operations to mutate historical paid economics.

Gate B must decide invoice issuer/responsibility for each commercial model before Supplier Commerce financial schema is designed.

## 7. Returns / refunds

Current platform already has returns/refund surfaces. Supplier Commerce must extend them vertically rather than create a supplier-only parallel return system.

Future responsibility split:

CUSTOMER RETURN/REFUND
≠ SUPPLIER RETURN/RECOVERY.

Return destination must be contract-driven and must not assume a Loadify warehouse.

## 8. Admin / Super Admin

Existing Admin/Super Admin surfaces become the integration point for Supplier Control Centre capabilities.

Do not create a separate admin product.

Future vertical additions:

- supplier registry/qualification;
- offer health;
- stock/price freshness;
- import/review queue;
- compliance/provenance evidence;
- supplier failures;
- tracking exceptions;
- refunds/recovery;
- reconciliation;
- incidents/risk;
- supplier kill switch.

## 9. Mobile

Existing rule remains:

WEB BUSINESS CONTRACT = MOBILE BUSINESS CONTRACT.

Supplier Commerce mobile consumers must use the same canonical APIs/lifecycle as web. No mobile-specific supplier/order truth.

## 10. Security / RLS

Checkpoint A is actively hardening server write boundaries, account suspension, push ownership and shipment writes.

Therefore this preparation lane must not snapshot current RLS/authorization assumptions as final.

After Foundation Baseline Freeze:

1. refetch final auth helpers;
2. refetch RLS;
3. refetch server boundaries;
4. refetch write grants;
5. refetch active-account contract;
6. design Supplier Commerce authorization from that frozen foundation.

## 11. Integration rule after Checkpoint A

Nothing in this document may be implemented merely because it appears here.

After Checkpoint A:

FROZEN BASELINE
→ RE-AUDIT THESE SURFACES
→ GATE B PASS
→ RESPONSIBILITY-TO-SCHEMA MAPPING
→ VERTICAL SLICE IMPLEMENTATION.