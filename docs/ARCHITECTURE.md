# Loadify Market — Current Architecture

**Status:** current repository architecture summary  
**Operator:** XDrive Logistics Ltd, United Kingdom  
**Source-of-truth rule:** this document is a maintained map, not a substitute for the controlling canonical contracts, current code, migrations or verified production evidence.

> Historical service/RFQ architecture, old marketplace-only product descriptions and speculative target-microservice roadmaps have been removed from this current-state document. Legacy schema objects may still exist for compatibility/history; their existence does not make them an active product surface.

---

## 1. Product and commerce model

Loadify Market is not a simple seller-only marketplace and not a generic dropshipping site.

The controlling direction is:

**MARKETPLACE + LOADIFY-OPERATED PRODUCT SOURCING / IMPORT + SUPPLIER-FULFILLED COMMERCE + PRODUCT DISCOVERY / OPPORTUNITY INTELLIGENCE + AI PRODUCT BUILDER + CANONICAL COMMERCE CONTROL.**

Customer-facing commerce remains Loadify-centric:

**discover → product → cart → checkout → payment → order → tracking → support → returns/refunds**

Underlying marketplace sellers, suppliers, fulfilment providers, carriers and integration partners remain distinct roles governed by their applicable contracts and evidence.

Core invariants include:

- one canonical customer order truth;
- one canonical financial truth;
- canonical product ≠ supplier offer;
- supplier raw stock ≠ Loadify sellable stock;
- payment success ≠ supplier order success;
- customer refund ≠ supplier recovery;
- no provider-specific commerce core;
- no silent supplier substitution that changes the customer promise;
- no AI-invented product facts;
- no unverified commercial reuse of external content/media.

For Supplier Commerce, read `docs/canonical/loadify-supplier-commerce-2026-08-19/README.md` first. The current canonical phase is **Phase O — Controlled Pilot**, with remaining sequence **O → P → Q**.

---

## 2. High-level runtime architecture

```text
Web / Android users
        │
        │ HTTPS
        ▼
Netlify CDN / Edge
        │
        ├──────────────► React 19 + Vite SPA
        │                    │
        │                    ├─ public platform / marketplace
        │                    ├─ Buyer Space
        │                    ├─ Seller Space
        │                    ├─ Admin
        │                    └─ native/mobile marketplace surfaces
        │
        └──────────────► Netlify Functions
                              │
             ┌────────────────┼─────────────────┐
             ▼                ▼                 ▼
        Supabase           Stripe           SendGrid
     PostgreSQL/Auth     Checkout/Connect   transactional email
     Storage/PostgREST   webhooks/payments
     Realtime/RLS
```

The Android application is a Capacitor wrapper around the Loadify web application with native-specific routing and plugins.

---

## 3. Technology stack

| Layer | Current technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Routing | React Router |
| Styling | Tailwind CSS, shadcn/ui |
| Client state | Zustand |
| Data platform | Supabase PostgreSQL, Auth, Storage, PostgREST, Realtime |
| Server API | Netlify Functions plus Supabase APIs |
| Payments | Stripe Checkout and Stripe Connect |
| Email | SendGrid; Supabase Auth email for applicable auth flows |
| Hosting / edge | Netlify |
| Android | Capacitor 8 |
| Unit/integration tests | Vitest |
| E2E | Playwright |

Exact versions are defined by `package.json`; do not duplicate version numbers here because they drift.

---

## 4. Identity, authorization and workspaces

The compatibility `UserRole` values remain:

- `buyer`
- `seller`
- `admin`

They are not the complete ordinary-commerce authorization model.

### Buyer and Seller

Buyer and Seller are server-governed commerce capabilities and may coexist on the same normal account. A seller can therefore remain a buyer under one identity.

Seller capability is distinct from seller lifecycle/readiness. Seller operations remain fail-closed where approval, tax, payout, compliance or other action-level readiness is required.

### Admin

Admin is a privileged system role and is not available through public signup or ordinary Buyer/Seller capability activation.

### Suppliers and fulfilment providers

Supplier Partner and Fulfilment Provider are commercial organisation relationships, not ordinary public `UserRole` values. Supplier Commerce uses its own governed identity/evidence/capability model.

Primary reference: `docs/architecture/IDENTITY_ROLE_CAPABILITY_DECISION_2026-08-26.md` and the controlling identity/onboarding contracts.

