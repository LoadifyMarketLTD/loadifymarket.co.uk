# Loadify Market — Public Presentation Page Blueprint

Date: 2026-09-02
Status: ACTIVE / P0 — OWNER-APPROVED ARCHITECTURE UPDATE
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724 — DRAFT / OPEN / NOT MERGED

## Shared rules
Every presentation page is a premium commercial landing page, not documentation. Use unique H1/proposition, concise hero, role-specific CTA, varied visual storytelling, evidence-backed capabilities, lifecycle where relevant, trust/governance proof, adjacent-page links and unique SEO metadata/canonical. No fake metrics, testimonials, logos, integrations, certifications or public API claims.

Presentation visual language is existing Loadify: predominantly light warm-white/light surfaces, navy structure/text and gold/orange accents. No dark/navy rebrand. Desktop visual quality is current priority; keep responsive/non-breaking but full mobile presentation acceptance is deferred.

## Shell blueprint
### Presentation shell
Used by `/`, `/platform`, `/buyers`, `/sellers`, `/trade`, `/suppliers`, `/integrations`, `/partners`, `/developers`, `/how-it-works`, `/trust` and appropriate institutional pages.

Header: `Platform | Buyers | Sellers | Business ▾ | Technology ▾ | Partners | How It Works | Trust`; Business → Trade Buyers/Suppliers/Brands & Wholesalers; Technology → Integrations/Developers; distinct Marketplace CTA → `/marketplace`; context-appropriate Sign in/Join/Dashboard.

Burger is secondary: About, Help, Contact, legal and full directory fallback. Do not hide core presentation architecture primarily there.

### Marketplace shell
`/marketplace` preserves existing marketplace homepage and shopping shell. Search, categories, deals, cart and marketplace actions stay here. Catalogue/category/product/cart/checkout routes remain commercial. Marketplace Home/logo should resolve within marketplace experience.

## `/` — Corporate Presentation Home
Audience: every first-time visitor, especially prospective buyers, sellers, trade businesses, suppliers, technology providers and partners.
Purpose: Loadify's primary business credential and strongest conversion surface.

Hero must explain Loadify without inflated claims. Prefer real UI/platform composition over generic globe/network art. Primary CTAs: Explore Platform + Open Marketplace.

Narrative sections:
1. Hero — what Loadify is and why the ecosystem matters.
2. Platform backbone — visual map to `/platform`.
3. Buy through Loadify — Buyers + Trade.
4. Sell and supply through Loadify — Sellers + Suppliers/Brands/Wholesalers.
5. Connect with Loadify — Integrations + Partners + Developers, clearly programme/discussion-oriented where gated.
6. How Loadify works — truthful lifecycle from discovery through order/fulfilment/tracking/support at appropriate abstraction.
7. Trust & Governance — real controls, payment architecture, policies, order visibility and controlled activation.
8. Role chooser / institutional close — Buy, Sell, Trade, Supply, Integrate/Partner, Marketplace.

Do NOT render ten equal cards as primary storytelling. Do NOT show provider logos or fabricated statistics/testimonials.

## Dedicated routes
`/platform`: executive map of ecosystem; map, not encyclopedia.
`/buyers`: discovery/search/categories, cart/checkout, Stripe-backed processing wording, Buyer Space/order management, tracking and verified buyer tools. No RFQ claim.
`/sellers`: onboarding/readiness, listings, storefront, orders, shipments, returns, reviews/messages/notifications; Stripe Connect payout path only where eligible. No unreconciled fee promises.
`/trade`: business/trade buying and route to existing registration; no trade-credit/guaranteed-discount claim.
`/suppliers`: legitimate supplier/brand/wholesaler participation and controlled supplier-commerce direction; no live automation implication.
`/integrations`: controlled integration programme; distinguish live vs conditional/provider-gated; no generally available API claim unless verified.
`/partners`: commercial/strategic gateway; no unverified partner logos.
`/developers`: technical credibility and controlled access model; no public API promise unless verified.
`/how-it-works`: truthful cross-platform lifecycle without provider-gated automation presented as active.
`/trust`: real access/governance/payment/order/support/policy/controlled-activation evidence; no fake badges/certifications.
`/about`: concise institutional/operator/mission/UK context/contact.
`/pricing`: do not publish until commercial truth is reconciled.

## Cross-linking and acceptance
Homepage is semantic/story root. Dedicated pages link naturally to adjacent audiences/topics and Marketplace. Visitor must not need burger to discover ecosystem.

At ~1440/1536 inspect homepage, primary nav/dropdowns, all ten presentation destinations and Marketplace transition. Corporate and marketplace shells must never appear visually mixed. Build/Netlify success alone is not visual PASS.
