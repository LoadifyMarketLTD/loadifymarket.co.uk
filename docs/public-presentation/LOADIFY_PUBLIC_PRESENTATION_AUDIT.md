# Loadify Market — Public Presentation Audit

Date: 2026-09-02
Status: IN PROGRESS / P0
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724
Base main at audit start: `4d52461823a13ab3412d074db17095df2bbf4fb2`

## Audit objective

Establish repository truth before any new public platform-presentation page is implemented. The audit exists to prevent unsupported marketing claims, preserve current marketplace functionality and convert Loadify's real capabilities into a professional public information architecture.

## 1. Repository operating contract

`AGENTS.md` has been read.

Relevant constraints confirmed:

- Loadify is not a simple seller-only marketplace and must not be reduced to a generic dropshipping site.
- public UI must meet the quality of the platform's strongest existing surfaces;
- unsupported customer-facing claims are prohibited;
- Supplier Commerce and provider capabilities remain evidence-gated;
- commerce, auth, payment, legal and security truths must not be duplicated or weakened;
- no Fake PASS;
- responsive/mobile/accessibility verification is mandatory;
- do not write directly to `main` without explicit authorization.

## 2. Current desktop header / navbar map

Source: `src/components/Header.tsx`.

### Top header

Current top header contains:

- left burger button opening `MobileDrawer`;
- Loadify logo linking to `/`;
- product/category search leading to `/catalog?q=...`;
- utility links on larger desktop:
  - `Marketplace` -> `/catalog`
  - `Sell with us` -> `/register?type=seller`
  - `Help` -> `/help`
  - Cart -> `/cart`
  - Sign in -> `/login` when unauthenticated
  - Join Loadify -> `/register` when unauthenticated
  - role-aware Dashboard when authenticated
  - Sign out when authenticated.

### Lower navigation

Current lower navigation is product-discovery oriented:

- `Home` -> `/`
- `Shop all` -> `/catalog`
- first six marketplace categories from `CATEGORY_CONFIG`
- `More categories` -> `/catalog`
- category hover menus expose subcategories.

### Initial conclusion

Current desktop navigation is correctly useful for shopping, but it does not expose Loadify as a broader platform ecosystem. It currently lacks first-class public destinations for Platform, Buyers, Business/Trade presentation, Suppliers, Integrations, Partners, Developers and Trust.

The lower category navigation is valuable commerce infrastructure and should not simply be deleted. The likely final architecture is a platform-presentation layer plus a separate product-discovery layer.

## 3. Current burger / drawer map

Source: `src/components/MobileDrawer.tsx`.

The same drawer component is opened by the desktop burger and is also designed as a mobile navigation surface.

Current sections:

### Account block

Role/account-aware controls via `DrawerAccountBlock`.

### Quick Actions

Rendered via `DrawerCTACards`.

### Browse Categories

- all categories from `CATEGORY_CONFIG`;
- category expansion to subcategories;
- link to `/catalog`;
- individual category links.

### Support links

- `Start Selling` -> `/register?type=seller`
- `Shipping Policy` -> `/shipping-policy`
- `Marketplace Information` -> `/wholesale-info`
- `About Us` -> `/about`.

### Initial conclusion

The current drawer is primarily:

`account + quick actions + categories + four support/commercial links`.

It does not yet function as a directory of the Loadify ecosystem. The rebuild should preserve category/shop access but add grouped routes for platform understanding, buyer/seller audiences, business/suppliers, integrations/partners/developers and trust/company information.

## 4. Current route architecture — initial inventory

Source: `src/App.tsx` import/routing architecture. Full route table remains to be completed from the route definitions.

### Public marketplace / commerce surfaces already represented in source

- homepage;
- catalogue;
- category page;
- product detail;
- cart;
- checkout;
- deals;
- order success;
- checkout error;
- public order tracking;
- public seller profile/store.

### Public information / legal surfaces already represented

- About Us;
- Contact Us;
- FAQ;
- Wholesale Info;
- Trade Account;
- Terms and Conditions;
- Privacy Policy;
- Cookie Policy;
- Returns Policy;
- Shipping Policy;
- Buyer Terms;
- Seller Terms;
- Disclaimer;
- Acceptable Use Policy;
- Prohibited Items Policy;
- Seller Verification Policy;
- Intellectual Property Complaints;
- Seller Guidelines.

### Authentication / onboarding surfaces represented

- Login;
- Signup/Register;
- Forgot Password;
- Reset Password;
- OAuth callback;
- Role Selection;
- Seller Onboarding;
- Seller Setup;
- App onboarding;
- mobile sell flow.

### Buyer workspace surfaces represented

