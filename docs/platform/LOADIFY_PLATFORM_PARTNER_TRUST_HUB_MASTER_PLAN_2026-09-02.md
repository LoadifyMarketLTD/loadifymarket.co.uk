# Loadify Market — Public Platform Presentation & Partner Trust Hub — Canonical Execution Plan

Date: 2026-09-02
Status: ACTIVE / P0 / CANONICAL FOR PR #724
Branch: `feat/platform-partner-trust-hub-20260902`
Base main at workstream start: `4d52461823a13ab3412d074db17095df2bbf4fb2`
PR: #724 — Draft / Open / Not merged

## 1. Mission

Build the complete public commercial, institutional and ecosystem presentation layer for Loadify Market so a first-time visitor can understand the platform without first entering a buyer or seller dashboard.

This is not a cosmetic landing-page exercise and not a simple buyer/seller website refresh.

The finished public site must make Loadify understandable and credible to:

- buyers;
- sellers;
- trade/business buyers;
- brands;
- wholesalers;
- suppliers/manufacturers/distributors;
- supplier-commerce platforms;
- fulfilment and commerce technology providers;
- integration/developer teams;
- commercial and strategic partners;
- procurement/compliance reviewers;
- journalists, prospective collaborators and other institutional visitors.

The exterior of Loadify must finally explain the breadth of the platform that already exists internally, while never claiming capabilities that are not live or verified.

## 2. Controlling sources and source-of-truth order

This plan incorporates the owner-supplied `LOADIFY_MARKET_PUBLIC_PLATFORM_PRESENTATION_MASTER_SPEC_2026-09-02_v3.md`, the current repository truth, `AGENTS.md`, current Supplier Commerce canonical constraints and current provider-readiness evidence.

When sources conflict, follow:

1. controlling canonical business/security contract;
2. newest controlling clarification;
3. current repository state;
4. current production/runtime evidence;
5. verified official external evidence;
6. this execution plan and page blueprint;
7. historical plans/checkpoints;
8. assumptions.

No unsupported marketing claim may override repository/runtime truth.

## 3. Core product-positioning principle

Loadify must not look publicly like only:

`buyer storefront + seller registration + small About page`.

The public presentation must communicate one connected ecosystem:

`Marketplace + Buyer Platform + Seller Platform + Business/Trade + Brands/Wholesale/Suppliers + Partnerships + Supplier Commerce/Integrations + Trust/Governance + Company`.

The public site should explain roles and relationships, not expose internal implementation details.

## 4. Non-negotiable truth gate

Every public capability claim must be classified as one of:

1. `LIVE / CURRENTLY SUPPORTED`
2. `SUPPORTED WITH CONDITIONS`
3. `INTERNAL / ADMIN ONLY`
4. `FOUNDATION PRESENT BUT NOT USER-AVAILABLE`
5. `PROVIDER-GATED / ACTIVATION OFF`
6. `STALE / CONTRADICTED / MUST NOT MARKET`
7. `NEEDS OWNER DECISION`

Only categories 1 and 2 may be presented as ordinary live customer-facing capabilities.

Categories 4 and 5 may appear only as clearly qualified programme/integration direction when commercially useful and when wording cannot imply live availability.

Never invent:

- public APIs;
- active integrations;
- partner relationships;
- product counts;
- customer counts;
- transaction volumes;
- certifications;
- testimonials;
- supplier verification claims;
- automatic supplier ordering/tracking/returns/refunds;
- provider logos or endorsements.

## 5. Research benchmark principle

Use mature marketplace/SaaS/platform websites only as information-architecture and presentation-quality references.

Reference patterns include:

- platform tour / product explanation;
- separate buyer/seller/supplier/business/partner/developer surfaces;
- role-based navigation;
- dedicated integrations/technology pages;
- strong diagrams and lifecycle storytelling;
- rich footer information architecture;
- clear commercial and trust CTAs.

Do not copy another company's branding, wording, layout, illustrations, logos or claims.

Loadify remains visually Loadify.

## 6. Public architecture — one ecosystem, multiple dedicated pages

Do not create one giant institutional page.

Each major audience/topic must have a direct landing page that can be shared independently.

### Platform family

- `/platform` — executive platform overview and ecosystem map.
- `/how-it-works` — visual cross-platform lifecycle.

### Buyer family

- `/buyers` — buyer proposition and Buyer Space benefits.
- `/trade` — trade/business buying proposition; links to the existing trade-account registration flow.

### Seller family

