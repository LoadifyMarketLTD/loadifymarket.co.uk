# Loadify Market — Architecture

**Operated by** XDrive Logistics Ltd · Company No: 13171804 · VAT: GB375949535  
**Domain model:** online **services** marketplace (B2B / B2C). No physical products, no warehouse, no depot.

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
- **Access:** `role = 'admin'` or `role = 'owner'`.

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
| Admin data | `USING (role IN ('admin','owner'))` |
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
