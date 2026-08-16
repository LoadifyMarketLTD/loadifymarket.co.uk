# Loadify Market

**UK multi-category physical goods marketplace**, operated by XDrive Logistics Ltd (Co. No: 13171804, VAT: GB375949535).

Independent and company UK sellers list and sell physical products across all consumer goods categories. The platform does not own inventory, hold or store products, or operate a depot — sellers manage their own inventory and fulfil orders directly. Buyers browse, purchase via Stripe, and receive orders from sellers with full shipment tracking.

---

## 📚 Documentation

| Doc | Purpose |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture, domain model, data flow |
| [docs/openapi.yaml](./docs/openapi.yaml) | API reference (OpenAPI 3.0) |
| [docs/SHIPPING.md](./docs/SHIPPING.md) | Shipment and tracking system |
| [docs/audit/MASTER_FRAMEWORK.md](./docs/audit/MASTER_FRAMEWORK.md) | Audit operating model: surfaces, levels, evidence, and definition of done |
| [docs/audit/COVERAGE_MATRIX.md](./docs/audit/COVERAGE_MATRIX.md) | Current critical-flow coverage and control gaps |

---

## ✨ Features

### Buyers
- Browse and search physical product listings by category, condition, and price range
- Purchase directly via Stripe Checkout (GBP)
- Request a bulk quote (RFQ) — submit product name, quantity, destination, and budget; seller replies by email
- Direct messaging with sellers, linked to products or orders
- Order tracking via courier name and tracking number (shipment event log)
- Post-delivery reviews (verified purchase — requires a delivered order)
- Wishlist, saved searches, and recently viewed products
- File returns and raise disputes on delivered orders

### Sellers
- List physical products across all supported categories, with optional listing attributes including condition (new, used, refurbished), stock quantity, weight, dimensions, and pallet or lot-specific fields
- Seller account lifecycle: `draft` → `submitted` → `active` → `suspended` (admin-approved account lifecycle; separate from product publication)
- Eligible active sellers publish listings directly without mandatory per-product admin approval
- Seller is responsible for listing accuracy, product description/photos, price, ownership/right to sell and compliance with marketplace rules
- Order management dashboard — status progression: `paid` → `packed` → `shipped` → `delivered`
- Shipment creation with courier name, tracking number, and dispatch date
- Respond to buyer RFQ requests via the quote inbox
- Stripe Connect Express onboarding for weekly GBP payouts
- Manage returns and respond to disputes
- Pause account (deactivates all listings) or delete seller account

### Admin
- Seller approval and suspension workflow (seller/account verification, not product certification)
- Post-publication product moderation and enforcement — review reports/flagged listings and hide or remove listings that breach marketplace rules
- Platform-wide order and user management
- Dispute resolution with refund amount control
- Support ticket inbox
- Platform analytics overview

---

## 💰 Business Model

The platform charges a **7% commission** on each completed transaction, deducted before the seller's payout is processed via Stripe Connect. The platform acts solely as an intermediary — it does not own products, hold inventory, or operate a fulfilment depot. Sellers are responsible for their own inventory management, listing accuracy and order fulfilment.

Loadify does **not** manually certify the truth, quality or physical condition of every product before publication. Eligible sellers may publish directly, while Loadify retains post-publication moderation and enforcement powers for prohibited content, fraud/spam, marketplace-rule violations, reports and suspicious activity.

> **Launch promotion:** 0% commission on all transactions until **31 December 2026 23:59:59 UTC**. The standard 7% rate resumes automatically after that date.

All prices are in **GBP**. VAT is calculated and displayed separately (flat-rate scheme, `GB375949535`). Sellers receive weekly payouts via Stripe Connect Express.

---

## 📦 Product Categories

The marketplace covers 15 top-level consumer goods categories, each with subcategories:

Clothing · Shoes · Jewellery · Media & Electronics · Accessories · Toys · Health & Beauty · Pets · Memorabilia · Adult · Food & Drink · Office Supplies · Home & Garden · Sports & Outdoors · Mixed Job Lots

---

## 📋 Prerequisites

- **Node.js 20+** and npm
- **Supabase account** (free tier works for development)
- **Stripe account** (test mode available — no real payments needed in development)
- **SendGrid account** (optional — transactional email for shipment notifications)

---

## 🛠️ Quick Start