- `/sellers` — seller proposition and Seller Space.
- `/pricing` — only after commercial truth is reconciled.

### Supplier / commercial product family

- `/suppliers` — brands, wholesalers, manufacturers, distributors and suppliers.
- existing `/wholesale-info` may be rebuilt, redirected or cross-linked only after route/content audit.

### Ecosystem / integration family

- `/integrations` — controlled supplier-commerce / technology integration programme.
- `/partners` — commercial, strategic, category, logistics, fulfilment and technology partnership gateway.
- `/developers` — technical front door, clearly stating access model and whether any API is generally available.

### Trust / company family

- `/trust` — trust, safety and governance summary.
- `/about` — concise institutional/company page, not the platform encyclopedia.

Existing legal/policy/help/contact pages remain linked and are not replaced by marketing copy.

## 7. Navigation target — professional dual-purpose architecture

The current navigation is primarily marketplace/category oriented. It must evolve into two cooperating layers:

### A. Platform presentation navigation

Desktop target hierarchy, subject to UX refinement after route audit:

`Marketplace | Platform | Buyers | Sellers | Business ▾ | Integrations | Partners`

Business dropdown / mega-menu:

- Trade Buyers
- Brands & Wholesalers
- Suppliers
- Business participation paths

Utility area:

- Pricing
- Trust
- Help
- Sign in / Dashboard
- Join Loadify
- Cart

### B. Product discovery navigation

Shopping functionality remains prominent:

- search;
- marketplace/catalogue;
- categories;
- deals;
- cart.

The product category strip may remain as a separate commerce layer below the institutional/platform navigation.

Do not cram every presentation page into one horizontal row.

## 8. Burger / drawer — Loadify Navigation Hub

The left burger must no longer function mainly as a list of marketplace categories plus a few support links.

It must become a professional directory for the whole Loadify ecosystem while preserving direct shopping access.

Target information architecture:

### Explore
- Marketplace
- Categories
- Deals

### Discover Loadify
- Platform
- How It Works
- For Buyers
- For Sellers

### Business
- Trade Buyers
- Brands & Wholesalers
- Suppliers

### Connect with Loadify
- Partners
- Integrations
- Developers / Technology

### Trust & Company
- Trust & Safety
- About Loadify
- Help Centre
- Contact
- Legal & Policies

Account/dashboard actions remain context-aware and accessible.

The mobile drawer must express the same information architecture as desktop, not become a reduced or unrelated menu.

## 9. Homepage role

The homepage must ultimately become the gateway into the ecosystem, not a 20-section corporate document and not merely a buyer/seller storefront introduction.

Target high-level routing concept after dedicated pages exist and are validated:

- I want to Buy
- I want to Sell
- I represent a Business
- I am a Supplier / Brand
- I want to Integrate / Partner

The homepage must remain commerce-oriented and preserve product discovery.

Homepage convergence is a later phase of this PR after the dedicated presentation architecture is complete and reviewed. Do not prematurely rewrite the homepage while the destination pages are still undefined.

## 10. Footer — professional ecosystem directory

The footer must eventually reflect the same expanded public architecture and no longer look like only a small online shop footer.

Target groups may include:

### Marketplace
- Shop
- Categories
- Deals
- Track Order

### Sell & Business
- Sellers
- Trade
- Suppliers
- Brands & Wholesalers
- Pricing

### Platform & Ecosystem
- Platform
- How It Works
- Integrations
- Partners
- Developers

### Trust & Support
- Trust & Safety
- Help
- Contact
- Seller Guidelines
- Returns / Shipping / Prohibited Items

### Company & Legal
- About Loadify
- Terms
- Buyer Terms
- Seller Terms
- Privacy
- Cookies
- other verified legal routes.

Exact footer content is determined from current route truth and must avoid dead/duplicate links.

## 11. Dedicated landing-page standard

Every presentation page must be a real commercial landing page, not documentation.

Each page requires:

1. strong audience-specific hero;
2. one clear value proposition;
3. concise explanatory copy;
4. visual storytelling/diagram/screenshot where useful;
5. capability/benefit sections;
6. role-specific lifecycle / how-it-works section;
7. trust/governance proof appropriate to that audience;
8. role-specific CTA;
9. internal links to adjacent pages;
10. SEO metadata and canonical handling.

Avoid walls of text, nested-card overload, fake metrics, generic stock-business imagery and generic SaaS clichés.

## 12. Page-specific intent

