# Loadify Market — Public Presentation Page Blueprint

Date: 2026-09-02
Status: ACTIVE / P0
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724
Base main at blueprint start: `4d52461823a13ab3412d074db17095df2bbf4fb2`

## Purpose

Make implementation mechanical, evidence-backed and audience-specific. Every route below must become a real landing page, not a documentation article or a duplicated About page.

## Shared page rules

Every presentation page must have:
- unique H1 and audience proposition;
- concise hero copy;
- role-specific CTA;
- visual storytelling or process diagram;
- only evidence-backed capabilities;
- adjacent-page cross-links;
- unique SEO title/description/canonical;
- responsive/mobile layout;
- no fake metrics, testimonials, customer logos, integration logos or certifications.

Status language:
- LIVE / CURRENTLY SUPPORTED
- SUPPORTED WITH CONDITIONS
- INTERNAL / ADMIN ONLY
- FOUNDATION PRESENT BUT NOT USER-AVAILABLE
- PROVIDER-GATED / ACTIVATION OFF
- STALE / MUST NOT MARKET
- NEEDS OWNER DECISION

---

## 1. `/platform` — Platform Overview

Audience: first-time visitors, commercial reviewers, prospective buyers/sellers/suppliers/partners.

Purpose: explain Loadify Market at executive level and route visitors into the correct dedicated proposition.

Core message:
**One marketplace, connected buyer and seller environments, and controlled paths for business, supplier and integration participation.**

May claim:
- UK-operated marketplace;
- multi-category product discovery;
- buyer and seller workspaces;
- catalogue/product listing workflows;
- marketplace ordering;
- Stripe-backed checkout;
- public order tracking;
- seller-managed operations/fulfilment where applicable;
- controlled marketplace governance.

Must not claim:
- universal automated supplier fulfilment;
- public API availability;
- live partnership with unapproved providers;
- services marketplace as a major proposition until verified;
- global scale, fake metrics or customer counts.

Hero direction:
**Commerce infrastructure for buyers, sellers and business partners.**

Sections:
1. Hero + role selector.
2. What Loadify is.
3. Ecosystem map: Buyer / Seller / Business / Supplier / Integration Partner.
4. High-level commerce lifecycle.
5. Connected Buyer Space and Seller Space.
6. Trust/governance summary.
7. Links to Buyers / Sellers / Trade / Suppliers / Integrations / Trust.
8. CTA: `Explore Loadify` / `Browse Marketplace`.

SEO title: `Loadify Market Platform | Marketplace for Buyers, Sellers & Business`
SEO description: `Explore Loadify Market — a UK-operated marketplace with connected buyer and seller environments, marketplace ordering, tracking and controlled business integration paths.`

Primary evidence:
- `src/App.tsx`
- `src/pages/Home.tsx`
- `src/components/HeroSection.tsx`
- `src/components/FeaturesGrid.tsx`
- buyer/seller route components.

---

## 2. `/buyers` — For Buyers

Audience: consumers and registered marketplace buyers.

Purpose: explain how buyers discover, purchase and manage marketplace activity.

Core message:
**Discover products, purchase through Loadify and manage orders from Buyer Space.**

May claim:
- catalogue/categories/search;
- product/seller information;
- cart/checkout;
- order history;
- public/order tracking;
- wishlist/favourites;
- saved addresses;
- buyer payments area;
- reviews;
- notifications/messages/disputes where supported by current routes.

Must not claim:
- guaranteed delivery outcome;
- universal buyer protection beyond actual policies;
- unsupported payment methods;
- supplier automation.

Hero direction:
**Discover, buy and manage marketplace orders in one place.**

Sections:
1. Hero.
2. Discover products.
3. Checkout and payment.
4. Buyer Space capability story.
5. Orders and tracking.
6. Reviews/support/disputes.
7. Trade buyer route.
8. CTA.

CTA:
- Primary: `Browse Marketplace`
- Secondary: `Create Buyer Account`
- Tertiary: `Buying for a business? Explore Trade`

SEO title: `Buy on Loadify Market | Buyer Marketplace & Order Management`
SEO description: `Browse products, checkout through Loadify Market and manage orders, tracking, favourites, reviews and account activity from Buyer Space.`

Evidence:
- `src/App.tsx`
- buyer workspace routes/components
- catalogue/cart/checkout/tracking pages.

---

## 3. `/sellers` — For Sellers

Audience: merchants, independent sellers, retailers and approved commercial sellers.

Purpose: serious seller-acquisition landing page.

