# Loadify Market — Architecture

**Operated by** Loadify Market Ltd · UK  
**Domain model:** online **physical products** marketplace (C2C / B2C). Buyers browse and purchase physical goods; sellers list products, receive offers, ship orders, and receive payouts via Stripe Connect.

---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Buyers / Sellers                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │  HTTPS
                ┌───────────────▼───────────────┐
                │    Netlify CDN + Edge Cache    │
                │  (static SPA + Functions)      │
                └──────┬──────────────┬──────────┘
                       │              │
          ┌────────────▼──┐    ┌──────▼─────────────┐
          │  React SPA    │    │  Netlify Functions  │
          │  (Vite build) │    │  (serverless API)   │
          └───────────────┘    └──────────┬──────────┘
                                          │
              ┌───────────────────────────┼──────────────────┐
              │                           │                  │
   ┌──────────▼──────────┐  ┌────────────▼────┐  ┌──────────▼──────┐
   │  Supabase           │  │  Stripe          │  │  SendGrid       │
   │  - PostgreSQL DB    │  │  - Checkout      │  │  - Transactional│
   │  - Auth (JWT)       │  │  - Connect       │  │    email        │
   │  - Storage (S3)     │  │  - Webhooks      │  └─────────────────┘
   │  - PostgREST API    │  └─────────────────┘
   │  - Realtime         │
   └─────────────────────┘