---

## 5. Public platform and marketplace surfaces

Current routing includes:

### Platform / business / trust

- `/`
- `/platform`
- `/buyers`
- `/sellers`
- `/business`
- `/trade`
- `/suppliers`
- `/technology`
- `/integrations`
- `/partners`
- `/developers`
- `/how-it-works`
- `/trust`

### Marketplace commerce

- `/marketplace`
- `/catalog`
- `/category/:slug`
- `/product/:id`
- `/cart`
- `/checkout`
- `/track-order`

### Account / legal / support

The application also exposes registration/login, account deletion, privacy, terms, returns/shipping policies, acceptable-use/prohibited-items policies, FAQ/contact and other applicable public resources.

The current application is **physical-products commerce** at the active create/update/checkout boundaries. Historical service/RFQ schema and documentation are not an active current product contract.

---

## 6. Buyer domain

Current Buyer Space and mobile buyer capabilities include, as applicable:

- marketplace browsing and search;
- favourites/wishlist;
- cart and checkout;
- addresses;
- purchase/order history;
- shipment/tracking visibility;
- reviews;
- messages/conversations;
- notifications;
- returns/disputes;
- profile/security/settings.

Private access is subject to active-account, authentication and capability/action rules.

---

## 7. Seller domain

Current seller capabilities include, as applicable:

- seller activation/onboarding and readiness;
- seller profile/store relationship;
- product listing creation and editing;
- product media upload;
- stock and listing status;
- shipping-method configuration;
- marketplace orders;
- shipment/tracking workflows;
- proof-of-delivery upload;
- returns;
- reviews/messages/notifications;
- Stripe Connect onboarding and seller balance/payout surfaces.

Seller publication/payment paths are not defined by UI alone. Tax, payment and readiness boundaries must consume current server/database evidence and fail closed where required.

---

## 8. Product catalogue and media

The active marketplace catalogue is product-led.

Primary current entities include:

- `products`;
- categories/subcategories;
- product images/media;
- seller/store relationships;
- canonical product/supplier-offer structures where Supplier Commerce applies.

Mobile fast-listing (`/sell`) uploads seller product images into Supabase Storage and creates physical-product listings through the server boundary.

Legacy `listingContext = service`, `services`, `service_requests`, `service_quotes` or RFQ-era objects may remain in schema/code compatibility seams. **They must not be interpreted as proof that service commerce is currently supported.** Current physical-goods enforcement and Google Play v1 boundaries take precedence.

---

## 9. Cart, checkout, payments and financial truth

Loadify uses Stripe-backed checkout/payment flows and Stripe Connect for applicable seller payout setup.

Important rules:

- displayed/cart/checkout amounts must come from current canonical pricing/tax evidence;
- do not infer a universal VAT rate;
- do not infer immediate seller transfer or a fixed payout schedule from historical docs;
- Stripe payment success does not by itself prove supplier-order success or financial reconciliation;
- refunds, supplier recovery, payouts and reconciliation remain distinct states/actions;
- idempotency and webhook verification are mandatory.

The exact Merchant-of-Record, seller-of-record, invoice, tax/VAT/customs and fulfilment responsibilities must follow the controlling business contract and current implementation evidence.

---

## 10. Orders, shipping and tracking

Current order/shipping architecture includes:

- customer orders and order items;
- shipments;
- shipping methods/costs;
- shipment status transitions/events;
- tracking numbers/carrier context;
- public tracking lookup protected by order identity + buyer email;
- seller/mobile shipment handling;
- proof-of-delivery upload;
- returns/dispute paths.

The public tracking function deliberately verifies buyer email before resolving private related data and returns generic failures to reduce enumeration risk.

`docs/SHIPPING.md` contains feature documentation, but current handlers and tests win if details conflict.

---

## 11. Messaging, UGC and marketplace safety

The platform supports marketplace messaging/conversations and review/user-generated-content surfaces.

Current safety work includes user blocking/reporting and listing/review/user report paths. UGC shown to buyers must preserve provenance; external ratings/reviews may not be laundered into Loadify verified-purchase reviews.

Any Android/Google Play declaration must be based on the actual native-app-visible functionality and current privacy/data processing, not merely on web-only or planned features.

---

## 12. Supplier Commerce and operator sourcing