Core message:
**Build your marketplace presence and run Loadify sales from one seller environment.**

May claim:
- seller onboarding/setup;
- product create/edit;
- catalogue/listing management;
- public seller profile/store;
- marketplace orders;
- shipments;
- returns;
- reviews;
- messages/notifications;
- seller dashboard;
- Stripe-connected payout path where eligible.

Must not claim:
- guaranteed approval;
- automatic activation without qualification until reconciled;
- permanent 7%/0% pricing until pricing gate closes;
- sales-volume guarantees.

Hero direction:
**List, sell, fulfil and manage your marketplace operation from Seller Space.**

Sections:
1. Hero.
2. Who can sell.
3. Seller setup/onboarding.
4. Build and manage catalogue.
5. Marketplace orders and fulfilment.
6. Returns/reviews/messages.
7. Eligible payout path.
8. Seller standards/trust.
9. Pricing teaser only after commercial truth closes.
10. CTA.

CTA:
- Primary: `Start Selling`
- Secondary: `View Seller Guidelines`

SEO title: `Sell on Loadify Market | Seller Platform & Marketplace Tools`
SEO description: `Create listings, manage marketplace orders, shipments, returns and eligible payouts through Loadify Seller Space.`

Evidence:
- seller routes/components;
- `src/pages/ProductFormPage.tsx`;
- `src/pages/SellerGuidelinesPage.tsx`;
- Stripe seller setup/payout implementation evidence.

---

## 4. `/trade` — Trade & Business Buyers

Audience: sole traders, companies, partnerships, charities/organisations and other business buyers.

Purpose: present business buying before registration.

Core message:
**Source products for your business through a dedicated Loadify buying path.**

May claim:
- trade/business account registration exists;
- customer-type support in current Trade Account form;
- business/trader details can be captured with Buyer profile;
- Buyer Space order/account management.

Must not claim:
- bespoke trade pricing unless implemented;
- invoicing/tax features beyond verified implementation;
- credit terms;
- wholesale discounts as universal.

Hero direction:
**A clearer path for business buying on Loadify.**

Sections:
1. Hero.
2. Who Trade is for.
3. Marketplace sourcing.
4. Business/trader profile.
5. Buyer Space management.
6. Trust/policy summary.
7. CTA to `/trade-account`.

CTA:
- Primary: `Open a Trade Account`
- Secondary: `Browse Marketplace`

SEO title: `Loadify Trade | Marketplace Buying for Businesses & Traders`
SEO description: `Explore Loadify's business buying path for sole traders, companies, partnerships and organisations, then open a Trade Account.`

Evidence:
- `src/pages/pixel-perfect/TradeAccount.tsx`
- Buyer Space routes/components.

---

## 5. `/suppliers` — Brands, Wholesalers & Suppliers

Audience: manufacturers, distributors, wholesalers, brands, commercial product suppliers.

Purpose: supplier/commercial acquisition page, independent of seller acquisition.

Core message:
**Bring products, supply capability and commercial scale to Loadify through controlled participation paths.**

May claim:
- brands/wholesalers can participate as marketplace sellers where eligible;
- direct-supplier architecture/foundation exists;
- controlled supplier onboarding/integration programme exists;
- catalogue/stock/price participation may be supported according to approved integration path.

Must not claim:
- automatic supplier fulfilment is universally live;
- direct supplier network is fully active;
- provider logos/partnerships;
- millions of products;
- all suppliers are verified/active.

Hero direction:
**Bring your catalogue and supply capability to Loadify Market.**

Sections:
1. Hero.
2. Ways to work with Loadify:
   - sell directly as approved seller;
   - brand/wholesale participation;
   - controlled supplier onboarding;
   - integration discussion.
3. What Loadify expects from supplier data.
4. Fulfilment/tracking expectations.
5. Compliance/governance.
6. Supplier Commerce architecture — carefully qualified.
7. CTA.

CTA:
- Primary: `Supplier Enquiry`
- Secondary: `Start Selling`

SEO title: `Become a Loadify Supplier | Brands, Wholesalers & Product Partners`
SEO description: `Learn how brands, wholesalers, distributors and suppliers can discuss marketplace participation and controlled supplier integration with Loadify Market.`

Evidence:
- Supplier Commerce canonical docs;
- direct-supplier contracts/foundation;
- provider readiness registry;
- Seller onboarding routes for direct marketplace selling.

---

## 6. `/integrations` — Supplier Commerce & Integrations

Audience: supplier platforms, dropshipping platforms, middleware, fulfilment technology, catalogue/feed and API partners.

