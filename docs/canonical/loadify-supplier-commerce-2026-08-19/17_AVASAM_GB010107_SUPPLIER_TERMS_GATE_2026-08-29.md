# Avasam GB010107 Supplier Terms Gate — 2026-08-29

## Scope

Provider: Avasam
Supplier reference: `GB010107`
Controlled pilot SKU: `S0671779793`
Parent integration PR: `#608`

This checkpoint records the supplier-specific terms presented in Avasam before sourcing the pilot SKU. It does not accept those terms, source the product, enable listing, enable orders, or change hosted Supplier Commerce state.

## Presented supplier terms

### Returns

- Supplier does not accept non-faulty/change-of-mind returns.
- The retailer can remain responsible for the customer-facing refund obligation.
- Supplier recovery/credit must not be assumed for non-faulty returns.

Operational consequence: listing remains blocked until return-loss economics and customer-return handling are explicitly approved.

### Price changes

- Supplier price changes apply in real time.
- The supplier does not follow Avasam's standard three-day price-change notification period.
- Avasam instructs sellers to use automated pricing rules for this supplier.

Operational consequence: listing remains blocked until real-time price sync, an automated pricing rule and a Loadify margin floor are verified.

### Dispatch / delivery terms conflict

The presented page contains two conflicting sets of timing statements:

- summary Shipping Information: dispatch `2 business day`; delivery `3-10 business days`;
- detailed supplier terms: dispatch within Avasam's stipulated 24 hours on Business Days; tracked UK shipping `3 to 5 day` only.

No single SLA is selected by Loadify while this conflict remains unresolved.

Operational consequence: dispatch and delivery SLA activation remains blocked pending provider clarification/evidence.

### Delivery territory / remote locations

- International shipping outside the UK is not supported by the presented terms.
- UK remote area orders require quotation.
- Restricted UK locations are referenced by Avasam.

Operational consequence: GB-only policy; remote/restricted postcode handling must be verified before listing.

### Cancellation

- Standard cancellation functionality is disabled for this supplier.
- Cancellation may be requested shortly after payment, typically up to approximately two hours, but is not guaranteed.
- Avasam customer support must be contacted for the cancellation request.

Operational consequence: no self-service supplier cancellation capability is advertised and order submission stays disabled.

## Fail-closed code profile

PR #608 adds:

- `netlify/functions/_shared/avasamSupplierPolicy.ts`
- `netlify/functions/__tests__/avasam-supplier-policy.test.ts`

The policy allows only `read_only_source_pilot` for exact supplier `GB010107` + exact SKU `S0671779793` after explicit terms acceptance.

Even after terms acceptance:

- listing remains blocked;
- order submission remains blocked;
- commercial activation remains blocked;
- Orders permission remains OFF;
- PII remains OFF.

Listing blockers include:

- automated pricing rule not verified;
- margin floor not verified;
- dispatch SLA conflict unresolved;
- delivery SLA conflict unresolved;
- remote-postcode policy not verified;
- non-faulty-return economics not approved.

## Existing Supplier Commerce architecture alignment

The profile maps to the existing canonical architecture rather than creating a parallel supplier system:

- `private.supplier_qualification_evidence` already includes `uk_shipping`, `price_reliability`, `returns`, `documentation`, `compliance` and related evidence;
- `private.supplier_sla_versions` already contains dispatch, return, refund, cancellation and commercial-terms fields;
- `private.supplier_compliance_profiles` already provides risk/status gating;
- Commercial Economics already requires approved pricing, verified landed cost, current tax evidence and a margin guard before a supplier offer is commercially eligible.

No hosted record is inserted by this checkpoint. Hosted Supplier Commerce remains fail-closed.

## Decision gate for sourcing the pilot

It is safe to proceed with Avasam's terms acceptance only for the controlled purpose of sourcing `S0671779793` into the seller account for read-only API validation, provided the account owner intentionally accepts the supplier terms.

Acceptance must not be interpreted as approval to list or sell the product.

After sourcing:

1. verify the SKU appears in Avasam Inventory / My products;
2. rerun the exact SKU-scoped read-only Avasam probe;
3. validate live SKU, stock and price fields;
4. keep adapter capabilities empty until parser validation passes;
5. keep all hosted Supplier Commerce activation gates OFF.
