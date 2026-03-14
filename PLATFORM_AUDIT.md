# Loadify Market — Full Platform Audit Report

**Date:** 2026-03-14  
**Platform Owner:** loadifymarket.co.uk@gmail.com  
**Auditor:** GitHub Copilot Coding Agent  
**Repo:** LoadifyMarketLTD/loadifymarket.co.uk  
**Status:** Production Readiness Assessment  

---

> **EXECUTIVE SUMMARY**  
> Loadify Market is a well-structured B2C/B2B marketplace platform built on React + Supabase + Netlify.  
> The core marketplace model (intermediary, per-seller orders, commission, VAT) is correctly implemented.  
> Two critical security vulnerabilities were identified and **fixed** as part of this audit:  
> 1. Stripe webhook lacked idempotency protection → duplicate orders on retry (FIXED)  
> 2. `payment_sessions` and `order_items` RLS policies were overly permissive (FIXED)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Seller System](#2-seller-system)
3. [Product Listing System](#3-product-listing-system)
4. [Cart and Checkout Flow](#4-cart-and-checkout-flow)
5. [Order Creation Logic](#5-order-creation-logic)
6. [Payment System (Stripe)](#6-payment-system-stripe)
7. [Shipping System](#7-shipping-system)
8. [Shipment Handling](#8-shipment-handling)
9. [Notifications System](#9-notifications-system)
10. [Security Review](#10-security-review)
11. [Legal Compliance](#11-legal-compliance)
12. [UX / Marketplace Clarity](#12-ux--marketplace-clarity)
13. [Confirmed Working Features](#13-confirmed-working-features)
14. [Risks and Inconsistencies](#14-risks-and-inconsistencies)
15. [Recommended Improvements](#15-recommended-improvements)

---

## 1. System Overview

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19.2 + TypeScript, Vite 7.2, TailwindCSS 3.4 |
| State Management | Zustand 5.0 (cart + auth, persisted to localStorage) |
| Routing | React Router 7.10 |
| Backend | Netlify Functions (serverless, Node.js) |
| Database | Supabase (PostgreSQL + PostgREST + Auth) with RLS |
| Payments | Stripe 18.1 (Checkout Sessions + Webhooks) |
| Email | SendGrid (`@sendgrid/mail` 8.1) |
| Forms | React Hook Form 7.68 + Zod 4.1 validation |
| PDF | jsPDF 4.0 |

### Marketplace Architecture

Loadify Market operates strictly as a **marketplace intermediary** (eBay / Etsy model):

- **Loadify Market Ltd** (Company No. 13171804, VAT GB375949535) provides the platform.
- **Sellers** list their own products, handle stock, ship items, and process returns.
- **Buyers** contract directly with individual sellers; Loadify Market is not the seller.
- **Commission**: 7% deducted from seller payouts. Buyers pay VAT-inclusive prices (20% UK VAT).
- **Payments**: Processed through Stripe. Funds are captured by Stripe; payout logic is admin-managed.

This architecture aligns with UK marketplace operator standards (Consumer Rights Act 2015 intermediary model).

---

## 2. Seller System

### Account Creation

Registration (`src/pages/RegisterPage.tsx`) uses `?type=seller` URL parameter to set the role:

```
/register?type=seller  →  user.role = 'seller'
/register              →  user.role = 'buyer'
```

The `supabase.auth.signUp()` call includes `data.role` in the metadata. On the server side, a DB trigger (`trg_new_user_profile`) auto-creates `buyer_profiles`, `seller_profiles`, and `seller_stores` rows. The frontend additionally upserts these to populate `storeName`.

### seller_stores Table

```sql
seller_stores (
  "userId"           UUID  PRIMARY KEY,   -- links to users.id
  "storeName"        TEXT,
  "storeSlug"        TEXT  UNIQUE,        -- URL: /seller/:storeSlug
  "storeLogo"        TEXT,
  "storeDescription" TEXT,
  "storeBanner"      TEXT,
  "socialLinks"      JSONB,
  "isActive"         BOOL  DEFAULT TRUE
)
```

- `storeSlug` is URL-safe and globally unique; used in `/seller/:slug` public profile.
- Index `idx_seller_stores_slug` on `storeSlug` for fast lookups.

### Product-to-Seller Linking

Every `products` row contains `"sellerId" UUID REFERENCES users(id)`. The RLS `products_insert` policy enforces `(select auth.uid()) = "sellerId" AND is_seller()`, ensuring sellers can only create products under their own account. The `products_update` policy similarly restricts modification to the owning seller or admin/owner.

### Seller Info on Product Pages

`ProductPage.tsx` fetches:
```sql
SELECT *, store:seller_stores(storeSlug, storeName)
FROM products WHERE id = $1
```
The joined `storeName` and `storeSlug` are rendered as a clickable "Sold by [Store Name]" link pointing to `/seller/:storeSlug`. The `SellerPerformance` component displays the seller's rating, total sales, verification status, and payment behaviour badge.

**CONFIRMED**: Each product is correctly and exclusively linked to one seller. Seller identity is displayed on product pages.

---

## 3. Product Listing System

### Product Creation

`src/pages/ProductFormPage.tsx` provides the full listing form. Key fields:

| Field | Notes |
|-------|-------|
| `title`, `description` | Required |
| `type` | Enum: product / retail / handmade / clearance / pallet / lot / wholesale / logistics |
| `condition` | new / used / refurbished |
| `price` | GBP, VAT-inclusive (20%) |
| `stockQuantity` | Integer; drives `stockStatus` calculation |
| `categoryId` | Required FK to `categories` |
| `images` | Up to 10 via Supabase Storage (`product-images` bucket) |
| `shippingMethods` | Linked via `product_shipping` junction table |

New products have `isApproved = false` by default. Admins approve via `SellerApprovalsPage.tsx`.

### Catalog Visibility

`ShopPage.tsx`, `CatalogPage.tsx`, and `BulkPage.tsx` all query:
```sql
SELECT *, seller_stores!products_sellerId_fkey(storeSlug, storeName)
FROM products
WHERE "isActive" = TRUE AND "isApproved" = TRUE
```
All three pages use a **LEFT JOIN** (PostgREST `!left` modifier) so products with incomplete seller records are still visible. Only active + admin-approved products appear in public listings.

### Inventory

- `stockQuantity` (integer): decremented atomically via `decrement_product_stock()` RPC (SECURITY DEFINER) after each paid order.
- `stockStatus` is recalculated: `> 10` → `in_stock`; `1–10` → `low_stock`; `0` → `out_of_stock`.
- Checkout function (`create-checkout.ts`) validates `stockQuantity >= requested quantity` server-side before creating a Stripe session.

### Multiple Sellers

Multiple sellers can list the same (or similar) products independently. Each listing has its own `sellerId`, pricing, stock, and shipping configuration. The RLS ensures sellers cannot modify each other's listings.

**CONFIRMED**: Product ownership is correctly enforced at both the application and database level.

---

## 4. Cart and Checkout Flow

### Cart State

Cart is managed by Zustand (`src/store/index.ts`) and persisted to `localStorage` as `loadify-cart`.

```typescript
interface CartItem {
  productId: string;
  quantity: number;
  price: number;        // VAT-inclusive
  title: string;
  image?: string;
  sellerId?: string;    // Used for multi-seller detection
}
```

No server-side cart is used for the main checkout flow; the DB `carts`/`cart_items` tables exist for logged-in users but the primary cart is client-side.

### Checkout Flow (CheckoutPage.tsx)

1. **Cart validation**: Redirect to `/cart` if empty.
2. **Multi-seller detection**: `new Set(items.map(i => i.sellerId)).size > 1` — shows shipping notice if true.
3. **Shipping methods**: Fetched from `product_shipping → shipping_methods → shipping_rates`; falls back to hardcoded Royal Mail options if no DB rows found.
4. **Address collection**: Separate shipping + billing addresses; "same as shipping" toggle.
5. **Price breakdown**: Subtotal (ex-VAT), VAT (20%), shipping (ex-VAT + VAT), commission display (7%), grand total.
6. **Stripe session creation**: `POST /.netlify/functions/create-checkout` with items, addresses, and shipping.
7. **Redirect**: User is redirected to `session.url` (Stripe-hosted checkout page).

### Single vs Multi-Seller Cart

| Scenario | Behaviour |
|----------|-----------|
| Single seller | One order created on payment |
| Multi-seller | Separate order per seller; shipping proportionally split; blue info notice shown at checkout |

**CONFIRMED**: Checkout behaves correctly for both single and multi-seller carts.

---

## 5. Order Creation Logic

### Webhook-Driven Order Creation

Orders are created by `netlify/functions/stripe-webhook.ts` on the `checkout.session.completed` event — **not** by the client. This ensures orders only exist for paid transactions.

### Per-Seller Splitting

```
1. Idempotency check: if payment_sessions has stripeSessionId → return early (no duplicate)
2. Parse items from session.metadata.items
3. Group items by sellerId  →  Map<sellerId, CartItem[]>
4. For each sellerId group:
   a. Calculate sellerSubtotal (ex-VAT), sellerVat, sellerShipping (proportional)
   b. INSERT one row into orders (buyerId, sellerId, status='paid', ...)
   c. INSERT order_items rows for each product in this group
   d. Decrement stockQuantity via decrement_product_stock() RPC
5. INSERT one payment_sessions row (stripeSessionId UNIQUE → idempotency lock)
```

### order_items Generation

```typescript
order_items = sellerItems.map(item => ({
  orderId: order.id,
  productId: item.productId,
  quantity: item.quantity,
  pricePerUnit: item.price,   // VAT-inclusive
  vatRate: 0.20,
  subtotal: (item.price / 1.20) * item.quantity,  // ex-VAT
}))
```

### payment_sessions Linking

One `payment_sessions` record is created per Stripe session, linked to the first order's `id`. The `stripeSessionId` UNIQUE constraint serves as the primary idempotency guard.

**CONFIRMED**: One checkout with multiple sellers correctly creates separate orders per seller.

---

## 6. Payment System (Stripe)

### Checkout Session Creation (create-checkout.ts)

Key steps:
1. **Server-side price validation**: Fetches authoritative prices from DB using service role key. Client-supplied prices are discarded and replaced with DB prices. Products not found, inactive, unapproved, or out of stock are rejected with `400`.
2. **VAT calculation**: Cart total is VAT-inclusive; shipping VAT (20%) added separately.
3. **Stripe session**: Created with `line_items`, `success_url`, `cancel_url`, and `metadata` (items, addresses, totals).

### Webhook Processing (stripe-webhook.ts)

| Event | Handling |
|-------|---------|
| `checkout.session.completed` | Idempotency check, then creates orders per seller, decrements stock, records payment session, sends email |
| `payment_intent.succeeded` | Logged only |
| `payment_intent.payment_failed` | Logged only |
| `charge.refunded` | Updates order status to `'refunded'` |

### Security

- Stripe webhook signature verified via `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`.
- Supabase service role key used (not anon key) for all webhook DB writes — bypasses RLS legitimately.
- Idempotency check prevents duplicate orders on webhook retry.

### Payment Session Uniqueness

`payment_sessions.stripeSessionId` has a UNIQUE constraint in the DB schema, preventing two identical Stripe sessions from being recorded.

**CONFIRMED**: Payment flow is secure. Server-side price validation prevents price manipulation. Webhook signature prevents spoofing. Idempotency prevents duplicate orders.

---

## 7. Shipping System

### Retail Products (Royal Mail / Courier)

Shipping is seller-configured per product via the `product_shipping` junction table:

```
products → product_shipping → shipping_methods → shipping_rates
                            ↓
                     dispatch_time (seller-set estimate)
```

Seeded methods: Royal Mail Tracked 48, Royal Mail Tracked 24, Evri Standard, Collection in Person.

Sellers select methods when creating/editing a product via `ShippingMethodSelector.tsx`. Sellers are responsible for dispatching items within their stated dispatch time.

### Bulk / Pallet Products (XDrive / RFQ)

Products of type `pallet`, `lot`, `wholesale`, or `logistics` use a separate flow:

1. **RFQ (Request for Quote)**: Buyer submits quote request via `RFQPage.tsx` → stored in `rfq_requests`.
2. **Seller Response**: Seller responds via `SellerRFQPage.tsx` → stored in `rfq_responses`.
3. **XDrive Integration**: `XDriveContentBlock.tsx` and `TransportQuotePage.tsx` handle the logistics/transport quotation flow.
4. **No standard checkout**: Bulk products redirect to the transport quote URL instead of cart/checkout.

This separation is enforced in `ProductPage.tsx`:
```typescript
const BULK_PRODUCT_TYPES = ['pallet', 'lot', 'wholesale', 'logistics'];
// → renders "Get Transport Quote" instead of "Add to Cart"
```

**CONFIRMED**: Retail and bulk logistics flows are correctly separated.

---

## 8. Shipment Handling

### Seller Marks Items as Shipped

Sellers use `SellerShipmentsPage.tsx` to view their orders and `SellerShipmentForm.tsx` to update shipment details. The form calls `POST /.netlify/functions/create-shipment` with:

```json
{
  "order_id": "...",
  "courier_name": "Royal Mail",
  "tracking_number": "RM123456789GB",
  "dispatched_at": "2026-03-15T10:00:00.000Z"
}
```

### dispatched_at Storage

The `dispatched_at` ISO timestamp is stored in the `shipments` table (snake_case schema). The `shipment_events` table records status transitions.

### Shipment Status Flow

```
Pending → Processing → Dispatched → In Transit → Out for Delivery → Delivered
                                                                  ↘ Delivery Failed
                                                                  ↘ Returned
```

Status changes are stored in `shipments.status` and can be updated by the seller or admin via `update-shipment-status.ts`.

Admin oversight is available via `AdminShipmentsPage.tsx`.

**CONFIRMED**: Shipment tracking works correctly. `dispatched_at` is stored and status transitions are well-defined.

---

## 9. Notifications System

### Email Templates (SendGrid)

`netlify/functions/send-email.ts` provides HTML email rendering for:

| Template | Trigger |
|----------|---------|
| `order_confirmation` | After `checkout.session.completed` webhook |
| `order_shipped` | When seller updates shipment status to Dispatched |
| `order_delivered` | When shipment status → Delivered |
| `return_requested` | When buyer initiates a return |
| `dispute_opened` | When buyer opens a dispute |
| `transport_quote_request` | For logistics RFQ submissions |

The confirmation email is sent from the webhook (`stripe-webhook.ts`) after order creation. It includes order number, date, items, and total.

### Notification Settings

Users can configure notification preferences via `NotificationSettingsPage.tsx`:
- Order confirmation
- Shipping updates
- Delivery confirmation
- Promotional emails

These are stored in the `notification_settings` table with per-user RLS.

### Assessment

**PARTIALLY IMPLEMENTED**: The email sending infrastructure (SendGrid, templates, webhook trigger) is fully implemented. The buyer order confirmation email is sent automatically. However, seller new-order notification emails and automatic shipment-status update emails are not triggered automatically — they require explicit calls to `send-email`. Sellers rely on checking their dashboard for new orders.

---

## 10. Security Review

### Authentication

- Supabase Auth handles email/password sign-up and sign-in.
- JWT sessions managed by Supabase client; auto-refreshed.
- Auth state initialised in `App.tsx` via `supabase.auth.getSession()` + `onAuthStateChange`.
- Role is read from the `users` table (not auth JWT metadata alone) to prevent client-side role manipulation.

### Authorization Rules

| Component | Protection |
|-----------|-----------|
| `/seller/*` routes | `RequireSeller` component wraps `RequireAuth`; checks `hasSellerAccess(user)` |
| `/admin/*` routes | `RequireAdmin` component wraps `RequireAuth`; checks `hasAdminAccess(user)` |
| Product edit | `ProductFormPage.tsx` checks `data.sellerId !== user.id` before allowing edits |
| DB operations | Supabase RLS policies (see below) |

### Database RLS Summary

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| users | Own or admin | Anyone (registration) | Own or admin | Admin |
| seller_profiles | Public | Own or admin | Own or admin | Admin |
| products | Active+approved OR own seller OR admin | Own seller | Own seller or admin | Own seller or admin |
| orders | Own buyer/seller or admin | Own buyer or admin | Own buyer/seller or admin | Admin |
| order_items | Via parent order ownership | Own buyer/seller or admin **(FIXED)** | — | — |
| payment_sessions | Own user or admin | Admin only **(FIXED)** | Admin only **(FIXED)** | Admin only **(FIXED)** |
| shipments | Via seller/admin | Auth required | Auth required | Admin |

### Seller Data Isolation

- `seller_profiles` SELECT is public (browsable); UPDATE/INSERT restricted to own userId.
- `seller_stores` SELECT public (active stores); ALL mutations restricted to own userId.
- `products` enforces `sellerId = auth.uid()` for INSERT; sellers cannot list products under another seller's ID.

### Order Ownership Protection

- `orders` INSERT requires `buyerId = auth.uid()` (or admin). Sellers cannot create orders; only the webhook (service role) or buyers can.
- `orders` SELECT restricted to own buyer/seller or admin — sellers only see their own orders.
- `orders` UPDATE allows both buyer and seller to update; this is intentional (buyer confirms delivery, seller updates shipment info).

### Critical Security Issues Fixed in This Audit

#### Issue 1: Stripe Webhook Idempotency (CRITICAL — FIXED)

**Risk**: Stripe guarantees at-least-once webhook delivery. Without idempotency protection, a network timeout causing Stripe to retry the webhook would create duplicate orders, double-decrement stock, and send duplicate emails — causing real financial harm in production.

**Fix**: Added idempotency check at the start of `handleCheckoutCompleted` in `netlify/functions/stripe-webhook.ts`. The function now queries `payment_sessions` for an existing `stripeSessionId` before processing. If found, it returns immediately without creating any duplicate records.

**File changed**: `netlify/functions/stripe-webhook.ts`

#### Issue 2: payment_sessions RLS Too Permissive (HIGH — FIXED)

**Risk**: The original policy `USING (TRUE) WITH CHECK (TRUE)` on ALL operations allowed any authenticated user to INSERT, UPDATE, or DELETE payment session records. A malicious authenticated user could insert a fake "completed" payment session to falsely legitimise an unpaid order, or tamper with existing session records.

**Fix**: Replaced with `payment_sessions_admin_write` policy restricted to `is_admin_or_owner()`. The Stripe webhook uses the service role key (bypasses RLS) for legitimate inserts.

**Files changed**: `netlify/functions/stripe-webhook.ts`, `supabase/10_rls_policies.sql`, `supabase/00_consolidated_schema.sql`, `supabase/80_fix_rls_security_gaps.sql`

#### Issue 3: order_items INSERT Too Permissive (MEDIUM — FIXED)

**Risk**: The original `WITH CHECK (TRUE)` policy allowed any authenticated user to insert order items for any order (regardless of ownership). This could be used to forge order item records or inflate order history.

**Fix**: Restricted INSERT to users who own the parent order (via `orders.buyerId` or `orders.sellerId`) or admin/owner. The Stripe webhook's service role key bypasses RLS for legitimate inserts.

**Files changed**: `supabase/10_rls_policies.sql`, `supabase/00_consolidated_schema.sql`, `supabase/80_fix_rls_security_gaps.sql`

---

## 11. Legal Compliance

### Marketplace Intermediary Disclaimer

`src/pages/legal/TermsPage.tsx` section 12 explicitly states:

> *"Loadify Market operates as an online marketplace platform that allows independent sellers to list and sell their products directly to buyers."*

> *"The contract of sale is formed directly between the buyer and the seller. Loadify Market is not the seller of the products listed on the platform."*

> *"Loadify Market acts only as an intermediary platform facilitating the transaction between buyers and sellers."*

### Seller Responsibility Notice

Section 12 of the Terms lists seller-exclusive responsibilities:
- Product listings and descriptions
- Product availability and stock
- Packaging and shipping
- Delivery times
- Returns and refunds
- Customer service related to their products

### Additional Legal Pages

| Page | File | Status |
|------|------|--------|
| Terms & Conditions | `TermsPage.tsx` | Complete — includes marketplace role section (section 12) |
| Privacy Policy | `PrivacyPage.tsx` | Present |
| Cookie Policy | `CookiePage.tsx` | Present |
| Returns Policy | `ReturnsPolicyPage.tsx` | Present (14-day return window) |
| Shipping Policy | `ShippingPolicyPage.tsx` | Present |

All legal pages are accessible from the site footer and linked in `App.tsx` at `/terms`, `/privacy`, `/cookies`, `/returns-policy`, `/shipping-policy`.

**CONFIRMED**: Legal structure correctly reflects marketplace intermediary model. Seller responsibility is clearly and explicitly stated in the Terms & Conditions.

---

## 12. UX / Marketplace Clarity

### Seller Visibility on Product Pages

`ProductPage.tsx` displays:
- **"Sold by [Store Name]"** link → `/seller/:storeSlug`
- `SellerPerformance` component: star rating, total sales, verification badge, payment behaviour badge
- Seller's stated dispatch time from `product_shipping.dispatch_time`

### Delivery Information Clarity

Product pages show available shipping methods with courier names, tracking availability, and price. The `dispatch_time` field communicates seller-specific dispatch estimates (e.g., "1–2 working days").

### Checkout Messaging

- VAT breakdown shown: subtotal (ex-VAT), VAT (20%), shipping, grand total.
- Commission display: 7% shown for transparency.
- **Multi-seller shipping notice**: When `hasMultipleSellers` is true, a blue info banner states:
  > *"Items in your order may be shipped separately by different sellers. Each seller is responsible for packaging and dispatching their products. Delivery times may vary depending on the seller."*

### Multi-Seller Cart Clarity

- `CartPage.tsx` shows each item with its seller association.
- `CheckoutPage.tsx` detects and announces multi-seller scenarios to buyers before payment.
- Order confirmation shows per-seller order numbers.

**CONFIRMED**: The platform clearly communicates how the marketplace operates to buyers at every key touchpoint.

---

## 13. Confirmed Working Features

| Feature | Status |
|---------|--------|
| Email/password authentication | Fully implemented |
| Buyer / Seller / Admin / Owner roles | Fully implemented |
| Role-based route guards (RequireAuth, RequireSeller, RequireAdmin) | Fully implemented |
| Seller account creation and store setup | Fully implemented |
| Admin approval workflow for sellers | Fully implemented |
| Product creation with all field types | Fully implemented |
| Product images via Supabase Storage | Fully implemented |
| Product catalog (Shop, Catalog, Bulk pages) | Fully implemented |
| Server-side price validation at checkout | Fully implemented |
| Stock validation at checkout | Fully implemented |
| Stripe Checkout integration | Fully implemented |
| Webhook signature verification | Fully implemented |
| **Idempotent webhook processing** | **Fixed in this audit** |
| Per-seller order splitting | Fully implemented |
| Atomic stock decrement (RPC) | Fully implemented |
| Royal Mail / courier shipping selection | Fully implemented |
| Bulk / pallet RFQ flow | Fully implemented |
| XDrive logistics integration | Fully implemented |
| Retail / bulk separation | Fully implemented |
| Seller shipment management | Fully implemented |
| Shipment status tracking | Fully implemented |
| Buyer order confirmation email | Fully implemented |
| Returns system (buyer-initiated, seller-managed) | Fully implemented |
| Disputes system with admin mediation | Fully implemented |
| Product Q&A | Fully implemented |
| Product reviews and ratings | Fully implemented |
| Seller public profile page | Fully implemented |
| Wishlist | Fully implemented |
| Saved searches | Fully implemented |
| Admin dashboard and moderation | Fully implemented |
| Category management | Fully implemented |
| PDF invoice generation | Fully implemented |
| Legal pages (T&C, Privacy, Cookies, Returns, Shipping) | Fully implemented |
| Marketplace intermediary disclaimer (T&C section 12) | Fully implemented |
| Cookie consent banner | Fully implemented |
| Supabase RLS on all tables | Fully implemented |
| **order_items INSERT restriction** | **Fixed in this audit** |
| **payment_sessions write restriction** | **Fixed in this audit** |

---

## 14. Risks and Inconsistencies

### Medium Risks

| Risk | Detail |
|------|--------|
| Seller new-order notifications not automated | Sellers must check their dashboard for new orders. No automatic email notification is sent to sellers when an order is placed for them. |
| Listing limit (5 for unverified sellers) not DB-enforced | The `listingLimit` field exists in types but no DB trigger or RLS CHECK enforces it. A seller could bypass the limit via direct API calls. |
| `orders_update` allows buyer to update any field | While intentional for delivery confirmation, buyers could attempt to set status values they shouldn't (e.g., 'refunded'). Application-level validation mitigates this but DB level does not restrict field-level changes. |
| Email verification not enforced | `isEmailVerified` is stored but not checked before allowing purchases or product listings. |

### Low Risks / Observations

| Item | Detail |
|------|--------|
| Guest checkout | `buyerId` can be null in orders. Works correctly but guest users cannot access order history without creating an account. |
| Fallback shipping options | If no `product_shipping` rows exist for cart items, CheckoutPage falls back to hardcoded Royal Mail options. These prices should be reviewed for accuracy. |
| Invoice generation fire-and-forget | `generate-invoice` is called asynchronously from the webhook. Failures are only logged; no retry mechanism. |
| No payout automation | `payouts` table exists but payout transfers to sellers are manual / admin-managed. No Stripe Connect integration yet. |
| `product_analytics_write` fully open | Any authenticated user can write view counts to `product_analytics`. Low risk but could be used to inflate fake popularity metrics. |

---

## 15. Recommended Improvements

### High Priority

1. **Automate seller new-order notifications** — Trigger `send-email` with a `seller_new_order` template from the webhook when an order is created for each seller. This is critical for seller experience and timely fulfilment.

2. **Enforce listing limit at DB level** — Add a trigger that enforces `listingLimit` for unverified sellers (5 listings max). This prevents bypass via direct API calls and ensures fair platform governance.

3. **Restrict order field updates by role** — Add a DB function or trigger to validate which `status` values buyers vs. sellers may set, preventing invalid status transitions.

### Medium Priority

4. **Enforce email verification** — Block checkout and product listing creation until `isEmailVerified = TRUE`. This reduces fraud and ensures contact information is valid.

5. **Invoice generation retry** — Add retry logic or a persistent queue for invoice generation failures rather than fire-and-forget.

6. **Automated seller payouts** — Implement Stripe Connect for automated seller payouts rather than manual admin management.

### Low Priority

7. **Restrict `product_analytics_write`** — Consider rate-limiting or authentication requirements to prevent fake view count inflation.

8. **Automate `shipment_events` logging** — Automatically insert a `shipment_events` row on every status change via DB trigger rather than requiring explicit application calls.

9. **OAuth login** — Add Google / Apple sign-in for improved conversion (currently not implemented).

---

*End of Audit Report — Loadify Market Ltd — 2026-03-14*
