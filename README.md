# Loadify Market

**UK online services marketplace** operated by XDrive Logistics Ltd (Co. No: 13171804, VAT: GB375949535).

Buyers discover, compare and book **services** — transport, logistics, freight, warehousing, equipment hire and more — from verified sellers. No physical products, no depot.

---

## 📚 Documentation

| Doc | Purpose |
|---|---|
| [COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md) | Step-by-step installation and configuration |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System architecture, domain model, data flow |
| [docs/openapi.yaml](./docs/openapi.yaml) | API reference (OpenAPI 3.0) |
| [DATABASE_SETUP_COMPLETE.md](./DATABASE_SETUP_COMPLETE.md) | Database initialisation guide |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Netlify deployment instructions |
| [docs/SHIPPING.md](./docs/SHIPPING.md) | Shipment and tracking system |

---

## ✨ Features

### Buyers
- Browse and search service listings by category, price, location type
- Submit a Request for Quote (RFQ) and receive competitive offers from sellers
- Secure checkout via Stripe (GBP)
- In-order messaging with sellers
- Order tracking and review system
- Wishlist and saved searches

### Sellers
- Service listing management (draft → active lifecycle)
- Order management dashboard (requested → accepted → in_progress → completed)
- Stripe Connect Express payout onboarding
- Quote submission for buyer RFQs
- Reviews and ratings

### Admin
- Seller verification and approval workflow
- Listing moderation
- User management
- Dispute resolution
- Analytics and reporting

---

## 📋 Prerequisites

- **Node.js 20+** and npm
- **Supabase account** (free tier works for development)
- **Stripe account** (test mode available — no real payments needed in development)
- **SendGrid account** (optional — transactional email)

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
#   supabase/10_rls_policies.sql          ← Row-Level Security
#   supabase/200_services_marketplace.sql ← services, RFQ, messaging tables
#   (and any higher-numbered migrations)

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
│   │   ├── seller/            # /seller/* seller dashboard
│   │   ├── buyer/             # /dashboard/* buyer dashboard
│   │   └── admin/             # /admin/* admin panel
│   ├── components/
│   │   └── ErrorBoundary.tsx  # Global error boundary
│   └── lib/
│       ├── supabase.ts        # Supabase client
│       └── errorTracking.ts   # Client-side error reporting
├── netlify/functions/         # Serverless API handlers
│   ├── register.ts            # User registration
│   ├── create-checkout.ts     # Stripe Checkout session
│   ├── stripe-webhook.ts      # Stripe event handler
│   ├── connect-onboard.ts     # Stripe Connect onboarding
│   └── send-email.ts          # SendGrid transactional email
├── supabase/                  # SQL migrations (numbered)
│   └── 200_services_marketplace.sql  # Services, RFQ, messaging
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
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | ✅ | Stripe Connect webhook secret |
| `SENDGRID_API_KEY` | Optional | SendGrid API key for emails |
| `VITE_SUPPORT_EMAIL` | Optional | Support email address |

For detailed instructions see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## 🔐 Security

- Row-Level Security (RLS) on every PostgreSQL table.
- All payments processed by Stripe (PCI-DSS Level 1) — card details never stored on our servers.
- Stripe webhook signature verification on every event.
- Supabase JWT with short-lived access tokens + refresh tokens.
- Rate limiting on registration, email, and error-reporting endpoints.
- Content-Security-Policy with violation reporting.

---

## 🧪 Test Accounts & Stripe Cards

After running the seed scripts:

| Role | Email | Password |
|---|---|---|
| Buyer | buyer@test.com | test1234 |
| Seller (approved) | seller@test.com | test1234 |
| Admin | admin@loadifymarket.co.uk | test1234 |

**Stripe test cards:**
- ✅ Success: `4242 4242 4242 4242` (any future expiry, any CVV)
- ❌ Decline: `4000 0000 0000 0002`

---

## 📧 Contact

**Company**: XDrive Logistics Ltd  
**Support**: support@loadifymarket.co.uk  
**Address**: 101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom

---

## 📄 License

Copyright © 2025 XDrive Logistics Ltd. All rights reserved.