### `/platform`
Answers:
- What is Loadify Market?
- Who participates?
- What environments exist?
- How does commerce move through Loadify?
- Why is it useful and trustworthy?

Acts as a map, not an encyclopedia.

### `/buyers`
Explains only verified buyer-facing capabilities such as discovery, checkout, account/order management, tracking, wishlist/favourites, reviews, messaging/support/disputes where actually supported, and trade path.

### `/sellers`
Explains seller onboarding, seller readiness, listing/catalogue management, storefront/profile, marketplace orders, shipments, returns, reviews, messaging/notifications and eligible payout path where verified.

### `/trade`
Explains business buying and routes into the existing trade account workflow. Do not make a registration form do the work of a presentation page.

### `/suppliers`
Explains how brands, wholesalers, manufacturers, distributors and suppliers may participate, including direct marketplace selling and controlled supplier/integration discussions. Do not market unverified automated fulfilment.

### `/integrations`
Designed for supplier platforms, dropshipping platforms, middleware, fulfilment technology, catalogue/feed providers and integration teams.

Must distinguish:
- Live
- Conditional
- Provider-gated
- Not generally available

Public API wording must be factual. If no generally available API exists, say so clearly.

### `/partners`
Broader commercial gateway for strategic, category, logistics, fulfilment, technology and commercial partnerships. Must not duplicate Suppliers or Integrations.

### `/developers`
Technical credibility layer. Explain the controlled integration model, data domains and technical principles without advertising an API that is not generally available.

### `/trust`
Summarises real account, seller, marketplace, payment, policy, dispute/support, review, tracking and governance controls at a public-safe level. Links to detailed legal policies.

### `/pricing`
Created/published only once current commission, launch promotion, Stripe processing wording, buyer charges and VAT/tax wording have one reconciled source of truth.

### `/about`
Concise operator, mission, UK context, marketplace model, legal identity and contact page. Never the main product-presentation surface.

## 13. Supplier Commerce marketing boundary

Supplier Commerce is strategically important but remains evidence-gated.

Public presentation may describe:

- supplier-commerce architecture;
- controlled provider onboarding;
- integration programme;
- supplier connectivity direction;
- provider-neutral commerce model;
- contact path for integration discussion.

Do not claim provider-specific automation unless verified current evidence supports it.

Provider contact/application status is internal evidence and does not create a public partnership.

The public site must not imply that Syncee, Spocket, DSers, BigBuy, AppScenic, Avasam, SaleHoo or any other provider is a live Loadify partner unless that exact relationship and capability are verified and publishable.

## 14. Required evidence deliverables before implementation

Before coding presentation pages, create and complete:

### `docs/public-presentation/LOADIFY_PUBLIC_PRESENTATION_AUDIT.md`
Contains:
- current navbar map;
- current burger/mobile drawer map;
- current public routes/pages;
- buyer/seller/admin/mobile capability inventory;
- payments/order/fulfilment capability inventory;
- Supplier Commerce truth;
- contradictory/stale content;
- dead/duplicate routes;
- commercial/pricing inconsistencies;
- current -> proposed information architecture.

### `docs/public-presentation/LOADIFY_PUBLIC_PRESENTATION_PAGE_BLUEPRINT.md`
For every proposed page:
- route;
- audience;
- purpose;
- core message;
- claims allowed;
- claims prohibited;
- hero direction;
- sections;
- CTA;
- cross-links;
- SEO title/description;
- evidence files.

### `docs/public-presentation/LOADIFY_PUBLIC_CLAIMS_EVIDENCE_MATRIX.md`
Columns:
`Public claim | Page | Repo/runtime evidence | Classification | Safe to publish?`

No major claim ships without evidence.

## 15. Implementation order

### Phase 0 — Repository-truth audit — START NOW

1. Read `AGENTS.md`.
2. Reconfirm current real `main` SHA before significant write batches.
3. Verify no overlapping active PR.
4. Audit `src/App.tsx` routes.
5. Audit `src/components/Header.tsx`.
6. Audit `src/components/MobileDrawer.tsx` and related mobile navigation components.
7. Audit current public pages, homepage and footer.
8. Inventory Buyer Space.
9. Inventory Seller Space.
10. Inventory relevant Admin governance.
11. Inventory native/mobile functionality.
12. Audit payments/orders/fulfilment/tracking/returns/messaging/disputes.
13. Revalidate current Supplier Commerce readiness.
14. Identify stale/contradictory claims and pricing inconsistencies.
15. Produce Audit.
16. Produce Page Blueprint.
17. Produce initial Claims Evidence Matrix.

