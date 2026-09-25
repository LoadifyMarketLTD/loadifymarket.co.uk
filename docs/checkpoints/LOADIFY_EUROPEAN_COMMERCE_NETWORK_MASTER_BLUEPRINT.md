# Loadify Market — European Commerce Network Master Blueprint

**Status:** CANONICAL / ACTIVE  
**Created:** 25 September 2026  
**Owner:** Loadify Market / XDrive Logistics Ltd  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Canonical implementation worktree:** `D:\LoadifyMarket-Multicountry`  
**Canonical implementation branch:** `feat/multicountry-uk-ro`  
**Companion document:** `docs/checkpoints/LOADIFY_MULTI_COUNTRY_EXPANSION_MASTER_PLAN.md`

> This document defines the target architecture for Loadify Market as a multi-country commerce operating platform. It is the canonical product/architecture blueprint for cross-border expansion. It does not replace the launch-control, legal-evidence or verification gates in the existing Multi-Country Expansion Master Plan. The two documents must be read together.

---

## 1. Executive decision

Loadify Market must not be treated as a simple online marketplace that is being translated into additional languages.

The current platform is already materially broader. Repository and database inspection on 25 September 2026 confirms approximately:

- **128 application pages**
- **114 Netlify backend functions**
- **225 canonical database migrations**
- **76 source test files**
- dedicated public marketplace, buyer, seller, supplier, trade, admin and mobile surfaces
- a governed supplier-commerce pipeline
- payments, shipping, returns, disputes, messaging, trust/safety and operational control infrastructure
- multi-country foundations for GB and RO

The correct strategic target is therefore:

> **Loadify Market — a multi-sided, multi-country Commerce Operating Platform connecting buyers, sellers, trade buyers and direct suppliers, with integrated catalogue governance, payments, fulfilment, shipping, returns, disputes, compliance and operational controls.**

The expansion architecture must become:

> **ONE APPLICATION + ONE CORE COMMERCE PLATFORM + MARKET CONFIGURATION + CROSS-BORDER ROUTE INTELLIGENCE**

Romania is not a separate product. Romania is the first proving ground for the international operating layer that must later support additional European markets without cloning the platform.

---

## 2. What Loadify already is

The platform currently combines six major systems.

### 2.1 Multi-sided marketplace

The public commerce surface already includes:

- marketplace home
- catalogue
- categories
- product detail
- deals
- cart
- checkout
- wishlist
- seller public profiles
- order tracking
- buyer discovery/search surfaces
- market-aware SEO foundations

The platform is not limited to one seller type or one purchasing context.

### 2.2 Buyer commerce workspace

Buyer capability includes:

- dashboard
- orders
- payment history/surfaces
- delivery addresses
- wishlist/favourites
- reviews
- profile
- settings
- notifications
- messages
- disputes
- returns/resolution-centre mobile surfaces
- authenticated checkout

### 2.3 Seller operating workspace

Seller capability includes:

- self-service activation/onboarding
- seller profile and store identity
- listing creation/editing
- product inventory
- order management
- shipment management
- returns
- disputes
- reviews
- messages
- notifications
- settings
- Stripe Connect
- payout readiness
- selling markets
- delivery markets
- returns country
- shipping defaults

Seller and Buyer capabilities may coexist on the same identity. Admin remains a separate privileged role.

### 2.4 Direct Supplier Network

The supplier system is materially more advanced than ordinary marketplace listing.

Existing supplier architecture includes:

- supplier applications
- onboarding
- integration profiles
- catalogue ingestion
- API / JSON / CSV / XML / Feed URL / SFTP / manual catalogue paths
- acquisition controls
- feed/sync foundations
- normalisation
- canonical catalogue projection
- supplier offer selection
- pricing/economics
- stock/readiness controls
- staging review
- merchandising review
- AI Product Builder assistance
- publication gates
- supplier checkout preparation
- supplier order handshake
- supplier order orchestration
- supplier order runtime
- supplier tracking
- supplier returns
- supplier health
- supplier pilot/control-centre tooling
- autonomous supplier commerce foundations

The supplier model is explicitly:

1. supplier retains or controls stock;
2. supplier fulfils approved buyer orders;
3. Loadify provides marketplace presentation and governed commerce orchestration;
4. supplier approval does not automatically imply product publication;
5. publication is evidence- and readiness-controlled.

Canonical supplier lifecycle:

**Candidate → Verification → Catalogue Connection → Normalisation → Merchandising Review → Controlled Publication → Commerce Runtime**

This is a supplier-commerce infrastructure layer, not merely a seller registration form.

### 2.5 Shipping and order operations

Existing foundations include:

- orders
- order items
- order events
- cancellation requests
- shipments
- shipment events
- shipping methods
- shipping rates
- shipping zones
- product shipping
- shipment status updates
- tracking
- proof of delivery
- delivery confirmation
- seller shipment surfaces
- public tracking

This is sufficient foundation for domestic commerce but is not yet a complete international route engine.

### 2.6 Admin / control platform

Admin capability includes:

- dashboard
- users
- buyers
- seller review/approvals
- product moderation
- product sourcing
- orders
- payouts
- Stripe event visibility
- disputes
- reports
- flagged content
- notifications
- settings
- support
- supplier application queue
- supplier integration kit
- supplier operations health
- controlled pilot readiness
- supplier acquisition
- supplier economics
- supplier publication gates
- supplier orchestration controls

Loadify therefore already contains a platform-control layer as well as a marketplace.

---

## 3. Non-negotiable business model

Loadify remains a marketplace/intermediary and technology-commerce platform.

Unless explicitly changed through a separately approved business/legal model:

- Loadify does not own supplier inventory.
- Loadify does not buy supplier stock in advance.
- Loadify does not operate its own warehouse merely to enable international expansion.
- Independent sellers/suppliers retain or control stock.
- Sellers/suppliers remain responsible for fulfilment according to the applicable arrangement.
- Loadify must not silently become retailer/reseller/importer of record solely because cross-border commerce is added.
- Product data rights, stock authority, price authority and compliance evidence must remain attributable.
- Payments, tax treatment, customs responsibility, shipping responsibility and returns responsibility must be explicit for every route.
- Existing UK production behaviour remains protected while international capabilities are introduced.

---

## 4. Architectural principle: do not duplicate products by country

A product/listing must have one canonical identity.

Do **not** create separate product records merely because the same item is available in GB, RO, DE or FR.

Preferred model:

```text
Canonical Product
  ├── seller / supplier identity
  ├── origin / dispatch locations
  ├── market availability
  ├── market-native price offers
  ├── inventory by location
  ├── shipping eligibility
  ├── compliance evidence
  └── buyer-market presentation
```

Example:

```text
Product ID: P123
Origin: GB
Canonical listing currency: GBP
GB availability: YES
RO availability: YES
RO buyer presentation: RON
GB → RO shipping route: eligible
RO compliance: PASS
RO checkout: eligible
```

The market selector must never duplicate or mutate the underlying product identity.

---

## 5. Separate the concepts that are currently easy to confuse

International commerce must distinguish at least the following concepts.

### 5.1 Market

Commercial/customer context selected by the user or resolved by host/domain.

Examples:

- GB
- RO

Market controls:

- language
- locale
- display currency
- catalogue visibility
- legal disclosures
- available shipping services
- tax logic
- checkout eligibility
- SEO domain/canonical

### 5.2 Seller / supplier legal country

Where the trading entity is established.

### 5.3 Dispatch / warehouse country

Where the actual stock is shipped from.

This may differ from the legal country.

### 5.4 Product origin

Commercial/customs origin where required. This must not be inferred blindly from dispatch location.

### 5.5 Listing currency

The currency of the source commercial offer.

### 5.6 Buyer presentation currency

The currency displayed to the buyer.

### 5.7 Transaction currency

The currency charged by the payment provider.

### 5.8 Settlement currency

The currency in which seller/supplier/platform settlement is recorded and/or paid.

### 5.9 Selling market

A market in which the seller or supplier intends and is permitted to offer products.

### 5.10 Delivery market

A market to which the seller/supplier can fulfil.

### 5.11 Returns country / returns destination

Where returned goods can be accepted.

### 5.12 Origin → destination route

The actual fulfilment path for a specific transaction.

A Romanian buyer does not make a UK product a Romanian product. The transaction is instead evaluated as a route such as:

`GB → RO`.

---

## 6. Target architecture

The platform should be understood in two layers.

### Layer A — Loadify Core

Existing core domains:

- Identity & Roles
- Buyer
- Seller
- Trade/B2B
- Supplier Network
- Catalogue
- Product/Listing
- Inventory
- Cart
- Checkout
- Orders
- Payments
- Payouts
- Shipping
- Tracking
- POD
- Returns
- Refunds
- Disputes
- Messaging
- Reviews
- Notifications
- Support
- Trust & Safety
- Admin
- Analytics
- SEO
- Mobile/Native

### Layer B — International Commerce Layer

New/extended international domains:

- Markets
- Country/locale configuration
- Home market
- Selling markets
- Delivery markets
- Dispatch locations
- Warehouses
- Cross-border routes
- Market pricing
- FX
- Tax/VAT
- Customs
- Duties
- Landed cost
- Product marketability
- Market-specific compliance
- Shipping route eligibility
- Return route eligibility
- Payment capability by market/currency
- Settlement capability
- International documents
- Market-specific legal snapshots
- Domain/SEO routing
- Country launch controls

No existing core module should be duplicated solely for international expansion.

---

## 7. Canonical Capability Map

Status definitions:

- **Implemented** — material code/schema exists.
- **Partial** — usable foundations exist, but not complete end-to-end.
- **E2E verified** — workflow has reproducible end-to-end evidence.
- **Production-ready** — currently safe for intended production scope.
- **Cross-border ready** — route-aware international behaviour is complete.
- **Missing** — required international capability is absent.

The statuses below describe the architecture observed on 25 September 2026. They are not a substitute for fresh launch evidence.

| Domain | Current capability | Current status | Cross-border gap |
|---|---|---|---|
| Public Marketplace | catalogue, categories, product detail, deals, cart, checkout | Implemented / UK production | route-aware international merchandising |
| Buyer Workspace | orders, addresses, payments, wishlist, reviews, messages, disputes | Implemented | buyer-market taxation, customs, international returns |
| Seller Workspace | products, orders, shipments, returns, disputes, Stripe Connect | Implemented | multi-origin inventory, tax registrations, route controls |
| Seller Markets | selling markets, delivery markets, returns country | Implemented foundation | route-specific capability and evidence |
| Trade/B2B | business/trade paths, RFQ schema/backend | Partial | complete RFQ workspace and cross-border documents |
| Supplier Network | ingestion, normalisation, economics, publication gates, orchestration | Implemented foundation | multi-warehouse and route-aware supplier selection |
| AI Product Builder | assisted merchandising | Implemented | market-language/compliance-assisted workflows |
| Catalogue Governance | product/source/publication gates | Implemented | destination-specific marketability |
| Inventory | listing stock and supplier stock concepts | Partial | unified inventory by physical location |
| Orders | order lifecycle, events, cancellation | Implemented | route snapshot, customs/tax/FX evidence |
| Payments | Stripe checkout/PI/webhooks/refunds/Connect | Implemented UK | RON/SCA/refund/reconciliation validation |
| Payouts | seller payout foundations | Implemented UK | multi-currency settlement strategy |
| Shipping | methods, rates, zones, shipments, tracking, POD | Implemented domestic foundation | international route engine |
| Returns | return lifecycle and eligibility | Implemented UK | reverse logistics route engine |
| Refunds | Stripe refund boundary | Implemented | FX/cross-border refund invariants |
| Disputes | buyer/seller/admin dispute handling | Implemented | country/legal context and international evidence |
| Messaging | conversations, messages, order messages | Implemented | localisation/transaction context |
| Notifications | web/mobile notification foundations | Implemented | international templates/localisation |
| Reviews | product/seller review foundations | Implemented | no major architectural blocker |
| Trust & Safety | reporting/flagging/policy controls | Implemented foundation | country/category enforcement |
| Support | tickets/admin support | Implemented foundation | localisation and cross-border issue taxonomy |
| Admin Hub | users, products, sellers, orders, payouts, supplier ops | Implemented | market/route-aware control centre |
| Compliance | RO product/market evidence gates exist | Partial / prelaunch | operational destination-specific engine |
| Legal | versioned policy evidence/snapshots foundations | Partial | reviewed local content per market |
| SEO | market resolver, sitemap, canonical/hreflang | Implemented foundation | final domain cutover verification |
| Android/Mobile | Capacitor + dedicated mobile surfaces | Implemented | international market parity |
| Multi-country | GB live + RO prelaunch configuration | Implemented foundation | full cross-border runtime |

---

## 8. Cross-Border Route Engine — highest-priority architectural addition

### 8.1 Purpose

The Cross-Border Route Engine becomes the authoritative decision service for international commerce.

