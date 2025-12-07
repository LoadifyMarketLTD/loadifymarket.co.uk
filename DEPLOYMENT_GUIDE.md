# Loadify Market - Complete Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Overview](#project-overview)
3. [Local Development](#local-development)
4. [Production Deployment](#production-deployment)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- ✅ GitHub account (for repository)
- ✅ Netlify account (for hosting)
- ✅ Supabase account (for database & auth)
- ✅ Stripe account (for payments)
- ✅ SendGrid account (for emails)

### Required Tools
- Node.js 20+ installed
- npm or yarn
- Git

## Project Overview

**Loadify Market** is a complete B2B/B2C marketplace with:
- 9 modules fully implemented
- Mock services for development
- Production-ready architecture
- SEO optimized
- Performance optimized

### Tech Stack
- Frontend: React 19 + TypeScript + Vite
- Styling: Tailwind CSS
- State: Zustand
- Backend: Supabase (PostgreSQL + Auth)
- Payments: Stripe
- Email: SendGrid
- Hosting: Netlify
- Functions: Netlify Serverless

## Local Development

### Step 1: Clone Repository

```bash
git clone https://github.com/LoadifyMarketLTD/loadifymarket.co.uk.git
cd loadifymarket.co.uk
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Development with Mocks

**No API keys needed!** Just start the dev server:

```bash
npm run dev
```

The app will run on `http://localhost:5173` with all features working via mock services.

See [MOCK_SERVICES_GUIDE.md](./MOCK_SERVICES_GUIDE.md) for details.

### Step 4: Development with Real Services

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys (see Setup Services section below).

Start dev server:

```bash
npm run dev
```

## Production Deployment

### Phase 1: Setup Services

#### A. Supabase Setup

1. **Create Project**
   - Go to https://supabase.com
   - Click "New Project"
   - Name: `loadifymarket-prod`
   - Region: Choose closest to UK (e.g., London)
   - Database Password: (save this!)

2. **Run Database Schema**
   - Go to SQL Editor
   - Copy content from `database-schema.sql`
   - Execute
   - Verify tables created (users, products, orders, etc.)

3. **Enable RLS (Row Level Security)**
   - Already configured in schema
   - Go to Database → Policies to verify

4. **Get API Keys**
   - Go to Settings → API
   - Copy:
     - Project URL
     - Anon/Public key
     - Service role key

5. **Configure Auth**
   - Go to Authentication → Providers
   - Enable Email provider
   - Configure email templates (optional)

#### B. Stripe Setup

1. **Create Account**
   - Go to https://stripe.com
   - Complete registration
   - Activate account

2. **Get API Keys (Test Mode)**
   - Dashboard → Developers → API keys
   - Copy:
     - Publishable key (pk_test_...)
     - Secret key (sk_test_...)

3. **Setup Webhook (After Netlify Deploy)**
   ```
   Endpoint: https://loadifymarket.co.uk/.netlify/functions/stripe-webhook
   Events: checkout.session.completed, payment_intent.succeeded, charge.refunded
   ```
   - Copy webhook signing secret (whsec_...)

4. **Enable Stripe Connect (for seller payouts)**
   - Go to Connect → Settings
   - Enable Express accounts
   - Configure branding

#### C. SendGrid Setup

1. **Create Account**
   - Go to https://sendgrid.com
   - Sign up for free tier (100 emails/day)

2. **Verify Sender Identity**
   - Settings → Sender Authentication
   - Single Sender Verification
   - Verify: loadifymarket.co.uk@gmail.com

3. **Create API Key**
   - Settings → API Keys
   - Create API Key
   - Full Access → Mail Send permissions
   - Copy key (SG....)

### Phase 2: Netlify Deployment

#### A. Connect Repository

1. **Import Project**
   - Go to https://netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect to GitHub
   - Select: LoadifyMarketLTD/loadifymarket.co.uk
   - Branch: main (or your preferred branch)

2. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Deploy**
   - Click "Deploy site"
   - Wait for initial deployment
   - Note: Will fail without env vars - that's OK!

#### B. Configure Environment Variables

1. **Go to Site Settings → Environment Variables**

2. **Add All Variables**:

```
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (add after webhook setup)

# SendGrid
SENDGRID_API_KEY=SG....

# App
VITE_APP_URL=https://loadifymarket.co.uk
VITE_SUPPORT_EMAIL=loadifymarket.co.uk@gmail.com

# Company
VITE_COMPANY_NAME=Danny Courier LTD
VITE_COMPANY_ADDRESS=101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom
VITE_COMPANY_VAT=GB375949535
VITE_CURRENCY=GBP
VITE_CURRENCY_SYMBOL=£

# Marketplace
VITE_COMMISSION_RATE=0.07
```

3. **Redeploy**
   - Deploys → Trigger deploy
   - Wait for successful deployment

#### C. Custom Domain

1. **Add Domain**
   - Domain settings → Add custom domain
   - Add: loadifymarket.co.uk

2. **Configure DNS**
   - Add CNAME record:
     ```
     CNAME @ <your-site-name>.netlify.app
     ```
   - Or use Netlify nameservers

3. **Enable HTTPS**
   - Automatically enabled with Let's Encrypt
   - Wait for certificate provisioning (can take 24h)

#### D. Configure Netlify Functions

Already configured in `netlify.toml`:
- create-checkout
- stripe-webhook
- generate-invoice
- send-email

No additional setup needed!

### Phase 3: Final Configuration

#### A. Update Stripe Webhook

1. **Go to Stripe Dashboard → Developers → Webhooks**
2. **Add endpoint**:
   ```
   URL: https://loadifymarket.co.uk/.netlify/functions/stripe-webhook
   Events: 
   - checkout.session.completed
   - payment_intent.succeeded
   - charge.refunded
   ```
3. **Get signing secret** and add to Netlify env vars:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
4. **Redeploy Netlify** to apply new env var

#### B. Test Webhook

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Test webhook
stripe trigger checkout.session.completed
```

Check Netlify Functions logs for successful processing.

## Post-Deployment

### 1. Create Admin User

```sql
-- Run in Supabase SQL Editor
INSERT INTO users (id, email, role, first_name, last_name, is_active, is_email_verified)
VALUES (
  'your-user-id-from-auth',
  'admin@loadifymarket.co.uk',
  'admin',
  'Admin',
  'User',
  true,
  true
);
```

### 2. Add Sample Categories

```sql
INSERT INTO categories (name, slug, description, "order")
VALUES
  ('Electronics', 'electronics', 'Electronic devices and accessories', 1),
  ('Pallets', 'pallets', 'Product pallets and bulk lots', 2),
  ('Clearance', 'clearance', 'Clearance items and liquidation stock', 3),
  ('Wholesale', 'wholesale', 'Wholesale products', 4);
```

### 3. Test Complete Flow

1. ✅ Visit https://loadifymarket.co.uk
2. ✅ Register as buyer
3. ✅ Register as seller
4. ✅ Create product (as seller)
5. ✅ Approve product (as admin)
6. ✅ Browse catalog
7. ✅ Add to cart
8. ✅ Complete checkout (use Stripe test card: 4242 4242 4242 4242)
9. ✅ Check email received
10. ✅ Track order
11. ✅ Request return
12. ✅ Open dispute

### 4. Enable Production Mode

**Once everything works in test mode:**

1. **Switch Stripe to Live Mode**
   - Get live API keys
   - Update Netlify env vars
   - Redeploy

2. **Update Webhook to Live**
   - Create new webhook with live keys
   - Update signing secret

### 5. Monitoring

**Netlify Analytics**
- Site → Analytics → Enable

**Supabase Logs**
- Dashboard → Logs → Monitor queries

**Stripe Dashboard**
- Monitor payments, disputes, refunds

**SendGrid Dashboard**
- Monitor email delivery rates

## Troubleshooting

### Build Fails

**Error**: `npm ERR! code ELIFECYCLE`
```bash
# Locally
npm install
npm run build

# Check for errors
```

### Functions Not Working

**Check**: Netlify Functions logs
```
Site → Functions → View logs
```

**Common issues**:
- Missing environment variables
- Wrong function path
- Timeout (increase in netlify.toml)

### Database Connection Fails

**Check**:
- VITE_SUPABASE_URL is correct
- VITE_SUPABASE_ANON_KEY is correct
- Project is not paused (Supabase free tier)

### Stripe Webhook Not Firing

**Check**:
- Webhook URL is correct
- Events are selected
- Signing secret matches env var
- Check Stripe Dashboard → Webhooks → Events

### Emails Not Sending

**Check**:
- SendGrid API key is valid
- Sender email is verified
- Check SendGrid Activity Feed
- Not hitting rate limits

### Page Not Found (404)

**Check**:
- `netlify.toml` has SPA redirect
- Deploy succeeded
- Clear browser cache

## Going Live Checklist

- [ ] All environment variables set
- [ ] Database schema deployed
- [ ] Stripe in live mode
- [ ] Stripe webhook working
- [ ] SendGrid sender verified
- [ ] Custom domain configured
- [ ] HTTPS enabled
- [ ] Admin user created
- [ ] Sample categories added
- [ ] Test order completed successfully
- [ ] Emails delivering
- [ ] Tracking working
- [ ] Returns working
- [ ] Disputes working
- [ ] Admin dashboard accessible
- [ ] Export functionality tested
- [ ] Mobile responsive verified
- [ ] SEO tags verified
- [ ] sitemap.xml accessible
- [ ] robots.txt accessible
- [ ] Legal pages reviewed
- [ ] Cookie banner working
- [ ] GDPR compliance verified

## Support

- **Email**: loadifymarket.co.uk@gmail.com
- **Documentation**: Check all MD files in repository
- **Issues**: Create GitHub issue

---

**Deployment Date**: December 7, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
