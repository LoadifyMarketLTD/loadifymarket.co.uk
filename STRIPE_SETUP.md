# Stripe Configuration Guide

This guide covers all Stripe environment variables required by Loadify Market, including Stripe Connect for automatic seller payouts.

---

## Required Environment Variables

| Variable | Source | Example |
|---|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → API Keys | `pk_live_51…` |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → API Keys | `sk_live_51…` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks (standard endpoint) | `whsec_…` |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Stripe Dashboard → Connect → Webhooks | `whsec_…` |

> ⚠️ **Always use Live keys** (`pk_live_` / `sk_live_`) in production. Test keys begin with `pk_test_` / `sk_test_`.

---

## Step 1 — Get API Keys

1. Go to **https://dashboard.stripe.com/apikeys**
2. Make sure you are in **Live mode** (toggle in the top-left)
3. Copy:
   - **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (click "Reveal live key") → `STRIPE_SECRET_KEY`

---

## Step 2 — Standard Checkout Webhook

Required so that orders are saved to the database after payment.

1. Go to **https://dashboard.stripe.com/webhooks**
2. Click **"Add endpoint"**
3. Set the endpoint URL:
   ```
   https://loadifymarket.co.uk/.netlify/functions/stripe-webhook
   ```
4. Select **exactly** these events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click **"Add endpoint"**
6. On the webhook page, click **"Reveal signing secret"** → copy the `whsec_…` value → `STRIPE_WEBHOOK_SECRET`

---

## Step 3 — Stripe Connect Webhook

Required for seller onboarding status updates (`account.updated` events).

1. Go to **https://dashboard.stripe.com/connect/webhooks** (Connect → Webhooks, *not* the standard Webhooks page)
2. Click **"Add endpoint"**
3. Set the endpoint URL (same URL as above):
   ```
   https://loadifymarket.co.uk/.netlify/functions/stripe-webhook
   ```
4. Select this event:
   - `account.updated`
5. Click **"Add endpoint"**
6. Click **"Reveal signing secret"** → copy the `whsec_…` value → `STRIPE_CONNECT_WEBHOOK_SECRET`

> **Note:** One endpoint URL handles both webhooks. The handler automatically tries both signing secrets.

---

## Step 4 — Set Variables in Netlify

1. Go to **https://app.netlify.com** → your `loadifymarket.co.uk` site
2. **Site configuration → Environment variables → Add variable**
3. Add all four variables:

```
VITE_STRIPE_PUBLISHABLE_KEY      = pk_live_51…
STRIPE_SECRET_KEY                = sk_live_51…
STRIPE_WEBHOOK_SECRET            = whsec_…   (standard webhook)
STRIPE_CONNECT_WEBHOOK_SECRET    = whsec_…   (Connect webhook)
```

4. Click **"Save"**
5. Go to **Deploys → Trigger deploy → Deploy site** — environment variable changes only take effect after a redeploy

---

## Step 5 — Verify

### Health check:
Visit `https://loadifymarket.co.uk/.netlify/functions/health` → should return `{ "status": "ok" }`

### Admin Connect status:
Log in as admin → Admin Dashboard → **Payouts tab** → a green "Stripe Connect: Active" banner confirms the platform account is correctly configured.

### Test webhook:
1. Go to Stripe Dashboard → **Developers → Webhooks** → your endpoint
2. Click **"Send test event"** → select `checkout.session.completed`
3. Response should be `200 OK`

---

## How the Payment Flow Works

```
Buyer adds items to cart
        ↓
Buyer clicks "Proceed to Payment"
        ↓
[NETLIFY] create-checkout
  → Creates Stripe Checkout Session
  → Assigns transfer_group for Connect compliance
        ↓
Stripe Hosted Checkout Page (buyer enters card details)
        ↓
Buyer completes payment
        ↓
Stripe sends webhook → [NETLIFY] stripe-webhook
  → Creates order(s) in database (one per seller)
  → Decrements stock
  → For each seller with active Connect account:
      Creates Transfer(seller amount - 7% commission) → seller's Stripe account
  → Sends confirmation emails
        ↓
Buyer redirected to /orders/success
```

---

## Stripe Connect — Seller Onboarding

Sellers connect their Stripe accounts via **Seller Dashboard → Payouts tab**:

1. Seller clicks "Connect Stripe Account"
2. Platform creates a Stripe Express account for the seller
3. Seller completes Stripe's hosted onboarding form
4. Stripe redirects seller back to the dashboard
5. Once `charges_enabled` and `payouts_enabled` are both `true`, the seller's status becomes **Active** and automatic transfers begin

**Payout schedule:** Weekly, every Friday (configured at account creation time).

---

## What Happens If a Key Is Missing

| Missing variable | Effect |
|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe.js fails to initialise — checkout button does nothing |
| `STRIPE_SECRET_KEY` | `create-checkout` returns 500 — buyer sees "Failed to proceed to checkout" |
| `STRIPE_WEBHOOK_SECRET` | Webhook returns 501 — orders are NOT saved after payment |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | `account.updated` events fail signature check — seller onboarding status is not auto-updated |

---

## Security Notes

- **Never commit `STRIPE_SECRET_KEY` to source code.** It must remain in Netlify environment variables only.
- `VITE_STRIPE_PUBLISHABLE_KEY` is safe to expose publicly — it only creates payment sessions on the client side.
- All Stripe API calls are made from Netlify Functions (server side), never from the browser.