For a proposed transaction it evaluates:

```text
seller/supplier
+ product
+ inventory location
+ origin country
+ destination market
+ buyer type
+ quantity
+ shipment profile
+ payment currency
+ compliance evidence
+ tax/customs evidence
= route decision
```

### 8.2 Required decisions

The engine must answer independently:

- **CanDisplay**
- **CanOffer**
- **CanShip**
- **CanCheckout**
- **CanReturn**

Every negative result must include machine-readable reasons.

Example:

```json
{
  "route": "GB-RO",
  "displayEligible": true,
  "offerEligible": true,
  "shippingEligible": false,
  "checkoutEligible": false,
  "returnEligible": true,
  "blockers": [
    "RO_SHIPPING_METHOD_MISSING"
  ]
}
```

### 8.3 Fail-closed principle

No cross-border checkout may rely on browser-only assumptions.

Eligibility must be recalculated server-side at the money-moving boundary.

If required evidence is unavailable, checkout remains blocked.

### 8.4 Suggested core entities

Do not implement names mechanically without schema review, but the target concepts should include:

- `market_routes`
- `seller_market_capabilities`
- `supplier_market_capabilities`
- `dispatch_locations`
- `warehouse_locations`
- `inventory_positions`
- `product_market_offers`
- `route_shipping_services`
- `route_tax_profiles`
- `route_compliance_requirements`
- `route_decisions` or reproducible decision snapshots

Existing `marketCodes` remains useful for compatibility but must not carry all route semantics alone.

---

## 9. Unified Inventory & Multi-Warehouse Sourcing

### 9.1 Goal

Allow one seller or supplier to have inventory in multiple physical locations.

Example:

```text
Supplier A
  ├── Warehouse GB / Birmingham / 80 units
  └── Warehouse RO / Bucharest / 25 units
```

A Romanian buyer ordering the product should preferably be fulfilled from the Romanian warehouse if:

- stock exists;
- offer is valid;
- price/economics are acceptable;
- delivery service is available;
- compliance evidence permits sale.

If local stock is unavailable, the platform may evaluate a GB → RO route.

### 9.2 Sourcing decision inputs

- available stock
- reserved stock
- dispatch country
- buyer destination
- shipping cost
- ETA
- tax/duty impact
- product compliance
- seller/supplier commercial eligibility
- return capability
- supplier margin/economics
- route risk

### 9.3 Inventory invariants

- physical stock must belong to a location;
- stock cannot be silently shared between warehouses;
- reservation must be atomic;
- order allocation records the chosen location;
- cancellation/release restores the correct location;
- returns must record the return destination.

### 9.4 Supplier advantage

The existing supplier offer-selection system can later rank candidate fulfilment sources:

```text
RO warehouse
→ DE warehouse
→ GB warehouse
```

based on landed cost, SLA and eligibility rather than a fixed supplier preference.

---

## 10. Cross-Border Shipping Route Engine

The current shipping foundation should evolve into a route-based service.

### 10.1 Canonical model

```text
Origin
→ Destination
→ Shipment Profile
→ Carrier
→ Service
→ Rate
→ ETA
→ Tracking capability
→ Customs capability
→ Return capability
→ Eligibility
```

### 10.2 Shipment profile

At minimum:

- parcel / multi-parcel / pallet
- weight
- dimensions
- quantity
- dangerous/restricted characteristics where applicable
- declared value
- Incoterm/responsibility model where applicable

### 10.3 Route examples

- GB → GB
- RO → RO
- GB → RO
- RO → GB

Future:

- RO → DE
- DE → RO
- FR → RO
- EU → UK

### 10.4 Carrier integrations

The architecture must permit direct or aggregator integrations without coupling checkout to one carrier.

Potential classes:

- postal
- parcel carrier
- express
- pallet/freight
- local same-day
- supplier-arranged shipping

Carrier availability must be route- and service-specific.

### 10.5 Tracking

Shipment tracking must preserve:

- carrier
- carrier reference
- route
- shipment events
- delivery evidence
- exceptions
- handover points where multiple carriers are involved

---

## 11. Landed Cost & Customs Engine

### 11.1 Purpose

A buyer should know the payable cost before committing, where the chosen commercial model permits pre-calculation.

Canonical total:

```text
Product subtotal
+ Shipping
+ Tax/VAT
+ Customs duties
+ Import charges
+ Platform/service charges where applicable
+ FX/conversion effects
= Buyer payable total
```

