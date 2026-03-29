# Loadify Market — System Architecture

**Version:** March 2026  
**Operator:** XDrive Logistics Ltd · Company No: 13171804 · VAT: GB375949535  
**Domain:** UK multi-category marketplace — buyers and independent sellers  

> **Current production stack vs target spec:**  
> The current build uses React (Vite) + Supabase + Netlify + Stripe.  
> This document describes both the **current architecture** (§1–3) and the **target enterprise architecture** (§4–8) as a roadmap for scaling.

---

## 1. Current Production Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      Buyers / Sellers                          │
└──────────────────────────┬─────────────────────────────────────┘
                           │  HTTPS
           ┌───────────────▼───────────────┐
           │    Netlify CDN + Edge Cache   │
           │  (static SPA + Functions)     │
           └──────┬────────────────┬───────┘
                  │                │
     ┌────────────▼──┐    ┌────────▼───────────┐
     │  React SPA    │    │ Netlify Functions  │
     │  (Vite build) │    │ (serverless API)   │
     └───────────────┘    └────────────┬───────┘
                                       │
         ┌─────────────────────────────┼───────────────┐
         │                             │               │
┌────────▼────────┐  ┌─────────────────▼──┐  ┌────────▼──────┐
│  Supabase       │  │  Stripe             │  │  SendGrid     │
│  PostgreSQL     │  │  Checkout Sessions  │  │  Transactional│
│  Auth (JWT)     │  │  Connect (sellers)  │  │  Email        │
│  Storage (S3)   │  │  Webhooks           │  └───────────────┘
│  PostgREST API  │  └─────────────────────┘
│  Realtime WS    │
└─────────────────┘
```

### Current Stack Summary

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + TypeScript + Vite | SPA, CSR |
| Styling | Tailwind CSS v3 | |
| State | Zustand + React Context | |
| Routing | React Router v6 | |
| Backend | Supabase (PostgREST + Edge Functions) | |
| Database | PostgreSQL (via Supabase) | |
| Auth | Supabase Auth (JWT + RLS) | |
| File Storage | Supabase Storage (S3-compatible) | |
| Payments | Stripe Checkout + Connect | |
| Email | SendGrid (via Netlify Functions) | |
| Hosting | Netlify (CDN + Functions) | |
| CI/CD | GitHub Actions + Netlify deploy previews | |

---

## 2. Frontend Architecture

### 2.1 Application Structure
```
src/
├── components/           # Shared UI components
│   ├── admin/            # Admin layout, sidebar, header
│   ├── buyer/            # Buyer layout, sidebar
│   ├── seller/           # Seller layout, sidebar
│   ├── product/          # ProductCard, ProductInfo, ProductGallery
│   ├── ui/               # shadcn/ui primitives (Button, Input, Dialog…)
│   └── NotificationBell, RecentlyViewed, Footer, Navbar…
├── contexts/             # CartContext, AuthContext
├── lib/                  # safeStorage, useWishlist, supabaseClient
├── pages/
│   ├── Home.tsx          # Homepage (this PR)
│   ├── pixel-perfect/
│   │   ├── admin/        # Admin panel pages
│   │   ├── buyer/        # Buyer dashboard pages
│   │   └── seller/       # Seller dashboard pages
│   └── (public pages)    # Products, ProductDetail, ContactUs…
├── store/                # Zustand store (cart, user, UI state)
└── types/                # Shared TypeScript types
```

### 2.2 Routing
- Public routes: `/`, `/products`, `/product/:id`, `/sellers`, `/about`, `/contact`, `/login`, `/register`
- Buyer routes: `/dashboard/*` (protected by `buyer` role)
- Seller routes: `/seller/*` (protected by `seller` role)
- Admin routes: `/admin/*` (protected by `admin` role)
- PP (pixel-perfect) routes: `/pp/*` (mirrors above, aliased)

### 2.3 localStorage Safety
All localStorage access goes through `src/lib/safeStorage.ts` (`safeLocalStorage`). Never use `window.localStorage` directly — it crashes in mobile private/incognito mode.

---

## 3. Backend Architecture (Current)

### 3.1 Database (Supabase / PostgreSQL)

**Core Tables:**

| Table | Purpose |
|-------|---------|
| `users` | Auth users (Supabase managed) |
| `buyer_profiles` | Buyer preferences, addresses |
| `seller_profiles` | Seller store info, Stripe ID, shipping defaults |
| `products` | Product listings |
| `orders` | Order records with status |
| `order_items` | Line items per order |
| `reviews` | Buyer reviews (linked to `orders`) |
| `wishlists` | UUID[] productIds per buyer |
| `notifications` | In-app notifications |
| `notification_settings` | Per-user notification preferences |
| `platform_settings` | Admin-configurable platform parameters |
| `support_tickets` | Buyer/seller support requests |

**Security:** Row Level Security (RLS) enforced on all tables. JWT verified by Supabase Auth.

### 3.2 Serverless Functions (Netlify)
- `send-email.ts` — SendGrid email dispatch (contact enquiry, order confirmation)
- Stripe webhook handler — order fulfillment, payout events

---

## 4. Target Enterprise Architecture (Roadmap)

```
┌────────────────────────────────────────────────────────────────────┐
│                       Buyers / Sellers / Admins                    │
└────────────────────────────────┬───────────────────────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │        Cloudflare CDN + WAF          │
              │   (DDoS protection, edge caching)    │
              └──────────────────┬──────────────────┘
                                 │
              ┌──────────────────▼──────────────────┐
              │         Load Balancer / API Gateway  │
              └───┬───────────────┬──────────────────┘
                  │               │
   ┌──────────────▼──┐    ┌───────▼──────────────┐
   │  Next.js SSR    │    │   Microservices API   │
   │  (React 18)     │    │   (Node.js + Express) │
   │  Framer Motion  │    └───┬───────────────────┘
   └─────────────────┘        │
                     ┌────────┴────────┐
                     │  Service Mesh   │
                     └────────┬────────┘
          ┌──────────┬────────┼──────────┬──────────┐
          │          │        │          │          │
   ┌──────▼──┐ ┌─────▼──┐ ┌──▼──────┐ ┌─▼──────┐ ┌▼─────────┐
   │Product  │ │Order   │ │Payments │ │Search  │ │Notif.    │
   │Service  │ │Service │ │Service  │ │Service │ │Service   │
   └──────┬──┘ └─────┬──┘ └──┬──────┘ └─┬──────┘ └┬─────────┘
          │          │       │           │         │
   ┌──────▼──────────▼───────▼──────┐   │   ┌─────▼──────┐
   │         PostgreSQL             │   │   │  Redis     │
   │  (primary relational store)    │   │   │  (cache,   │
   └────────────────────────────────┘   │   │   sessions)│
                                        │   └────────────┘
                                 ┌──────▼──────┐
                                 │Elasticsearch│
                                 │(full-text   │
                                 │ product     │
                                 │ search)     │
                                 └─────────────┘
```

---

## 5. Microservices (Target)

### 5.1 Product Service
**Responsibilities:** CRUD for product listings, image upload, category management, search indexing  
**Endpoints:**
```
GET    /api/products                → list with filters/pagination
GET    /api/products/:id            → product detail
POST   /api/products                → create listing (seller auth)
PUT    /api/products/:id            → update listing
DELETE /api/products/:id            → remove listing
POST   /api/products/:id/images     → upload product images
```
**Data store:** PostgreSQL (primary) + Elasticsearch (search index) + S3/Cloudflare R2 (images)

### 5.2 Order Service
**Responsibilities:** Order lifecycle management, status tracking, fulfilment  
**States:** `pending_payment` → `paid` → `processing` → `dispatched` → `delivered` → `completed`  
**Endpoints:**
```
POST   /api/orders                  → create order (checkout)
GET    /api/orders/:id              → order detail
PUT    /api/orders/:id/status       → update status (seller)
POST   /api/orders/:id/dispute      → open dispute (buyer)
```

### 5.3 Payments Service (Stripe)
**Responsibilities:** Checkout sessions, Stripe Connect onboarding, webhook processing, payouts  
```
POST   /api/payments/checkout        → create Stripe Checkout session
POST   /api/payments/connect         → Stripe Connect OAuth for sellers
POST   /api/webhooks/stripe          → inbound webhook processor
GET    /api/payments/balance         → seller payout balance
```
**Payout schedule:** Weekly (every Monday) for previous week's completed orders

### 5.4 Search Service (Elasticsearch)
**Responsibilities:** Full-text search, faceted filtering, autocomplete, trending  
**Indices:**
- `products` — title, description, category, tags, price range, condition, seller rating
- `sellers` — store name, categories, rating, location

### 5.5 Notification Service
**Responsibilities:** In-app notifications, email dispatch, push (future)  
**Queue:** Redis pub/sub → notification processor  
**Channels:** in-app bell, email (SendGrid), future: push (Firebase)

---

## 6. Payments Architecture (Stripe)

### 6.1 Stripe Connect
- **Model:** Standard Connect (sellers manage their own Stripe accounts)
- **Flow:** Seller completes Stripe Connect OAuth during onboarding → `stripe_account_id` stored in `seller_profiles`
- **Payouts:** Platform collects full payment; weekly payouts to sellers minus commission

### 6.2 Commission Model
- Platform fee: configurable in `platform_settings` (key: `platform_config.commission_rate`)
- Collected via `application_fee_amount` in Stripe Checkout

### 6.3 Webhook Events Handled
| Event | Action |
|-------|--------|
| `checkout.session.completed` | Mark order `paid`, notify seller |
| `account.updated` | Sync Stripe Connect status |
| `payout.paid` | Notify seller of payout |
| `dispute.created` | Flag order, notify admin |

---

## 7. Storage Architecture

### 7.1 Current: Supabase Storage (S3-compatible)
- Product images: `products/` bucket
- Seller avatars/banners: `sellers/` bucket
- Public access via Supabase CDN URL

### 7.2 Target: AWS S3 + Cloudflare CDN
- **S3:** Primary object storage (private bucket)
- **Cloudflare R2 / CDN:** Public-facing CDN for images and static assets
- **Image processing:** Cloudflare Images or imgix for on-the-fly resizing and WebP conversion
- **Max upload sizes:** Product images 5MB; store banners 10MB; enforce at upload

---

## 8. Admin Panel Architecture

### 8.1 Modules
| Module | Capabilities |
|--------|-------------|
| **Sellers** | View all, approve/suspend, view store, impersonate |
| **Products** | View all, approve/reject, flag, feature |
| **Orders** | View all, update status, assign to dispute |
| **Disputes** | Review open disputes, resolve, refund via Stripe |
| **Users** | View all buyers/sellers, ban, reset password |
| **Fraud Detection** | Flagged accounts, suspicious orders, duplicate listings |
| **Settings** | Commission rate, platform name, support email, max upload size |
| **Analytics** | GMV, orders, active sellers, active buyers, conversion rate |

### 8.2 Fraud Detection Signals (Target)
- Multiple accounts with same IP / device fingerprint
- Seller with high dispute rate (>5% orders)
- Product price significantly below market (potential counterfeit)
- Buyer chargebacks
- Velocity: >50 orders in 1 hour from single account

---

## 9. Buyer Experience Architecture

### 9.1 Search & Discovery
- Full-text search via Elasticsearch (target) / Supabase full-text (current)
- Filters: category, price range, condition, dispatch time, rating, seller location
- Sort: relevance, price asc/desc, newest, best-rated, most popular
- Autocomplete with debounce (300ms)

### 9.2 AI Recommendations (Target)
- *"You might also like"* — collaborative filtering on order history
- *"Trending in your categories"* — based on real-time view/order data
- *"Similar products"* — product embedding similarity (OpenAI embeddings or in-house)

### 9.3 Wishlist
- Stored in `wishlists` table as `UUID[]` array (current implementation)
- Price-drop notifications when wishlisted item drops in price

### 9.4 Order Tracking
- Status updates: paid → processing → dispatched → delivered
- Seller provides tracking number → buyer sees carrier + tracking link
- Dispute window: 14 days after delivery

---

## 10. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Page load (LCP) | < 2.5s (Core Web Vitals: Good) |
| API response p99 | < 500ms |
| Uptime SLA | 99.9% |
| Image optimisation | WebP, lazy-loaded, responsive srcset |
| Accessibility | WCAG 2.1 AA |
| GDPR | Cookie consent, right to erasure, data export |
| Security | HTTPS everywhere, CSP headers, rate limiting, RLS |

---

*For the current deployed architecture, see also `docs/ARCHITECTURE.md`.*  
*For CI/CD pipeline detail, see `docs/CI-CD.md`.*
