# Loadify Market — Documentation Index

> **Quick navigation**: jump directly to what you need without searching through multiple files.

---

## 🚀 Getting Started

| Document | Description |
|---|---|
| [README.md](./README.md) | Project overview and feature summary |
| [COMPLETE_SETUP_GUIDE.md](./COMPLETE_SETUP_GUIDE.md) | Step-by-step installation and environment configuration |
| [QUICKSTART.md](./QUICKSTART.md) | Fastest path to a running local dev environment |
| [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) | One-page deploy checklist for Netlify |
| [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) | Detailed deployment instructions |

---

## 🗄️ Database

| Document | Description |
|---|---|
| [DATABASE_SETUP.md](./DATABASE_SETUP.md) | Database initialisation and migration guide |
| [DATABASE_SETUP_COMPLETE.md](./DATABASE_SETUP_COMPLETE.md) | Post-migration verification steps |
| [SUPABASE_RESTORE.md](./SUPABASE_RESTORE.md) | How to restore from a backup |
| [supabase/](./supabase/) | SQL migration files (run in numeric order) |

### Migration files (run in order)

| File | Purpose |
|---|---|
| `supabase/00_consolidated_schema.sql` | Full schema baseline |
| `supabase/10_rls_policies.sql` | Row Level Security policies |
| `supabase/20_fix_users_table.sql` | Users table live fix |
| `supabase/30_storage_buckets.sql` | Storage bucket setup |
| `supabase/40_shipping_methods.sql` | Shipping tables |
| `supabase/50_fix_b2c_categories.sql` | B2C category slugs |
| `supabase/60_fix_products_rls_perf.sql` | RLS performance optimisation |
| `supabase/70_simplify_retail_shipping.sql` | Retail shipping simplification |
| `supabase/80_fix_rls_security_gaps.sql` | RLS security hardening |
| `supabase/90_launch_features.sql` | Launch feature additions |
| `supabase/95_stripe_connect.sql` | Stripe Connect tables |
| `supabase/100_fix_users_permissions.sql` | User permission grants |
| `supabase/110_fix_rls_insert_policy.sql` | Insert policy fix |
| `supabase/120_error_tracking_rate_limits.sql` | Error tracking & rate-limit tables |

---

## 💳 Payments & Stripe

| Document | Description |
|---|---|
| [STRIPE_SETUP.md](./STRIPE_SETUP.md) | Stripe account setup and Connect configuration |

---

## 🚢 Shipping & Logistics

| Document | Description |
|---|---|
| [docs/SHIPPING.md](./docs/SHIPPING.md) | Shipping integration architecture |
| [docs/TESTING_SHIPPING.md](./docs/TESTING_SHIPPING.md) | Manual shipping test procedures |
| [IMPLEMENTATION_SUMMARY_SHIPPING.md](./IMPLEMENTATION_SUMMARY_SHIPPING.md) | Shipping feature implementation notes |

---

## 🔧 Platform & Architecture

| Document | Description |
|---|---|
| [FEATURES.md](./FEATURES.md) | Complete feature list |
| [FEATURE_IMPLEMENTATION_STATUS.md](./FEATURE_IMPLEMENTATION_STATUS.md) | Implementation status per feature |
| [MODULES_STATUS.md](./MODULES_STATUS.md) | Module readiness overview |
| [MOCK_SERVICES_GUIDE.md](./MOCK_SERVICES_GUIDE.md) | Using mock services for local dev |
| [PLATFORM_AUDIT.md](./PLATFORM_AUDIT.md) | Architecture and security audit |
| [SETUP.md](./SETUP.md) | Environment variables reference |

---

## 🔒 Security

| Topic | Where to look |
|---|---|
| Content Security Policy | `netlify.toml` — `Content-Security-Policy` header |
| CSP violation reports | `netlify/functions/csp-report.ts` + `supabase/120_error_tracking_rate_limits.sql` |
| Frontend error tracking | `src/lib/errorTracking.ts` + `netlify/functions/error-report.ts` |
| Rate limiting | `netlify/functions/_shared/rateLimiter.ts` |
| Row Level Security | `supabase/10_rls_policies.sql`, `supabase/80_fix_rls_security_gaps.sql` |
| Edge function security headers | `netlify/edge-functions/security-headers.ts` |

---

## 🧪 Testing

| Topic | Where to look |
|---|---|
| Unit tests | `src/lib/__tests__/` and `netlify/functions/__tests__/` |
| Run tests | `npm test` |
| Watch mode | `npm run test:watch` |
| Coverage report | `npm run test:coverage` |
| Test setup | `src/test/setup.ts`, `tsconfig.test.json` |

---

## 📊 Netlify Functions

| Function | Endpoint | Description |
|---|---|---|
| `register.ts` | `POST /register` | User registration (server-side, bypasses email rate limit) |
| `create-checkout.ts` | `POST /create-checkout` | Stripe checkout session with server-side price validation |
| `stripe-webhook.ts` | `POST /stripe-webhook` | Stripe payment and Connect webhooks |
| `connect-onboard.ts` | `POST /connect-onboard` | Stripe Connect Express onboarding link |
| `connect-dashboard.ts` | `POST /connect-dashboard` | Stripe Connect dashboard link |
| `connect-status.ts` | `POST /connect-status` | Stripe Connect account status |
| `send-email.ts` | `POST /send-email` | Transactional email via SendGrid |
| `resend-verification.ts` | `POST /resend-verification` | Resend verification email (admin only) |
| `generate-invoice.ts` | `POST /generate-invoice` | PDF invoice generation |
| `create-shipment.ts` | `POST /create-shipment` | Create a shipment record |
| `track-shipment.ts` | `GET /track-shipment` | Track a shipment |
| `update-shipment-status.ts` | `POST /update-shipment-status` | Update shipment status |
| `upload-proof-of-delivery.ts` | `POST /upload-proof-of-delivery` | Upload delivery proof |
| `csp-report.ts` | `POST /csp-report` | Receive CSP violation reports |
| `error-report.ts` | `POST /error-report` | Receive frontend JS error reports |
| `health.ts` | `GET /health` | Health check endpoint |

---

## 🗺️ Netlify Edge Functions

| Function | Path | Description |
|---|---|---|
| `security-headers.ts` | `/*` | Adds HSTS and Permissions-Policy to HTML responses at the CDN edge |

---

## 🌐 Netlify Image CDN

Product and seller images can be served via Netlify's built-in image CDN
for automatic WebP conversion, resizing, and compression.

```ts
import { productThumbnail, productHero, sellerAvatar } from '@/lib/imageOptimization';

// 300×300 WebP thumbnail
<img src={productThumbnail(product.imageUrl)} />

// 800px wide hero image
<img src={productHero(product.imageUrl)} />
```

In development the original URL is returned unchanged; transformation is
applied automatically in production (Netlify hosting).

---

## 📝 Change Log & Reports

| Document | Description |
|---|---|
| [ROADMAP.md](./ROADMAP.md) | Planned features and priorities |
| [IMPLEMENTATION_ENHANCEMENTS_COMPLETE.md](./IMPLEMENTATION_ENHANCEMENTS_COMPLETE.md) | Completed enhancement notes |
| [PHASE_1.5_IMPLEMENTATION_REPORT.md](./PHASE_1.5_IMPLEMENTATION_REPORT.md) | Phase 1.5 implementation record |
| [FINAL_REPORT.md](./FINAL_REPORT.md) | Final project report |
