# Loadify Market — ECN-3 Unified Inventory / Multi-Warehouse Technical Design

**Status:** CANONICAL DESIGN / IMPLEMENTATION-READY  
**Created:** 25 September 2026  
**Programme:** European Commerce Network  
**Phase:** ECN-3 — Unified Inventory / Multi-Warehouse  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Worktree:** `D:\LoadifyMarket-Multicountry`  
**Depends on:** ECN-1 domain foundation + ECN-2 shadow route decision

---

## 1. Objective

Introduce a unified inventory decision layer that can choose an eligible third-party fulfilment source without replacing the existing seller-stock or supplier-stock systems.

### Non-negotiable marketplace ownership model

Loadify Market is a platform/intermediary. It does **not**:

- own inventory;
- operate its own warehouses;
- pre-purchase goods from suppliers;
- take title to goods;
- become the retailer/seller of record merely because a product comes from a direct supplier;
- finance stock before a buyer order exists.

Stock remains owned/controlled by the independent seller or supplier until sold under the applicable marketplace contract. The responsible seller/supplier stores and dispatches the goods. Loadify may orchestrate catalogue, checkout, payment workflow, shipping information, returns/disputes and evidence, but this does not transfer inventory ownership to Loadify.

The target question is:

> For this product and quantity, which verified physical source can actually fulfil the buyer destination through an eligible route?

The output must support:

- seller stock from one or more dispatch locations;
- direct-supplier stock from supplier warehouse evidence;
- domestic preference when appropriate;
- cross-border fallback;
- deterministic source selection;
- reservation-safe checkout integration later.

---

## 2. Critical architectural rule

**Do not build a second competing stock truth.**

The existing platform already has two materially different **third-party stock** models. Neither model represents Loadify-owned stock.

### Seller stock truth today

Seller listings currently use:

- `public.products.stockQuantity`
- listing status
- reservation fields on products
- checkout/payment reservation lifecycle

This is the current production truth for seller inventory.

### Supplier stock truth today

Supplier Commerce already has a governed evidence chain:

- `private.supplier_stock_observations`
- supplier stock/price readiness decisions
- `private.supplier_stock_reservations`
- orchestration/runtime guards
- append-only raw supplier evidence

Supplier stock observations explicitly state that raw supplier stock is **not automatically Loadify sellable stock**.

Therefore ECN-3 must integrate, not replace.

---

## 3. Unified Inventory means a common decision contract

The unification layer is a server decision abstraction.

It may expose candidate inventory sources in one common shape:

```ts
type InventorySourceCandidate = {
  sourceType: 'seller_listing' | 'supplier_offer';
  productId: string;
  sellerId?: string;
  supplierId?: string;
  supplierOfferId?: string;

  dispatchLocationId?: string;
  sourceCountry: string;

  requestedQuantity: number;
  availableQuantity?: number;

  availabilityState:
    | 'available'
    | 'insufficient'
    | 'unknown'
    | 'stale'
    | 'blocked';

  stockEvidenceRef?: string;
  stockEvidenceCapturedAt?: string;

  reservationModel:
    | 'legacy_seller_listing'
    | 'supplier_stock_reservation';

  routeKey?: string;
  routeEligible: boolean;

  blockers: string[];
};
```

The Route Engine can consume this normalized decision output without owning stock truth.

---

## 4. Existing components to reuse

### ECN dispatch locations

Reuse:

- `private.dispatch_locations`

These represent verified seller/supplier physical dispatch, warehouse or return locations.

### Supplier warehouse declarations

Existing supplier foundation already stores:

- `warehouse_refs`
- supplier origin/business country
- warehouse-origin evidence
- declared warehouse country in supplier feed/intake contracts

Do not discard these.

ECN dispatch locations should become the reviewed canonical binding for route decisions, while supplier warehouse references remain provider/source identifiers.

### Supplier stock observations

Reuse:

- `private.supplier_stock_observations`
- `server_supplier_stock_price_decision_v1`

No new raw supplier-stock table.

### Supplier reservations

Reuse:

- `private.supplier_stock_reservations`

No parallel ECN supplier reservation table.

### Seller listing stock

Retain:

- `public.products.stockQuantity`
- current listing reservation flow