Purpose: the principal page shareable with prospective integration providers.

Core message:
**Connect commerce systems to Loadify through controlled, evidence-based integration paths.**

May claim:
- Loadify has a provider-neutral supplier adapter architecture;
- catalogue/offers, stock/price, order/fulfilment/tracking domains exist in the integration model;
- access is capability-scoped and provider-dependent;
- activation is controlled and evidence-gated;
- custom/partner integration discussions are possible.

Must not claim:
- public API is generally available;
- all domains are available to every provider;
- provider write/order capability without evidence;
- webhooks generally available;
- named provider is live unless approved and verified.

Hero direction:
**Controlled integration paths for supplier and commerce systems.**

Required status block:
- Public API: `Not currently generally available` unless audit later proves otherwise.
- Supplier integrations: `Partner/onboarding based`.
- Webhooks: `Availability depends on integration path`.
- Custom integrations: `Discuss with Loadify`.

Sections:
1. Hero.
2. Integration philosophy.
3. High-level flow:
   `External source/provider -> validation -> Loadify catalogue/commerce layer -> customer order -> authorised fulfilment -> status/tracking back to Loadify`.
4. Capability domains.
5. Validation/activation stages.
6. Security/data-minimisation principles.
7. Availability/status vocabulary.
8. Integration enquiry CTA.

CTA: `Integration Enquiry`

SEO title: `Loadify Integrations | Supplier Commerce & Partner Connectivity`
SEO description: `Explore Loadify Market's controlled supplier and commerce integration model, capability validation process and partner-based integration paths.`

Evidence:
- `netlify/functions/_shared/supplierAdapter.ts`
- `netlify/functions/_shared/supplierProviderRegistry.ts`
- `netlify/functions/_shared/supplierProviderReadiness.ts`
- canonical Supplier Commerce documentation.

---

## 7. `/partners` — Commercial & Technology Partners

Audience: strategic, category, logistics, fulfilment, technology and commercial collaborators.

Purpose: broad partnership gateway distinct from suppliers/integrations.

Core message:
**Build commercial and technology relationships around the Loadify marketplace.**

May claim:
- Loadify is open to appropriate partnership discussions;
- partnership enquiries can be routed by type;
- supplier/integration paths are controlled.

Must not claim:
- partnerships that do not exist;
- logos without permission;
- partner counts or ecosystem scale without evidence.

Hero direction:
**Partner with Loadify to expand marketplace capability and reach.**

Sections:
1. Hero.
2. Partnership categories.
3. What Loadify brings.
4. What Loadify looks for.
5. Route to Supplier vs Integration vs Commercial enquiry.
6. Trust/company summary.
7. CTA.

CTA: `Partner with Loadify`

SEO title: `Loadify Partners | Commercial, Technology & Marketplace Partnerships`
SEO description: `Explore commercial, technology, supplier and marketplace partnership opportunities with Loadify Market.`

Evidence:
- current contact partnership route;
- company/platform truth;
- integration/supplier programme evidence.

---

## 8. `/developers` — Developer / Technology Integration Front Door

Audience: technical reviewers, developers and integration managers at prospective partners.

Purpose: credible technical front door without pretending an open public API exists.

Core message:
**Technical integration with Loadify is controlled, capability-scoped and partner-based.**

May claim:
- platform integration domains exist conceptually;
- provider-specific capability negotiation;
- validation/testing/evidence gates;
- idempotency/retry/reconciliation/auditability as architecture principles where backed by current Supplier Commerce implementation.

Must not claim:
- public self-service developer account;
- generally available API keys;
- public sandbox;
- generic webhooks;
- public SDK unless verified.

Hero direction:
**A technical entry point for approved integration discussions.**

Sections:
1. Hero.
2. Who should contact Loadify.
3. Integration domains.
4. Capability negotiation.
5. Validation lifecycle.
6. Security/auth principles at public-safe level.
7. Availability states.
8. CTA.

CTA: `Developer / Technology Enquiry`

SEO title: `Loadify Developers | Partner-Based Commerce Integration`
SEO description: `Technical overview of Loadify's controlled, partner-based commerce integration model for approved technology and supplier platforms.`

Evidence:
- supplier adapter/readiness architecture;
- runtime-boundary tests/docs;
- no evidence currently supporting a generally available public API.

---

## 9. `/how-it-works` — Marketplace Lifecycle

Audience: all visitors who want a simple visual explanation.

Purpose: explain buyer/seller/business lifecycles visually, without becoming documentation.

