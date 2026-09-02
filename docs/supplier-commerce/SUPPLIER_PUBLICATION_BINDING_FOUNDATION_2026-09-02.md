# Supplier Publication Binding Foundation — 2026-09-02

## Status

**FOUNDATION ONLY — FAIL CLOSED — NO MARKETPLACE PUBLICATION — NO CHECKOUT/PAYMENT ACTIVATION**

This change closes an identity seam discovered during the audit of the path:

`provider catalogue -> Supplier Commerce canonical truth -> public Loadify listing -> customer order -> supplier fulfilment`

## Audit finding

The repository already contains two mature but separate domains:

1. **Supplier Commerce canonical truth**
   - canonical products;
   - supplier catalogue identities;
   - supplier offers;
   - import/normalisation;
   - provenance and asset-rights review;
   - product/compliance review;
   - landed-cost/tax/pricing economics;
   - stock/price observations and reservations;
   - fulfilment legs;
   - payment-to-supplier-order handshake and reconciliation.

2. **Customer-facing marketplace listings**
   - `public.products`;
   - seller ownership;
   - listing visibility/status;
   - seller Stripe Connect readiness;
   - seller-centric checkout/payment paths.

No active implementation was found that proves that a customer-facing `public.products` row is the marketplace representation of a specific Supplier Commerce `private.canonical_products` identity.

The existing Supplier Commerce phases intentionally do not publish marketplace listings. The existing customer-facing listing/checkout implementation remains designed around Marketplace Seller accounts.

## Why the seam matters

Before this foundation, supplier order routing could receive:

- a customer `order_item.productId`; and
- a separately selected approved `supplierOfferId`.

Existing guards correctly required the fulfilment item's canonical product to match the selected supplier offer. However, they did not prove that the **public product bought by the customer** had been approved as the public representation of that same canonical product.

That is an identity-integrity gap. It must be closed before real supplier-fulfilled catalogue publication is enabled.

## Canonical commercial contract

For `loadify_supplier_fulfilled`:

- legal seller to the buyer: **XDrive Logistics Ltd trading as Loadify Market**;
- merchant of record: Loadify;
- payment recipient: Loadify;
- invoice/receipt issuer: Loadify;
- supplier: procurement / fulfilment vendor, not the customer-facing seller merely because it dispatches the parcel.

Therefore this foundation does **not** model a supplier as `sellerId` and does **not** require a supplier to have a Loadify seller account or Stripe Connect account.

## Foundation introduced

`private.supplier_publication_bindings` provides a private, audited bridge:

`public product -> canonical product -> approved source import identity`

The binding is restricted to:

- `commercial_mode = loadify_supplier_fulfilled`;
- legal seller key `xdrive_logistics_ltd_ta_loadify_market`;
- explicit territory;
- admin-reviewed status lifecycle;
- evidence-backed approval.

An approved binding requires existing canonical truth rather than recreating it:

- active canonical product;
- approved source import item for that canonical product;
- current `server_supplier_import_decision_v1` approval.

## Selected supplier-offer readiness

`server_supplier_listing_binding_decision_v1(...)` additionally validates a candidate supplier offer for the bound public product.

It requires:

- an approved publication binding;
- the same canonical product;
- the requested territory;
- approved supplier offer;
- existing Supplier Catalog readiness;
- existing Supplier Import readiness;
- existing Supplier Commercial Economics readiness for `loadify_supplier_fulfilled`.

This preserves provider-neutral fallback: several approved supplier offers may serve the same canonical product, but an offer for another canonical product cannot be silently substituted.

## Order-integrity closure

The existing `private.guard_supplier_fulfilment_item_identity_v1()` is extended so a supplier fulfilment item cannot be created unless:

- its supplier offer matches the fulfilment leg;
- its canonical product matches that offer; and
- the customer-facing `order_item.productId` has an approved publication binding to that same canonical product and an eligible selected offer.

This is fail-closed identity validation only.

## Explicit non-goals / unresolved work

This foundation does **not** solve or authorize the customer-facing Supplier-Fulfilled release by itself.

Still intentionally unresolved:

- creation of a Supplier-Fulfilled `public.products` listing from canonical supplier truth;
- product title/description/media projection into the customer-facing listing;
- public RLS visibility for Loadify-sale listings;
- representation of the Loadify legal seller in the public product schema without abusing Marketplace Seller identity;
- Supplier-Fulfilled checkout branch;
- Loadify merchant-of-record payment branch;
- Supplier-Fulfilled shipping-quote selection in checkout;
- immutable order-time snapshot of commercial mode, legal seller, canonical product/variant and selected supplier route;
- mixed Marketplace Seller + Loadify Supplier-Fulfilled carts;
- provider activation;
- Production configuration;
- any real product publication.

`public.products.sellerId` remains seller-centric and non-null in the existing schema. This change deliberately does **not** fake a supplier into that field and does **not** create a synthetic seller account as a shortcut.

## Next phase

After this foundation is validated, the next architecture step is a separate customer-facing publication/checkout change that must:

1. keep one existing canonical customer order/payment truth;
2. distinguish Marketplace Seller and Loadify Supplier-Fulfilled commercial modes explicitly;
3. preserve the existing Marketplace Seller Stripe Connect path;
4. use Loadify/XDrive as seller/MoR/payment recipient for Loadify Supplier-Fulfilled;
5. consume this binding and the existing supplier catalog/import/economics/stock gates;
6. snapshot transaction-time legal/commercial/supplier facts immutably;
7. remain fail-closed when any provider, compliance, pricing, stock, legal-seller or payment evidence is missing.

No Production mutation is authorized by this document or its accompanying foundation code.
