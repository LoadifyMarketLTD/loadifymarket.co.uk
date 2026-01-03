# 🚀 QUICK DEPLOYMENT GUIDE - Loadify Market

**Time Required:** 2.5 hours + 24 hours DNS wait  
**Status:** Site is 100% ready, only external services needed

---

## ✅ PRE-FLIGHT CHECK

Before starting, confirm:
- [x] Build passes: `npm run build` ✅ 4.34s
- [x] No errors: ESLint ✅ 0 errors
- [x] Secure: npm audit ✅ 0 vulnerabilities
- [x] Code ready: All features implemented ✅

---

## 📋 DEPLOYMENT CHECKLIST

### Step 1: Supabase (30 min) 🗄️

**Website:** https://supabase.com

1. [ ] Create free account
2. [ ] Create new project (name: loadify-market)
3. [ ] Go to SQL Editor
4. [ ] Run `database-complete.sql`
5. [ ] Run `database-seed-categories.sql`
6. [ ] Optional: Run `database-seed-testdata.sql` (for testing)
7. [ ] Go to Settings → API
8. [ ] Copy these values:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
9. [ ] Go to Storage → Create bucket: `proof-of-delivery` (public)
10. [ ] Go to Authentication → Providers → Enable Email

---

### Step 2: Stripe (45 min) 💳

**Website:** https://stripe.com

1. [ ] Create account (business details: Danny Courier LTD)
2. [ ] Switch to Test Mode (toggle in top right)
3. [ ] Go to Developers → API keys
4. [ ] Copy these values:
   ```
   Publishable key: pk_test_xxxxx
   Secret key: sk_test_xxxxx
   ```
5. [ ] Go to Connect → Get Started
6. [ ] Enable Connect (for seller payouts)
7. [ ] Go to Webhooks → Add endpoint
8. [ ] Endpoint URL: `https://loadifymarket.co.uk/.netlify/functions/stripe-webhook`
9. [ ] Select events:
   - [x] payment_intent.succeeded
   - [x] payment_intent.payment_failed
   - [x] checkout.session.completed
10. [ ] Copy Signing secret: `whsec_xxxxx`

**Note:** After deployment works in test mode, switch to Live mode and update keys.

---

### Step 3: SendGrid (20 min) 📧

**Website:** https://sendgrid.com

1. [ ] Create free account (100 emails/day)
2. [ ] Go to Settings → API Keys
3. [ ] Create API Key (Full Access)
4. [ ] Copy: `SG.xxxxx`
5. [ ] Go to Settings → Sender Authentication
6. [ ] Verify email: `loadifymarket.co.uk@gmail.com`
7. [ ] Go to Email API → Dynamic Templates
8. [ ] Create 3 templates:
   - **Template 1: Order Shipped**
     - Subject: "Your order {{orderNumber}} has shipped"
     - Body: Include tracking link
     - Copy Template ID: `d-xxxxx1`
   
   - **Template 2: Out for Delivery**
     - Subject: "Your order {{orderNumber}} is out for delivery"
     - Copy Template ID: `d-xxxxx2`
   
   - **Template 3: Delivered**
     - Subject: "Your order {{orderNumber}} has been delivered"
     - Copy Template ID: `d-xxxxx3`

**Tip:** Use SendGrid's template builder for nice HTML emails.

---

### Step 4: Netlify Deploy (15 min) 🌐

**Website:** https://netlify.com

1. [ ] Log in to Netlify
2. [ ] Click "Add new site" → "Import an existing project"
3. [ ] Choose "Deploy with GitHub"
4. [ ] Select repository: `LoadifyMarketLTD/loadifymarket.co.uk`
5. [ ] Branch: `copilot/check-site-functionality`
6. [ ] Build settings (auto-detected from netlify.toml):
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: `20`
7. [ ] Click "Show advanced" → "New variable"
8. [ ] Add ALL environment variables (see below)
9. [ ] Click "Deploy site"
10. [ ] Wait ~4 minutes for build
11. [ ] Click on site URL to verify it works!

---

### Step 5: Environment Variables (Copy-Paste Ready)

In Netlify Site settings → Environment variables → Add:

**Supabase:**
```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Stripe:**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**SendGrid:**
```
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_TEMPLATE_ID_SHIPPED=d-xxxxx1
SENDGRID_TEMPLATE_ID_OUT_FOR_DELIVERY=d-xxxxx2
SENDGRID_TEMPLATE_ID_DELIVERED=d-xxxxx3
```

**App Config (Already Correct):**
```
VITE_APP_URL=https://loadifymarket.co.uk
VITE_SUPPORT_EMAIL=loadifymarket.co.uk@gmail.com
VITE_COMPANY_NAME=Danny Courier LTD
VITE_COMPANY_ADDRESS=101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom
VITE_COMPANY_VAT=GB375949535
VITE_CURRENCY=GBP
VITE_CURRENCY_SYMBOL=£
VITE_COMMISSION_RATE=0.07
SUPABASE_BUCKET_NAME=proof-of-delivery
```

---

### Step 6: Domain Setup (10 min + 24h wait) 🌍

**In Netlify:**
1. [ ] Go to Domain settings
2. [ ] Click "Add custom domain"
3. [ ] Enter: `loadifymarket.co.uk`
4. [ ] Netlify shows DNS records needed

**At Your Domain Registrar:**
1. [ ] Log in to domain registrar (where you bought loadifymarket.co.uk)
2. [ ] Go to DNS settings
3. [ ] Add these records:
   ```
   Type    Name    Value
   A       @       75.2.60.5
   CNAME   www     [your-netlify-site].netlify.app
   ```
4. [ ] Save changes
5. [ ] Wait 24-48 hours for DNS propagation

**SSL (Automatic):**
- [ ] Netlify auto-provisions Let's Encrypt SSL (free)
- [ ] Site will be https://loadifymarket.co.uk

---

### Step 7: Post-Deployment Setup (30 min) ⚙️

**Create Admin Account:**
1. [ ] Go to your site: `https://[your-site].netlify.app`
2. [ ] Click "Register as Seller"
3. [ ] Fill in your details
4. [ ] Go to Supabase → Authentication → Users
5. [ ] Find your user
6. [ ] Click on user → Edit
7. [ ] Change `role` from `seller` to `admin`
8. [ ] Log out and log in again
9. [ ] You now have admin access at `/admin`

**Test Complete Flow:**
1. [ ] Register as buyer (new browser/incognito)
2. [ ] Register as seller (another incognito)
3. [ ] As admin: approve the seller
4. [ ] As seller: create test product
5. [ ] As admin: approve the product
6. [ ] As buyer: add to cart and checkout (use test card: 4242 4242 4242 4242)
7. [ ] Verify order appears in seller dashboard
8. [ ] Test tracking page
9. [ ] Test messages between buyer-seller

**Test Cards (Stripe Test Mode):**
- ✅ Success: `4242 4242 4242 4242`
- ❌ Decline: `4000 0000 0000 0002`
- Any future expiry date, any CVV

---

## 🎯 LAUNCH CHECKLIST

Before going LIVE with real payments:

**Security:**
- [ ] All test data removed from database
- [ ] Admin accounts secured with strong passwords
- [ ] Supabase RLS policies verified
- [ ] SSL certificate active (https://)
- [ ] Stripe webhook receiving events

**Content:**
- [ ] Add real product categories
- [ ] Update Terms & Conditions if needed
- [ ] Update Privacy Policy if needed
- [ ] Add company logo/branding

**Stripe Live Mode:**
- [ ] Switch Stripe to Live mode
- [ ] Copy Live API keys
- [ ] Update Netlify environment variables
- [ ] Test live transaction with small amount
- [ ] Verify payout to bank account works

**Go Live:**
- [ ] Announce on social media
- [ ] Send to initial sellers
- [ ] Monitor first transactions
- [ ] Check error logs in Netlify Functions

---

## 🆘 TROUBLESHOOTING

### Build fails on Netlify
- Check Node version is 20
- Check all env variables are set
- View build logs for specific error

### Can't login to site
- Check Supabase is running
- Verify VITE_SUPABASE_URL is correct
- Check Supabase Auth is enabled

### Stripe checkout doesn't work
- Verify publishable key in browser console
- Check webhook is receiving events
- Verify webhook secret is correct

### Emails not sending
- Check SendGrid API key
- Verify sender email is verified
- Check template IDs are correct
- View Netlify function logs

### Database errors
- Check service role key is correct
- Verify RLS policies in Supabase
- Check tables exist (run SQL files)

---

## 📞 NEED HELP?

**Documentation:**
- Read: `SITE_VERIFICATION_REPORT.md` (English - detailed)
- Read: `VERIFICARE_FINALA_RO.md` (Romanian - summary)
- Read: `COMPLETE_SETUP_GUIDE.md` (full setup guide)

**Support:**
- Email: loadifymarket.co.uk@gmail.com
- Check Netlify build logs
- Check Supabase logs
- Check browser console for errors

---

## ✅ SUCCESS CRITERIA

Your site is live when:
- [ ] Site loads at https://loadifymarket.co.uk
- [ ] You can register and login
- [ ] You can create products
- [ ] You can checkout (test mode)
- [ ] You receive order emails
- [ ] Admin panel works
- [ ] SSL certificate shows (green padlock)

---

## 🎉 CONGRATULATIONS!

Once all steps are complete, your marketplace is LIVE! 🚀

**What you have:**
- ✅ Full B2B & B2C marketplace
- ✅ Buyer, seller, and admin features
- ✅ Secure payments with Stripe
- ✅ Email notifications
- ✅ Order tracking
- ✅ Professional design

**Next steps:**
1. Add your products
2. Invite sellers
3. Market your platform
4. Process orders
5. Grow! 📈

---

**Created:** January 3, 2026  
**Version:** 1.0  
**Estimated Time:** 2.5 hours + 24h DNS
