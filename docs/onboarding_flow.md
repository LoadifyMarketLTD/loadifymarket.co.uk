# Loadify Market — Seller Onboarding Flow

**Version:** March 2026  
**Goal:** Guide a new seller from landing page to first live product in ≤15 minutes  
**Principle:** Progressive disclosure — never show all steps at once; celebrate each milestone

---

## Flow Overview

```
Step 1: Landing          →  Register / Sign In
Step 2: Create Account   →  Email verification
Step 3: Business Details →  Verification review
Step 4: Stripe Connect   →  Payout setup
Step 5: Create Store     →  Brand identity
Step 6: Add Products     →  First listing
Step 7: Publish          →  Go live
Step 8: Dashboard        →  Seller home
```

**Estimated completion time:** 8–15 minutes (store live)  
**Drop-off mitigation:** Progress bar visible throughout; draft saving at every step

---

## Step 1 — Landing Page

**URL:** `/sell` or `/become-a-seller`  
**Goal:** Convert visitor intent into registration click

### Content

**Headline:**
```
Reach Thousands of UK Buyers.
Start Selling Free.
```

**Subheadline:**
```
Join verified independent sellers on the UK's premium marketplace.
No monthly fees. No listing fees to start. Just sales.
```

**Three Benefits:**
```
✅  Verified seller badge — stand out from the crowd
💷  Weekly payouts via Stripe — fast, reliable payments
🇬🇧  UK-based seller support — real help when you need it
```

**Social Proof:**
```
"I listed my first product and had an order within 48 hours."
— Sarah T., Fashion Seller, Manchester

★★★★★  500+ active sellers  £1M+ in seller payouts
```

**CTA:**
```
[ Create Your Free Account → ]
```

---

## Step 2 — Create Account

**URL:** `/register?role=seller`  
**Progress:** Step 1 of 8 — "Create your account"

### Form Fields
```
First Name         [text input]
Last Name          [text input]
Email Address      [email input]
Password           [password input, show/hide toggle]
Confirm Password   [password input]

☑ I agree to Loadify Market's Terms & Conditions
☑ I agree to receive seller communications (optional)

[ Create Account → ]
```

### Post-Registration
- Send verification email: *"Please verify your email to continue setting up your store"*
- Auto-redirect to verification prompt
- Resend option visible after 60 seconds

---

## Step 3 — Business Details (Verification)

**URL:** `/seller/onboarding/business`  
**Progress:** Step 2 of 8 — "Tell us about your business"

### Form Fields
```
Business Type      [radio: Individual / Sole Trader / Limited Company / Partnership]
Business Name      [text — required for Ltd/Sole Trader]
Trading Name       [text — if different from above]
UK Address (Line 1) [text]
Address Line 2     [text, optional]
Town / City        [text]
Postcode           [text]
Country            [dropdown, default: United Kingdom]
VAT Number         [text, optional]
Company Number     [text, optional — for Ltd companies]
Phone Number       [tel input]
Business Category  [dropdown — primary product category]
```

### Verification Note
```
ℹ  We review all seller applications within 1 working day.
   You can continue setting up your store while we review.
```

### Automatic Approval Criteria
- Email verified ✓
- All required fields complete ✓
- Business type selected ✓

### Manual Review Triggers
- Company number provided (Companies House check)
- VAT number provided (HMRC check)

---

## Step 4 — Stripe Connect (Payout Setup)

**URL:** `/seller/onboarding/payouts`  
**Progress:** Step 3 of 8 — "Set up your payouts"

### Intro Copy
```
Headline:     "Get paid weekly. Directly to your bank."
Subheadline:  "Loadify Market uses Stripe to process all payments.
               Your payouts are sent every Monday for the previous week's sales."
```

### Action
```
[ Connect with Stripe → ]
```
*Redirects to Stripe Connect OAuth flow (hosted by Stripe)*

### Post-Connect
- Stripe account ID stored in `seller_profiles.stripe_account_id`
- Onboarding continues with success message: *"Payouts connected. You'll be paid every Monday."*
- If Stripe Connect incomplete: show "Complete Later" option — seller can still list but cannot receive payouts until connected

