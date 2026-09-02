# Loadify Market — Public Presentation Page Blueprint

Date: 2026-09-02
Status: ACTIVE / P0 — FINAL OWNER ARCHITECTURE RECORDED
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724 — DRAFT / OPEN / NOT MERGED

## Shared rules
Every presentation page is a premium commercial landing page. Unique H1/proposition, concise hero, role CTA, varied visual storytelling, evidence-backed capabilities, lifecycle where relevant, trust/governance proof, adjacent links and unique SEO metadata/canonical. No fake metrics, testimonials, provider logos/integrations, certifications or public API claims.

Visual language = existing Loadify: predominantly light warm-white/light surfaces, navy structure/text and gold/orange accents. No dark/navy rebrand. Desktop quality is current priority; responsive/non-breaking required, full mobile visual acceptance deferred.

## Presentation shell
Used by `/`, `/platform`, `/buyers`, `/sellers`, `/trade`, `/suppliers`, `/integrations`, `/partners`, `/developers`, `/how-it-works`, `/trust` and appropriate institutional pages.
Header: `Platform | Buyers | Sellers | Business ▾ | Technology ▾ | Partners | How It Works | Trust`; Business → Trade Buyers/Suppliers/Brands & Wholesalers; Technology → Integrations/Developers; distinct Marketplace CTA → `/marketplace`; account utilities as appropriate. Burger secondary for About/Help/Contact/legal/full-directory fallback.

## Marketplace shell
`/marketplace` preserves existing marketplace homepage/shopping shell. Search, categories, deals, cart and marketplace actions stay there. Catalogue/category/product/cart/checkout remain commercial. Marketplace Home/logo should remain inside marketplace experience.

## `/` Corporate Presentation Home
Primary business credential and strongest conversion surface. Hero explains Loadify without inflated claims; prefer real UI/platform composition over generic globe/network art. Primary CTAs: Explore Platform + Open Marketplace.

Narrative: Hero → Platform backbone → Buy (Buyers + Trade) → Sell/Supply (Sellers + Suppliers/Brands/Wholesalers) → Connect (Integrations + Partners + Developers) → How Loadify Works → Trust & Governance → role chooser/institutional close.

Do not render ten equal cards as primary storytelling. Do not show provider logos or fabricated statistics/testimonials.

## Dedicated routes
- `/platform`: executive ecosystem map, not encyclopedia.
- `/buyers`: verified discovery/cart/checkout/Buyer Space/tracking tools; no RFQ.
- `/sellers`: verified onboarding/readiness/listings/storefront/orders/shipments/returns/reviews/messages/notifications; payout path qualified where eligible; no unreconciled fee promise.
- `/trade`: business buying + registration path; no trade-credit/guaranteed-discount claim.
- `/suppliers`: supplier/brand/wholesaler participation + controlled supplier-commerce direction; no live automation implication.
- `/integrations`: controlled programme; distinguish live/conditional/provider-gated; no public API claim unless verified.
- `/partners`: commercial/strategic gateway; no unverified partner logos.
- `/developers`: technical credibility/controlled access; no public API promise unless verified.
- `/how-it-works`: truthful lifecycle; provider-gated automation not active by implication.
- `/trust`: real governance/payment/order/support/policy/controlled-activation evidence; no fake badges/certifications.
- `/about`: concise institutional/operator/mission/UK context/contact.
- `/pricing`: not until commercial truth reconciled.

## Acceptance
Homepage is semantic/story root. Dedicated pages cross-link naturally. Visitor must not need burger to discover ecosystem. At ~1440/1536 inspect homepage, primary nav/dropdowns, all ten presentation destinations and Marketplace transition. Corporate/marketplace shells must never appear visually mixed. Build/Netlify success alone is not visual PASS.