until seller multi-location inventory is proven and cut over.

---

## 5. Seller multi-location extension

Seller stock requires an additive model because one scalar `products.stockQuantity` cannot represent stock split across locations.

Proposed table:

### `private.seller_inventory_positions`

Purpose:

Represent seller-controlled stock for one product at one verified ECN dispatch location.

Suggested fields:

- `id uuid PK`
- `product_id uuid NOT NULL`
- `seller_id uuid NOT NULL`
- `dispatch_location_id uuid NOT NULL`
- `on_hand integer NOT NULL`
- `reserved integer NOT NULL DEFAULT 0`
- `available integer` derived by decision logic
- `status text` — active / suspended / retired
- `source_type text` — seller_manual / seller_api / migration
- `source_ref text nullable`
- `evidence jsonb`
- `verified_at timestamptz nullable`
- `created_at`
- `updated_at`

Constraints:

- product seller must equal `seller_id`;
- dispatch location must belong to the seller;
- dispatch location must be active/verified for authoritative use;
- on_hand >= 0;
- reserved >= 0;
- reserved <= on_hand;
- one active position per product + dispatch location.

---

## 6. Legacy seller compatibility

Seller multi-location must not break UK production.

Migration/cutover strategy:

### Stage A — no behavioural change

Create seller inventory-position tables privately.

Do not require existing UK sellers to populate them.

### Stage B — shadow projection

For a legacy seller listing with no inventory positions:

```text
sourceType = seller_listing
sourceCountry = GB
availableQuantity = products.stockQuantity
reservationModel = legacy_seller_listing
legacy = true
```

Only allowed for the existing GB→GB compatibility path.

### Stage C — explicit position adoption

When verified inventory positions exist for a product:

- inventory decision uses positions;
- legacy scalar remains compatibility/display field until cutover;
- parity checks compare summed/authoritative stock with legacy behaviour.

### Stage D — authoritative migration

Only after seller inventory E2E proves:

- reservation correctness;
- cancellation release;
- payment failure release;
- completed-order decrement;
- seller edit behaviour;
- no negative stock;
- UK checkout parity.

Then the scalar can become a projection instead of authority.

---

## 7. Supplier warehouse binding

Supplier sources need a safe mapping between provider warehouse identifiers and ECN dispatch locations.

Proposed table:

### `private.supplier_warehouse_bindings`

Suggested fields:

- `id uuid PK`
- `supplier_id uuid`
- `external_warehouse_ref text`
- `dispatch_location_id uuid`
- `status text` — draft / verified / suspended / retired
- `evidence jsonb`
- `reviewed_by`
- `reviewed_at`
- timestamps

Constraints:

- external warehouse ref must exist in supplier foundation/declaration evidence;
- dispatch location belongs to same supplier;
- location country must match reviewed warehouse country;
- verified binding requires evidence.

This does not alter supplier stock observations. It gives them a physical ECN location.

---

## 8. Inventory source decision

Proposed service-role interface:

`public.server_inventory_source_decision_v1(...)`

Input:

- product id
- destination country
- destination market
- quantity
- seller id optional
- supplier offer id optional
- preferred dispatch location optional

Output:

- candidates
- selected candidate
- source type
- source country
- dispatch location
- available quantity/evidence
- route key
- route eligibility
- blockers
- decision interface version

---

## 9. Deterministic source ranking v1

Do not use AI for authoritative source selection.

Initial ranking:

1. candidate must be stock-eligible;
2. candidate route must be eligible for the decision context;
3. domestic source before cross-border source, when both are eligible;
4. lower governed landed-cost input when available;
5. shorter governed SLA when available;
6. stable UUID/source key tie-breaker.

For ECN-3, landed cost and SLA ranking may be placeholders until ECN-4/5 provide authoritative inputs.

The key requirement is deterministic behaviour.

---

## 10. Reservation model

ECN-3 does **not** force seller and supplier reservations into one table.

### Seller

Current:

- listing/product reservation boundary

Future:

- seller inventory-position reservation may be added once multi-location positions become authoritative.

### Supplier

Keep:

- `private.supplier_stock_reservations`

The unified inventory result must state which reservation mechanism the checkout orchestrator must invoke.

