# Loadify Market — Public Presentation Audit

Date: 2026-09-02
Status: ACTIVE / P0 — CONTINUITY UPDATED AFTER OWNER ARCHITECTURE REVIEW
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724 — DRAFT / OPEN / NOT MERGED

## New controlling conclusion
The earlier public shell mixed corporate/platform presentation with marketplace shopping navigation. Owner review rejected that architecture. The corrected target is two coordinated but visually distinct public environments.

### Corporate presentation world
`/` is the official company/platform homepage. Presentation routes: `/platform`, `/buyers`, `/sellers`, `/trade`, `/suppliers`, `/integrations`, `/partners`, `/developers`, `/how-it-works`, `/trust`.

Its header is presentation-first: Platform, Buyers, Sellers, Business, Technology/Integrations, Partners, How It Works, Trust; Marketplace is a distinct destination. Corporate footer is an ecosystem/company directory. Core presentation pages must be visible through navbar/dropdowns, not hidden primarily in burger.

### Marketplace world
`/marketplace` preserves the old marketplace homepage/experience. `/catalog`, category/product routes, deals, cart and checkout remain commercial product discovery. Marketplace retains its own shopping header/drawer/footer with search/categories/cart. Marketplace Home/logo should remain inside the marketplace world rather than unexpectedly replacing corporate `/`.

### Workspaces
Buyer, Seller and Admin remain functional product workspaces and must not be disturbed by presentation refactoring.

## Visual audit conclusion
Loadify's current identity is light and must remain recognizable: warm-white/light surfaces, navy structure/text and gold/orange accent. Dark/navy rebranding is explicitly rejected. Premium composition is required, but visual sophistication cannot come from changing brand identity.

The homepage must meet or exceed the quality of the ten existing presentation pages. It must not be a flat directory of ten cards. It should use narrative hierarchy, varied section composition, real interface evidence and truthful diagrams where useful.

## Homepage conversion audit
The homepage is the primary business credential and sales surface. It must explain one ecosystem and deliberately route multiple audiences: Buyers and Trade; Sellers; Suppliers/Brands/Wholesalers; Integration/technology teams; Commercial/strategic partners; Marketplace shoppers.

Required story: What Loadify is → Platform backbone → Buy → Sell/Supply → Connect → Lifecycle → Trust/Governance → audience-specific next step.

A new visitor should not have to understand the site architecture before understanding the business.

## Navigation audit correction
Earlier implementation work that combined a platform navbar with marketplace search/category/cart layers is not final and must be replaced by separate shells. The corporate burger is secondary/extended navigation, not the primary location for the ten presentation destinations.

Recommended corporate desktop hierarchy:
`Platform | Buyers | Sellers | Business ▾ | Technology ▾ | Partners | How It Works | Trust`
Business: Trade Buyers, Suppliers, Brands & Wholesalers. Technology: Integrations, Developers. Right side: Marketplace CTA, Sign in, Join/Dashboard as appropriate.

## Truth audit — unchanged and strengthened
Only LIVE/CURRENTLY SUPPORTED and SUPPORTED WITH CONDITIONS claims may be marketed as normal live capabilities. Internal/admin-only, foundation-only, provider-gated, stale/contradicted and owner-decision items must not be converted into live marketing claims.

Explicitly prohibited without verified publishable evidence: provider logos/relationships; fabricated product/customer/supplier/transaction/country counts; fake testimonials/reviews; public API availability; certifications or enterprise/security claims; automatic provider fulfilment/tracking/refunds; unsupported global reach.

Provider application/contact/review/readiness work is not a partnership.

## Known capability truth retained
The repository supports marketplace catalogue/search/category/product discovery, cart/checkout, Stripe-backed payment processing, order success/tracking, public seller profiles, buyer and seller workspaces, trade registration, seller onboarding/listing/order/shipment/returns/reviews/messages/notifications flows, admin governance surfaces and controlled Supplier Commerce readiness architecture. Verify at route/runtime level when used in public claims.

Known contradictions remain: RFQ must not be marketed; services-marketplace language is not supported by dominant current implementation; pricing/commission/promotion needs reconciliation before `/pricing`; old no-email-confirmation wording conflicts with verification gates; absolute no-own/store/dispatch language is unsafe for broader architecture.

## Desktop-first scope
Current acceptance is desktop-first. Maintain technical responsive safety but defer full mobile visual acceptance until explicitly resumed.

## Required next audit gates
Do not restart the repository audit. Continue from current PR state. Before merge: inspect exact App route diff against current main; verify corporate/marketplace shell separation; verify old marketplace behavior under `/marketplace`; test auth/cart/checkout/workspaces/legal routes; run build/type/lint/relevant tests; verify Netlify; inspect real desktop preview; re-check new marketing claims against Claims Matrix; verify current main/behind/overlap; keep PR draft/not merged until owner approval.