- Buyer Dashboard;
- Orders;
- Addresses;
- Payments;
- Reviews;
- Profile;
- Settings;
- Wishlist;
- Notifications;
- Messages;
- Disputes.

### Seller workspace surfaces represented

- Seller Dashboard;
- Products;
- product create/edit;
- Orders;
- Shipments;
- Returns;
- Profile;
- Settings;
- Reviews;
- Notifications;
- Messages;
- Seller Setup / onboarding.

### Admin governance surfaces represented

- Admin Dashboard;
- Users;
- Buyers;
- Seller Approvals;
- Products;
- Orders;
- Flagged activity;
- Reports;
- Support;
- Settings;
- Notifications;
- Payouts;
- Stripe Events;
- Disputes;
- Seller detail.

### Mobile/native surfaces represented

- Inbox;
- Chat;
- Orders;
- Categories;
- Profile;
- Notifications;
- Security;
- Balance;
- Favourites;
- Settings;
- Seller Payments;
- native sell wizard;
- Capacitor/native deep-link infrastructure.

## 5. Current public-presentation gap — confirmed

The repository already contains substantial commerce and workspace functionality, but the public navigation does not currently explain this as a coherent platform.

The current public exterior therefore creates a discovery problem:

- buyers can find the marketplace;
- sellers can find a seller registration route;
- visitors can find a small set of information/legal pages;
- but suppliers, brands, trade buyers, technology providers, integration teams and commercial partners do not have obvious dedicated public paths explaining why and how they should engage with Loadify.

This is the primary P0 problem this workstream solves.

## 6. Proposed architecture direction — provisional until audit completion

### Presentation layer

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
- `/pricing` after pricing reconciliation
- `/about` refined as concise company page.

### Shopping layer retained

- Marketplace/catalogue
- Categories
- Deals
- Search
- Cart

### Burger / Navigation Hub target groups

- Explore
- Discover Loadify
- Business
- Connect with Loadify
- Trust & Company

This is not yet implementation approval. It is the working information architecture to be tested against the remaining route/content audit.

## 7. Claims taxonomy for the audit

Every claim found or proposed will be classified as:

- LIVE / CURRENTLY SUPPORTED
- SUPPORTED WITH CONDITIONS
- INTERNAL / ADMIN ONLY
- FOUNDATION PRESENT BUT NOT USER-AVAILABLE
- PROVIDER-GATED / ACTIVATION OFF
- STALE / CONTRADICTED / MUST NOT MARKET
- NEEDS OWNER DECISION

## 8. Known high-risk content areas requiring reconciliation

The following are already flagged for evidence review before copy is written:

- RFQ claims versus current seller routing;
- physical-products marketplace versus any service-marketplace claims;
- seller commission and launch-promotion wording across homepage/FAQ/terms/guidelines;
- Stripe Connect / payout eligibility wording;
- trade account versus dedicated trade presentation;
- wholesale terminology versus supplier/brand/wholesaler roles;
- mobile availability versus actual store/release evidence;
- Supplier Commerce/provider-specific capabilities;
- public API / webhooks / custom integrations language;
- provider names/logos/partnership implications;
- seller verification / trust wording;
- refund/returns responsibility wording.

## 9. Supplier Commerce public-marketing boundary — initial state

Supplier Commerce is not to be presented as a universally live automated supplier network.

Current workstream rules require:

- provider capabilities to remain capability-scoped;
- hosted/provider activation may remain OFF;
- provider writes are not marketed as available without provider-authoritative evidence;
- an adapter, migration, test or document does not equal a live integration;
- provider contact or application status does not equal partnership.

Public integration pages should therefore focus on the controlled integration programme and truthful availability states until exact capabilities are revalidated.

## 10. Audit work remaining

- complete exact `App.tsx` route table;
- inspect `Home.tsx`, Hero/Features/How-It-Works/Security/Seller CTA components;
- inspect `Footer.tsx`;
- inspect current About/FAQ/Wholesale/Trade/Seller Guidelines and legal wording;
- inspect buyer route/components for customer-facing claims;
- inspect seller route/components and payout/order/shipments/returns truth;
- inspect relevant admin governance evidence;
- inspect mobile/native release evidence before any mobile marketing claim;
- inspect Stripe/checkout/order tracking implementation evidence;
- inspect current Supplier Commerce readiness files and evidence;
- identify dead, duplicate or redirected routes;
- reconcile pricing/commission truth;
- produce current -> proposed route/navigation map;
- produce Page Blueprint;
- seed Claims Evidence Matrix.

## 11. Implementation gate

No new public presentation page should be implemented until this audit and the Page Blueprint contain enough repository evidence to make page construction mechanical rather than speculative.