Buyer flow:
`Discover -> Choose -> Checkout -> Seller fulfils -> Track -> Receive -> Review / Support`

Seller flow:
`Join -> Complete setup -> List -> Receive order -> Fulfil -> Track -> Returns/support -> Eligible payout`

Supplier/integration flow: show separately and only with provider-gated qualification.

CTA: `Explore Marketplace` / `Start Selling`

SEO title: `How Loadify Market Works | Buying, Selling & Marketplace Orders`
SEO description: `See the Loadify Market lifecycle for buyers and sellers — from discovery and listing through checkout, fulfilment, tracking and support.`

---

## 10. `/trust` — Trust, Safety & Governance

Audience: buyers, sellers, suppliers, partners and procurement/commercial reviewers.

Purpose: explain trust architecture in plain language and route to policies.

May claim where verified:
- UK operator/company identity;
- Stripe-backed payment processing;
- role-aware access and account controls;
- seller setup/readiness controls;
- prohibited-item policies;
- reviews/disputes/support routes;
- order tracking;
- admin moderation/governance surfaces;
- provider activation evidence-gating.

Must not claim:
- seller/product/order guarantees;
- external certifications not verified;
- fake ratings;
- absolute fraud prevention.

Hero direction:
**Marketplace trust is built through clear roles, controlled access and evidence-backed operations.**

Sections:
1. Hero.
2. Company/operator identity.
3. Account and seller readiness.
4. Payments and commerce responsibility.
5. Marketplace rules/prohibited items.
6. Reviews/disputes/support/tracking.
7. Supplier/integration governance.
8. Legal/policy directory.
9. CTA.

SEO title: `Loadify Trust & Safety | Marketplace Governance & Policies`
SEO description: `Learn how Loadify Market approaches seller readiness, payments, marketplace rules, order visibility, disputes and controlled supplier integration.`

Evidence:
- auth/access controls;
- admin governance routes;
- legal policies;
- Stripe/payment implementation;
- supplier readiness gates.

---

## 11. `/about` — About Loadify

Audience: anyone verifying the company/platform identity.

Purpose: concise institutional page, not platform feature inventory.

Must include only verified:
- operator/legal identity;
- UK context;
- company details;
- mission;
- marketplace model;
- high-level seller/fulfilment relationship;
- contact routes.

Must remove/quarantine:
- unverified Google rating trust proof;
- unsupported services-marketplace positioning;
- absolute statements incompatible with Supplier Commerce direction.

CTA: `Explore Platform` / `Contact Loadify`

---

## 12. `/pricing` — Seller Fees & Pricing

Status: BLOCKED pending commercial truth reconciliation.

Do not implement final pricing copy until these agree:
- current Seller Terms;
- actual Stripe/application-fee logic;
- seller guidelines/FAQ/homepage claims;
- owner commercial policy.

Current repeated public claim (7% standard, 0% until 31 Dec 2026) is not yet elevated to canonical truth for a new permanent pricing page.

---

# Navigation Blueprint

## Desktop primary navigation

Recommended first implementation target:
`Marketplace | Platform | Buyers | Sellers | Business ▾ | Integrations | Partners`

Business menu:
- Trade Buyers
- Brands & Wholesalers
- Suppliers

Utility:
- Trust
- Help
- Sign in / Dashboard
- Join Loadify
- Cart

Shopping category strip remains separate below the primary presentation navigation.

## Burger / Loadify Navigation Hub

### Explore
- Marketplace
- Categories
- Deals

### Discover Loadify
- Platform
- How It Works
- Buyers
- Sellers

### Business
- Trade Buyers
- Brands & Wholesalers
- Suppliers

### Connect with Loadify
- Partners
- Integrations
- Developer / Technology Integration

### Trust & Company
- Trust & Safety
- About Loadify
- Help
- Contact
- Policies & Legal

Account block and role-aware dashboard access remain available.

## Footer target architecture

Replace the current Shop / Sell / Loadify-only information model with a broader directory after destination pages exist:
- Marketplace
- Sell
- Business & Supply
- Integrations & Partners
- Trust & Company
- Legal

Do not change footer before route destinations are ready.

# Implementation order after claims matrix

P0 first wave:
1. `/platform`
2. `/suppliers`
3. `/integrations`
4. `/partners`
5. `/developers`
6. `/trust`

P1 second wave:
7. `/buyers`
8. `/sellers`
9. `/trade`
10. `/how-it-works`
11. refined `/about`

P2 after commercial truth:
12. `/pricing`

Navigation convergence occurs once first-wave routes exist, so navbar/burger links never lead to placeholders.
