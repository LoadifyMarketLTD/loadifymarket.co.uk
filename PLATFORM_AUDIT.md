# Loadify Market — Complete Platform Audit & Supabase Architecture Plan

**Date:** 2026-03-10  
**Platform Owner:** loadifymarket.co.uk@gmail.com  
**Status:** Supabase is EMPTY — full schema designed from zero  
**Repo:** LoadifyMarketLTD/loadifymarket.co.uk  

---

## Table of Contents

1. [Full Feature Audit](#1-full-feature-audit)
2. [System Inventory](#2-system-inventory)
3. [Required Database Tables](#3-required-database-tables)
4. [Complete SQL Schema](#4-complete-sql-schema)
5. [RLS / Security Plan](#5-rls--security-plan)
6. [Owner / Admin Model](#6-owner--admin-model)
7. [Missing Features](#7-missing-features)
8. [Recommended Implementation Order](#8-recommended-implementation-order)

---

## 1. Full Feature Audit

### AUTHENTICATION

| Feature | Status | Notes |
|---------|--------|-------|
| Email/password login | FULLY IMPLEMENTED | Supabase Auth, `LoginPage.tsx` |
| Registration | FULLY IMPLEMENTED | `RegisterPage.tsx` |
| Session management | FULLY IMPLEMENTED | `App.tsx` auth listener |
| Auth state (Zustand) | FULLY IMPLEMENTED | `store/index.ts` useAuthStore |
| Protected routes | FULLY IMPLEMENTED | `RequireAuth.tsx` |
| Email verification flag | PARTIALLY IMPLEMENTED | `isEmailVerified` stored but not enforced |
| OAuth (Google/Apple) | NOT IMPLEMENTED BUT EXPECTED | No OAuth providers wired |
| Password reset | NOT IMPLEMENTED BUT EXPECTED | No reset flow in UI |

### ROLES & PERMISSIONS

| Feature | Status | Notes |
|---------|--------|-------|
| Role types (buyer/seller/admin) | FULLY IMPLEMENTED | `users.role` field |
| Owner role | UI ONLY | `owner` value referenced but not in existing DB CHECK constraints |
| Role-based UI rendering | FULLY IMPLEMENTED | Dashboard branching in `DashboardPage.tsx` |
| Marketplace role (carrier/broker/seller) | FULLY IMPLEMENTED | `marketplaceRole` in types and migrations |
| Admin-only routes | PARTIALLY IMPLEMENTED | Client-side check only; no DB-level enforcement |

### USER PROFILES

| Feature | Status | Notes |
|---------|--------|-------|
| Buyer profile (addresses) | FULLY IMPLEMENTED | `BuyerProfile` type; `buyer_profiles` table in migrations |
| Seller profile (business info) | FULLY IMPLEMENTED | `SellerProfile` type; `seller_profiles` table |
| Seller store page | FULLY IMPLEMENTED | `SellerPublicProfilePage.tsx`, `seller_stores` table |
| Seller performance metrics | PARTIALLY IMPLEMENTED | `SellerPerformance.tsx` component; DB columns defined but not populated via triggers |
| Profile completeness % | PARTIALLY IMPLEMENTED | Field defined; no calculation logic |
| Avatar upload | UI ONLY | `ImageUpload.tsx` exists; no Supabase Storage integration |
| Verification badges | FULLY IMPLEMENTED | `VerificationBadge.tsx` reads `verificationStatus` |
| Payment behaviour indicator | FULLY IMPLEMENTED | `PaymentBehaviourBadge.tsx` + `paymentBehaviour` field |

### PRODUCT / LISTING SYSTEM

| Feature | Status | Notes |
|---------|--------|-------|
| Product types (product/pallet/lot/clearance/handmade/wholesale/logistics) | FULLY IMPLEMENTED | `ProductType` enum in types |
| Product creation / editing | FULLY IMPLEMENTED | `ProductFormPage.tsx` |
| Product detail page | FULLY IMPLEMENTED | `ProductPage.tsx` |
| Product catalog | FULLY IMPLEMENTED | `CatalogPage.tsx` |
| Product search | FULLY IMPLEMENTED | `SearchPage.tsx`, `search.ts` |
| Category management | FULLY IMPLEMENTED | `CategoryManagementPage.tsx`, `categories` table |
| Product images | FULLY IMPLEMENTED | `images TEXT[]` in products; `ImageUpload.tsx` |
| Product Q&A | FULLY IMPLEMENTED | `ProductQA.tsx`, `product_questions` table |
| Listing approval workflow | PARTIALLY IMPLEMENTED | `isApproved` flag; admin approves but no email notification |
| Listing limit (5 for unverified) | PARTIALLY IMPLEMENTED | `listingLimit` in types; not enforced by DB |
| Related products | FULLY IMPLEMENTED | `RelatedProducts.tsx` |
| Recently viewed | FULLY IMPLEMENTED | `RecentlyViewed.tsx`, `recently_viewed` table |
| Trending products | FULLY IMPLEMENTED | `TrendingProducts.tsx`, `product_analytics` table |
| Frequently bought together | UI ONLY | `FrequentlyBoughtTogether.tsx`; no real data logic |
| Handmade / unique items | FULLY IMPLEMENTED | `isHandmade`, `isUnique`, `artistName` fields |
| Logistics job listings | FULLY IMPLEMENTED | `logisticsInfo` JSONB, `LogisticsLoadsPage.tsx` |
| SEO (sitemap / meta tags) | FULLY IMPLEMENTED | `sitemap.ts`, `seo.ts` |

### CATALOG & BROWSE

| Feature | Status | Notes |
|---------|--------|-------|
| Shop page (all products) | FULLY IMPLEMENTED | `ShopPage.tsx` |
| Bulk / wholesale browse | FULLY IMPLEMENTED | `BulkPage.tsx` |
| Category filters | FULLY IMPLEMENTED | `CategorySelector.tsx` |
| Search with filters | FULLY IMPLEMENTED | `SearchPage.tsx` |
| Cinematic hero / banners | FULLY IMPLEMENTED | `CinematicHero.tsx`, `CinematicCategoryPanels.tsx` |
| Marketplace type switcher | FULLY IMPLEMENTED | `CinematicMarketplaceSwitch.tsx` |

### CART & CHECKOUT

| Feature | Status | Notes |
|---------|--------|-------|
| Cart (in-memory Zustand) | FULLY IMPLEMENTED | `CartPage.tsx`, `useCartStore` |
| Persistent cart (DB) | PARTIALLY IMPLEMENTED | `carts` table defined; app still uses Zustand only |
| Save for later | FULLY IMPLEMENTED | `saveForLater` in Zustand store |
| Checkout page | FULLY IMPLEMENTED | `CheckoutPage.tsx` |
| Stripe integration | PARTIALLY IMPLEMENTED | Stripe mock in `stripe-mock.ts`; real webhooks not wired |
| VAT calculation | FULLY IMPLEMENTED | `vatRate` field, displayed in checkout |
| Coupon / discount codes | NOT IMPLEMENTED BUT EXPECTED | `coupons` table designed; no UI |
| Order confirmation | PARTIALLY IMPLEMENTED | Redirects after checkout; no real email |

### ORDERS

| Feature | Status | Notes |
|---------|--------|-------|
| Order listing (buyer) | FULLY IMPLEMENTED | `OrdersPage.tsx` |
| Order detail | FULLY IMPLEMENTED | `OrderDetailPage.tsx` |
| Order status tracking | FULLY IMPLEMENTED | Status field + display |
| Multi-item orders | PARTIALLY IMPLEMENTED | `order_items` table designed; `orders` table still primary-product-centric |
| Escrow logic | UI ONLY | `escrowStatus` in types; no actual payment escrow implementation |
| Invoice generation | PARTIALLY IMPLEMENTED | `invoiceUrl` field; no PDF generation logic |

### SELLER DASHBOARD

| Feature | Status | Notes |
|---------|--------|-------|
| Seller dashboard overview | FULLY IMPLEMENTED | `SellerDashboardPage.tsx` |
| Seller profile management | FULLY IMPLEMENTED | `SellerProfilePage.tsx` |
| Product management | FULLY IMPLEMENTED | Create/edit/delete products |
| Order management | FULLY IMPLEMENTED | Seller sees their orders |
| Returns management | FULLY IMPLEMENTED | `SellerReturnsPage.tsx` |
| Shipment management | FULLY IMPLEMENTED | `SellerShipmentsPage.tsx`, `SellerShipmentForm.tsx` |
| Review management | FULLY IMPLEMENTED | `SellerReviewsPage.tsx` |
| RFQ inbox | FULLY IMPLEMENTED | `SellerRFQPage.tsx` |
| Payout management | NOT IMPLEMENTED BUT EXPECTED | `payouts` table designed; no UI for seller payouts |
| Seller analytics | PARTIALLY IMPLEMENTED | `SellerPerformance.tsx`; no real-time data |
| Document verification upload | PARTIALLY IMPLEMENTED | `seller_verifications` table; no upload UI |

### BUYER DASHBOARD

| Feature | Status | Notes |
|---------|--------|-------|
| Buyer dashboard | FULLY IMPLEMENTED | `DashboardPage.tsx` |
| Orders list | FULLY IMPLEMENTED | `OrdersPage.tsx` |
| Returns management | FULLY IMPLEMENTED | `ReturnsPage.tsx` |
| Disputes | FULLY IMPLEMENTED | `DisputesPage.tsx` |
| Wishlist | FULLY IMPLEMENTED | `WishlistPage.tsx` |
| Notification settings | FULLY IMPLEMENTED | `NotificationSettingsPage.tsx` |
| Saved searches | FULLY IMPLEMENTED | `SavedSearches.tsx` component |
| Buyer protection | FULLY IMPLEMENTED | `BuyerProtectionPage.tsx` |
| Track order | FULLY IMPLEMENTED | `TrackOrderPage.tsx`, `TrackingPage.tsx` |
| Messages | FULLY IMPLEMENTED | `MessagesPage.tsx` |

### ADMIN DASHBOARD

| Feature | Status | Notes |
|---------|--------|-------|
| Admin overview | FULLY IMPLEMENTED | `AdminDashboardPage.tsx` |
| User management | FULLY IMPLEMENTED | Admin sees all users |
| Product approvals | FULLY IMPLEMENTED | Admin can approve/reject listings |
| Seller approvals | FULLY IMPLEMENTED | `SellerApprovalsPage.tsx` |
| Category management | FULLY IMPLEMENTED | `CategoryManagementPage.tsx` |
| Reported listings | FULLY IMPLEMENTED | `ReportedListingsPage.tsx` |
| Shipment management | FULLY IMPLEMENTED | `AdminShipmentsPage.tsx` |
| Reviews moderation | FULLY IMPLEMENTED | `AdminReviewsPage.tsx` |
| Dispute management | PARTIALLY IMPLEMENTED | Admin can view; full resolution workflow UI missing |
| Export tools | FULLY IMPLEMENTED | `exportUtils.ts` (CSV exports) |
| Analytics dashboard | PARTIALLY IMPLEMENTED | Basic stats; no charts or advanced analytics |
| Payout management | NOT IMPLEMENTED BUT EXPECTED | No admin payout UI |
| Support tickets | NOT IMPLEMENTED BUT EXPECTED | `support_tickets` table designed; no UI |
| Audit logs | NOT IMPLEMENTED BUT EXPECTED | `audit_logs` table designed; no UI or writes |
| Featured listings control | NOT IMPLEMENTED BUT EXPECTED | `featured_listings` table designed; no UI |
| Promoted listings approval | NOT IMPLEMENTED BUT EXPECTED | `promoted_listings` table designed; no UI |
| Owner-specific dashboard | NOT IMPLEMENTED BUT EXPECTED | No owner-specific view |

### RFQ SYSTEM

| Feature | Status | Notes |
|---------|--------|-------|
| RFQ submission form | FULLY IMPLEMENTED | `RFQPage.tsx` |
| RFQ database persistence | FULLY IMPLEMENTED | `rfq_requests` table, migration in place |
| Seller RFQ inbox | FULLY IMPLEMENTED | `SellerRFQPage.tsx` |
| RFQ response workflow | PARTIALLY IMPLEMENTED | Seller can mark as replied; no formal quote response |
| RFQ response table | NOT IMPLEMENTED | `rfq_responses` table newly designed |
| Buyer notification on response | NOT IMPLEMENTED BUT EXPECTED | |
| RFQ expiry logic | NOT IMPLEMENTED BUT EXPECTED | |

### MESSAGING

| Feature | Status | Notes |
|---------|--------|-------|
| Messaging UI | FULLY IMPLEMENTED | `MessagesPage.tsx` |
| Conversation / messages tables | FULLY IMPLEMENTED | In `database-complete.sql` |
| Real-time messages | NOT IMPLEMENTED BUT EXPECTED | Supabase Realtime not configured |
| File attachments in messages | NOT IMPLEMENTED BUT EXPECTED | `attachment_urls[]` designed; no upload UI |

### REVIEWS & REPUTATION

| Feature | Status | Notes |
|---------|--------|-------|
| Product reviews | FULLY IMPLEMENTED | `ProductReviews.tsx`, `reviews` table |
| Verified purchase badge | FULLY IMPLEMENTED | `isVerifiedPurchase` + trigger designed |
| Seller rating | PARTIALLY IMPLEMENTED | `sellerRating` in reviews; no aggregation trigger in existing DB |
| Seller response to reviews | FULLY IMPLEMENTED | `sellerResponse` in types |
| Review moderation | FULLY IMPLEMENTED | `AdminReviewsPage.tsx`, `status` field |
| Helpful votes | FULLY IMPLEMENTED | `helpfulCount`, `helpfulVoters[]` |

### DELIVERY / TRANSPORT / XDRIVE

| Feature | Status | Notes |
|---------|--------|-------|
| Transport quote page | FULLY IMPLEMENTED | `TransportQuotePage.tsx` |
| XDrive URL builder | FULLY IMPLEMENTED | `transportQuote.ts` |
| XDrive content block | FULLY IMPLEMENTED | `XDriveContentBlock.tsx` |
| Delivery request persistence | UI ONLY | `DeliveryRequest` type defined; no DB persistence |
| Transport quote persistence | NOT IMPLEMENTED | `transport_quotes` table newly designed |
| Shipment tracking (buyer) | FULLY IMPLEMENTED | `TrackingPage.tsx`, `shipments` table |
| Shipment management (seller) | FULLY IMPLEMENTED | `SellerShipmentsPage.tsx` |
| Shipment status events | FULLY IMPLEMENTED | `shipment_events` table in migrations |

### WISHLIST

| Feature | Status | Notes |
|---------|--------|-------|
| Wishlist UI | FULLY IMPLEMENTED | `WishlistPage.tsx` |
| Wishlist DB (array approach) | PARTIALLY IMPLEMENTED | `wishlists.productIds UUID[]` — not normalised |
| Wishlist items (normalised) | NOT IMPLEMENTED | `wishlist_items` table newly designed |
| Wishlist hook | FULLY IMPLEMENTED | `useWishlist.ts` |

### NOTIFICATIONS

| Feature | Status | Notes |
|---------|--------|-------|
| Notification settings UI | FULLY IMPLEMENTED | `NotificationSettingsPage.tsx` |
| Notification settings DB | FULLY IMPLEMENTED | `notification_settings` table |
| In-app notifications | PARTIALLY IMPLEMENTED | `notifications` table designed; no UI feed |
| Email notifications | NOT IMPLEMENTED | SendGrid mock; no real email sends |
| Push notifications | NOT IMPLEMENTED BUT EXPECTED | |

### DISPUTES / RETURNS

| Feature | Status | Notes |
|---------|--------|-------|
| Buyer disputes UI | FULLY IMPLEMENTED | `DisputesPage.tsx` |
| Disputes DB | FULLY IMPLEMENTED | `disputes` table |
| Returns UI (buyer) | FULLY IMPLEMENTED | `ReturnsPage.tsx` |
| Returns UI (seller) | FULLY IMPLEMENTED | `SellerReturnsPage.tsx` |
| Returns DB | FULLY IMPLEMENTED | `returns` table |
| Dispute resolution workflow | PARTIALLY IMPLEMENTED | Status fields exist; no full admin resolution UI |
| Escrow hold/release | NOT IMPLEMENTED | Logic designed; not wired |

### PROMOTIONS & FEATURED

| Feature | Status | Notes |
|---------|--------|-------|
| Featured deals on homepage | UI ONLY | Cinematic components; no real featured_listings table |
| Promoted listings | NOT IMPLEMENTED | `promoted_listings` table newly designed |
| Coupons / discount codes | NOT IMPLEMENTED | `coupons` table newly designed |
| Banners management | PARTIALLY IMPLEMENTED | `banners` table; no admin UI to manage them |

### LEGAL & POLICIES

| Feature | Status | Notes |
|---------|--------|-------|
| Terms & Conditions | FULLY IMPLEMENTED | `TermsPage.tsx` |
| Privacy Policy | FULLY IMPLEMENTED | `PrivacyPage.tsx` |
| Cookie Policy | FULLY IMPLEMENTED | `CookiePage.tsx` |
| Cookie consent banner | FULLY IMPLEMENTED | `CookieBanner.tsx` |
| Returns Policy | FULLY IMPLEMENTED | `ReturnsPolicyPage.tsx` |
| Shipping Policy | FULLY IMPLEMENTED | `ShippingPolicyPage.tsx` |
| Buyer Protection | FULLY IMPLEMENTED | `BuyerProtectionPage.tsx` |

### ANALYTICS & REPORTING

| Feature | Status | Notes |
|---------|--------|-------|
| Product analytics (views/cart) | FULLY IMPLEMENTED | `product_analytics` table + functions |
| Export to CSV | FULLY IMPLEMENTED | `exportUtils.ts` |
| Admin stats overview | PARTIALLY IMPLEMENTED | Basic counts; no charts |
| Revenue reporting | NOT IMPLEMENTED BUT EXPECTED | No aggregated revenue table |
| Seller analytics | NOT IMPLEMENTED BUT EXPECTED | No per-seller analytics view |

---

## 2. System Inventory

### Authentication System
- **Exists:** Supabase Auth, session management, protected routes, role-based access
- **Needs:** Real OAuth providers, password reset flow, email verification enforcement
- **DB required:** `users` (via Supabase Auth), RLS policies
- **Production gaps:** Email verification not enforced; no rate limiting on auth endpoints

### Role / Permissions System
- **Exists:** `role` field in users; client-side role checks; `RequireAuth.tsx`
- **Needs:** `owner` role enforced at DB level via RLS; server-side role validation
- **DB required:** `users.role` with 'owner' check constraint; `is_admin_or_owner()` helper
- **Production gaps:** All current role checks are client-side only

### User Profile System
- **Exists:** `buyer_profiles`, `seller_profiles`, `seller_stores` tables defined in migrations
- **Needs:** Auto-creation trigger on user insert; document verification flow
- **DB required:** All profile tables + `seller_verifications` + triggers
- **Production gaps:** Supabase is empty so nothing is live yet

### Seller System
- **Exists:** Full seller dashboard UI; profile management; store pages; shipments; reviews; RFQ inbox
- **Needs:** Payout UI; verification document upload; listing limit enforcement; seller analytics
- **DB required:** `seller_profiles`, `seller_stores`, `seller_verifications`, `payouts`, `product_analytics`
- **Production gaps:** Stripe Connect not set up; payout flow not built; document upload not wired

### Buyer System
- **Exists:** Buyer dashboard; orders; returns; disputes; wishlist; messages; notifications settings
- **Needs:** Persistent cart; real-time notifications; saved search alerts
- **DB required:** `buyer_profiles`, `carts`, `cart_items`, `wishlists`, `wishlist_items`, `saved_searches`, `notifications`
- **Production gaps:** Cart is in-memory only; no real-time notification delivery

### Listing / Product System
- **Exists:** Full product CRUD; approval flow; types; categories; images; Q&A; analytics
- **Needs:** Listing limit enforcement; duplicate detection; bulk upload for wholesale
- **DB required:** `products`, `categories`, `product_analytics`, `product_questions`, `recently_viewed`
- **Production gaps:** Supabase Storage not configured for image uploads

### Cart / Checkout System
- **Exists:** Cart UI (Zustand); checkout page; Stripe mock
- **Needs:** Persistent DB cart; real Stripe webhook; payment confirmation
- **DB required:** `carts`, `cart_items`, `payment_sessions`, `orders`, `order_items`
- **Production gaps:** Stripe not live; no order confirmation emails; no invoice generation

### Order System
- **Exists:** Orders UI (buyer and seller); order detail; status tracking
- **Needs:** Multi-item orders; invoice PDF generation; escrow release; payout initiation
- **DB required:** `orders`, `order_items`, `payouts`, `payment_sessions`
- **Production gaps:** Single-product orders only; escrow not wired to payments

### RFQ System
- **Exists:** RFQ submission form; seller inbox; `rfq_requests` table with RLS
- **Needs:** Formal quote response workflow; buyer notification on response; RFQ expiry
- **DB required:** `rfq_requests`, `rfq_responses`, `notifications`
- **Production gaps:** No `rfq_responses` table live; no buyer notification

### Messaging System
- **Exists:** `MessagesPage.tsx` UI; `conversations` + `messages` tables defined
- **Needs:** Supabase Realtime subscriptions; unread count badge; file attachments
- **DB required:** `conversations`, `messages`
- **Production gaps:** No real-time delivery; no push notification integration

### Review / Reputation System
- **Exists:** `ProductReviews.tsx`; `reviews` table; admin moderation; seller response
- **Needs:** Seller rating aggregation trigger; review abuse detection; review analytics
- **DB required:** `reviews` with rating refresh trigger; `seller_profiles.rating` aggregate
- **Production gaps:** Seller rating not auto-updated from reviews

### Delivery / Transport / XDrive System
- **Exists:** `TransportQuotePage.tsx`; XDrive URL builder; `DeliveryRequest` type; `shipments` + `shipment_events` tables
- **Needs:** Delivery request persistence to DB; XDrive API webhook; transport quote storage
- **DB required:** `delivery_requests`, `transport_quotes`, `shipments`, `shipment_events`
- **Production gaps:** Delivery requests currently not saved to DB; XDrive API not integrated

### Wishlist System
- **Exists:** `WishlistPage.tsx`; `useWishlist.ts`; `wishlists` table (array approach)
- **Needs:** Normalised `wishlist_items` table for scalability; "notify when back in stock" feature
- **DB required:** `wishlists`, `wishlist_items`
- **Production gaps:** Array-based wishlist not scalable for large catalogs

### Notification System
- **Exists:** `NotificationSettingsPage.tsx`; `notification_settings` + `notifications` tables defined
- **Needs:** Notification feed UI component; Supabase Realtime delivery; email sends via SendGrid
- **DB required:** `notifications`, `notification_settings`
- **Production gaps:** No notification feed in UI; SendGrid not live; no real-time delivery

### Admin / Owner System
- **Exists:** `AdminDashboardPage.tsx`; seller approvals; category management; reported listings; review moderation; export tools
- **Needs:** Owner-specific dashboard; payout management; support tickets; audit logs; featured listing management; platform settings UI
- **DB required:** `admin_actions`, `audit_logs`, `support_tickets`, `platform_settings`, `featured_listings`
- **Production gaps:** Owner role not enforced at DB level; no owner dashboard; audit logs not written

### Moderation System
- **Exists:** `ReportedListingsPage.tsx`; `reported_listings` table; `AdminReviewsPage.tsx`
- **Needs:** Auto-flagging for suspicious listings; ban/suspend user workflow; moderation queue
- **DB required:** `reported_listings`, `admin_actions`, `audit_logs`
- **Production gaps:** No automated moderation triggers

### Support / Dispute / Returns System
- **Exists:** `DisputesPage.tsx`; `ReturnsPage.tsx`; `SellerReturnsPage.tsx`; `disputes` + `returns` tables
- **Needs:** Support ticket system; dispute resolution workflow; escrow release on resolution
- **DB required:** `support_tickets`, `support_ticket_messages`, `disputes`, `returns`
- **Production gaps:** No support ticket UI; dispute resolution not connected to escrow/payouts

### Promotions / Featured System
- **Exists:** Homepage featured sections (UI only); banners table
- **Needs:** Featured listings management; promoted listing workflow; coupon system
- **DB required:** `featured_listings`, `promoted_listings`, `coupons`, `coupon_usage`
- **Production gaps:** Entirely missing from DB

### Analytics / Reporting System
- **Exists:** `product_analytics` table; `exportUtils.ts` (CSV export); basic admin stats
- **Needs:** Revenue analytics; seller performance charts; platform-wide KPIs; cohort analysis
- **DB required:** `product_analytics`, `order_items` aggregations, seller revenue views
- **Production gaps:** No real-time analytics; no charts in UI; no revenue reporting

---

## 3. Required Database Tables

The following 42 tables are required for the complete platform. All are defined in the SQL schema files.

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Core user accounts linked to Supabase Auth |
| 2 | `buyer_profiles` | Buyer-specific data (addresses, preferences) |
| 3 | `seller_profiles` | Seller business info, ratings, metrics |
| 4 | `seller_stores` | Public-facing seller store pages |
| 5 | `seller_verifications` | Identity/business document submissions |
| 6 | `categories` | Product category hierarchy |
| 7 | `products` | All product/pallet/wholesale listings |
| 8 | `product_analytics` | Daily aggregated product metrics |
| 9 | `recently_viewed` | User/guest recently viewed products |
| 10 | `carts` | Persistent shopping carts |
| 11 | `cart_items` | Normalised cart line items |
| 12 | `orders` | Placed orders |
| 13 | `order_items` | Multi-product order line items |
| 14 | `payment_sessions` | Stripe checkout sessions |
| 15 | `payouts` | Seller payout records |
| 16 | `reviews` | Product reviews with seller response |
| 17 | `product_questions` | Product Q&A |
| 18 | `product_offers` | Make-an-offer negotiations |
| 19 | `returns` | Return requests |
| 20 | `disputes` | Buyer protection disputes |
| 21 | `rfq_requests` | B2B Request for Quote submissions |
| 22 | `rfq_responses` | Seller quotes responding to RFQs |
| 23 | `conversations` | Message thread metadata |
| 24 | `messages` | Individual messages within threads |
| 25 | `delivery_requests` | XDrive logistics/transport requests |
| 26 | `transport_quotes` | Quotes returned for delivery requests |
| 27 | `shipments` | Physical shipment tracking records |
| 28 | `shipment_events` | Audit trail of shipment status changes |
| 29 | `reported_listings` | Community-reported suspicious listings |
| 30 | `admin_actions` | Log of all admin/owner deliberate actions |
| 31 | `audit_logs` | Immutable platform-wide event log |
| 32 | `support_tickets` | Customer support tickets |
| 33 | `support_ticket_messages` | Thread messages within support tickets |
| 34 | `banners` | Homepage/catalog promotional banners |
| 35 | `platform_settings` | Key/value platform configuration |
| 36 | `notifications` | In-app notification feed |
| 37 | `notification_settings` | Per-user notification preferences |
| 38 | `wishlists` | User wishlists |
| 39 | `wishlist_items` | Normalised wishlist product items |
| 40 | `saved_searches` | Saved search queries with alert settings |
| 41 | `featured_listings` | Admin-curated featured products |
| 42 | `promoted_listings` | Paid seller promotion campaigns |
| 43 | `coupons` | Discount codes |
| 44 | `coupon_usage` | Coupon redemption tracking |

---

## 4. Complete SQL Schema

The complete SQL schema is split across 10 migration files in the `/supabase/` directory:

| File | Contents |
|------|----------|
| `supabase/01_users_profiles.sql` | users, buyer_profiles, seller_profiles, seller_stores, seller_verifications |
| `supabase/02_categories_products.sql` | categories, products, product_analytics, recently_viewed |
| `supabase/03_cart_orders_checkout.sql` | carts, cart_items, orders, order_items, payment_sessions, payouts |
| `supabase/04_sellers_reviews_ratings.sql` | reviews, product_questions, product_offers, returns, disputes |
| `supabase/05_rfq_messages.sql` | rfq_requests, rfq_responses, conversations, messages |
| `supabase/06_delivery_transport_xdrive.sql` | delivery_requests, transport_quotes, shipments, shipment_events |
| `supabase/07_admin_moderation.sql` | reported_listings, admin_actions, audit_logs, support_tickets, banners, platform_settings |
| `supabase/08_notifications_saved_searches.sql` | notifications, notification_settings, wishlists, wishlist_items, saved_searches |
| `supabase/09_promotions_featured.sql` | featured_listings, promoted_listings, coupons, coupon_usage |
| `supabase/10_rls_policies.sql` | All RLS policies for all 44 tables |
| `supabase/00_consolidated_schema.sql` | **Single master file combining all of the above** |

> **To bootstrap Supabase from zero:** Run `supabase/00_consolidated_schema.sql` in the Supabase SQL Editor.

---

## 5. RLS / Security Plan

### Helper Functions

Three reusable security functions are defined and used across all policies:

```sql
is_admin_or_owner()  -- TRUE for role IN ('admin', 'owner')
is_owner()           -- TRUE for role = 'owner' only
is_seller()          -- TRUE for role IN ('seller', 'admin', 'owner')
```

### Policy Summary by Role

| Table | guest SELECT | buyer SELECT | seller SELECT | admin/owner SELECT | INSERT | UPDATE | DELETE |
|-------|-------------|-------------|---------------|-------------------|--------|--------|--------|
| users | ✗ | own only | own only | ALL | service | own+admin | admin |
| buyer_profiles | ✗ | own | ✗ | ALL | self | self+admin | admin |
| seller_profiles | ✓ (public) | ✓ (public) | ✓ (public) | ALL | self | self+admin | admin |
| seller_stores | active only | active only | own+active | ALL | self | self+admin | admin |
| seller_verifications | ✗ | ✗ | own | ALL | self | admin | admin |
| categories | ✓ | ✓ | ✓ | ALL | admin | admin | admin |
| products | approved+active | approved+active | own+approved | ALL | seller | seller+admin | seller+admin |
| orders | ✗ | own (buyer) | own (seller) | ALL | buyer | buyer+seller+admin | admin |
| reviews | published | published | published | ALL | buyer | buyer+seller+admin | admin |
| rfq_requests | ✗ | own | ALL | ALL | anyone | seller+admin | admin |
| conversations | ✗ | party only | party only | ALL | party | party | admin |
| messages | ✗ | party only | party only | ALL | sender | receiver | admin |
| delivery_requests | ✗ | own | own | ALL | anyone | party | admin |
| shipments | ✗ | own (buyer) | own (seller) | ALL | seller | seller+admin | admin |
| disputes | ✗ | own (buyer) | own (seller) | ALL | buyer | party+admin | admin |
| admin_actions | ✗ | ✗ | ✗ | ALL | admin | ✗ | ✗ |
| audit_logs | ✗ | ✗ | ✗ | ALL | service-role | ✗ | ✗ |
| support_tickets | ✗ | own | own | ALL | anyone | own+admin | admin |
| banners | active | active | active | ALL | admin | admin | admin |
| platform_settings | ✓ | ✓ | ✓ | ALL | admin | admin | admin |
| notifications | ✗ | own | own | ALL | service | own (read) | own+admin |
| wishlists | ✗ | own | own | ALL | self | self | admin |
| featured_listings | active | active | active | ALL | admin | admin | admin |
| coupons | active | active | own | ALL | seller | owner | owner |

### Key Security Principles

1. **Owner bypass:** `is_admin_or_owner()` grants full access to owner/admin on all tables
2. **Audit logs are append-only:** No UPDATE or DELETE policies on `audit_logs`
3. **Admin actions are append-only:** No UPDATE or DELETE on `admin_actions`
4. **Service-role writes:** `payment_sessions`, `order_items`, `notifications`, `audit_logs` should be written via Supabase service-role (Edge Functions / webhooks), not by the anon key
5. **Products visible to guests:** Only `is_active = TRUE AND is_approved = TRUE` products are publicly visible
6. **RFQ open to guests:** Anyone can submit an RFQ (with email as identifier)
7. **Support tickets open to guests:** Anyone can open a support ticket

---

## 6. Owner / Admin Model

### Role Hierarchy

```
owner
  └── admin
        └── seller
              └── buyer
                    └── guest
```

### Owner — loadifymarket.co.uk@gmail.com

The platform owner is set up by:
1. Registering via Supabase Auth with email `loadifymarket.co.uk@gmail.com`
2. Manually running: `UPDATE users SET role = 'owner' WHERE email = 'loadifymarket.co.uk@gmail.com';`

**Owner can:**
- Access ALL data across ALL tables (bypasses all RLS via `is_admin_or_owner()`)
- Approve / reject / suspend sellers
- Approve / reject / remove listings
- Resolve disputes and returns
- View all orders, RFQs, messages, tickets
- Control featured listings, promoted listings, banners
- Manage platform settings (commission rates, VAT, limits)
- View full audit logs and admin action history
- Manage other admin accounts
- Initiate and oversee payouts
- Access all analytics and export reports

### Admin

Admins are trusted staff appointed by the owner.

**Admin can:**
- Everything the owner can except: creating other admins, changing owner role, accessing owner-specific settings
- Approve sellers, moderate listings, resolve disputes
- Manage support tickets
- View all data across the platform

### Seller

**Seller can:**
- Manage own products (CRUD)
- View own orders (where seller_id = auth.uid())
- Manage own shipments, returns, disputes
- View all RFQ requests and respond
- Manage own seller profile and store
- View own reviews and respond
- Submit transport quotes as carrier
- Upload verification documents

**Seller cannot:**
- See other sellers' orders, finances, or private data
- Approve other sellers
- Access admin panel
- Change own role

### Buyer

**Buyer can:**
- Browse all approved active products
- Manage own cart and place orders
- Track own orders and shipments
- Submit returns and disputes on own orders
- Review products they have purchased
- Message sellers
- Manage own wishlist, saved searches, notifications

**Buyer cannot:**
- See other buyers' orders
- Access seller-only features
- Access admin panel

### Guest

**Guest can:**
- Browse all approved active products
- View seller public profiles
- Submit RFQ requests (with email)
- Submit support tickets (with email)
- Submit delivery/transport requests
- Track orders by order number (public tracking page)

---

## 7. Missing Features

### CRITICAL

| Feature | Why Required | DB Tables Needed | Partial Support | Priority |
|---------|-------------|------------------|-----------------|----------|
| **Real Stripe payment processing** | Platform cannot take payments without it | `payment_sessions`, `orders`, `payouts` | Stripe mock exists | CRITICAL |
| **RLS policies live in DB** | Without RLS, all data is exposed | All 44 tables | Designed but not live | CRITICAL |
| **Owner role enforcement** | Owner can be blocked by seller/buyer RLS | `users.role = 'owner'` | Type defined, not in DB | CRITICAL |
| **Persistent delivery requests** | `DeliveryRequest` type exists; never saved to DB | `delivery_requests` | Type + form exist | CRITICAL |
| **Seller payout flow** | Sellers can't receive money | `payouts` | Table designed | CRITICAL |
| **Email notifications (SendGrid)** | Order confirmations, shipping alerts | `notifications`, `notification_settings` | Mock exists | CRITICAL |

### IMPORTANT

| Feature | Why Required | DB Tables Needed | Partial Support | Priority |
|---------|-------------|------------------|-----------------|----------|
| **Support ticket system** | Customers need support | `support_tickets`, `support_ticket_messages` | Tables designed | IMPORTANT |
| **Seller verification upload UI** | Needed for trusted marketplace | `seller_verifications` | Table designed | IMPORTANT |
| **Persistent cart (DB-backed)** | Cart lost on browser close/login | `carts`, `cart_items` | Zustand only | IMPORTANT |
| **Normalised wishlist (wishlist_items)** | Array approach breaks with scale | `wishlist_items` | Array approach live | IMPORTANT |
| **RFQ response workflow** | Sellers need to formally quote | `rfq_responses` | Partial (mark replied) | IMPORTANT |
| **In-app notification feed UI** | Users need to see notifications | `notifications` | Table designed | IMPORTANT |
| **Transport quote persistence** | Quotes are currently ephemeral | `transport_quotes` | None | IMPORTANT |
| **Featured listings management UI** | Owner/admin need to feature products | `featured_listings` | Table designed | IMPORTANT |
| **Seller rating aggregation trigger** | Seller ratings not auto-updated | `seller_profiles.rating` | Partial | IMPORTANT |
| **Listing limit enforcement (DB)** | Unverified sellers limited to 5 | `seller_profiles.listing_limit` | Type defined | IMPORTANT |
| **Invoice PDF generation** | Required for B2B marketplace | `orders.invoice_url` | URL field exists | IMPORTANT |
| **Audit logs writing** | Required for compliance and security | `audit_logs` | Table designed | IMPORTANT |

### LATER

| Feature | Why Required | DB Tables Needed | Partial Support | Priority |
|---------|-------------|------------------|-----------------|----------|
| **Promoted listings / paid ads** | Revenue stream for platform | `promoted_listings` | Table designed | LATER |
| **Coupon / discount system** | Buyer incentives and seller promotions | `coupons`, `coupon_usage` | Tables designed | LATER |
| **Make-an-offer feature** | B2B negotiation for wholesale | `product_offers` | Table designed | LATER |
| **Saved search email alerts** | Re-engagement marketing | `saved_searches` | UI + table | LATER |
| **Owner analytics dashboard** | Platform-wide KPIs | `product_analytics`, aggregations | Partial admin stats | LATER |
| **Supabase Realtime messages** | Real-time chat experience | `messages` + Realtime | Table defined | LATER |
| **OAuth login (Google)** | Reduces signup friction | Supabase Auth providers | Not configured | LATER |
| **Back-in-stock notifications** | Buyer re-engagement | `wishlist_items`, `notifications` | None | LATER |
| **Bulk product import (CSV)** | Wholesale sellers need it | `products` | None | LATER |
| **Seller analytics charts** | Seller revenue visibility | `product_analytics` | Partial | LATER |

---

## 8. Recommended Implementation Order

### Phase 1 — Foundation (Week 1-2)
*Everything else depends on this. Must be done first.*

- [ ] Run `supabase/00_consolidated_schema.sql` in Supabase SQL Editor
- [ ] Set owner role: `UPDATE users SET role='owner' WHERE email='loadifymarket.co.uk@gmail.com'`
- [ ] Configure Supabase Auth (email/password enabled, email templates)
- [ ] Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Netlify environment
- [ ] Wire real Supabase client (remove mock fallback for production)
- [ ] Test auth flow: register → auto-create profile → login → role detection
- [ ] Seed categories from `database-seed-categories.sql`
- [ ] Test product CRUD with real DB

### Phase 2 — Core Commerce (Week 3-4)
*Revenue-generating features.*

- [ ] Persist cart to `carts` + `cart_items` (replace Zustand-only approach)
- [ ] Wire real Stripe payment (replace stripe-mock)
- [ ] Stripe webhook → create order in DB on `checkout.session.completed`
- [ ] Order confirmation email via SendGrid
- [ ] Seller payout initiation (admin-triggered via Stripe Connect)
- [ ] Persist delivery requests to `delivery_requests` table
- [ ] Test full buyer flow: browse → cart → checkout → order → tracking

### Phase 3 — Seller Tools (Week 5-6)
*Required for sellers to trust the platform.*

- [ ] Seller verification document upload (Supabase Storage)
- [ ] Admin verification review UI
- [ ] Auto-upgrade listing limit when verified
- [ ] Listing limit enforcement on product insert
- [ ] RFQ response workflow (`rfq_responses` table)
- [ ] Buyer notification when seller responds to RFQ
- [ ] Seller payout tracking UI

### Phase 4 — Buyer Experience (Week 7-8)
*Retention and engagement features.*

- [ ] In-app notification feed UI (bell icon in header)
- [ ] Supabase Realtime for messages (live chat)
- [ ] Normalised wishlist (`wishlist_items`)
- [ ] Transport quote persistence (`transport_quotes`)
- [ ] Invoice PDF generation on delivered orders
- [ ] Support ticket system UI

### Phase 5 — Admin & Owner Control (Week 9-10)
*Operational control for the platform owner.*

- [ ] Owner-specific dashboard (separate from admin)
- [ ] Featured listings management UI
- [ ] Platform settings management UI
- [ ] Payout management (admin approves payouts)
- [ ] Audit log viewer
- [ ] Support ticket management queue
- [ ] Dispute resolution workflow connected to escrow

### Phase 6 — Growth Features (Week 11-12)
*Revenue and engagement growth.*

- [ ] Promoted listings (seller-paid visibility boost)
- [ ] Coupon / discount code system
- [ ] Seller analytics dashboard with charts
- [ ] Saved search email alerts
- [ ] Make-an-offer feature (product_offers)
- [ ] Google OAuth login
- [ ] Back-in-stock notifications

---

## Database Migration Execution Order

When running individual files (not the consolidated file):

```
01_users_profiles.sql
02_categories_products.sql
03_cart_orders_checkout.sql
04_sellers_reviews_ratings.sql
05_rfq_messages.sql
06_delivery_transport_xdrive.sql
07_admin_moderation.sql
08_notifications_saved_searches.sql
09_promotions_featured.sql
10_rls_policies.sql
```

Or simply run the single master file:
```
00_consolidated_schema.sql
```

---

## Technical Notes

### Naming Convention
The new SQL files use `snake_case` column naming (e.g. `seller_id`, `created_at`). The existing codebase uses `camelCase` (e.g. `sellerId`, `createdAt`). When connecting the frontend to the real Supabase DB, column names should be mapped accordingly using Supabase's `select` aliasing or by updating the TypeScript interfaces.

**Recommended approach:** Update TypeScript `types/index.ts` to use snake_case to match Supabase conventions, then update all component references.

### Supabase Storage
Required for:
- Product images (`products.images[]`)
- Seller verification documents (`seller_verifications.file_url`)
- Proof of delivery (`shipments.proof_of_delivery_url`)
- Message attachments (`messages.attachment_urls[]`)
- Support ticket attachments

Create Storage buckets: `product-images`, `verification-docs`, `delivery-proofs`, `message-attachments`

### Supabase Edge Functions Required
- `stripe-webhook` — Handle Stripe payment events, create orders
- `send-email` — SendGrid email dispatch (order confirmation, shipping updates)
- `release-escrow` — Scheduled job to auto-release escrow after 7 days
- `expire-offers` — Scheduled job to expire stale product offers
- `rfq-expiry` — Scheduled job to close expired RFQ requests

### Environment Variables Required
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG...
XDRIVE_API_KEY=...
```