### 11.2 UK ↔ EU importance

Post-Brexit GB/EU routes may require:

- customs declaration data
- commodity/HS classification where applicable
- origin data
- EORI
- importer/exporter responsibilities
- customs value
- duties
- import VAT
- commercial invoice
- packing data

The exact legal/tax model must be verified from authoritative sources and stored as evidence, not guessed in code.

### 11.3 VAT / OSS / IOSS

The engine must be capable of representing:

- seller VAT registrations
- destination VAT treatment
- OSS/IOSS applicability where legally relevant
- B2B vs B2C distinctions
- reverse-charge scenarios where applicable
- evidence/versioning of tax decisions

No hard-coded percentage alone qualifies as a tax engine.

---

## 12. Canonical international money model

Never relabel one currency as another.

Required immutable transaction facts:

- listing amount
- listing currency
- buyer-display amount
- buyer-display currency
- transaction amount
- transaction currency
- settlement amount
- settlement currency
- FX rate
- FX source
- FX timestamp/version
- platform fee currency
- processor fee currency
- refund currency
- refund amount
- seller/supplier payout currency

Example:

```text
Listing: £12.49 GBP
Buyer presentation: 73.20 RON
Transaction: 73.20 RON
Settlement: GBP
FX source/version: recorded
Refund: governed by original transaction evidence
```

Historical orders must never change because the current FX rate changes.

---

## 13. Dynamic Supplier Publication & Compliance Gates

The existing publication-gate architecture should become destination-aware.

For every proposed destination market the platform should answer:

- Is the product category allowed?
- Is the listing data complete?
- Is required local-language information present?
- Is manufacturer identity present?
- Is EU responsible-person evidence required?
- Is it present?
- Is GPSR evidence complete?
- Are CE/product-specific requirements applicable?
- Is required labelling evidence present?
- Are warnings/instructions available in the required language?
- Is the product transportable by the selected route?
- Is seller/supplier authority to sell established?

AI may assist with:

- translation
- merchandising copy
- extraction
- classification suggestions
- missing-evidence detection

AI must **not** fabricate:

- certifications
- manufacturer identity
- test evidence
- legal approvals
- customs codes as verified fact
- safety evidence

Human/reviewed or authoritative evidence remains required where the gate calls for it.

---

## 14. Cross-Border Return Orchestration

International returns must not automatically mean “send everything back to the original country.”

### 14.1 Reverse logistics decision

The return engine should evaluate:

- original fulfilment location
- seller/supplier return policy
- nearest eligible return hub
- inspection requirement
- product value
- return shipping cost
- dangerous/restricted transport
- refund timing
- restock destination
- disposal/refurbishment path where applicable

### 14.2 Example

```text
Buyer RO
→ requests return
→ platform validates return entitlement
→ selects RO local return point where contractually permitted
→ generates/assigns return shipping
→ inspection/receipt event
→ refund eligibility confirmed
→ Stripe refund
→ inventory/restock/disposition recorded
```

### 14.3 Refund safety

Return completion and refund are separate state transitions.

No UI-only return event may directly authorise a financial refund.

---

## 15. Smart B2B Trade & RFQ

The existing RFQ foundation should be completed rather than replaced.

### 15.1 Cross-border RFQ use case

A Romanian business buyer requests:

- 1,000 units
- specific delivery deadline
- delivery to Romania
- seller/supplier located in GB

The RFQ engine should support:

- quantity break pricing
- commercial terms
- lead time
- route shipping quote
- tax treatment
- customs responsibility
- validity period
- accepted quote → order conversion

### 15.2 Document pack

Where required, the B2B order should be able to generate/store:

- commercial invoice
- packing list
- certificate/origin evidence where applicable
- customs references
- tax/VAT evidence
- purchase order/reference
- shipment documentation

### 15.3 RFQ international readiness

Existing `rfq_requests`, `rfq_responses` and `rfq.ts` are foundations. Seller-facing RFQ must not be called production-complete until the workspace and accepted-quote lifecycle are E2E verified.

---

## 16. Admin Hub → European Commerce Control Centre

The Admin market selector must become operational, not cosmetic.

### 16.1 Admin filters

At minimum:

- All markets
- GB domestic
- RO domestic
- GB → RO
- RO → GB
- International eligible
- International blocked
- Compliance incomplete
- Shipping incomplete
- Payment incomplete
- Tax/customs incomplete

