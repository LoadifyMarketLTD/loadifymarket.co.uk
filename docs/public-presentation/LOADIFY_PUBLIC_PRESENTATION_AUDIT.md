# Loadify Market — Public Presentation Audit

Date: 2026-09-02
Status: ACTIVE / P0 — repository-truth audit substantially advanced
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724
Base main at audit start: `4d52461823a13ab3412d074db17095df2bbf4fb2`

## Objective

Establish repository truth before presentation-page implementation. This audit exists to convert Loadify's real platform capabilities into a credible public information architecture while preventing unsupported claims and regressions.

## 1. Repository operating contract

`AGENTS.md` has been read. It establishes that Loadify is not a simple seller-only marketplace or generic dropshipping site. Public UI must be evidence-backed, Supplier Commerce/provider capabilities remain gated, no Fake PASS is allowed, and auth/commerce/payments/legal/security truth must not be weakened or duplicated.

## 2. Current public navigation — confirmed

### Desktop header (`src/components/Header.tsx`)

Current top header:
- burger button;
- logo -> `/`;
- search -> `/catalog?q=...`;
- Marketplace -> `/catalog`;
- Sell with us -> `/register?type=seller`;
- Help -> `/help`;
- Cart -> `/cart`;
- Sign in / Join Loadify when logged out;
- role-aware Dashboard / Sign out when logged in.

Current lower bar:
- Home;
- Shop all;
- first six marketplace categories;
- More categories;
- category hover menus.

Conclusion: the current header is suitable for basic shopping discovery but does not expose Loadify as a wider platform ecosystem.

### Burger / drawer (`src/components/MobileDrawer.tsx`)

Current drawer is primarily:
`account + quick actions + category directory + four support/commercial links`.

It exposes:
- all marketplace categories/subcategories;
- Start Selling;
- Shipping Policy;
- Marketplace Information;
- About Us.

Conclusion: it is not yet a professional platform directory. It needs to become a Loadify Navigation Hub while preserving category/shop access.

## 3. Current homepage positioning — confirmed

Sources: `src/pages/Home.tsx`, `src/components/HeroSection.tsx`, `src/components/FeaturesGrid.tsx`.

The desktop homepage hero currently positions Loadify primarily as:
- a UK marketplace for independent sellers;
- built for UK sellers, brands and wholesalers;
- a sales channel for listing products, managing marketplace orders and following eligible payouts.

The homepage also contains:
- marketplace categories;
- live approved product listings;
- seller proposition;
- Stripe Connect-qualified payout wording;
- marketplace order/tracking trust signals;
- seller CTA.

This is useful commerce positioning but still under-represents:
- buyer platform proposition;
- business/trade buying;
- supplier participation;
- supplier/integration programme;
- commercial/technology partners;
- developer/integration entry point;
- institutional trust/governance.

Important: this workstream must not casually rewrite the existing homepage while the dedicated presentation family is being built. Homepage convergence comes later, after the destination pages exist and are validated.

## 4. Footer — confirmed

Source: `src/components/Footer.tsx`.

Current footer already provides useful legal/company proof:
- XDrive Logistics Ltd operator identity;
- company number and VAT number;
- UK address/contact details;
- Stripe-powered checkout;
- order tracking;
- legal/policy links;
- Shop, Sell and Loadify columns;
- Partner With Us currently routes to generic contact with a partnership topic.

Gap: the footer still describes only a three-part public model — Shop / Sell / Loadify. It does not expose the future public architecture for Platform, Buyers, Business, Suppliers, Integrations, Partners, Developers and Trust. Footer redesign belongs to navigation convergence, not the first code step.

## 5. Public information pages — findings

### About (`src/pages/pixel-perfect/AboutUs.tsx`)

