# ECN-2 GB->GB Shadow Parity Matrix — 25 September 2026

**Status:** CONTRACT/DOMAIN PARITY COMPLETE — SHADOW REMAINS NON-AUTHORITATIVE  
**Branch:** `feat/multicountry-uk-ro`  
**Shadow function:** `public.server_cross_border_product_decision_v1`  
**Live baseline:** UK marketplace checkout/payment orchestration

## Decision

ECN-2 has reached the point where the shadow Route Engine has a defined, tested responsibility boundary and no known unexplained GB->GB contract mismatch remains in the domains audited below.

This is **not** approval to make the Route Engine authoritative.

Authoritative checkout cutover remains blocked until:

1. ECN migrations are deployed through a controlled environment;
2. real runtime shadow comparisons are captured without changing checkout outcomes;
3. mismatch telemetry shows no unexplained divergence;
4. the route decision integration is introduced behind a fail-safe boundary;
5. full UK regression remains green.

## Parity matrix

| Domain | Live UK authority | ECN shadow treatment | Status |
|---|---|---|---|
| Product active/approved/listing state | checkout/payment backend | composed into shadow product eligibility | PASS |
| Market eligibility | product `marketCodes` + GB launch state | composed, does not broaden eligibility | PASS |
| Listing currency | canonical product GBP | controlled GB-GB legacy price compatibility | PASS |
| Market-native price ledger | not required by current GB legacy checkout | shadow fallback only for GB-GB; no fallback RO/cross-border | PASS |
| Seller market capability | seller profile / account state | composed and may only narrow | PASS |
| Seller account capability | active user + seller capability | mirrored | PASS |
| Seller commercial state | seller status / pause / Connect | mirrored | PASS |
| Individual seller identity | businessName OR fullName | empty-string-safe fallback mirrored | PASS |
| Dispatch/origin | implicit legacy GB today | implicit origin allowed only GB-GB shadow compatibility | PASS |
| Route configuration | implicit domestic GB today | explicit GB-GB live baseline | PASS |
| Quantity/stock | `products.stockQuantity` | mirrored for seller listings | PASS |
| Shipping readiness | product shipping + active method | composed | PASS |
| Selected shipping method | selected method must cover cart goods | product-level selected method mirrored; cart-wide coverage remains checkout authority | PASS / boundary classified |
| Carrier allowlist | Royal Mail / Evri | mirrored | PASS |
| Shipping rate | non-negative available rate | mirrored selected-method rate eligibility | PASS |
| Marketplace tax | `resolveMarketplaceTaxV1` | GB contract mirrored | PASS |
| GB postcode exclusion for tax contract | BT/GY/JE/IM/GX/BF excluded | mirrored | PASS |
| Market compliance | governed readiness RPC | composed | PASS |
| Product compliance | governed product decision | composed; no seller/supplier evidence conflation | PASS |
| Payment readiness | governed readiness RPC | composed | PASS |
| Legal readiness | governed policy snapshot | composed | PASS |
| Launch control | market launch controls | composed | PASS |
| Return route capability | reverse-logistics capability | exposed as route capability only | PASS |
| Customer return entitlement | order/delivery/quantity/reason/window | explicitly remains outside Route Engine | PASS / boundary classified |
| Full shipping/billing address validation | `validateMarketAddress` | remains outside Route Engine | PASS / boundary classified |
| Buyer authentication | active-account auth | remains outside Route Engine | PASS / boundary classified |
| BuyerId ownership | checkout/payment orchestration | remains outside Route Engine | PASS / boundary classified |
| Rate limiting | checkout/payment rate limiters | remains outside Route Engine | PASS / boundary classified |
| Maintenance mode | platform flag | remains outside Route Engine | PASS / boundary classified |
| Duplicate lines | checkout/payment cart validation | remains outside Route Engine | PASS / boundary classified |
| Single-seller cart | checkout/payment orchestration | remains outside Route Engine | PASS / boundary classified |
| Reservation lifecycle | checkout/payment orchestration | remains outside Route Engine | PASS / boundary classified |

## Production evidence used

Read-only production checks during the parity audit observed:

- 9 active physical listings;
- 9/9 GB + GBP product readiness;
- 9/9 seller GB market/delivery + active commercial state;
- 9/9 positive stock;
- 9/9 at least one supported active shipping selection;
- 1–2 supported shipping choices per active listing;
- 0/9 approved GB market-price ledger versions;
- 4/9 complete live GB marketplace-seller product tax evidence;
- 5/9 correctly remain blocked by the live tax resolver.

The absence of GB market-price ledger versions is intentionally handled only by the controlled legacy GB-GB compatibility path. It must not leak into RO or international routes.

## Defects found and closed

1. Shadow domestic tax readiness was initially too permissive.
   - Fixed by mirroring the live GB marketplace-seller tax contract.

2. Individual seller identity fallback could fail when `businessName=''` and `fullName` was valid.
   - Fixed with empty-string-aware fallback.

3. Route return eligibility was semantically ambiguous.
   - Fixed by exposing `returnRouteEligible` and `returnEntitlementAuthoritative=false`.

4. Checkout/session responsibilities risked being conceptually absorbed into Route Engine.
   - Frozen by explicit orchestration boundary tests.

## Test evidence

Latest relevant checks across the ECN-2 parity workstream:

- route/address/orchestration focused contracts: PASS;
- TypeScript: PASS;
- targeted ESLint: PASS;
- canonical migrations: 228/228 unique versions PASS;
- security boundary build tests: 9/9 PASS;
- production build: PASS;
- `git diff --check`: PASS.

## ECN-2 closure gate

**ECN-2 contract/domain parity is closed.**

The shadow Route Engine remains non-authoritative.

The next programme phase is **ECN-3 — Unified Inventory / Multi-Warehouse**, with one critical architectural requirement:

> “Unified Inventory” must be a unified decision model, not a second source of truth that overwrites the existing supplier stock evidence/reservation architecture.

Seller stock and supplier stock have different canonical evidence models and must converge through a controlled inventory-source abstraction.