### 16.2 Product moderation columns

Recommended:

- Product
- Seller/Supplier
- Home market
- Dispatch country
- Selling markets
- Delivery markets
- Listing currency
- Inventory locations
- Compliance state
- Shipping readiness
- Payment readiness
- Cross-border eligibility

### 16.3 Important rule

Selecting `RO · RON` in Admin must not simply relabel all prices or show every UK product as Romanian.

A UK-origin listing may appear in an Admin Romanian context only with an explicit state such as:

- **RO domestic**
- **International available in RO**
- **International blocked for RO**

This removes ambiguity while preserving full administrative visibility.

---

## 17. Buyer-facing merchandising model

A Romanian buyer should be able to understand whether an item is local or international.

Possible presentation:

- “Ships from Romania”
- “International — ships from United Kingdom”
- estimated delivery
- shipping cost
- import/customs responsibility where applicable
- returns destination summary

Buyer experience must not expose internal complexity unnecessarily, but must not hide commercially important facts.

---

## 18. Seller and Supplier settings — target international capability

Seller/Supplier profiles should eventually record:

### Identity / tax

- legal country
- trader/business type
- company/registration evidence
- VAT registrations
- OSS/IOSS information where applicable
- EORI where applicable

### Operations

- dispatch locations
- warehouses
- return locations
- fulfilment SLAs
- supported shipment types
- carrier capabilities

### Commerce

- selling markets
- delivery markets
- supported currencies
- local price offers
- cross-border offers

### Compliance

- product categories supported by market
- manufacturer/economic operator evidence
- market-specific documentation capability

The current `marketCodes`, `deliveryMarketCodes` and `returnsCountryCode` are valid foundations but are not the final international data model.

---

## 19. Romania as the proving ground

Before adding more countries, Loadify must prove four routes:

### Route A — GB domestic

Existing production baseline. Must not regress.

### Route B — RO domestic

Romanian seller/supplier or Romanian inventory → Romanian buyer.

Must prove:

- RON
- Romanian shipping
- Romanian tax/legal/compliance
- Romanian returns
- Stripe RON lifecycle
- local SEO/domain

### Route C — GB → RO

Must prove:

- international visibility
- cross-border seller/supplier eligibility
- RON buyer presentation/transaction strategy
- shipping route
- customs
- VAT/import treatment
- product compliance
- tracking
- returns
- refund
- reconciliation

### Route D — RO → GB

Must prove the reverse direction separately.

Passing GB → RO does not automatically prove RO → GB.

---

## 20. Romania launch gate

Romania must remain **PRELAUNCH** until all launch evidence passes.

Required gates include:

- build/typecheck/lint/tests
- visual QA
- real catalogue evidence
- correct RON money model
- payment lifecycle
- SCA/3DS
- refunds
- settlement/reconciliation
- seller eligibility
- supplier eligibility
- shipping
- tax/VAT
- customs where applicable
- legal policy versions
- consumer disclosures
- product compliance
- returns
- notifications
- analytics
- SEO/domain/hreflang
- accessibility
- RLS/API security
- rollback plan

No single passing test — including successful RON payment — makes Romania launch-ready by itself.

---

## 21. Stripe / payment workstream

Current verified platform-account facts must be treated separately from route readiness.

The platform Stripe account is UK-based and live. RON readiness must prove:

1. RON charge/presentment support
2. merchant/platform account capability
3. SCA/3DS behaviour
4. successful payment lifecycle
5. declined/cancelled/retry behaviour
6. webhook idempotency
7. full refund
8. partial refund where supported
9. order/refund currency integrity
10. seller/supplier settlement behaviour
11. conversion/FX behaviour where settlement differs
12. reconciliation evidence

Testing should use sandbox/test mode where possible. Do not generate live charges merely to prove development readiness.

---

## 22. SEO/domain model

Country expansion must keep one platform while supporting local domains.

Target:

- `loadifymarket.co.uk` → GB
- `loadifymarket.ro` → RO

Both resolve to the same application/codebase.

Required:

- host-aware market resolution
- correct canonical
- reciprocal hreflang
- market-aware sitemap
- deep-link compatibility
- auth callback compatibility
- payment callback compatibility
- no duplicate-content regression
- no indexing of incomplete/prelaunch transactional surfaces

---

## 23. Mobile/native

Internationalisation is not complete until Android/native reaches parity.