Useful verified-positioning material exists, including operator/company identity and seller-managed fulfilment framing. However the page contains high-risk claims that require reconciliation before reuse:
- it calls Loadify the UK's "trusted" multi-category marketplace;
- it markets service-based offerings strongly;
- it says the platform does not own/store/dispatch any products, which may conflict with the intended Loadify-operated sourcing / supplier-fulfilled architecture if presented as a timeless platform-wide rule;
- it references a Google 5.0 rating, which must not be used as platform trust proof without current verification and an appropriate evidence basis.

Conclusion: About should become a concise institutional/company page, not the platform encyclopedia.

### FAQ (`src/pages/pixel-perfect/FAQ.tsx`)

Confirmed contradictions/stale claims:
- registration FAQ says no email confirmation is required, while current architecture contains email-verification gates and the Trade Account flow explicitly asks the user to confirm email;
- RFQ is marketed as live, while the master specification already identified seller `/seller/rfq` as redirecting and therefore not suitable to market as a major live capability;
- FAQ says Loadify never owns/stores/dispatches any products, a statement that is too absolute for the intended supplier-commerce direction;
- seller activation descriptions vary between compliance review language and automatic activation language;
- 7% standard commission / 0% launch promotion appears as current policy and must be reconciled against canonical commercial terms before a permanent Pricing page is published.

Conclusion: FAQ cannot be copied into the new presentation family without correction.

### Marketplace Information / Wholesale (`src/pages/pixel-perfect/WholesaleInfo.tsx`)

This page currently mixes buyer information, seller information and wholesale concepts. High-risk claims include:
- "no category restrictions" despite prohibited/restricted-item governance;
- "all major product categories" wording that should be grounded in actual taxonomy/listings rather than used as an absolute commercial guarantee;
- immediate listing visibility after profile verification;
- 7%/0% fee claims;
- seller-controlled volume discounts/tiered pricing, which must be verified against real listing/product behaviour before marketing;
- broad statements about international sellers and fulfilment responsibility.

Conclusion: `/wholesale-info` should not be used as the future Suppliers/Brands/Trade presentation page. The new architecture should separate those audiences.

### Trade Account (`src/pages/pixel-perfect/TradeAccount.tsx`)

This is a real registration flow, not a marketing page. It supports customer types including:
- individual;
- sole trader;
- limited company;
- partnership;
- charity/organisation;
- other business/trader.

It captures business/trader details and creates a buyer registration intent, then uses Supabase signup with email confirmation. This strongly supports creating a separate `/trade` presentation page that routes qualified visitors into `/trade-account`.

### Seller Guidelines (`src/pages/SellerGuidelinesPage.tsx`)

This confirms real seller-oriented messaging around:
- accurate listings;
- legal/compliant stock;
- business profile + Stripe setup;
- fulfilment/tracking responsibility;
- seller dashboard;
- marketplace payment path;
- prohibited-item/legal rules.

But it also repeats the 7%/0% fee claim and contains wording that seller activation is automatic after setup. These need reconciliation before being elevated into permanent acquisition copy.

## 6. Current platform capability inventory — presentation-safe direction

### Public marketplace

Repository source represents:
- catalogue and category discovery;
- product detail;
- cart;
- Stripe-backed checkout;
- deals;
- public order tracking;
- public seller profiles;
- buyer/seller/legal information pages.

### Buyer environment

Routes/components represent:
- dashboard;
- orders;
- wishlist/favourites;
- addresses;
- payments;
- reviews;
- profile/settings;
- notifications;
- messages;
- disputes.

These capabilities support a dedicated Buyers page, but wording must describe benefits rather than mechanically list dashboard menu items.

### Seller environment

Routes/components represent:
- dashboard;
- products and create/edit;
- orders;
- shipments;
- returns;
- profile/settings;
- reviews;
- notifications;
- messages;
- seller setup/onboarding;
- Stripe-connected payout path where eligible;
- public seller profile/store.

These support a dedicated Sellers page.

### Admin / governance

Routes/components represent governance surfaces for:
- users/buyers;
- seller approvals;
- products/orders;
- flagged activity;
- reports/support;
- payouts;
- Stripe events;
- disputes;
- seller review/detail.

