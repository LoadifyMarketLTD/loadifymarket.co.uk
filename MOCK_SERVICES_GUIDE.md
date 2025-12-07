# Loadify Market - Mock Services Setup Guide

## Overview

This guide explains how to use the mock services when real API keys are not available. The mocks allow you to develop and test all features without connecting to live services.

## Mock Services Included

1. **Supabase Mock** - Database and authentication
2. **Stripe Mock** - Payment processing
3. **SendGrid Mock** - Email notifications

## How It Works

The application automatically detects missing API keys and switches to mock mode:

```
⚠️  Supabase credentials not found - using MOCK client for development
📝 To use real Supabase, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env
```

## Mock Supabase Features

### Authentication
- Sign up / Sign in with any email/password
- Returns mock user: `test@loadifymarket.co.uk`
- Session management works identically to real Supabase

### Database Operations
- All CRUD operations logged to console
- In-memory storage for testing
- Pre-populated with sample data (categories, products)

### Sample Data
```javascript
// Categories
- Electronics
- Pallets

// Products
- Electronics Pallet - Grade A (£1500, 10 in stock)
```

## Mock Stripe Features

### Checkout
```javascript
// Mock checkout always succeeds
const session = await mockStripe.createCheckoutSession(items, metadata);
// Returns: { id: 'cs_mock_...', url: '/checkout/success?session_id=...' }
```

### Refunds
```javascript
const refund = await mockStripe.createRefund(paymentIntentId, amount);
// Returns: { id: 're_mock_...', status: 'succeeded' }
```

### Stripe Connect (Seller Payouts)
```javascript
const account = await mockStripeConnect.createAccount(email);
// Returns: { id: 'acct_mock_...', charges_enabled: true }
```

## Mock SendGrid Features

### Email Sending
```javascript
await mockSendGrid.send({
  to: 'customer@example.com',
  subject: 'Order Confirmation',
  html: '<h1>Thank you!</h1>',
});
```

### Email Templates
- Order Confirmation
- Order Shipped
- Return Requested
- All emails logged to console for debugging

## Development Workflow

### 1. Fresh Setup (No API Keys)
```bash
npm install
npm run dev
```
✅ Everything works with mocks!

### 2. Testing Features
- Browse products ✅ (sample data)
- Add to cart ✅
- Checkout ✅ (mock payment)
- Track order ✅ (mock data)
- Request return ✅
- Open dispute ✅

### 3. Console Logging
All mock operations are logged:
```
[MOCK] Signing in with: test@loadifymarket.co.uk
[MOCK] SELECT from products ORDER BY createdAt
[MOCK STRIPE] Creating checkout session { items: [...], metadata: {...} }
[MOCK SENDGRID] Sending email { to: '...', subject: '...' }
```

## Transitioning to Production

### Step 1: Get Real API Keys

**Supabase**
1. Create project at https://supabase.com
2. Go to Settings → API
3. Copy:
   - Project URL
   - Anon/Public key
   - Service role key (for Netlify Functions)

**Stripe**
1. Create account at https://stripe.com
2. Get keys from Dashboard → Developers → API keys
3. Copy:
   - Publishable key (Test mode)
   - Secret key (Test mode)
   - Webhook signing secret (after setting up webhook)

**SendGrid**
1. Create account at https://sendgrid.com
2. Go to Settings → API Keys
3. Create new API key with Mail Send permissions

### Step 2: Update Environment Variables

Create `.env` file:
```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

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

### Step 3: Setup Database

1. Go to Supabase Dashboard → SQL Editor
2. Run `database-schema.sql`
3. Verify tables created:
   - users
   - products
   - orders
   - payments
   - shipments
   - returns
   - disputes
   - etc.

### Step 4: Setup Stripe Webhook

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Test locally:
   ```bash
   stripe listen --forward-to localhost:8888/.netlify/functions/stripe-webhook
   ```
3. For production, add webhook endpoint in Stripe Dashboard:
   ```
   https://loadifymarket.co.uk/.netlify/functions/stripe-webhook
   ```
4. Select events:
   - checkout.session.completed
   - payment_intent.succeeded
   - charge.refunded

### Step 5: Test with Real Services

```bash
# Clear browser cache/storage
# Restart dev server
npm run dev
```

You should see:
```
✅ Supabase connected successfully
✅ Using real Stripe API
```

### Step 6: Deploy to Production

```bash
# Set environment variables in Netlify
# Deploy
npm run build
netlify deploy --prod
```

## Mock vs Production Comparison

| Feature | Mock | Production |
|---------|------|------------|
| Auth | Instant, any email | Real email verification |
| Database | In-memory | PostgreSQL |
| Payments | Always succeed | Real transactions |
| Emails | Console logged | Actually sent |
| Performance | Instant | Network latency |
| Data | Sample data | Empty/real data |
| Webhooks | Simulated | Real events |

## Troubleshooting

### Mocks not working?
**Check console**: Look for `[MOCK]` prefixed logs

### Want to force mocks?
**Remove `.env` keys**: Delete Supabase/Stripe keys temporarily

### Data not persisting?
**Expected behavior**: Mocks use in-memory storage that resets on refresh

### Emails not visible?
**Check console**: All mock emails are logged there

## Testing Checklist

With mocks enabled, test:
- [ ] User registration
- [ ] User login
- [ ] Browse catalog
- [ ] View product details
- [ ] Add to cart
- [ ] Checkout process
- [ ] Order confirmation
- [ ] Track shipment
- [ ] Request return
- [ ] Open dispute
- [ ] Seller dashboard
- [ ] Admin dashboard
- [ ] Export reports

## Support

For questions or issues:
- Email: loadifymarket.co.uk@gmail.com
- Check console for detailed mock logs
- Review `src/lib/mocks/` for mock implementation

---

**Last Updated**: December 7, 2025
**Version**: 1.0.0