Eventually validate:

- market selector
- locale
- currency
- catalogue eligibility
- checkout
- international shipping
- returns
- notifications
- legal links
- deep links
- app-store localisation

Do not couple the international web worktree to the existing Android release work unless deliberately planned.

---

## 24. Security and governance principles

The international layer increases risk. Preserve and extend existing server-side controls.

Rules:

- client input is untrusted;
- money-moving decisions are server-authoritative;
- RLS remains enabled and tested;
- service-role writes remain narrow and auditable;
- cross-border route decisions fail closed;
- Stripe webhook idempotency remains mandatory;
- shipment events remain append-only where designed;
- compliance evidence is versioned;
- legal snapshots are immutable per transaction;
- tax/FX evidence is versioned;
- admin override requires reason/audit trail;
- no route becomes live solely through UI configuration.

---

## 25. Analytics / observability

Every international transaction should be attributable by:

- buyer market
- seller market
- supplier market
- origin country
- destination country
- route
- listing currency
- transaction currency
- settlement currency
- warehouse/dispatch location
- shipping service
- cross-border eligibility decision
- blocker/rejection code
- compliance version
- tax decision version

Operational dashboards should expose:

- route conversion
- blocked checkout reasons
- shipping failure rate
- customs exceptions
- refund rate
- returns cost
- supplier SLA
- landed cost variance
- FX variance
- margin by route

---

## 26. Recommended implementation programme

### Phase ECN-0 — Canonical capability inventory

Deliverables:

- authoritative Capability Map
- route/page/function/schema inventory
- status: Implemented / Partial / E2E / Production-ready / Cross-border-ready
- known duplicate/legacy paths
- UK regression baseline

No feature should be labelled production-ready based only on file existence.

### Phase ECN-1 — Cross-border domain model

Implement/review:

- market vs origin vs destination separation
- dispatch/warehouse model
- market offer/pricing model
- route entity
- eligibility decision model
- compatibility migration from `marketCodes`

### Phase ECN-2 — Cross-Border Route Engine

Build:

- display decision
- offer decision
- shipping decision
- checkout decision
- return decision
- machine-readable blockers
- server-authoritative APIs/RPCs
- tests

### Phase ECN-3 — Unified Inventory / Multi-Warehouse

Build:

- warehouse/location identity
- inventory positions
- reservations
- allocation
- release
- multi-location sourcing
- supplier-source ranking

### Phase ECN-4 — Shipping Route Engine

Build:

- route service model
- parcel/pallet profiles
- carrier/service integration contract
- rate/ETA
- tracking
- customs capability
- reverse route capability

### Phase ECN-5 — Tax / Customs / Landed Cost

Build:

- tax decision contract
- VAT evidence/versioning
- customs data model
- landed-cost calculation
- buyer disclosure
- audit snapshot

### Phase ECN-6 — Destination Compliance Publication

Build:

- marketability decision
- destination evidence
- product/language/labelling requirements
- seller/supplier compliance capability
- publication gate integration

### Phase ECN-7 — Reverse Logistics

Build:

- return routing
- local/partner return points
- inspection events
- refund trigger boundary
- restock/disposition

### Phase ECN-8 — Smart B2B / RFQ

Complete:

- buyer RFQ
- seller/supplier response
- cross-border commercial terms
- accepted quote → order
- commercial document pack

### Phase ECN-9 — Admin European Control Centre

Upgrade:

- market/route filters
- international product state
- readiness dashboards
- blockers
- route controls
- evidence review

### Phase ECN-10 — Romania route validation

E2E:

- GB → GB
- RO → RO
- GB → RO
- RO → GB

### Phase ECN-11 — Romania production cutover

Only after all gates and explicit owner approval:

- domain/DNS/SSL
- live launch controls
- checkout/payment enablement
- monitoring
- rollback readiness

### Phase ECN-12 — EU Country Factory

New markets should be added primarily through:

- market configuration
- tax configuration
- compliance requirements
- shipping routes
- legal content
- payment capabilities

not by cloning code.

---

## 27. Country Factory target

Once Romania proves the architecture, adding a new country should resemble:

```text
Add Market Config
→ Add locale/translations
→ Add tax/compliance rules
→ Add legal policies
→ Add shipping routes
→ Validate payment currencies
→ Seed launch-control evidence
→ Run E2E
→ Enable market
```