---

## 11. Multi-item carts

Inventory decision is product-level.

Cart orchestration remains responsible for:

- same-seller restriction while that business rule exists;
- selecting one compatible shipping method for cart goods;
- atomic reservation ordering;
- rollback/release on failure.

The inventory engine must not become a cart transaction orchestrator.

---

## 12. Route Engine integration

ECN-2 currently checks seller stock directly from `products.stockQuantity`.

ECN-3 target:

- replace only the stock-source part of the shadow decision with the inventory-source decision;
- preserve all existing route/compliance/payment/legal gates;
- remain shadow/non-authoritative during parity.

Expected flow:

```text
Product
→ Inventory source candidates
→ Candidate origin
→ Route decision
→ Selected inventory source
→ Shipping/tax/compliance/payment
→ Checkout eligibility
```

For multiple candidate origins, route eligibility participates in source selection.

---

## 13. Domestic vs cross-border example

Product P123 has:

- Seller warehouse GB: 20 units
- Seller warehouse RO: 5 units

Buyer destination RO, quantity 2.

Candidates:

1. RO warehouse
   - stock yes
   - RO-RO route
   - domestic

2. GB warehouse
   - stock yes
   - GB-RO route
   - cross-border

If both routes are eligible, deterministic v1 selects RO first.

If RO stock < 2, GB may become candidate only if GB-RO passes all route gates.

---

## 14. Supplier example

Supplier offer has stock observations tied to external warehouse refs:

- warehouse A / GB
- warehouse B / DE

The ECN layer:

1. reads governed supplier stock readiness;
2. resolves external warehouse ref to verified ECN dispatch location;
3. derives origin;
4. evaluates destination route;
5. returns eligible source candidates.

It does not copy raw supplier stock into a new ECN truth table.

---

## 15. Safety invariants

- no negative seller stock;
- no over-reservation;
- no cross-owner dispatch location use;
- no unverified supplier warehouse binding in authoritative checkout;
- no raw supplier observation treated as sellable stock without supplier readiness decision;
- no implicit RO/international origin;
- legacy implicit GB origin remains GB-GB-only;
- inventory selection cannot enable a disabled route;
- inventory selection cannot bypass product marketability;
- reservations remain server-authoritative.

---

## 16. Tests required

### Seller positions

- cannot bind product to another seller;
- cannot bind another seller’s dispatch location;
- cannot reserve above on-hand;
- cannot create negative stock;
- verified/active location required for authoritative use;
- legacy GB listing fallback preserved when no position exists.

### Supplier warehouse binding

- supplier ownership enforced;
- declared warehouse ref required;
- country mismatch blocked;
- verified evidence required.

### Decision

- one seller position eligible;
- multiple seller positions deterministic;
- local source preferred;
- insufficient local source falls back to cross-border candidate;
- disabled route removes candidate;
- supplier stock stale/blocked is not eligible;
- seller and supplier reservation model is explicit;
- no Romania route becomes live.

---

## 17. Implementation order

### ECN-3A

Create seller inventory positions + supplier warehouse bindings privately.

No checkout changes.

### ECN-3B

Create read-only inventory-source decision RPC.

### ECN-3C

Wire into ECN shadow Route Engine only.

### ECN-3D

GB-GB legacy-vs-position parity tests.

### ECN-3E

RO-RO / GB-RO / RO-GB prelaunch source-selection tests.

### ECN-3F

Only after later approval: reservation/cutover work.

---

## 18. Non-goals

ECN-3 does not:

- make Loadify the owner, purchaser, importer, warehouse operator, retailer or seller of the goods;

- activate Romania;
- rewrite supplier stock evidence;
- replace supplier reservations;
- immediately replace `products.stockQuantity`;
- implement carrier rating;
- implement customs;
- implement landed cost;
- remove current UK reservation code;
- create Loadify-owned warehouse inventory.

---

## 19. Implementation decision

Proceed with a **unified inventory decision layer**, not a unified raw-stock table.

Create additive seller-location inventory positions and supplier-warehouse bindings, then normalize both seller and supplier sources through one server decision contract.

This preserves the current enterprise supplier architecture while enabling true multi-warehouse and route-aware sourcing.