**No presentation-page implementation before this evidence layer exists.**

### Phase 1 — Navigation architecture foundation

After Phase 0:
- define desktop platform navigation hierarchy;
- define Business mega-menu/dropdown;
- rebuild burger as Navigation Hub;
- preserve search/cart/account/category discovery;
- define shared public presentation layout/components;
- preserve Loadify palette and visual language.

### Phase 2 — P0 presentation pages

Build first:
1. `/platform`
2. `/suppliers`
3. `/integrations`
4. `/partners`
5. `/developers`
6. `/trust`

These are the most urgent external credibility surfaces for current supplier/integration conversations.

### Phase 3 — Audience and lifecycle pages

Build:
- `/buyers`
- `/sellers`
- `/trade`
- `/how-it-works`
- reconcile/rebuild wholesale/brands presentation.

### Phase 4 — Commercial clarity

- reconcile seller fees/commission/promotional terms;
- create `/pricing` only when truth is consistent;
- reconcile Seller Guidelines / Seller Terms / FAQ / homepage commercial claims.

### Phase 5 — Homepage + footer convergence

Only after destination pages are coherent:
- add ecosystem routing to homepage;
- preserve marketplace/product discovery;
- rebuild footer around platform + marketplace + business + trust + legal architecture.

### Phase 6 — SEO / internal linking / structured data

- unique title/meta/canonical/H1 per page;
- semantic hierarchy;
- internal role-based linking;
- breadcrumbs where appropriate;
- Organization/WebSite/Breadcrumb schema only from verified facts;
- no fabricated review/rating schema.

### Phase 7 — Technical and visual validation

Run repository-required:
- install/check;
- typecheck;
- lint;
- relevant tests;
- build;
- route/link validation;
- desktop/mobile navigation validation;
- Netlify Deploy Preview;
- actual preview screenshots at desktop/tablet/mobile widths;
- visual owner review.

Do not declare visual PASS from source alone.

### Phase 8 — Branch Guard and merge gate

Before merge:
- verify real current `main`;
- verify PR behind/ahead and overlap;
- inspect exact changed-file inventory/diff;
- ensure no auth/cart/checkout/workspace/legal/Supplier-Commerce regression;
- ensure no unsupported claim;
- ensure preview and required checks pass;
- owner visually approves.

PR remains Draft / Open / Not merged until all gates pass.

## 16. New Visitor Acceptance Test

A visitor with no prior knowledge of Loadify must be able to answer from public pages alone:

1. What is Loadify Market?
2. Is it relevant to me?
3. What can I buy?
4. Who sells?
5. Can my business buy?
6. Can my business sell?
7. Can I supply products?
8. Can my platform/company integrate or partner?
9. How do seller operations work?
10. How do payments/orders/fulfilment work?
11. What happens if there is a problem?
12. How does Loadify govern trust and marketplace activity?
13. What does selling cost?
14. How do I start?
15. Which advanced supplier/integration capabilities are actually live today?

If public presentation cannot answer these clearly, the project is incomplete.

## 17. Definition of done

This P0 workstream is complete only when:

- the public exterior no longer presents Loadify as merely buyer + seller;
- desktop navbar exposes the platform ecosystem professionally;
- burger/mobile drawer functions as a professional Loadify Navigation Hub;
- marketplace search/categories/cart remain obvious and usable;
- each major audience has a dedicated shareable landing page;
- platform/integration/partner/trust/company information is discoverable without registration;
- the footer reflects the expanded ecosystem;
- all meaningful public claims have evidence;
- no provider relationship/capability is invented;
- responsive, accessibility, build/test and preview gates pass;
- visual screenshots are reviewed;
- PR #724 remains unmerged until owner approval.

## 18. Immediate execution state

Phase 0 has begun.

Verified at start:
- `AGENTS.md` read;
- current workstream base `main` = `4d52461823a13ab3412d074db17095df2bbf4fb2`;
- Draft PR #724 exists and is not merged;
- no overlapping public-platform-presentation PR was found by targeted PR search;
- current desktop header is marketplace/category-first;
- current desktop burger opens `MobileDrawer`;
- current `MobileDrawer` is mainly account/quick actions + marketplace categories + a small support-link group;
- current public routing already contains marketplace, legal, wholesale, trade-account, buyer, seller, admin, tracking and mobile surfaces that must be audited before claims are written.

Next artifact: `docs/public-presentation/LOADIFY_PUBLIC_PRESENTATION_AUDIT.md`.