Supplier Commerce is a provider-neutral canonical subsystem.

The governed operator path is conceptually:

**source/import candidate → identify source/product → normalise → canonical match/create candidate → variant map → supplier offer → provenance/rights/compliance → landed cost/tax/margin → AI merchandising → review → publish**

External roles remain distinct:

**Discovery Source ≠ Catalog Source ≠ Supplier ≠ Fulfilment Provider ≠ Carrier ≠ Sales/Channel Connector.**

Provider capability must be verified per provider, capability, territory, commercial right and API/feed/webhook contract. Architecture existence does not equal provider activation.

The current canonical execution boundary is **Phase O — Controlled Pilot**. Follow the canonical Phase O→Q continuation plan before any write/activation.

---

## 13. Product Discovery and AI Product Builder

Product Discovery / Opportunity Intelligence is recommendation intelligence, not an auto-publishing bypass.

AI Product Builder / Merchandising may transform verified facts into presentation/copy, but the invariant is:

**VERIFIED FACTS → AI PRESENTATION**

Never:

**AI INVENTION → PRODUCT FACT**

Rights, compliance, review provenance and pricing rules apply to AI-assisted content exactly as they apply to manually authored content.

---

## 14. Admin and governance

Current Admin surfaces cover platform operations such as:

- users/buyers;
- sellers/approvals;
- products/moderation/flagged content;
- orders;
- disputes;
- support;
- notifications;
- payouts;
- Stripe-event visibility;
- platform settings/reporting/analytics as implemented.

Admin authority is privileged and server/database-backed. A future Platform Owner/Super Admin control plane must not be treated as production authority merely because preview/design work exists.

---

## 15. Security model

Security is layered across:

- Supabase Auth/JWT;
- active/suspended account controls;
- server-governed Buyer/Seller capabilities;
- privileged Admin boundary;
- PostgreSQL RLS;
- service-role-only server operations where required;
- webhook signature verification;
- idempotency/replay controls;
- rate limiting;
- input validation;
- storage access controls;
- CSP/security headers;
- audit/evidence checkpoints;
- fail-closed money/tax/security behavior.

Never assume that table existence, UI visibility or a client-side role check is sufficient authorization.

---

## 16. Android / Capacitor architecture

The Android application is intentionally **marketplace-first** rather than a mirror of every professional web workspace.

Native/mobile information architecture includes:

- Home;
- Search;
- Sell;
- Inbox/chat;
- Profile;
- orders;
- notifications;
- security/settings;
- favourites;
- seller balance/payment setup;
- marketplace safety/reporting flows.

Professional platform pages and web/admin workspace routes are redirected away from native use where defined by `src/components/Header.tsx` and route guards.

Current Capacitor plugins are defined by `package.json`/`capacitor.config.ts`; do not infer native permissions from the breadth of the web platform.

---

## 17. Observability and operational controls

Current observability/operations include, as implemented:

- client error capture;
- Netlify function logs;
- CSP reporting;
- Stripe event records;
- notification/email operational paths;
- scheduled reconciliation/cleanup jobs;
- migration-health verification;
- audit/checkpoint documentation for sensitive release gates.

Historical PASS claims are evidence for their time, not proof of current runtime state.

---

## 18. Database and migration truth

`supabase/migrations/` is the authoritative ordered repository migration source.

Rules:

- never edit an already-applied production migration to redefine history;
- add a new corrective migration;
- verify the current production migration head when it matters;
- legacy numbered SQL copies, schema audits and historical migration documentation do not override current migration history;
- preserve RLS, service-role boundaries, canonical ownership and financial integrity.

---

## 19. Deployment and validation

Production is hosted on Netlify from `main` according to `netlify.toml`.

The repository's real local validation commands are defined in `package.json`, including:

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run verify:migrations`
- `npm run e2e`
- `npm run build`
- `npm run verify:local`

Deploy Preview is a validation surface, not proof of production database state, external provider capability or legal/commercial readiness.

---

## 20. Source-of-truth hierarchy

When documents disagree, use:

1. controlling canonical contract;
2. newest controlling canonical clarification;
3. current repository code/migrations;
4. current verified production evidence;
5. current official external evidence where required;
6. preparation documents;
7. historical plans/audits;
8. assumptions.

Historical documents may be retained as audit evidence, but must not be presented as current architecture.
