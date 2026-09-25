# Loadify Market — ECN-0 Canonical Capability Map
# Loadify Market — ECN-0 Canonical Capability Map

**Status:** CANONICAL / ACTIVE  
**Created:** 25 September 2026  
**Programme:** European Commerce Network (ECN)  
**Phase:** ECN-0 — Canonical Capability Inventory  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Worktree:** `D:\LoadifyMarket-Multicountry`  
**Branch:** `feat/multicountry-uk-ro`  
**Parent blueprint:** `docs/checkpoints/LOADIFY_EUROPEAN_COMMERCE_NETWORK_MASTER_BLUEPRINT.md`  
**Implementation/launch companion:** `docs/checkpoints/LOADIFY_MULTI_COUNTRY_EXPANSION_MASTER_PLAN.md`

> This document is evidence-led. File existence alone is not treated as proof of production readiness. Each capability is classified according to the strongest evidence currently observed in routes, source code, backend functions, database schema and tests.

---

## 1. Status vocabulary

### Implemented
Material production code and/or schema exists.

### Partial
A meaningful foundation exists, but the user-facing or server-side lifecycle is incomplete.

### Contract-tested
Static/contract/unit tests prove important invariants, but not the whole real user journey.

### E2E-verified
A reproducible end-to-end flow has been observed or automated through the actual runtime boundary.

### Production-ready
The capability is suitable for the currently intended production scope and has no known P0/P1 blocker.

### Cross-border-ready
The capability is route-aware and proven for origin→destination commerce. This is a higher bar than multi-country UI support.

### Prelaunch
Implemented foundations exist, but the market/route is intentionally blocked from live transactions.

---

## 2. Platform inventory baseline

Repository inspection on 25 September 2026 confirms approximately:

- 128 application page components under `src/pages`
- 114 Netlify backend functions under `netlify/functions`
- 225 canonical database migrations
- 76 source test files under `src`
- extensive backend function test coverage under `netlify/functions/__tests__`
- GB production market
- RO prelaunch market
- dedicated Buyer, Seller, Admin, Supplier and Mobile surfaces
- Stripe payment, Connect, refund, payout and webhook infrastructure
- shipment, tracking, POD and delivery-confirmation foundations
- direct-supplier ingestion/orchestration architecture
- international market/currency/compliance foundations

---

## 3. Identity, authentication and role model

### UI/routes

Evidence:

- `/login`
- `/register`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`
- `/onboarding/role-selection`
- `/welcome`

Source:

- `src/AppRoutes.tsx`
- `src/pages/pixel-perfect/Login.tsx`
- `src/pages/pixel-perfect/Signup.tsx`
- `src/pages/AuthCallbackPage.tsx`
- `src/pages/onboarding/RoleSelection.tsx`
- `src/App.tsx`

### Backend

Evidence:

- `register.ts`
- `register-intent.ts`
- `register-social-intent.ts`
- `set-account-role.ts`
- `resend-verification.ts`
- `deactivate-account.ts`
- `delete-account.ts`

### Schema

Observed tables include:

- `users`
- `buyer_profiles`
- `seller_profiles`
- `account_capabilities`
- `user_display_names_data`
- `user_deletion_log`
- registration/auth rate-limit tables

### Tests

Representative evidence:

- `active-account-auth.test.ts`
- `auth-signup-current-main-contract.test.ts`
- `auth-strict-cutover-contract.test.ts`
- `cross-platform-auth-security.test.ts`
- `signup-native-auth-contract.test.ts`
- `set-account-role.test.ts`
- `register.test.ts`
- `register-intent.test.ts`

### Current status

**Implemented / contract-tested / production-used**

Buyer and Seller capabilities may coexist on one identity. Admin remains privileged through role checks.

### Cross-border gap

Identity itself is not the blocker. Country-aware trader/business identity, tax registrations and compliance attributes need to become first-class international capability data.

---

## 4. Public marketplace

### UI/routes

Evidence:

- `/`
- `/marketplace`
- `/catalog`
- `/category/:slug`
- `/product/:id`
- `/deals`
- `/cart`
- `/checkout`
- `/seller/:slug`
- `/track-order`

### Source

- `src/pages/Home.tsx`
- `src/pages/MarketplaceHomePage.tsx`
- `src/pages/pixel-perfect/Catalog.tsx`
- `src/pages/pixel-perfect/CategoryPage.tsx`
- `src/pages/pixel-perfect/ProductDetail.tsx`
- `src/pages/pixel-perfect/Cart.tsx`
- `src/pages/pixel-perfect/Checkout.tsx`

### Backend

Relevant functions:

- `create-checkout.ts`
- `create-payment-intent.ts`
- `checkout-status.ts`
- `product-feed.ts`
- `track-shipment.ts`
- `sitemap.ts`

### Schema

Relevant tables:

- `products`
- `categories`
- `product_shipping`
- `carts`
- `cart_items`
- `orders`
- `order_items`
- `payment_sessions`
- `wishlists`
- `saved_searches`
- `featured_listings`
- `promoted_listings`

### Tests

Representative:

- `catalog-product-card-content.test.ts`
- `multicountry-public-surfaces.test.ts`
- `website-commerce-parity-contract.test.ts`
- `create-checkout.test.ts`
- `checkout-safety.test.ts`

### Current status

**Implemented / GB production / RO prelaunch**

The public catalogue already filters by market eligibility in key surfaces.

### Cross-border gap

Current market visibility is primarily market-code driven. It does not yet resolve route-level visibility such as:

`GB origin + RO destination + route eligible = visible internationally`

without making the product a native RO listing.

---

## 5. Buyer workspace

### Routes

Evidence:

- `/buyer`
- `/buyer/orders`
- `/buyer/wishlist`
- `/buyer/addresses`
- `/buyer/payments`
- `/buyer/reviews`
- `/buyer/profile`
- `/buyer/settings`
- `/buyer/notifications`
- `/buyer/messages`
- `/buyer/disputes`

### Source

- `src/pages/pixel-perfect/buyer/BuyerDashboard.tsx`
- `BuyerOrders.tsx`
- `BuyerAddresses.tsx`
- `BuyerPayments.tsx`
- `BuyerWishlist.tsx`
- `BuyerDisputes.tsx`
- `BuyerMessages.tsx`
- `BuyerNotifications.tsx`

### Backend/schema

Relevant:

- `orders`
- `order_items`
- `payment_sessions`
- `returns`
- `disputes`
- `conversations`
- `messages`
- `reviews`
- `notifications`
- `order_cancellation_requests`

Functions:

- `request-order-cancellation.ts`
- `customer-return-eligibility.ts`
- `dispute-action.ts`
- `send-message.ts`
- `conversation-get-or-create.ts`

### Current status

**Implemented / production-used**

### Cross-border gap

Needs buyer-visible international facts:

- origin country
- estimated duties/tax treatment
- international delivery SLA
- customs/import responsibility
- local vs international returns route
- buyer display currency vs transaction currency
- route-specific cancellation/return implications

---

## 6. Seller onboarding and activation

### Routes

- `/onboarding`
- `/seller/setup`
- `/seller/profile`

### Backend

- `start-seller-activation.ts`
- `seller-onboarding-status.ts`
- `set-seller-onboarding.ts`
- `recheck-activation.ts`
- `connect-onboard.ts`
- `connect-status.ts`

### Schema

- `seller_profiles`
- `seller_profiles_public`
- `seller_verifications`
- `seller_stores`
- `account_capabilities`

### Tests

- `seller-onboarding.test.ts`
- `seller-activation-active-account.test.ts`
- `start-seller-activation.test.ts`
- `seller-profile-type-completeness.test.ts`

### Current status

**Implemented / production-used**

### Cross-border gap

Need structured capture of:

- legal country
- VAT registrations
- OSS/IOSS where applicable
- EORI where applicable
- dispatch locations
- warehouse locations
- supported destination markets
- international returns locations
- route-specific fulfilment capability

---

## 7. Seller products and listing lifecycle

### Routes

- `/seller/products/new`
- `/seller/products/:id/edit`
- `/seller/products`
- mobile `/sell`
- mobile `/profile/listings`

### Backend

- `create-product.ts`
- `update-product.ts`
- `delete-product.ts`

### Schema

- `products`
- `product_shipping`
- `product_variants_3p`
- `product_analytics`

### Tests

- `update-product.test.ts`
- `seller-inventory.test.ts`
- `seller-direct-publish-ui-contract.test.ts`
- `mobile-seller-product-routing-contract.test.ts`
- `seller-listing-layout-image-optimization.test.ts`

### Current status

**Implemented**

### Cross-border gap

The product/listing model needs to distinguish:

- canonical product identity
- home market
- dispatch location
- product origin
- market offer
- destination eligibility
- route eligibility
- market-native price vs converted display price

Current `marketCodes` is useful but insufficient as the only international dimension.

---

## 8. Seller operations workspace

### Routes

- `/seller`
- `/seller/orders`
- `/seller/orders/:orderId`
- `/seller/shipments`
- `/seller/returns`
- `/seller/disputes`
- `/seller/reviews`
- `/seller/settings`
- `/seller/notifications`
- `/seller/messages`

### Current status

**Implemented**

### Cross-border gap

Seller operations need route context on every order:

- dispatch location
- destination
- carrier/service
- customs state
- tax state
- return route
- settlement currency
- international evidence/documents

---

## 9. Seller market capability

### Current source

`src/pages/pixel-perfect/seller/SellerSettings.tsx`

Observed current fields:

- `marketCodes`
- `deliveryMarketCodes`
- `returnsCountryCode`
- shipping defaults

### Current status

**Implemented foundation**

### Important limitation

Current model is market capability, not full route capability.

The system can express:

- seller sells in GB/RO
- seller delivers in GB/RO

but not yet robustly:

- seller dispatches from GB warehouse A
- seller may sell into RO only for compliant category X
- seller can use DPD International for parcels but not pallets
- seller can accept returns in RO partner hub but ships from GB
- seller can fulfil B2B but not B2C on a route

### Cross-border requirement

Upgrade from market capability to route capability.

---

## 10. Stripe Connect / seller settlement

### Source/backend

- `connect-onboard.ts`
- `connect-status.ts`
- `connect-dashboard.ts`
- `seller-bank-payout.ts`
- `admin-payout-action.ts`

### Schema

- `payouts`
- `payout_requests`
- `seller_balance`
- `seller_balance_adjustments`

### Tests

- `admin-payout-security-boundary.test.ts`
- `stripe-payout-reconciliation.test.ts`
- `stripe-settlement-policy.test.ts`

### Current status

**Implemented UK foundation**

### Cross-border gap

Need:

- seller settlement currency policy
- route-specific FX
- payout reconciliation for transaction currency ≠ settlement currency
- connected-account country/capability rules
- refund and negative-balance handling across currencies

---

## 11. Direct Supplier Network

### Public routes

- `/suppliers`
- `/suppliers/apply`
- `/integrations`
- `/partners`

### Admin/source areas

- Supplier Application Queue
- Supplier Integration Kit
- Supplier Operations Health
- First Supplier Launch Gate
- Controlled Pilot Readiness
- Product Sourcing

### Backend functions

Observed substantial supplier surface including:

- `supplier-application.ts`
- `supplier-catalog.ts`
- `admin-supplier-foundation.ts`
- `admin-supplier-import.ts`
- `admin-supplier-sync.ts`
- `admin-supplier-offer-selection.ts`
- `admin-supplier-economics.ts`
- `admin-supplier-publication-gate.ts`
- `admin-supplier-order-handshake.ts`
- `admin-supplier-order-orchestration.ts`
- `admin-supplier-order-runtime.ts`
- `admin-supplier-return-runtime.ts`
- `admin-supplier-tracking.ts`
- `admin-supplier-health.ts`
- `autonomous-supplier-commerce.ts`
- direct supplier acquisition/ingestion functions

### Integration transports represented

- API
- JSON
- CSV
- XML
- Feed URL
- SFTP
- Manual catalogue

### Tests

Very broad backend test coverage exists for:

- supplier foundation
- acquisition
- feed admission
- import
- staging
- offer selection
- economics
- checkout preparation
- payment boundary
- order orchestration
- returns
- tracking
- health
- simulator
- publication
- source policy
- runtime recovery

### Current status

**Advanced implemented foundation / contract-tested**

### Critical caution

Supplier function/test breadth does not automatically prove every provider is live or every supplier flow is production-complete.

### Cross-border gap

Need:

- multi-warehouse supplier inventory
- supplier offer by route
- supplier market-native price
- landed cost
- route-aware supplier ranking
- supplier customs capability
- destination compliance
- international return destination

---

## 12. AI Product Builder

### Backend

- `admin-ai-product-builder-brief.ts`
- `admin-ai-product-builder-generate.ts`

### Tests

- `ai-product-builder-contract.test.ts`
- `ai-product-builder-generation-contract.test.ts`
- runtime-boundary tests

### Current status

**Implemented governed assistance**

### Cross-border gap

AI can assist:

- translation
- market merchandising
- classification suggestion
- missing evidence detection

AI must not be treated as authoritative source for:

- certifications
- product safety
- customs origin
- legal approvals
- verified HS code
- manufacturer identity

---

## 13. Catalogue governance and publication

### Current architecture

Supplier publication is already controlled by evidence/readiness gates.

Relevant functions/tests indicate:

- merchandising review
- source policy
- canonical product facts
- publication gate
- marketplace projection
- product sourcing

### Current status

**Implemented foundation**

### Cross-border gap

Publication decision must become destination-specific:

`Product may be published in GB` does not imply `Product may be published in RO`.

Required decision:

`product + seller/supplier + destination market + evidence version → marketability verdict`

---

## 14. Inventory

### Current evidence

- product stock fields
- seller inventory tests
- supplier stock/economics/readiness concepts
- product variants foundation

### Current status

**Partial**

### Missing capability

No canonical first-class multi-warehouse inventory model has yet been proven.

Required:

- warehouses/dispatch locations
- inventory positions
- reservations
- allocations
- release
- location-aware replenishment
- return restock destination

### ECN priority

**High**

---

## 15. Cart

### Source

`src/contexts/CartContext.tsx`

Observed market-aware validation already checks product eligibility and currency.

### Current status

**Implemented / market-aware foundation**

### Cross-border gap

Cart currently needs route resolution before checkout when:

- buyer destination differs from stock origin
- shipping depends on actual warehouse
- tax/customs depends on route
- one cart contains products with different origins

---

## 16. Checkout

### Route/source

- `/checkout`
- `src/pages/pixel-perfect/Checkout.tsx`

### Backend

- `create-checkout.ts`
- `create-payment-intent.ts`
- `prepare-supplier-checkout.ts`
- `create-supplier-payment-intent.ts`

### Current safeguards

Observed in code/tests:

- market gate
- currency validation
- product market eligibility
- address validation
- tax evidence checks
- supplier checkout restrictions
- Romania prelaunch fail-closed boundary

### Current status

**GB implemented / RO prelaunch**

### Cross-border gap

Checkout must invoke the future route engine server-side and persist a route decision snapshot before money moves.

---

## 17. Payments

### Backend

- `create-payment-intent.ts`
- `create-checkout.ts`
- `stripe-webhook.ts`
- `create-refund.ts`
- supplier payment intent
- cleanup/reconciliation functions

### Schema

- `payment_sessions`
- `stripe_events`
- `stripe_webhook_events`

### Tests

Representative:

- `create-payment-intent.test.ts`
- `create-checkout.test.ts`
- `stripe-webhook-commission.test.ts`
- `stripe-runtime-deployment-contract.test.ts`
- `stripe-refund-dispute-recovery.test.ts`

### Current status

**Implemented UK / Romania validation incomplete**

### Cross-border gap

Need verified:

- RON charge
- SCA/3DS
- refund
- FX
- settlement
- reconciliation
- connected-account capability
- route/country restrictions

---

## 18. Orders

### Schema

- `orders`
- `order_items`
- `order_events`
- `order_cancellation_requests`
- `order_messages`

### Backend

- order status functions
- cancellation
- checkout status
- admin orders

### Tests

- `order-transition-guards.test.ts`
- `seller-order-details-contract.test.ts`
- `order-success-checkout-status-contract.test.ts`
- `order-refund-reconciliation-contract.test.ts`
- multicountry money/legal snapshot tests

### Current status

**Implemented**

### Cross-border gap

Order must persist immutable:

- chosen origin/warehouse
- destination
- route
- customs responsibility
- tax decision/version
- FX evidence
- shipping service
- return route policy
- market legal snapshot

---

## 19. Shipping

### Schema

- `shipping_methods`
- `shipping_rates`
- `shipping_zones`
- `product_shipping`
- `shipments`
- `shipment_events`

### Backend

- `create-shipment.ts`
- `update-shipment-status.ts`
- `track-shipment.ts`
- `upload-proof-of-delivery.ts`
- `confirm-delivery.ts`
- shipment stall monitoring

### Tests

- `shipment-boundary.test.ts`
- `shipment-inactive-actor.test.ts`
- `shipping-carrier-policy.test.ts`
- `shipping-method-validation.test.ts`
- `multicountry-shipping-readiness.test.ts`

### Current status

**Implemented domestic foundation**

### Cross-border gap

No complete first-class route engine yet.

Required:

`origin → destination → profile → carrier → service → rate → ETA → customs → tracking → returns`

---

## 20. Tracking and POD

### Current capabilities

- shipment events
- public tracking
- POD upload
- delivery confirmation

### Current status

**Implemented foundation**

### Cross-border gap

Need:

- multi-leg tracking
- carrier handoff
- customs-hold events
- route exceptions
- cross-border ETA semantics

---

## 21. Returns

### Schema/backend

- `returns`
- `return-action.ts`
- `customer-return-eligibility.ts`
- supplier return runtime
- supplier customer return bridge

### Tests

- `return-eligibility-boundary.test.ts`
- `multicountry-return-market-gate.test.ts`
- supplier returns/recovery tests

### Current status

**Implemented UK foundation / RO guarded**

### Cross-border gap

Need reverse-logistics routing:

- buyer location
- original origin
- seller/supplier return rules
- local return hub
- inspection
- restock/disposition
- route-specific refund timing

---

## 22. Refunds

### Backend

- `create-refund.ts`
- Stripe refund/dispute recovery
- supplier refund idempotency

### Current status

**Implemented foundation**

### Cross-border gap

Need immutable currency/FX rules and route-aware reconciliation.

---

## 23. Disputes and resolution

### Routes

- Buyer disputes
- Seller disputes
- Admin disputes
- mobile Resolution Centre

### Schema

- `disputes`
- `dispute_messages`
- `disputes_and_returns`

### Current status

**Implemented foundation**

### Cross-border gap

Dispute evidence must carry:

- jurisdiction/market
- route
- customs/shipping events
- local consumer policy version
- payment/refund currency

---

## 24. Messaging

### Routes/schema

- buyer messages
- seller messages
- inbox/chat
- `conversations`
- `messages`
- `order_messages`

### Backend

- `send-message.ts`
- `conversation-get-or-create.ts`

### Current status

**Implemented**

### Cross-border gap

Primarily localisation and route/order context. No fundamental architectural blocker.

---

## 25. Reviews

### Schema/routes

- `reviews`
- buyer reviews
- seller reviews
- mobile reviews

### Current status

**Implemented foundation**

### Cross-border gap

Low architectural priority. Preserve market/order provenance.

---

## 26. Notifications

### Schema

- `notifications`
- `in_app_notifications`
- `notification_settings`
- `push_tokens`

### Backend

- `push-token.ts`
- notification policy logic

### Current status

**Implemented foundation**

### Cross-border gap

Need:

- locale-aware templates
- customs/shipping exception templates
- international return/refund templates
- market-specific legal notices where required

---

## 27. Support

### Schema

- `support_tickets`
- `support_ticket_messages`

### UI

- Admin Support

### Current status

**Implemented foundation**

### Cross-border gap

Need issue taxonomy for:

- customs
- import charges
- FX
- international delivery
- cross-border returns
- local legal rights

---

## 28. Trust & Safety

### Schema

- `reported_listings`
- `reported_users`
- `reported_reviews`
- `user_blocks`

### UI

- Trust page
- Admin flagged content
- prohibited-items and acceptable-use policies

### Current status

**Implemented foundation**

### Cross-border gap

Policy enforcement must become market/route/category aware.

---

## 29. Legal and policy surfaces

### Public pages

- Terms
- Privacy
- Cookies
- Returns
- Shipping
- Buyer Terms
- Seller Terms
- Disclaimer
- Acceptable Use
- Prohibited Items
- Seller Verification
- IP complaints

### Current status

**UK implemented / RO policy-version framework present / RO review incomplete**

### Cross-border gap

Need reviewed:

- local consumer terms
- cross-border delivery disclosures
- import responsibility
- returns rights
- product safety disclosures
- language requirements

---

## 30. Compliance

### Existing Romania foundations

Current multi-country work includes:

- market compliance evidence
- product compliance evidence
- legal policy evidence
- checkout readiness composition
- payment readiness evidence
- product marketability gates
- Romania fail-closed launch controls

### Current status

**Advanced prelaunch foundation**

### Cross-border gap

Need a reusable compliance requirement model by:

`destination market + category + product type + seller/supplier role + route`

instead of Romania-only expansion logic.

---

## 31. B2B / Trade

### Public routes

- `/business`
- `/trade`
- `/trade-account`

### Schema/backend

- `rfq_requests`
- `rfq_responses`
- `rfq.ts`

### Important route observation

Current AppRoutes redirects:

- `/buyer/rfq` → `/buyer`
- `/seller/rfq` → `/seller`

### Current status

**Partial**

The data/backend foundation exists, but dedicated buyer/seller RFQ workspace is not currently active as a full routed feature.

### Cross-border opportunity

High-value ECN capability:

- bulk quantity
- quote validity
- route shipping
- customs responsibility
- B2B tax treatment
- commercial invoice
- packing list
- accepted quote → order

---

## 32. Services foundation

### Schema

Observed:

- `services`
- `service_attributes`
- `service_media`
- `service_requests`
- `service_quotes`

### Current status

**Foundation only / not equivalent to mature Buyer/Seller product commerce**

Do not market this as a complete services marketplace without further E2E evidence.

### Cross-border relevance

Potential later use for:

- freight services
- customs broker services
- installation
- inspection
- regional fulfilment partners

Not an ECN-1 blocker.

---

## 33. Admin Hub

### Routes

- `/admin`
- users
- buyers
- approvals
- products
- product sourcing
- orders
- flagged
- reports
- support
- settings
- notifications
- payouts
- Stripe events
- disputes
- seller detail

### Current status

**Implemented**

### Confirmed defect/gap in multi-country semantics

Admin Product Moderation currently queries products globally and does not filter by active market. Therefore selecting RO in the market selector can still show UK products without a clear route/market status.

This should not be fixed with a simplistic hide/show rule.

### ECN target

Admin becomes **European Commerce Control Centre** with:

- market filters
- route filters
- origin/destination
- domestic/international state
- shipping readiness
- payment readiness
- compliance readiness
- tax/customs readiness
- cross-border blocker visibility

---

## 34. Analytics and reporting

### Existing evidence

- product analytics
- reports UI
- multicountry analytics currency tests

### Current status

**Partial**

### Cross-border gap

Need dimensions:

- buyer market
- seller market
- supplier market
- origin
- destination
- route
- warehouse
- listing currency
- transaction currency
- settlement currency
- blocker code
- tax/compliance versions

---

## 35. SEO / international discovery

### Existing implementation

Evidence in:

- `src/components/SEO.tsx`
- edge functions for product/category/public metadata
- `sitemap.ts`
- market resolver/context
- loadifymarket.co.uk / loadifymarket.ro domain strategy
- hreflang/canonical tests

### Current status

**Implemented foundation / RO domain not launched**

### Cross-border gap

Need decide whether an international UK-origin listing visible in RO uses:

- RO market URL
- canonical product identity
- translated metadata
- international availability signals

without duplicate-content or false-local-origin semantics.

---

## 36. Mobile / Android

### Existing dedicated mobile surfaces

Observed:

- Inbox
- Chat
- Orders
- Categories
- Profile
- Addresses
- Returns
- Resolution Centre
- Reviews
- Listings
- Shipments
- Store
- Notifications
- Security
- Balance
- Favourites
- Settings
- Seller Payments
- Sell Wizard

Capacitor integration exists.

### Current status

**Implemented substantial mobile/native surface**

### Cross-border gap

Need parity for:

- market selection
- route-aware product availability
- international shipping
- RON
- customs/tax disclosure
- return routing
- translated transactional flows

---

## 37. Security / governance

### Existing evidence

- RLS enabled across core tables
- account capabilities
- rate-limit tables for sensitive functions
- CSP reports
- error reports
- audit logs
- server-managed mutations
- webhook idempotency tables
- security boundary tests

### Current status

**Strong implemented foundation**

### Cross-border gap

New route/tax/compliance decisions must remain:

- server-authoritative
- versioned
- auditable
- fail-closed
- non-bypassable from client state

---

## 38. Observability

### Existing

- `error_reports`
- `csp_reports`
- Stripe event logs
- shipment events
- order events
- supplier health concepts

### Current status

**Implemented foundation**

### Cross-border gap

Need route-level operational metrics and blocker telemetry.

---

## 39. Market / multi-country kernel

### Existing source

- `src/lib/marketConfig.ts`
- `src/contexts/MarketContext.tsx`
- `src/lib/marketResolver.ts`
- market selector
- money utilities
- market-aware catalogue surfaces
- market-aware sitemap/SEO

### Current status

**Implemented foundation**

### Important rule

Market selection controls context. It must not transform product origin or silently convert a listing into a native product for that country.

---

## 40. Romania readiness

### Current status

**PRELAUNCH**

Implemented foundations include:

- RO market config
- locale/i18n foundations
- RON model
- checkout fail-closed
- payment readiness evidence ledger
- legal policy evidence/versioning
- compliance gates
- launch controls
- RO SEO/domain model
- synthetic prelaunch E2E

### Not yet proven complete

- live-safe RON payment lifecycle
- settlement/reconciliation
- full route-aware shipping
- cross-border customs/landed-cost
- final reviewed legal content
- loadifymarket.ro DNS/production cutover
- complete GB→RO and RO→GB route E2E

---

## 41. ECN priority classification

### P0 — required before Romania live

1. Cross-Border Route Engine domain model
2. route eligibility server contract
3. RON payment lifecycle validation
4. shipping route readiness
5. tax/customs responsibility model
6. landed-cost/disclosure model
7. destination compliance decision
8. reverse logistics/return decision
9. immutable order route snapshot
10. final legal policy evidence
11. RO domain/SEO cutover
12. final E2E and rollback

### P1 — major capability after route core

1. Unified Inventory
2. Multi-Warehouse
3. route-based supplier offer ranking
4. Admin European Control Centre
5. route analytics
6. B2B RFQ completion

### P2 — scale/optimisation

1. advanced warehouse ranking
2. multi-leg shipping
3. regional return hubs
4. additional EU country factory
5. route optimisation AI
6. advanced landed-cost providers

---

## 42. Confirmed architecture reuse

The following existing foundations should be extended, not replaced:

- `marketCodes`
- `deliveryMarketCodes`
- `returnsCountryCode`
- product currency
- MarketContext
- market resolver
- money formatter/model
- checkout market gate
- shipping method market codes
- seller profile
- supplier foundation
- supplier publication gate
- supplier offer selection
- order records
- payment sessions
- shipments/events
- returns/disputes
- legal policy evidence
- compliance evidence
- payment readiness evidence
- launch controls
- sitemap/SEO market logic

---

## 43. Known architectural gaps discovered in ECN-0

### Gap A — Admin Products market semantics

Admin Products is currently global and not market/route classified.

**Impact:** UK products can appear while Admin selector is RO, creating false impression that they are RO listings.

**Correct fix:** route/market classification, not simple currency relabelling.

### Gap B — RFQ UI route not active

Buyer/Seller RFQ routes redirect to dashboards.

**Impact:** B2B data/backend foundation exists, but full workspace is not active.

### Gap C — Inventory is not yet canonical multi-warehouse

**Impact:** route sourcing cannot reliably select local vs cross-border inventory.

### Gap D — Shipping is market-aware but not route-engine complete

**Impact:** current shipping foundations cannot alone decide GB→RO or RO→GB eligibility.

### Gap E — Market capability ≠ route capability

Seller `marketCodes` and `deliveryMarketCodes` do not fully express:

- origin
- warehouse
- carrier
- customs
- category restriction
- route compliance

### Gap F — Payments multi-currency readiness still needs evidence

RON capability must be proven end-to-end, not inferred.

---

## 44. ECN-0 conclusion

Loadify Market is already structurally broader than a conventional marketplace.

It has:

- consumer commerce
- seller commerce
- direct supplier commerce
- order operations
- payment infrastructure
- logistics foundations
- reverse-commerce foundations
- messaging
- trust/safety
- admin control
- mobile/native
- internationalisation foundations

The next architectural problem is therefore **not adding more pages**.

The next problem is making the existing systems agree on one authoritative international decision:

> For this exact product, actor, inventory source and origin→destination route, may Loadify display it, offer it, ship it, charge for it and accept its return?

That decision is the purpose of ECN-1/ECN-2.

---

## 45. Next exact implementation task

Proceed to **ECN-1 — Cross-Border Domain Model**.

The next technical design must define:

1. canonical route key
2. origin semantics
3. dispatch location
4. warehouse identity
5. seller/supplier route capability
6. product market offer
7. inventory source
8. route shipping service
9. route tax/customs profile
10. route compliance requirements
11. route eligibility result
12. immutable order route snapshot
13. compatibility strategy for existing `marketCodes`
14. migration strategy with UK-safe defaults
15. admin visibility
16. checkout integration boundary
17. tests before any RO live activation

Romania remains PRELAUNCH.