---

## Step 5 — Create Store

**URL:** `/seller/onboarding/store`  
**Progress:** Step 4 of 8 — "Build your store"

### Form Fields
```
Store Name         [text, max 60 chars — URL slug preview shown]
Store Tagline      [text, max 120 chars, optional]
Store Description  [textarea, max 500 chars]
Store Logo         [image upload — JPG/PNG/WEBP, max 2MB, min 400×400px]
Store Banner       [image upload — JPG/PNG/WEBP, max 5MB, min 1200×400px]
Store Category     [dropdown — same as business category, editable]
```

### Preview
Live store card preview updates in real time as fields are filled.

### Validation
- Store name: unique (checked against DB), no offensive terms
- Slug: auto-generated from store name, editable

---

## Step 6 — Add First Product

**URL:** `/seller/onboarding/first-product`  
**Progress:** Step 5 of 8 — "List your first product"

### Intro Copy
```
"Buyers are ready. Let's list your first product.
 You can add more later — for now, let's get one live."
```

### Form Fields
```
Product Title      [text, max 100 chars]
Category           [dropdown]
Subcategory        [dropdown, conditional on Category]
Description        [rich text editor, max 2000 chars]
Price              [number, £]
Stock Quantity     [number]
Condition          [radio: New / Used — Good / Used — Acceptable]
Images             [multi-upload, up to 8 images, max 5MB each]
Dispatch Time      [dropdown: Same day / 1 working day / 2 working days / 3–5 working days]
Shipping Cost      [number, £ — or toggle "Free UK Shipping"]
```

### Guidance Tips (contextual)
- Image tip: *"Products with 4+ images sell 3× faster"*
- Description tip: *"Mention condition, dimensions, and what's included"*
- Price tip: *"Check similar listings to stay competitive"*

---

## Step 7 — Review & Publish

**URL:** `/seller/onboarding/review`  
**Progress:** Step 6 of 8 — "Review and go live"

### Summary Display
Full preview of:
- Store profile card
- First product listing card

### Pre-publish Checklist
```
✅  Email verified
✅  Business details submitted
✅  Stripe payouts connected (or "⚠ Connect payouts to receive sales")
✅  Store created
✅  First product listed
✅  Seller agreement accepted
```

### Final CTA
```
[ Publish My Store → ]
```

### Post-Publish
- `seller_profiles.store_published = true`
- All products set to `active = true`
- Confirmation screen with celebration state:
  ```
  🎉 Your store is live!
  "Your products are now visible to thousands of UK buyers."
  [ View My Store ]   [ Go to Dashboard ]
  ```
- Welcome email sent: *"Your Loadify Market store is live — here's what to do next"*

---

## Step 8 — Seller Dashboard

**URL:** `/seller/dashboard`  
**Progress:** ✅ Complete — Onboarding badge shown for first 7 days

### Onboarding Completion Banner (first login)
```
🎯 Complete your store to attract more buyers.

  [✓] Store created        [✓] First product listed
  [ ] Add 3 more products  [ ] Connect social media
  [ ] Get your first review

[ Complete your store → ]
```

### Key Dashboard Sections
- **Orders** — pending, dispatched, delivered
- **Products** — manage listings, add new
- **Payouts** — Stripe balance, next payout date
- **Reviews** — buyer feedback
- **Analytics** — views, clicks, conversion rate
- **Support** — open a ticket, view knowledge base

---

## Drop-off Recovery

| Drop-off Point | Recovery Action |
|---------------|-----------------|
| Step 2 — email not verified | 3 reminder emails over 48 hours |
| Step 3 — business details incomplete | "Continue your application" email at 24h |
| Step 4 — Stripe not connected | In-dashboard banner until connected |
| Step 6 — no products listed | 48h email: "Your store is empty — add your first product" |
| Step 7 — unpublished | 72h email: "Your store isn't live yet" |

---

*See `homepage_copy.md` Section 7 for the seller acquisition copy on the homepage.*