The core Buyer/Seller/Supplier/Admin applications should not be rewritten.

---

## 28. What not to do

Do not:

- clone the application for Romania;
- duplicate products by country without a real commercial reason;
- reinterpret GBP numeric values as RON;
- expose every UK product in RO by changing the selector;
- assume seller market capability equals shipping capability;
- assume shipping capability equals legal/compliance eligibility;
- assume product compliance equals checkout readiness;
- let browser state authorise a payment;
- perform live Stripe charges just to test development;
- treat a DB table or function as evidence that the full feature is E2E complete;
- auto-verify Romanian legal content without authoritative review;
- make supplier approval automatically publish every supplier product;
- bypass evidence gates to accelerate launch;
- break UK production to finish Romania.

---

## 29. Immediate decisions from the 25 September review

The following decisions are now recommended as canonical:

1. Loadify is treated as a **Commerce Operating Platform**, not merely an online marketplace.
2. International expansion is a platform layer, not a cloned country app.
3. A canonical listing remains a single identity.
4. Market, origin, destination, currency and settlement are separate concepts.
5. Cross-border route eligibility becomes a first-class system.
6. Romania remains the first proving ground.
7. Cross-Border Route Engine is the highest-priority architectural addition after the capability map.
8. Unified inventory/multi-warehouse follows the route model.
9. Shipping becomes route-aware.
10. Landed cost/customs becomes an explicit engine.
11. Supplier publication gates become destination-aware.
12. Returns become reverse-logistics aware.
13. RFQ should be completed for international B2B rather than replaced.
14. Admin Hub becomes a European Commerce Control Centre.
15. UK production remains the regression baseline.
16. Romania cannot become LIVE until all existing launch-control gates and the new route-level requirements pass.

---

## 30. Immediate next work

Before adding more ad-hoc Romania UI behaviour:

### Step 1 — freeze terminology

Adopt:

- Home Market
- Seller/Supplier Country
- Dispatch Country
- Warehouse
- Origin
- Destination Market
- Selling Market
- Delivery Market
- Listing Currency
- Buyer Currency
- Transaction Currency
- Settlement Currency
- Cross-Border Route

### Step 2 — complete the Capability Map with file/API/schema evidence

For each domain record:

- UI route
- backend function/RPC
- tables
- tests
- current E2E evidence
- production status
- cross-border gap

### Step 3 — write the Cross-Border Route Engine technical design

Define:

- request contract
- result contract
- blocker taxonomy
- DB entities
- RPC/API ownership
- checkout integration point
- admin visibility
- audit strategy

### Step 4 — map current GB/RO fields to the new model

Identify what can be retained:

- `marketCodes`
- `deliveryMarketCodes`
- `returnsCountryCode`
- product currency
- shipping method market codes
- payment readiness evidence
- compliance evidence
- market launch controls

and what needs extension.

### Step 5 — do not activate Romania

Romania stays PRELAUNCH while architecture and evidence are completed.

---

## 31. Definition of success

The European Commerce Network architecture is successful when the following statement is true:

> A buyer in any enabled market can discover a canonical product from any eligible seller/supplier location, and Loadify can deterministically decide whether the product may be displayed, offered, shipped, purchased and returned for the exact origin→destination route, while preserving correct currency, tax, customs, compliance, payment, fulfilment and audit evidence.

For Romania specifically, success means Loadify can prove all four initial routes:

- GB → GB
- RO → RO
- GB → RO
- RO → GB

without duplicating the application, duplicating product identities, corrupting money semantics or regressing UK production.

---

## 32. Continuity rule for future agents

Any future agent changing international commerce must:

1. read this blueprint;
2. read `LOADIFY_MULTI_COUNTRY_EXPANSION_MASTER_PLAN.md`;
3. inspect current main/branch status;
4. identify which Loadify Core domain is being modified;
5. identify which international route/market rule applies;
6. preserve UK behaviour;
7. test server-side eligibility boundaries;
8. update capability/readiness evidence;
9. never mark a route production-ready solely because UI renders;
10. keep Romania PRELAUNCH until explicit final cutover approval.

---

## 33. Strategic product statement

Loadify should evolve toward:

> **Loadify Market — the operating layer for multi-market commerce: discovery, supply, catalogue governance, inventory, payments, fulfilment, shipping, returns and compliance across domestic and cross-border routes.**

This statement reflects the platform that already exists and the architecture required to scale it into a European Commerce Network.
