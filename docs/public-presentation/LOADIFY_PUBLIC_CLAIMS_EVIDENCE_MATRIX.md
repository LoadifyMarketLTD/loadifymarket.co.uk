# Loadify Market — Public Claims Evidence Matrix

Date: 2026-09-02
Status: ACTIVE / pre-implementation gate
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724

This matrix controls what the new presentation family may say publicly. A source file, route, adapter or migration alone does not prove a runtime/provider capability. Claims involving money, provider execution, public API availability, app-store distribution, pricing or legal/compliance status require the strongest relevant evidence before publication.

| Public claim | Target page(s) | Evidence | Classification | Safe to publish? | Qualification / action |
|---|---|---|---|---|---|
| Loadify Market is UK-operated | Platform, Trust, About | `src/components/Footer.tsx`, `src/pages/pixel-perfect/AboutUs.tsx` | LIVE / CURRENTLY SUPPORTED | YES | Use verified operator/company wording; do not imply regulatory endorsement. |
| Loadify provides a multi-category marketplace/catalogue | Platform, Buyers | `src/App.tsx`, catalogue/category routes, Home marketplace sections | LIVE / CURRENTLY SUPPORTED | YES | Avoid absolute category-coverage guarantees. |
| Buyers can browse/search products and categories | Buyers, Platform | Header search, catalogue/category routes | LIVE / CURRENTLY SUPPORTED | YES | Normal customer-facing claim. |
| Buyers can add products to cart and checkout | Buyers, How It Works | Cart/Checkout routes in `src/App.tsx` | LIVE / CURRENTLY SUPPORTED | YES | Payment-method detail must match checkout implementation. |
| Checkout is Stripe-backed | Buyers, Trust, Platform | `src/pages/Home.tsx`, Footer trust strip, checkout implementation | LIVE / CURRENTLY SUPPORTED | YES | Prefer "Stripe-powered/backed payment processing"; do not overstate Loadify PCI responsibilities. |
| Buyers can track orders | Buyers, Trust, How It Works | `TrackOrderPage`, `/track-order`, Footer | LIVE / CURRENTLY SUPPORTED | YES | Do not guarantee carrier accuracy/arrival. |
| Buyer Space contains orders, wishlist, addresses, payments, reviews, profile/settings, notifications, messages and disputes | Buyers | Buyer route/components in `src/App.tsx` | LIVE / CURRENTLY SUPPORTED | YES | Convert menu items into customer benefits; verify each CTA route during implementation. |
| Trade/business account registration exists | Trade | `src/pages/pixel-perfect/TradeAccount.tsx` | LIVE / CURRENTLY SUPPORTED | YES | Presentation page must precede the registration form. |
| Trade registration supports sole trader/company/partnership/charity etc. | Trade | `TradeAccount.tsx` customer types | LIVE / CURRENTLY SUPPORTED | YES | Do not imply trade credit or special pricing. |
| Sellers can create/manage product listings | Sellers, Platform | Seller products routes + `ProductFormPage.tsx` | LIVE / CURRENTLY SUPPORTED | YES | Do not claim unsupported service-listing model. |
| Sellers can manage marketplace orders | Sellers, Platform | Seller Orders route/component | LIVE / CURRENTLY SUPPORTED | YES | Normal claim. |
| Sellers have shipment workflow | Sellers, How It Works | Seller Shipments route/component | LIVE / CURRENTLY SUPPORTED | YES | Use factual operational wording. |
| Sellers have returns workflow | Sellers, How It Works | Seller Returns route/component | LIVE / CURRENTLY SUPPORTED | YES | Legal return obligations remain policy-specific. |
| Sellers can use reviews/messages/notifications | Sellers | Seller routes/components | LIVE / CURRENTLY SUPPORTED | YES | Do not promise response outcomes. |
| Sellers have a public profile/storefront | Sellers, Platform | `SellerPublicProfilePage` | LIVE / CURRENTLY SUPPORTED | YES | Verify final route when wiring CTA/example links. |
| Seller payouts use a Stripe Connect path where eligible | Sellers, Platform | `FeaturesGrid.tsx`, seller setup/payment architecture | SUPPORTED WITH CONDITIONS | YES, qualified | Always retain "where eligible" / setup qualification. |
| Loadify charges 7% standard commission | Sellers, Pricing | FAQ, WholesaleInfo, SellerGuidelines | NEEDS OWNER DECISION / COMMERCIAL RECONCILIATION | NO for new Pricing page yet | Reconcile Seller Terms + actual application-fee logic + owner policy. |
| 0% seller commission until 31 Dec 2026 | Sellers, Pricing | FeaturesGrid, FAQ, WholesaleInfo, SellerGuidelines | NEEDS OWNER DECISION / COMMERCIAL RECONCILIATION | NO for permanent new page yet | Time-sensitive and repeated, but must be confirmed as canonical policy before new page. |
| No monthly or listing fees | Pricing | `WholesaleInfo.tsx` | NEEDS OWNER DECISION / COMMERCIAL RECONCILIATION | NO | Verify commercial policy and actual billing implementation. |
| Seller activation is automatic after business profile + Stripe setup | Sellers, Trust | FAQ, SellerGuidelines contain this wording | STALE / CONTRADICTED / NEEDS RECONCILIATION | NO | Current platform also has seller readiness/approval governance. Publish only after exact activation contract is established. |
| Registration requires no email confirmation | FAQ/general | `FAQ.tsx` says no confirmation; `TradeAccount.tsx` requires confirmation | STALE / CONTRADICTED | NO | Correct old FAQ; email verification gates exist. |
| RFQ is a live buyer feature | Buyers/Platform | FAQ claim; master spec notes seller RFQ redirect | STALE / CONTRADICTED | NO | Do not market until route/runtime is reconciled. |
| Loadify is a major services marketplace | Platform/About | About/older components mention service-based offerings | FOUNDATION/CLAIM UNVERIFIED | NO | Dominant current commerce implementation is product/order oriented. |
| Loadify never owns, stores or dispatches any product | About/FAQ | Existing About/FAQ wording | STALE AS PLATFORM-WIDE ABSOLUTE | NO | Too absolute for intended Loadify-operated sourcing / supplier-fulfilled architecture. Use role/responsibility wording instead. |
| Suppliers/brands/wholesalers can discuss participation with Loadify | Suppliers, Partners | seller/wholesale paths + current partnership contact + supplier-commerce programme | LIVE / CONTROLLED | YES | Phrase as enquiry/onboarding path, not guaranteed acceptance. |
| Direct-supplier integration foundation exists | Suppliers, Integrations | Supplier Commerce docs/contracts/readiness | FOUNDATION PRESENT BUT NOT USER-AVAILABLE | YES only as controlled architecture | Do not imply fully active supplier network. |
| Loadify has a provider-neutral supplier adapter/readiness architecture | Integrations, Developers | supplier adapter/registry/readiness code | INTERNAL FOUNDATION / CONTROLLED | YES at high level | Public-safe architecture wording only; no secret/internal mechanics. |
| Supplier/provider activation is evidence-gated and controlled | Integrations, Trust, Developers | `supplierProviderReadiness.ts` + canonical Supplier Commerce rules | CONTROLLED / INTERNAL PRINCIPLE | YES at high level | This is a governance principle, not a promise of provider availability. |
| Avasam is a live Loadify integration | Integrations | readiness: read-only verified, activation off | PROVIDER-GATED / ACTIVATION OFF | NO | Do not show as live partner/integration. |
| BigBuy is a live Loadify integration | Integrations | sandbox evidence required, activation off | PROVIDER-GATED / ACTIVATION OFF | NO | Do not show as live partner/integration. |
| AppScenic is a live Loadify integration | Integrations | partner retailer access required, activation off | PROVIDER-GATED / ACTIVATION OFF | NO | Do not show as live partner/integration. |
| Spocket is a live Loadify integration | Integrations | contract/resale permission blocked | PROVIDER-GATED / CONTRACT BLOCKED | NO | Do not show as live partner/integration. |
| DSers is a live Loadify integration | Integrations | developer review underway + compliance controls, activation off | PROVIDER-GATED / REVIEW UNDERWAY | NO | Do not show as live partner/integration. |
| SaleHoo is a live commerce integration | Integrations | directory/API approval required | PROVIDER-GATED | NO | Treat as discovery/due-diligence unless explicitly approved. |
| Loadify offers universal automated supplier order submission | Integrations, Suppliers | provider readiness has writes inactive/off | PROVIDER-GATED / ACTIVATION OFF | NO | Prohibited until provider-authoritative evidence and activation. |
| Loadify offers universal automated supplier tracking/returns/refunds | Integrations, Suppliers | provider readiness / canonical boundary | PROVIDER-GATED / ACTIVATION OFF | NO | Prohibited as live claim. |
| Loadify has a generally available public API | Developers, Integrations | no current evidence of general availability | UNAVAILABLE / NOT GENERALLY AVAILABLE | NO | Public page should explicitly say not currently generally available unless later evidence changes. |
| Loadify offers partner/onboarding-based integration discussions | Integrations, Developers, Partners | supplier/provider programme + current partner enquiry path | CONTROLLED | YES | Make clear access and capabilities depend on approval/integration path. |
| Webhooks are generally available | Developers | no general evidence | UNVERIFIED / PARTNER-DEPENDENT | NO as general claim | Say availability depends on integration path, if mentioned. |
| Mobile/native application code exists | Platform | mobile/native routes + Capacitor-aware behaviour | FOUNDATION PRESENT | YES only internally qualified | Do not claim App Store/Google Play availability without release evidence. |
| Loadify has a 5.0 Google rating | Trust/About | existing About copy only | STALE / EXTERNAL VERIFICATION REQUIRED | NO | Remove from new trust proposition unless independently reverified and appropriate. |
| Loadify has prohibited-items / seller-verification / IP complaint policies | Trust, Sellers | legal routes in `src/App.tsx`, Footer legal links | LIVE / CURRENTLY SUPPORTED | YES | Link to detailed policies rather than restating legal text loosely. |
| Admin governance exists for sellers/products/orders/flagged activity/reports/disputes | Trust | admin route/components | INTERNAL / ADMIN ONLY | YES at public-safe summary level | Do not expose internal admin procedures or security-sensitive details. |

## Pre-code publication gate

The following claims are blocked from implementation copy until their evidence is closed:
1. Pricing and commission source of truth.
2. Exact seller activation/approval model.
3. Any service-commerce proposition.
4. Any provider-specific live integration claim.
5. Public API/webhook/general sandbox availability.
6. App-store/mobile availability.
7. External ratings/certifications.

## Implementation rule

When a new page introduces a material claim not listed above, add it to this matrix before merging that copy. A visual review does not override this evidence gate.
