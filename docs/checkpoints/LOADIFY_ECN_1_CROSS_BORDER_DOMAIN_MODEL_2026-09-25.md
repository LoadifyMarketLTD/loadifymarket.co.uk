# Loadify Market — ECN-1 Cross-Border Domain Model Technical Design

**Status:** CANONICAL / DESIGN-APPROVED FOR IMPLEMENTATION  
**Created:** 25 September 2026  
**Programme:** European Commerce Network (ECN)  
**Phase:** ECN-1 — Cross-Border Domain Model  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Worktree:** `D:\LoadifyMarket-Multicountry`  
**Branch:** `feat/multicountry-uk-ro`  
**Parent blueprint:** `docs/checkpoints/LOADIFY_EUROPEAN_COMMERCE_NETWORK_MASTER_BLUEPRINT.md`  
**Capability inventory:** `docs/checkpoints/LOADIFY_ECN_0_CANONICAL_CAPABILITY_MAP_2026-09-25.md`

> This design defines the minimum canonical data model and server contract required before building the Cross-Border Route Engine. It extends the current GB/RO architecture; it does not replace the current UK commerce model and does not activate Romania checkout.

---

## 1. Design objective

Loadify must be able to answer one authoritative question:

> For this exact actor, product, fulfilment source and origin→destination route, may the platform display, offer, ship, charge for and accept a return for this transaction?

The current multi-country implementation can already express:

- market selection;
- product market eligibility through `products.marketCodes`;
- seller selling/delivery markets;
- supplier selling/delivery markets;
- market-native price versions;
- market-aware shipping methods/rates;
- RO payment/compliance/readiness evidence;
- order market and currency.

What it cannot yet express robustly is the actual physical/commercial route.

Example currently ambiguous:

```text
Seller can sell in RO
Seller can deliver to RO
Product enabled for RO
```

This does not tell us whether the order is:

- RO warehouse → RO buyer;
- GB warehouse → RO buyer;
- DE warehouse → RO buyer;
- supplier-direct GB → RO;
- seller-fulfilled RO → RO.

ECN-1 introduces that missing distinction.

---

## 2. Non-negotiable compatibility rules

1. Existing UK production behaviour remains the safe default.
2. Existing records must continue to behave as GB/GBP unless explicitly extended.
3. Existing `marketCodes`, `deliveryMarketCodes`, `returnsCountryCode` remain supported.
4. No current product is automatically exposed cross-border.
5. No current seller/supplier is automatically granted cross-border capability.
6. No new route can activate checkout merely because a row exists.
7. Romania remains PRELAUNCH.
8. Route decisions are server-authoritative.
9. Client/UI may display readiness but may not create authoritative eligibility.
10. Historical orders keep immutable route/money/compliance snapshots.

---

## 3. Canonical terminology

### 3.1 Market

Customer-facing commercial context.

Examples:

- GB
- RO

### 3.2 Legal country

Country in which seller/supplier entity or individual trader is established.

### 3.3 Dispatch location

Physical place from which goods leave for the buyer.

### 3.4 Warehouse

A dispatch location that owns/manages inventory positions.

A dispatch location does not have to be a Loadify-owned warehouse.

### 3.5 Product origin

Customs/commercial origin of the goods where relevant.

Do not infer product origin from dispatch country.

### 3.6 Destination market

Market in which the buyer is shopping.

### 3.7 Destination country

Physical delivery country.

For the initial architecture market and destination country align for GB/RO, but the data model must keep them distinct.

### 3.8 Route

Canonical origin-country → destination-country pair plus commerce context.

Examples:

- GB→GB
- RO→RO
- GB→RO
- RO→GB

### 3.9 Market offer

Commercially approved offer for a canonical product in a destination market.

It can be seller-originated or supplier-originated.

### 3.10 Route capability

Evidence-backed permission for an actor to fulfil a specific route.

### 3.11 Route decision

Calculated server result for a specific transaction candidate.

### 3.12 Route snapshot

Immutable copy of the decisive route facts stored with the order.

---

## 4. Existing schema that must be reused

### Public foundations

`products`

- `currency`
- `marketCodes`
- `stockQuantity`
- `weight`
- `dimensions`
- `palletInfo`
- `logisticsInfo`
- tax evidence fields