```bash
# 1. Clone and install
git clone https://github.com/LoadifyMarketLTD/loadifymarket.co.uk.git
cd loadifymarket.co.uk
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_STRIPE_PUBLISHABLE_KEY

# 3. Initialise database
# In Supabase SQL Editor, run migrations in order:
#   supabase/00_consolidated_schema.sql   ← full baseline schema
#   supabase/10_rls_policies.sql          ← Row-Level Security policies
#   supabase/210_seller_auto_activation.sql ← seller lifecycle
#   (then any higher-numbered migrations in ascending order)

# 4. Start dev server (hot reload)
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173)

---

## 🧑‍💻 Development Commands

```bash
npm run dev          # Start Vite dev server with HMR
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm test             # Vitest unit tests (single run)
npm run test:watch   # Vitest in watch mode
```

Local Netlify Functions (Stripe, register, email):
```bash
npm install -g netlify-cli
netlify dev          # Starts frontend + Netlify Functions at http://localhost:8888
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| API | Supabase PostgREST + Netlify Functions |
| Payments | Stripe Checkout + Stripe Connect Express |
| Email | SendGrid |
| Hosting | Netlify (CDN + serverless functions) |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

---

## 📂 Key Project Structure

```
├── src/
│   ├── pages/pixel-perfect/   # Full-page React components
│   │   ├── seller/            # Seller dashboard pages — served at both /seller/* (shadcn sidebar layout)
│   │   │                      #   and /pp/seller/* (pixel-perfect standalone shell)
│   │   ├── buyer/             # Buyer dashboard pages — served at both /dashboard/* and /pp/buyer/*
│   │   └── admin/             # Admin panel pages — served at both /admin/* and /pp/admin/*
│   ├── components/            # Shared UI components
│   └── lib/
│       ├── supabase.ts        # Supabase client
│       └── safeStorage.ts     # Safe localStorage wrapper (mobile private mode safe)
├── netlify/functions/         # Serverless API handlers
│   ├── register.ts            # User registration
│   ├── create-checkout.ts     # Stripe Checkout session creation
│   ├── stripe-webhook.ts      # Stripe event handler (orders + Connect)
│   ├── connect-onboard.ts     # Stripe Connect Express onboarding
│   ├── create-shipment.ts     # Shipment creation and update
│   ├── track-shipment.ts      # Shipment tracking lookup
│   ├── generate-invoice.ts    # Invoice PDF generation
│   └── send-email.ts          # SendGrid transactional email
├── supabase/                  # SQL migrations (numbered, run in ascending order)
│   ├── 00_consolidated_schema.sql
│   ├── 10_rls_policies.sql
│   └── ...
├── docs/
│   ├── ARCHITECTURE.md        # System architecture
│   └── openapi.yaml           # API reference
└── public/
    ├── sitemap.xml
    └── robots.txt
```

---

## 🚀 Deployment

The project deploys to Netlify automatically via the configuration in `netlify.toml`.

1. Connect the GitHub repository to Netlify.
2. Leave the **Build command** field **empty** in the Netlify UI (it reads from `netlify.toml`).
3. Set the following environment variables in the Netlify dashboard:

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (functions only) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe standard webhook signing secret |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | ✅ | Stripe Connect webhook signing secret |
| `SENDGRID_API_KEY` | Optional | SendGrid API key for shipment emails |
| `VITE_SUPPORT_EMAIL` | Optional | Support email address |

For detailed instructions see the [Netlify documentation](https://docs.netlify.com/configure-builds/environment-variables/).

---

## 🔐 Security

- Row-Level Security (RLS) enforced on every PostgreSQL table.
- All payments processed by Stripe (PCI-DSS Level 1) — card details are never stored on our servers.
- Stripe webhook signature verification on every inbound event.
- Both the standard account webhook and the Stripe Connect webhook share a single endpoint, each verified with its own signing secret.
- Supabase JWT with short-lived access tokens and refresh tokens.
- Rate limiting on registration, Stripe Connect onboarding, email, and error-reporting endpoints.
- Content-Security-Policy with violation reporting.
- Product publication eligibility is enforced server-side; the client cannot supply or override the compatibility `isApproved` field.

---

## 🧪 Test Accounts & Stripe Cards

After running the seed scripts:

| Role | Email | Password |
|---|---|---|
| Buyer | buyer@test.com | test1234 |
| Seller (active) | seller@test.com | test1234 |
| Admin | admin@loadifymarket.co.uk | test1234 |

**Stripe test cards:**
- ✅ Success: `4242 4242 4242 4242` (any future expiry, any CVV)
- ❌ Decline: `4000 0000 0000 0002`

---

## 📧 Contact

**Company**: XDrive Logistics Ltd  
**Support**: contact@loadifymarket.co.uk  
**Phone**: +44 7423 272138  
**Address**: 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom

---

## 📄 License

Copyright © 2025 XDrive Logistics Ltd. All rights reserved.
