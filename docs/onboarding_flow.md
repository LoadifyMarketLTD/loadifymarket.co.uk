# Loadify Market — Seller Onboarding Flow

> ## HISTORICAL EVIDENCE — NOT CURRENT PRODUCT TRUTH
> **Original version:** March 2026. This document is retained because newer identity/onboarding contracts explicitly reference it as historical evidence. It must not be used to derive current routes, seller readiness, payout timing, verification policy, marketing claims or implementation behavior.  
> **Current authority:** `docs/identity-onboarding-workspaces-2026-08-21/README.md`, `docs/architecture/IDENTITY_ROLE_CAPABILITY_DECISION_2026-08-26.md`, current repository code, and current production evidence.  
> Historical claims below such as “thousands of UK buyers”, fixed weekly payouts, automatic approval criteria and fixed onboarding routes are **not approved current claims**.

**Version:** March 2026  
**Goal at the time:** Guide a new seller from landing page to first live product in ≤15 minutes  
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

**Historical estimated completion time:** 8–15 minutes (store live)  
**Historical drop-off concept:** Progress bar visible throughout; draft saving at every step

---

## Step 1 — Landing Page

**Historical URL concept:** `/sell` or `/become-a-seller`  
**Goal:** Convert visitor intent into registration click

### Historical content concept

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

**Historical social-proof example — not verified/current:**
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

**Historical URL:** `/register?role=seller`  
**Progress:** Step 1 of 8 — "Create your account"

### Historical form concept
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

### Historical post-registration concept
- Send verification email: *"Please verify your email to continue setting up your store"*
- Auto-redirect to verification prompt
- Resend option visible after 60 seconds

---

## Step 3 — Business Details (Verification)

**Historical URL:** `/seller/onboarding/business`  
**Progress:** Step 2 of 8 — "Tell us about your business"

### Historical form fields
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

### Historical verification wording — not current authority
```
ℹ  We review all seller applications within 1 working day.
   You can continue setting up your store while we review.
```

### Historical approval concept
- Email verified ✓
- All required fields complete ✓
- Business type selected ✓

### Historical manual-review concept
- Company number provided (Companies House check)
- VAT number provided (HMRC check)

---

## Step 4 — Stripe Connect (Payout Setup)

**Historical URL:** `/seller/onboarding/payouts`  
**Progress:** Step 3 of 8 — "Set up your payouts"

### Historical copy — payout timing is not current authority
```
Headline:     "Get paid weekly. Directly to your bank."
Subheadline:  "Loadify Market uses Stripe to process all payments.
               Your payouts are sent every Monday for the previous week's sales."
```

### Action concept
```
[ Connect with Stripe → ]
```

### Historical post-connect concept
- Stripe account ID stored in seller profile data
- Onboarding continues after successful setup
- Incomplete Stripe Connect setup remains a readiness issue

---

## Step 5 — Create Store

**Historical URL:** `/seller/onboarding/store`  
**Progress:** Step 4 of 8 — "Build your store"

### Historical form fields
```
Store Name         [text, max 60 chars — URL slug preview shown]
Store Tagline      [text, max 120 chars, optional]
Store Description  [textarea, max 500 chars]
Store Logo         [image upload — JPG/PNG/WEBP, max 2MB, min 400×400px]
Store Banner       [image upload — JPG/PNG/WEBP, max 5MB, min 1200×400px]
Store Category     [dropdown — same as business category, editable]
```

### Historical preview/validation concept
- Live store card preview updates in real time
- Store name uniqueness/slug validation

---

## Step 6 — Add First Product

**Historical URL:** `/seller/onboarding/first-product`  
**Progress:** Step 5 of 8 — "List your first product"

### Historical intro copy
```
"Buyers are ready. Let's list your first product.
 You can add more later — for now, let's get one live."
```

### Historical form fields
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

### Historical guidance examples — not evidence-backed claims
- Image quantity/sales-performance copy was illustrative and must not be reused without evidence.
- Description and pricing tips were design concepts only.

---

## Step 7 — Review & Publish

**Historical URL:** `/seller/onboarding/review`  
**Progress:** Step 6 of 8 — "Review and go live"

### Historical summary concept
- Store profile card
- First product listing card

### Historical checklist
```
✅  Email verified
✅  Business details submitted
✅  Stripe payouts connected (or readiness warning)
✅  Store created
✅  First product listed
✅  Seller agreement accepted
```

### Historical CTA
```
[ Publish My Store → ]
```

Current seller publication/readiness rules must be derived from the active capability/lifecycle, server, database, tax, compliance and payment boundaries instead of this historical checklist.

---

## Step 8 — Seller Dashboard

**Historical URL:** `/seller/dashboard`  
**Progress:** historical completion concept

### Historical onboarding banner concept
```
🎯 Complete your store to attract more buyers.

  [✓] Store created        [✓] First product listed
  [ ] Add 3 more products  [ ] Connect social media
  [ ] Get your first review

[ Complete your store → ]
```

### Historical dashboard-section concept
- Orders
- Products
- Payouts
- Reviews
- Analytics
- Support

Current Seller Space routes and capabilities are defined by current code and current authorization/readiness contracts.

---

## Historical drop-off recovery concepts

| Drop-off Point | Historical concept |
|---------------|--------------------|
| email not verified | reminder emails |
| business details incomplete | continue-application reminder |
| Stripe not connected | in-product readiness reminder |
| no products listed | listing reminder |
| unpublished | follow-up reminder |

These timings/templates are not current operational commitments unless verified in current runtime/configuration.

---

## Why this file remains

Newer identity/onboarding documentation explicitly names this file as **legacy evidence only**. It is therefore retained to preserve the historical audit trail, but no current implementation, marketing copy, payout policy or readiness decision should be based on it.