`seller_profiles`

- `country`
- `taxCountry`
- `marketCodes`
- `deliveryMarketCodes`
- `returnsCountryCode`
- `shippingDefaults`
- seller activation / Stripe capability

`orders`

- `marketCode`
- `currency`
- `displayCurrency`
- `settlementCurrency`
- shipping/billing addresses
- tax decision snapshot
- commercial identity snapshots
- supplier bindings

`payment_sessions`

- `marketCode`
- `currency`
- `displayCurrency`

`shipping_methods`

- `marketCodes`

`shipping_rates`

- `marketCode`
- `currency`
- weight limits

`shipments`

- carrier
- service
- tracking
- POD
- events

`returns`

- order
- buyer/seller
- quantity
- tracking
- refund amount

### Private foundations

Existing private supplier and multi-country structures include:

- supplier foundation
- supplier offers
- supplier pricing snapshots
- supplier landed-cost snapshots
- supplier tax rule versions
- product market price versions
- product/market compliance evidence
- payment readiness evidence
- legal policy versions
- launch controls

These must be composed, not duplicated.

---

## 5. New canonical route entity

Recommended table:

`private.commerce_routes`

Purpose:

- canonical route registry;
- launch/readiness state;
- no user-editable client writes;
- one source for supported origin/destination route identities.

Proposed fields:

```text
id uuid PK
route_code text UNIQUE
origin_country_code text
destination_country_code text
origin_market_code text nullable
destination_market_code text
route_type text
status text
checkout_allowed boolean
returns_allowed boolean
customs_required boolean
tax_profile_code text nullable
shipping_profile_code text nullable
effective_from timestamptz
effective_to timestamptz nullable
evidence jsonb
evidence_version integer
created_at
updated_at
```

Initial seeded routes:

```text
GB-GB  domestic
RO-RO  domestic
GB-RO  cross_border
RO-GB  cross_border
```

Initial state:

- GB-GB = live-compatible
- RO-RO = prelaunch
- GB-RO = prelaunch
- RO-GB = prelaunch

A route row is configuration only. It must not override payment/compliance/shipping launch gates.

---

## 6. Dispatch locations

Recommended table:

`private.commerce_dispatch_locations`

Purpose:

- physical origin identity;
- shared model for seller and supplier fulfilment;
- future multi-warehouse inventory source.

Proposed fields:

```text
id uuid PK
owner_type text -- seller | supplier
seller_user_id uuid nullable
supplier_id uuid nullable
location_type text -- warehouse | store | fulfilment_partner | other
country_code text
region text nullable
city text nullable
postcode text nullable
address_ref jsonb
active boolean
is_returns_location boolean
is_default_dispatch boolean
capabilities jsonb
evidence jsonb
created_at
updated_at
```

Constraints:

- exactly one owner identity;
- no client-visible sensitive full address unless explicitly projected;
- country code required;
- inactive location cannot be newly allocated;
- no route capability can reference an inactive location.

---

## 7. Inventory positions

ECN-1 defines the contract; full inventory execution belongs to ECN-3.

Recommended table:

`private.commerce_inventory_positions`

Proposed fields:

```text
id uuid PK
product_id uuid
dispatch_location_id uuid
supplier_offer_id uuid nullable
quantity_on_hand numeric/integer
quantity_reserved numeric/integer
quantity_available generated/derived
stock_status text
source_type text
source_ref text
source_updated_at timestamptz
version bigint
created_at
updated_at
```

Rules:

- availability belongs to a physical location;
- reservations must be atomic;
- legacy `products.stockQuantity` remains UK-compatible until cutover;
- no automatic split of current stock into multiple locations.

---

## 8. Seller route capability

Recommended table:

`private.seller_route_capabilities`

Purpose:

- express that a seller is actually allowed/capable to fulfil an origin→destination route from a particular dispatch location.

Proposed fields:

```text
id uuid PK
seller_user_id uuid
route_id uuid
dispatch_location_id uuid
buyer_context text -- b2c | b2b | both
status text
shipping_capability_status text
returns_capability_status text
tax_capability_status text
customs_capability_status text
compliance_capability_status text
currency_capabilities text[]
evidence jsonb
evidence_hash text
reviewed_by uuid nullable
reviewed_at timestamptz nullable
valid_from timestamptz
valid_to timestamptz nullable
created_at
updated_at
```