Trust pages may describe governance at a public-safe level, not expose the admin operations manual.

### Mobile/native

Dedicated mobile/native routes exist, but public app-store availability must not be claimed without release-store evidence.

## 7. Supplier Commerce truth — current hard boundary

Source: `netlify/functions/_shared/supplierProviderReadiness.ts`.

Every provider readiness object currently has `hostedActivation: 'off'`, capability promotion false, provider write activation false, and `platformEngineeringBlocked: false`.

Current provider categories include:
- Avasam: read-only verified, transactional evidence still required;
- BigBuy: sandbox evidence required;
- Direct Supplier: authentic supplier required;
- AppScenic: retailer-side partner access required;
- SaleHoo: directory/API approval required;
- Spocket: contract/resale permission blocked;
- DSers: developer review underway plus UK import-compliance controls required.

Public implication:
- do not market provider names as live partners;
- do not advertise universal automated supplier fulfilment;
- do not claim public API/webhooks unless generally available and verified;
- integration pages should explain a controlled programme, capability-scoped validation and status vocabulary.

## 8. Pricing truth — unresolved / do not publish permanent Pricing page yet

Current source contains repeated claims of:
- standard 7% marketplace commission;
- 0% seller commission until 31 December 2026;
- no monthly/listing fees in some pages.

Historical repository documents also contain incompatible older pricing concepts. Historical docs are not authority, but their presence confirms pricing has changed over time.

Gate: a permanent `/pricing` page must not be built until current Seller Terms + actual Stripe/application-fee logic + owner commercial policy are reconciled into one source of truth.

## 9. Confirmed stale / contradictory claims to quarantine

Do not reuse without reconciliation:
- RFQ as a live marketplace proposition;
- "no email confirmation required";
- services marketplace as a major proposition;
- absolute "Loadify never owns/stores/dispatches products" platform-wide wording;
- "no category restrictions";
- Google 5.0 rating as trust proof;
- automatic seller activation language where it conflicts with readiness/verification controls;
- permanent pricing/fee claims until reconciled;
- live supplier/provider automation;
- public API/webhooks/general developer access;
- provider logos or partnership claims.

## 10. Proposed public information architecture — audit recommendation

### Primary presentation routes
- `/platform`
- `/buyers`
- `/sellers`
- `/trade`
- `/suppliers`
- `/integrations`
- `/partners`
- `/developers`
- `/how-it-works`
- `/trust`
- `/about` (refined company page)
- `/pricing` only after commercial reconciliation.

### Marketplace routes preserved
- `/catalog`;
- `/categories` / category routes;
- `/deals`;
- product detail;
- search;
- cart;
- checkout;
- tracking.

### Recommended desktop hierarchy

Primary:
`Marketplace | Platform | Buyers | Sellers | Business ▾ | Integrations | Partners`

Business menu:
`Trade Buyers | Brands & Wholesalers | Suppliers`

Utility:
`Trust | Help | Sign in/Dashboard | Join Loadify | Cart`

This is a working architecture; final labels may change during visual implementation if hierarchy/accessibility testing shows a better form.

### Recommended burger / Loadify Navigation Hub

1. Explore
   - Marketplace
   - Categories
   - Deals
2. Discover Loadify
   - Platform
   - How It Works
   - Buyers
   - Sellers
3. Business
   - Trade Buyers
   - Brands & Wholesalers
   - Suppliers
4. Connect with Loadify
   - Partners
   - Integrations
   - Developer / Technology Integration
5. Trust & Company
   - Trust & Safety
   - About Loadify
   - Help
   - Contact
   - Policies & Legal

## 11. Implementation gate status

The evidence base is now sufficient to begin the Page Blueprint and Claims Evidence Matrix. Code implementation of presentation pages remains gated until those documents are present on PR #724.

Next execution:
1. create Page Blueprint;
2. seed Claims Evidence Matrix;
3. inspect any remaining claim-critical seller/payment/return components as each blueprint claim is finalized;
4. only then build shared presentation primitives and first P0 pages.