```

---

## 2. Domain Boundaries

### 2.1 Auth & Users
- **Responsibility:** sign-up, sign-in, JWT tokens, role assignment (buyer / seller / admin).
- **Implementation:** Supabase Auth + `netlify/functions/register.ts`.
- **Roles:** `buyer` | `seller` | `admin` (admin = owner-equivalent; no separate owner role).
- **Key tables:** `auth.users` (Supabase-managed), `public.users`.

### 2.2 Seller Onboarding
- **Responsibility:** seller registration, business profile setup, Stripe Connect account linking, approval flow.
- **Implementation:** `seller_profiles`, `seller_stores` + `netlify/functions/connect-onboard.ts`, `recheck-activation.ts`.
- **Key tables:** `seller_profiles`, `seller_stores`.

### 2.3 Product Catalogue
- **Responsibility:** CRUD on physical product listings, category tree, specifications, images.
- **Implementation:** `netlify/functions/create-product.ts`, `update-product.ts`, `delete-product.ts`; PostgREST on `products`.
- **Key tables:** `products`, `categories`, `subcategories`.

### 2.4 Cart & Checkout
- **Responsibility:** buyer cart management, Stripe Checkout session creation, payment intent.
- **Implementation:** `netlify/functions/create-checkout.ts`, `create-payment-intent.ts`; Zustand cart store on client.
- **Key tables:** `cart_items`.

### 2.5 Orders & Shipping
- **Responsibility:** order lifecycle — `awaiting_payment → paid → packed → shipped → delivered → completed / cancelled`.
- **Implementation:** `netlify/functions/confirm-delivery.ts`, `update-shipment-status.ts`; buyer/seller order dashboards.
- **Key tables:** `orders`, `order_items`, `shipments`, `shipping_methods`.

### 2.6 Payments & Payouts
- **Responsibility:** Stripe Checkout session creation, webhook processing, Stripe Connect payouts to sellers.
- **Implementation:**
  - `netlify/functions/create-checkout.ts` — creates Stripe Checkout session with price integrity validation.
  - `netlify/functions/stripe-webhook.ts` — handles `checkout.session.completed`, creates order + transfer (idempotent).
  - `netlify/functions/connect-onboard.ts` / `connect-dashboard.ts` / `connect-status.ts` — seller payout onboarding.
  - `netlify/functions/escrow-release.ts` — scheduled payout release (daily cron).
- **Key tables:** `payments`, `payouts`, `stripe_events` (idempotency).

### 2.7 Offers & Messaging
- **Responsibility:** buyer↔seller in-app messaging, price offer negotiation.
- **Implementation:** `netlify/functions/send-message.ts`, `conversation-offer.ts`, `conversation-get-or-create.ts`.
- **Key tables:** `conversations`, `messages`, `offers`.
- **Note:** `offers` table created in migration `480_offers_engine.sql` — must be applied in all environments.

### 2.8 Notifications
- **Responsibility:** in-app notifications + transactional email for orders, messages, offers.
- **Implementation:** `netlify/functions/send-email.ts` → SendGrid; realtime Supabase subscriptions on `notifications`.
- **Key tables:** `notifications`.
- **Canonical types:** `offer_received`, `new_message`, `order_update` (legacy `new_offer`/`offer` normalised on read).

### 2.9 Support
- **Responsibility:** buyer/seller support tickets, admin moderation.
- **Implementation:** `netlify/functions/support-ticket-create.ts` (rate-limited); direct `support_tickets` inserts are RLS-restricted.
- **Key tables:** `support_tickets`.

### 2.10 Admin
- **Responsibility:** moderate listings, approve/reject sellers, manage disputes, view analytics, platform settings.
- **Implementation:** Pixel-perfect admin dashboard (`/admin/*`).
- **Access:** `role = 'admin'`.

---

## 3. Data Model (simplified ERD)

```
users ──< seller_profiles ──< products ──< categories
  │               │
  ├──< orders ──< order_items ──> products
  │        │
  │        ├──< payments
  │        ├──< shipments
  │        └──< reviews
  │
  ├──< conversations ──< messages
  │             └──< offers
  │
  ├──< notifications
  ├──< support_tickets
  ├──< wishlists
  ├──< cart_items
  └──< payouts
```

Key constraints:
- `seller_profiles.userId = users.id` (FK).
- `products.sellerId` references `users.id`.
- `orders_update` is admin-only by RLS; buyer/seller status transitions go through service-role Netlify functions.

---

## 4. Request Lifecycle — Buy Now

```
Buyer                    Frontend                  Netlify Fn          Stripe         Supabase
  │                          │                         │                  │               │
  ├─ Browse catalog ─────────►│                         │                  │               │
  │◄─ Product listings ───────┤ (PostgREST SELECT)      │                  │               │
  │                          │                         │                  │               │
  ├─ Click "Buy Now" ─────────►│                         │                  │               │
  │                          ├─── POST /create-checkout ►│                  │               │
  │                          │                         ├─ validate price ──────────────────►│
  │                          │                         │◄─ OK ──────────────────────────────┤
  │                          │                         ├─ create Session ──►│               │
  │                          │                         │◄─ { url } ─────────┤               │
  │                          │◄─── { url } ────────────┤                  │               │
  ├─ Redirect to Stripe ──────►──────────────────────────────────────────►│               │
  ├─ Pay ─────────────────────►──────────────────────────────────────────►│               │
  │                          │                         │◄─ webhook ─────────┤               │
  │                          │                         ├─ INSERT order ─────────────────────►│
  │                          │                         ├─ transfer to seller ►│               │
  │◄─ Redirect /orders/success┤                         │                  │               │
```

---

## 5. Mobile (Capacitor APK)

The web app is wrapped as an Android APK via Capacitor.

- `capacitor.config.ts` — app ID, server URL, plugins.
- `src/lib/capacitorFetchPatch.ts` — patches `fetch` for Android WebView cookie handling.
- `src/lib/authorizedFetch.ts` — wraps Netlify function calls with absolute URL resolution for APK context.
- `android/` — Gradle project for APK build/sign.

---

## 6. Frontend Architecture

```
src/
├── pages/
│   └── pixel-perfect/        # Full-page components (own Header + Footer)
│       ├── Index.tsx          # Homepage
│       ├── Catalog.tsx        # Product catalogue
│       ├── CategoryPage.tsx   # /category/:slug
│       ├── ProductDetail.tsx  # /product/:id
│       ├── Cart.tsx
│       ├── Checkout.tsx
│       ├── seller/            # /seller/* seller dashboard
│       ├── buyer/             # /buyer/* buyer dashboard
│       └── admin/             # /admin/* admin panel
├── pages/Mobile*.tsx          # Mobile-only pages (shown <768px, MobileBottomNav)
├── components/
│   ├── Mobile*.tsx            # Mobile-specific UI components
│   ├── Header.tsx             # Desktop global header
│   ├── Footer.tsx
│   └── ...
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── authorizedFetch.ts     # APK-safe authenticated fetch
│   └── errorTracking.ts       # Client-side error capture + reporting
└── store/                     # Zustand stores (auth, cart, authPrompt)
```

---

## 7. Security Model

| Layer | Mechanism |
|---|---|
| Auth | Supabase JWT (short-lived access token + refresh token) |
| API access | Row-Level Security (RLS) on every Postgres table |
| Public data | `USING TRUE` or `isActive = true` RLS policies |
| Seller data | `USING (auth.uid() = seller_id)` |
| Admin data | `USING (role = 'admin')` |
| Orders mutation | Admin-only RLS on `orders_update`; buyer/seller use service-role functions |
| Payments | Stripe signature verification on every webhook |
| Rate limiting | `checkRateLimit()` in shared Netlify function module |
| Input validation | Zod schemas on form inputs; DB constraints as last line |
| CSP | `unsafe-inline` retained for Tailwind/JSON-LD; `csp-report` endpoint captures violations |

---

## 8. Observability

| Signal | Tooling |
|---|---|
| Client-side errors | `errorTracking.ts` → `/.netlify/functions/error-report` |
| CSP violations | `/.netlify/functions/csp-report` |
| Unhandled React render errors | `ErrorBoundary.tsx` → `captureError()` |
| Netlify function logs | Netlify dashboard (structured JSON logs) |
| Stripe events | `stripe_events` table (idempotent, with `status='failed'` for retries) |

---

## 9. Deployment

| Stage | Branch | Host | Notes |
|---|---|---|---|
| Production | `main` | Netlify | Manual approval merge |
| Staging | `develop` | Netlify (preview) | Auto-deploy on push |
| PR preview | `feature/*` | Netlify (preview) | Auto-deploy per PR |

Database migrations are applied manually via the Supabase SQL editor, in order, using the files in `supabase/`.  
The numbering convention is `NNN_description.sql` (e.g. `480_offers_engine.sql`).

---

## 10. CI Pipeline

See `.github/workflows/ci.yml`.  Jobs run in order: **lint → typecheck → test → build**.


---

## 1. High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Buyers / Sellers                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │  HTTPS
                ┌───────────────▼───────────────┐
                │    Netlify CDN + Edge Cache    │
                │  (static SPA + Functions)      │
                └──────┬──────────────┬──────────┘
                       │              │
          ┌────────────▼──┐    ┌──────▼─────────────┐
          │  React SPA    │    │  Netlify Functions  │
          │  (Vite build) │    │  (serverless API)   │
          └───────────────┘    └──────────┬──────────┘
                                          │
              ┌───────────────────────────┼──────────────────┐
              │                           │                  │
   ┌──────────▼──────────┐  ┌────────────▼────┐  ┌──────────▼──────┐
   │  Supabase           │  │  Stripe          │  │  SendGrid       │
   │  - PostgreSQL DB    │  │  - Checkout      │  │  - Transactional│
   │  - Auth (JWT)       │  │  - Connect       │  │    email        │
   │  - Storage (S3)     │  │  - Webhooks      │  └─────────────────┘
   │  - PostgREST API    │  └─────────────────┘
   │  - Realtime         │
   └─────────────────────┘
```

---

## 2. Domain Boundaries

### 2.1 Auth & Users
- **Responsibility:** sign-up, sign-in, JWT tokens, role assignment (buyer / seller / admin).
- **Implementation:** Supabase Auth + `netlify/functions/register.ts`.
- **Key tables:** `auth.users` (Supabase-managed), `public.users`.

### 2.2 Seller Onboarding
- **Responsibility:** apply as seller, verify business details, approve/reject.
- **Implementation:** PostgREST on `seller_profiles` + `seller_stores`; admin dashboard.
- **Key tables:** `seller_profiles`, `seller_stores`.

### 2.3 Service Catalogue
- **Responsibility:** CRUD on service listings, category tree, attributes, media.
- **Implementation:** PostgREST on `services`, `service_attributes`, `service_media`.
- **Key tables:** `services`, `service_attributes`, `service_media`, `categories`.

### 2.4 Requests & Quotes (RFQ)
- **Responsibility:** buyer posts a brief; sellers submit competitive quotes; buyer accepts one → order.
- **Implementation:** PostgREST on `service_requests`, `service_quotes`.
- **Key tables:** `service_requests`, `service_quotes`.

### 2.5 Orders / Bookings
- **Responsibility:** booking lifecycle — `requested → accepted → in_progress → completed / cancelled`.
- **Implementation:** PostgREST on `orders`, `order_items`.
- **Key tables:** `orders`, `order_items`.

### 2.6 Payments
- **Responsibility:** Stripe Checkout session creation, webhook processing, Connect payouts.
- **Implementation:**
  - `netlify/functions/create-checkout.ts` — creates Stripe Checkout session.
  - `netlify/functions/stripe-webhook.ts` — handles `checkout.session.completed`, creates order + transfer.
  - `netlify/functions/connect-onboard.ts` / `connect-dashboard.ts` / `connect-status.ts` — seller payout onboarding.
- **Key tables:** `payments`, `payouts`, `stripe_events`.

### 2.7 Messaging
- **Responsibility:** in-order chat between buyer and seller.
- **Implementation:** PostgREST on `order_messages`.
- **Key tables:** `order_messages`.

### 2.8 Reviews
- **Responsibility:** ratings and written reviews after order completion.
- **Implementation:** PostgREST on `reviews`.
- **Key tables:** `reviews`.

### 2.9 Notifications
- **Responsibility:** transactional email (order confirmation, seller alerts, etc.).
- **Implementation:** `netlify/functions/send-email.ts` → SendGrid.
- **Templates:** `order_confirmation`, `order_accepted`, `service_completed`, `order_cancelled`, etc.

### 2.10 Admin
- **Responsibility:** moderate listings, approve sellers, manage disputes, view reports.
- **Implementation:** Pixel-perfect admin dashboard (`/admin/*`).
- **Access:** `role = 'admin'`.

---

## 3. Data Model (simplified ERD)

```
users ──< seller_profiles ──< services ──< service_attributes
  │               │                  └──< service_media
  │               │
  ├──< service_requests ──< service_quotes
  │
  ├──< orders ──< order_items
  │        │
  │        ├──< payments
  │        ├──< order_messages
  │        └──< reviews
  │
  └──< payouts
```

Key constraints:
- `seller_profiles.userId = users.id = seller_stores.userId` (enforced by FK in migration 180).
- `services.seller_id` references `users.id`.
- `orders.service_id` (nullable, FK to `services`) or `orders.quote_id` (FK to `service_quotes`).

---

## 4. Request Lifecycle — Direct Booking

```
Buyer                    Frontend                  Netlify Fn          Stripe         Supabase
  │                          │                         │                  │               │
  ├─ Browse catalog ─────────►│                         │                  │               │
  │◄─ Service listings ───────┤ (PostgREST SELECT)      │                  │               │
  │                          │                         │                  │               │
  ├─ Click "Book Now" ───────►│                         │                  │               │
  │                          ├─── POST /create-checkout ►│                  │               │
  │                          │                         ├─ validate prices ─►               │
  │                          │                         │◄─ OK ─────────────┤               │
  │                          │                         ├─ create Session ──►│               │
  │                          │                         │◄─ { url } ─────────┤               │
  │                          │◄─── { url } ────────────┤                  │               │
  ├─ Redirect to Stripe ──────►──────────────────────────────────────────►│               │
  │◄─ Payment form ───────────┤                         │                  │               │
  ├─ Pay ─────────────────────►──────────────────────────────────────────►│               │
  │                          │                         │◄─ webhook ─────────┤               │
  │                          │                         ├─ INSERT order ─────────────────►  │
  │                          │                         ├─ transfer to seller ►│               │
  │◄─ Redirect /orders/success┤                         │                  │               │
```

---

## 5. Request Lifecycle — Request for Quote (RFQ)

```
Buyer posts request → Sellers submit quotes → Buyer accepts quote
→ order created (status: requested) → seller accepts → in_progress
→ service delivered → completed → review unlocked
```

---

## 6. Frontend Architecture

```
src/
├── pages/
│   └── pixel-perfect/        # Full-page components (own Navbar + Footer)
│       ├── Index.tsx          # Homepage
│       ├── Catalog.tsx        # All services
│       ├── CategoryPage.tsx   # /category/:slug
│       ├── ProductDetail.tsx  # /product/:id
│       ├── Cart.tsx
│       ├── Checkout.tsx
│       ├── CheckoutError.tsx  # /checkout/error
│       ├── FAQ.tsx            # /faq
│       ├── seller/            # /seller/* dashboard
│       ├── buyer/             # /dashboard/* buyer dashboard
│       └── admin/             # /admin/* admin panel
├── components/
│   ├── ErrorBoundary.tsx      # Global error boundary (calls captureError)
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   └── ...
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── stripe.ts              # Stripe.js loader
│   └── errorTracking.ts      # Client-side error capture + reporting
└── store/                    # Zustand stores (auth, cart)
```

---

## 7. Security Model

| Layer | Mechanism |
|---|---|
| Auth | Supabase JWT (short-lived access token + refresh token) |
| API access | Row-Level Security (RLS) on every Postgres table |
| Public data | `USING TRUE` or `status = 'active'` RLS policies |
| Seller data | `USING (auth.uid() = seller_id)` |
| Admin data | `USING (role = 'admin')` |
| Payments | Stripe signature verification on every webhook |
| Rate limiting | `checkRateLimit()` in shared Netlify function module |
| Input validation | Zod schemas on form inputs; DB constraints as last line |
| CSP | `csp-report` endpoint captures violations |

---

## 8. Observability

| Signal | Tooling |
|---|---|
| Client-side errors | `errorTracking.ts` → `/.netlify/functions/error-report` |
| CSP violations | `/.netlify/functions/csp-report` |
| Unhandled React render errors | `ErrorBoundary.tsx` → `captureError()` |
| Netlify function logs | Netlify dashboard (structured JSON logs) |
| Stripe events | `stripe_events` table (idempotent, with `status='failed'` for retries) |

---

## 9. Deployment

| Stage | Branch | Host | Notes |
|---|---|---|---|
| Production | `main` | Netlify | Manual approval merge |
| Staging | `develop` | Netlify (preview) | Auto-deploy on push |
| PR preview | `feature/*` | Netlify (preview) | Auto-deploy per PR |

Database migrations are applied manually via the Supabase SQL editor, in order, using the files in `supabase/`.  
The numbering convention is `NNN_description.sql` (e.g. `200_services_marketplace.sql`).

---

## 10. CI Pipeline

See `.github/workflows/ci.yml`.  Jobs run in order: **lint → typecheck → test → build**.  
The build job uploads the `dist/` artefact for inspection.

Merge to `main` is blocked if any job fails.