No capability becomes `verified` without evidence and review where required.

---

## 9. Supplier route capability

Recommended table:

`private.supplier_route_capabilities`

Same conceptual contract as seller route capability, linked to:

- supplier foundation identity;
- supplier offer;
- supplier warehouse/dispatch location;
- territory/commercial mode.

It must compose with existing:

- supplier catalogue decision;
- supplier commercial decision;
- pricing snapshot;
- landed-cost snapshot;
- tax rule;
- publication gate.

It must not duplicate those decisions.

---

## 10. Product market offer

Existing `private.product_market_price_versions` already provides evidence-backed destination-market price truth.

Do not create a second pricing system.

ECN-1 adds a broader offer identity around it.

Recommended table:

`private.product_market_offers`

Purpose:

- bind product + seller/supplier + destination market + dispatch source + approved price evidence.

Proposed fields:

```text
id uuid PK
product_id uuid
seller_user_id uuid nullable
supplier_offer_id uuid nullable
dispatch_location_id uuid
destination_market_code text
route_id uuid
price_version_id uuid nullable
supplier_pricing_snapshot_id uuid nullable
status text
valid_from timestamptz
valid_to timestamptz nullable
evidence jsonb
created_at
updated_at
```

Rules:

- exactly one commercial source: seller or supplier offer;
- offer cannot be active unless route capability is valid;
- price evidence remains authoritative in existing price version/snapshot tables.

---

## 11. Route shipping service

Current shipping methods/rates are market-aware but not origin→destination aware.

Recommended route binding:

`private.route_shipping_services`

Proposed fields:

```text
id uuid PK
route_id uuid
shipping_method_id uuid
dispatch_location_id uuid nullable
shipment_type text -- parcel | pallet | freight | supplier_arranged
currency text
min_weight numeric nullable
max_weight numeric nullable
max_dimensions jsonb nullable
tracking_supported boolean
customs_supported boolean
returns_supported boolean
status text
rate_source_type text
rate_source_ref text nullable
evidence jsonb
valid_from
valid_to nullable
```

Existing `shipping_rates` remains compatible for domestic market-level rates.

Route-specific rates may be added later without deleting domestic rate behaviour.

---

## 12. Route tax/customs profile

Recommended table:

`private.route_tax_customs_profiles`

Purpose:

- versioned route-level tax/customs responsibility model;
- not a simplistic VAT percentage table.

Proposed fields:

```text
id uuid PK
route_id uuid
buyer_context text
commercial_mode text
status text
vat_treatment_code text
customs_required boolean
import_vat_responsibility text
duty_responsibility text
exporter_role text nullable
importer_role text nullable
eori_requirement text nullable
oss_i255_applicability text nullable
rule_source_refs jsonb
evidence jsonb
evidence_hash text
version integer
effective_from
effective_to nullable
reviewed_by uuid
reviewed_at
```

Note: field name for IOSS/OSS must be finalised during implementation; do not encode legal conclusions until authoritative evidence is collected.

---

## 13. Route compliance requirements

Recommended table:

`private.route_compliance_requirements`

Purpose:

- describe which destination-market evidence must exist for product/category/actor before route eligibility.

Proposed fields:

```text
id uuid PK
route_id uuid
category_id uuid nullable
product_type text nullable
require_product_marketability boolean
require_gpsr boolean
require_ce_or_specific_conformity boolean
require_manufacturer_identity boolean
require_eu_responsible_person boolean
require_local_language_safety_info boolean
require_transport_eligibility boolean
require_restricted_category_clearance boolean
evidence_policy_ref text
status text
version integer
effective_from
effective_to nullable
```

Actual product evidence remains in the existing compliance evidence structures.

---

## 14. Route decision contract

Target server function:

`public.server_cross_border_route_decision_v1(...)`

This is a service-role/server-only decision function.

Proposed input:

```json
{
  "productId": "uuid",
  "sellerUserId": "uuid|null",
  "supplierOfferId": "uuid|null",
  "dispatchLocationId": "uuid",
  "destinationMarket": "RO",
  "destinationCountry": "RO",
  "buyerContext": "b2c",
  "quantity": 1
}
```

The server resolves:

- route
- actor capability
- product availability
- inventory source
- market offer
- price
- shipping
- tax/customs profile
- compliance
- payment readiness
- returns readiness
- launch controls

---

## 15. Route decision output

Canonical shape:

```json
{
  "eligible": false,
  "interfaceVersion": 1,
  "routeCode": "GB-RO",
  "originCountry": "GB",
  "destinationCountry": "RO",
  "destinationMarket": "RO",
  "displayEligible": true,
  "offerEligible": true,
  "shippingEligible": false,
  "paymentEligible": false,
  "checkoutEligible": false,
  "returnEligible": false,
  "currency": {
    "listing": "GBP",
    "buyerDisplay": "RON",
    "transaction": "RON",
    "settlement": "GBP"
  },
  "evidenceRefs": {},
  "blockers": [
    {
      "code": "ROUTE_SHIPPING_NOT_READY",
      "domain": "shipping",
      "severity": "blocking"
    }
  ]
}
```

Do not return only a single boolean.

---

## 16. Blocker taxonomy v1

### Route

- `ROUTE_NOT_CONFIGURED`
- `ROUTE_DISABLED`
- `ROUTE_PRELAUNCH`

### Actor

- `SELLER_ROUTE_CAPABILITY_MISSING`
- `SELLER_ROUTE_CAPABILITY_EXPIRED`
- `SUPPLIER_ROUTE_CAPABILITY_MISSING`
- `DISPATCH_LOCATION_INACTIVE`

### Product

- `PRODUCT_NOT_ACTIVE`
- `PRODUCT_MARKET_NOT_ENABLED`
- `PRODUCT_ROUTE_RESTRICTED`
- `MARKET_PRICE_NOT_READY`

### Inventory

- `INVENTORY_SOURCE_MISSING`
- `INSUFFICIENT_INVENTORY`

### Shipping

- `ROUTE_SHIPPING_NOT_READY`
- `SHIPMENT_PROFILE_UNSUPPORTED`
- `CARRIER_ROUTE_UNAVAILABLE`

### Compliance

- `PRODUCT_COMPLIANCE_INCOMPLETE`
- `CATEGORY_RESTRICTED`
- `LOCAL_LANGUAGE_SAFETY_INFO_MISSING`
- `RESPONSIBLE_PERSON_EVIDENCE_MISSING`

### Tax/customs

- `TAX_PROFILE_NOT_READY`
- `CUSTOMS_PROFILE_NOT_READY`
- `LANDED_COST_NOT_READY`

### Payments

- `PAYMENT_MARKET_NOT_READY`
- `TRANSACTION_CURRENCY_UNSUPPORTED`
- `SETTLEMENT_EVIDENCE_INCOMPLETE`

### Returns

- `RETURN_ROUTE_NOT_READY`

### Launch

- `MARKET_CHECKOUT_DISABLED`
- `MARKET_PAYMENT_DISABLED`

The taxonomy must remain machine-readable and stable across UI/API.

---

## 17. Display vs checkout eligibility

Loadify must distinguish discovery from purchase.

Example:

A GB product can be visible to a Romanian buyer if:

- international merchandising is allowed;
- product marketability information is sufficient for display.

But checkout may remain blocked because:

- shipping rate missing;
- payment readiness incomplete;
- customs model incomplete.

Therefore:

```text
displayEligible != checkoutEligible
```

This is critical for future international browsing.

---

## 18. Compatibility with current marketCodes

`products.marketCodes` remains a coarse commercial allowlist.

Meaning after ECN-1:

> This product is potentially eligible for merchandising in this market.

It does **not** mean:

- all routes are valid;
- all sellers can ship there;
- all warehouses can fulfil there;
- payment is enabled;
- checkout is enabled.

Likewise:

`seller_profiles.marketCodes`

means seller commercial participation capability.

`seller_profiles.deliveryMarketCodes`

means declared high-level delivery capability.

The new route engine provides the authoritative transaction decision.

---

## 19. Compatibility with current shipping model

Current:

```text
shipping_method.marketCodes
shipping_rate.marketCode
product_shipping
```

remains valid for domestic/simple shipping.

New:

```text
route_shipping_services
```

adds origin→destination constraints.

Resolution order:

1. find route;
2. find route-capable shipping service;
3. bind product shipment profile;
4. obtain rate;
5. verify currency;
6. verify tracking/customs capability;
7. return eligible service(s).

---

## 20. Compatibility with existing supplier landed-cost architecture

Supplier Commerce already contains:

- landed-cost snapshots;
- tax-rule versions;
- commercial decision;
- pricing snapshots.

Do not rebuild these.

For supplier-origin transactions, Cross-Border Route Engine should consume the existing supplier commercial decision and require route alignment.

Future work may generalise supplier landed-cost structures for seller cross-border commerce where useful.

---

## 21. Order route snapshot

Orders need immutable route facts.

Target additions to `public.orders`:

```text
originCountryCode text
destinationCountryCode text
routeCode text
dispatchLocationId uuid nullable
routeDecisionSnapshot jsonb
routeDecisionSource text
routeDecisionCapturedAt timestamptz
```

Potential additions:

```text
productOriginCountryCode text nullable
buyerContext text
customsSnapshot jsonb
landedCostSnapshot jsonb
fxSnapshot jsonb
```

Do not add fields until the migration is reviewed against existing order creation/RPCs.

---

## 22. Order-item fulfilment snapshot

Multi-seller/multi-source orders may need per-item route facts.

Recommended future fields on `order_items`:

```text
dispatchLocationId
routeCode
originCountryCode
destinationCountryCode
marketOfferId
inventoryPositionId
routeDecisionSnapshot
```

Order-level fields may represent the common case; item-level facts become authoritative when a mixed-source order exists.

---

## 23. Route decision immutability

At successful checkout:

1. server calculates route decision;
2. decision must be eligible;
3. decisive evidence/version IDs are captured;
4. order/order-items store immutable route snapshot;
5. later changes to seller settings, route config or rates do not rewrite historical evidence.

Re-check may be required before payment confirmation if the session becomes stale.

---

## 24. Checkout integration boundary

Target flow:

```text
Cart
→ server revalidates product
→ resolve dispatch/inventory source
→ server_cross_border_route_decision_v1
→ market-native price decision
→ shipping route decision
→ tax/customs/landed cost
→ payment readiness
→ create immutable checkout/order snapshot
→ create Stripe payment
```

No Stripe PaymentIntent/Checkout Session may be created if `checkoutEligible=false`.

---

## 25. Returns integration boundary

Return eligibility must resolve against the immutable original order route.

Target:

```text
Order route snapshot
→ consumer/business return rules
→ product condition/category constraints
→ return destination
→ reverse shipping service
→ return cost responsibility
→ return decision
```

Do not infer return route from the seller's current settings if the original transaction snapshot differs.

---

## 26. Admin visibility

Admin Product/Order/Seller/Supplier screens should eventually show:

- home/legal country
- dispatch country
- destination market
- route
- capability status
- blocker codes
- compliance readiness
- shipping readiness
- payment readiness
- tax/customs readiness
- return readiness

Admin market selector must not change product identity.

---

## 27. Public API exposure

Internal route evidence is sensitive/complex.

Recommended public exposure:

- buyer-safe route summary only;
- no internal evidence payloads;
- no service-role IDs;
- no confidential supplier economics.

Example buyer-safe projection:

```json
{
  "shipsFrom": "United Kingdom",
  "destination": "Romania",
  "international": true,
  "estimatedDelivery": "...",
  "shippingPrice": "...",
  "importChargesIncluded": true,
  "returnSummary": "..."
}
```

---

## 28. Security

All new private tables:

- no anon/authenticated direct mutation;
- service-role/server RPC only;
- least privilege;
- explicit grants;
- audit admin overrides.

Public/read projections should expose only required commercial facts.

---

## 29. UK-safe migration strategy

### Stage 1 — schema only

- create route registry;
- seed GB-GB;
- create dispatch locations;
- backfill one default GB dispatch location only where evidence allows;
- no change to checkout behaviour.

### Stage 2 — shadow decision

- calculate route decisions alongside current UK checkout;
- compare result;
- do not block current UK checkout until parity is proven.

### Stage 3 — UK parity gate

Require:

- current UK orders produce GB-GB decision;
- price/shipping/payment parity;
- no new UK blockers;
- E2E PASS.

### Stage 4 — RO shadow/prelaunch

- seed RO-RO/GB-RO/RO-GB as prelaunch;
- calculate blockers;
- no live payment.

### Stage 5 — route engine becomes authoritative

Only after parity and launch readiness.

---

## 30. Backfill rules

Never invent physical origin.

Existing seller records with a verified business/shipping address may support a proposed dispatch location only if that address is legitimately used for fulfilment.

If origin cannot be proven:

- leave dispatch location unverified;
- route decision fails closed for cross-border;
- UK legacy flow remains available until migration cutover.

Existing products remain:

```text
marketCodes = ['GB']
currency = GBP
```

unless explicitly extended.

---

## 31. Testing contract

### Static/schema tests

Verify:

- constraints;
- uniqueness;
- owner XOR rules;
- route-code format;
- status enums/checks;
- no client grants.

### Unit/contract tests

Verify:

- route resolution;
- blocker taxonomy;
- display vs checkout distinction;
- marketCodes compatibility;
- UK defaults.

### Database decision tests

Verify:

- GB→GB eligible under current valid UK facts;
- RO routes remain prelaunch;
- missing route capability fails closed;
- missing shipping fails closed;
- missing compliance fails closed;
- missing payment readiness fails closed.

### E2E

Before authority cutover:

- current UK catalogue/cart/checkout;
- seller order;
- shipment/tracking;
- return/refund baseline.

Before RO launch:

- RO→RO;
- GB→RO;
- RO→GB;
- RON payment;
- refund;
- reconciliation;
- return route.

---

## 32. Implementation sequence

1. create migration for `commerce_routes`;
2. create dispatch-location schema;
3. create route-capability schema;
4. create market-offer bindings;
5. create route shipping binding;
6. add route decision RPC in shadow mode;
7. add tests;
8. prove GB parity;
9. add immutable route snapshots;
10. integrate checkout;
11. build RO route readiness data;
12. only then proceed to live cutover.

---

## 33. Explicit non-goals of ECN-1

ECN-1 does not:

- activate Romania;
- integrate a live international carrier;
- calculate final customs duties;
- replace Stripe;
- create Loadify-owned warehouses;
- fully implement multi-warehouse allocation;
- complete RFQ;
- automatically translate compliance text;
- automatically expose UK products to Romania.

It creates the canonical domain model required for those later phases.

---

## 34. Acceptance criteria for ECN-1 design

The design is complete when:

- origin and destination are separate from market selection;
- dispatch location is first-class;
- route identity is first-class;
- seller/supplier capability can be route-specific;
- product commercial offer can bind to a route;
- shipping can be route-specific;
- tax/customs/compliance requirements can be versioned;
- route decision output has stable blocker codes;
- orders can store immutable route evidence;
- existing GB behaviour has a compatibility strategy;
- Romania remains fail-closed.

This document satisfies the design stage. The next implementation task is the UK-safe schema foundation plus shadow route decision.


---

## 21. Implementation checkpoint — verified 25 September 2026

The additive ECN-1 foundation has now been implemented in `supabase/migrations/20260925163000_ecn_cross_border_domain_foundation.sql` and hardened before authoritative use.

Implemented invariants include:

- `destination_country` is stored separately from `destination_market`;
- the route key represents physical `origin_country -> destination_country`;
- `GB-GB` remains the existing live domestic baseline;
- `RO-RO`, `GB-RO` and `RO-GB` remain PRELAUNCH/fail-closed;
- dispatch locations have explicit verification status and reviewed evidence;
- verified actor route capability requires a verified dispatch location;
- the dispatch-location country must equal the route origin country;
- verified seller/supplier route capability cannot exceed existing market/delivery declarations;
- route decision snapshots remain private;
- `server_market_route_baseline_v1` is service-role only and does not itself authorise checkout;
- existing `private.product_market_price_versions` remains the canonical market-native price truth.

Verification after hardening:

- ECN domain/route targeted suite: PASS;
- canonical migration health: 227/227 unique versions PASS after ECN-2 addition;
- TypeScript: PASS;
- targeted ESLint: PASS;
- production build: PASS (2,500 modules transformed; security boundary tests 9/9 PASS);
- `git diff --check`: PASS.

ECN-2 is implemented only as a shadow/read-only decision layer and is not wired into live checkout.
