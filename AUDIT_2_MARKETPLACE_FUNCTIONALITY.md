# AUDIT 2 — FULL MARKETPLACE FUNCTIONALITY REVIEW

**Date:** 2026-03-14
**Repository:** LoadifyMarketLTD/loadifymarket.co.uk
**Auditor:** GitHub Copilot Agent (read-only code audit, no changes made)

---

## AUDIT METHODOLOGY

Full static code review of:
- All `src/pages/` (95 files), `src/components/`, `src/lib/`, `src/store/`, `src/types/`
- `netlify/functions/` (create-checkout, stripe-webhook, send-email, create-shipment, etc.)
- `supabase/00_consolidated_schema.sql` (44 tables)
- `src/App.tsx` (all registered routes)
- `.env.example` (required environment variables)
- `src/constants/brand.ts` (company info)

Classification: **FULLY WORKING** | **PARTIALLY WORKING** | **UI ONLY** | **NOT IMPLEMENTED**

---

## 1. BUYER FLOW

| Feature | Status | Notes | Files |
|---|---|---|---|
| Browse products | ✅ FULLY WORKING | CatalogPage, ShopPage, BulkPage query Supabase with `isActive + isApproved` filters, pagination | `src/pages/CatalogPage.tsx`, `ShopPage.tsx`, `BulkPage.tsx` |
| Browse categories | ✅ FULLY WORKING | Categories fetched from Supabase `categories` table, filter applied in CatalogPage | `src/pages/CatalogPage.tsx` |
| Search products | ✅ FULLY WORKING | SearchPage uses `useSearch` hook with Supabase `ilike` query; debounced, sanitised, paginated | `src/pages/SearchPage.tsx`, `src/lib/search.ts` |
| Filter products | ✅ FULLY WORKING | Price (debounced), condition, type, listingType, category all wired to real Supabase queries | `src/pages/CatalogPage.tsx`, `src/pages/SearchPage.tsx` |
| View product page | ✅ FULLY WORKING | ProductPage fetches product + seller + storeSlug, tracks views via `track_product_view` RPC | `src/pages/ProductPage.tsx` |
| Add to cart | ✅ FULLY WORKING | Zustand CartStore with localStorage persistence; login required (redirects to login) | `src/store/index.ts`, `src/pages/ProductPage.tsx` |
| Update cart | ✅ FULLY WORKING | `updateQuantity`, `saveForLater`, `moveToCart` all implemented | `src/store/index.ts`, `src/pages/CartPage.tsx` |
| Remove from cart | ✅ FULLY WORKING | `removeItem`, `removeSaved` implemented | `src/store/index.ts`, `src/pages/CartPage.tsx` |
| Checkout | ⚠️ PARTIALLY WORKING | Stripe Checkout session created via Netlify function; VAT + shipping calculated correctly; but **order row is NOT created in Supabase at checkout time** — it depends on the Stripe webhook firing | `src/pages/CheckoutPage.tsx`, `netlify/functions/create-checkout.ts` |
| Order success | ⚠️ PARTIALLY WORKING | OrderSuccessPage clears cart and shows confirmation, but order DB record requires working Stripe webhook + env vars | `src/pages/OrderSuccessPage.tsx`, `netlify/functions/stripe-webhook.ts` |
| Order history | ✅ FULLY WORKING | OrdersPage queries `orders` by `buyerId`, status filter tabs, links to detail | `src/pages/OrdersPage.tsx` |
| Track order | ⚠️ PARTIALLY WORKING | TrackingPage queries `shipments` + `shipment_events` from Supabase; tracking events depend on seller manually creating them | `src/pages/TrackingPage.tsx`, `src/pages/TrackOrderPage.tsx` |
| Leave review | ⚠️ PARTIALLY WORKING | ProductReviews has full review form with star rating, verified purchase check (queries `orders`), images, video URL; submits to `reviews` table; **requires completed orders in DB** | `src/components/ProductReviews.tsx` |
| Contact seller | 🔴 UI ONLY | "Contact Seller" button on ProductPage links to `/contact` (general contact form), **not** to a seller-specific messaging thread | `src/pages/ProductPage.tsx` (line 424–429) |
| Request transport quote | ⚠️ PARTIALLY WORKING | TransportQuotePage form pre-filled from URL params; submits via email (SendGrid/Netlify); **saved to localStorage only, NOT to Supabase** | `src/pages/TransportQuotePage.tsx`, `netlify/functions/send-email.ts` |
| Submit RFQ | ⚠️ PARTIALLY WORKING | RFQPage saves to `rfq_requests` Supabase table; but **no seller_id or product_id FK** — just text fields | `src/pages/RFQPage.tsx` |

---

## 2. SELLER FLOW

| Feature | Status | Notes | Files |
|---|---|---|---|
| Register as seller | ✅ FULLY WORKING | RegisterPage with `?type=seller` creates user row, seller_profile (isApproved: false), and seller_store | `src/pages/RegisterPage.tsx` |
| Seller account role assignment | ⚠️ PARTIALLY WORKING | Role set to `seller` on registration; admin must approve via SellerApprovalsPage before products are visible | `src/pages/RegisterPage.tsx`, `src/pages/SellerApprovalsPage.tsx` |
| Seller profile/store creation | ✅ FULLY WORKING | SellerProfilePage edits businessName, VAT, registration number, address, store name/description/logo/banner | `src/pages/SellerProfilePage.tsx` |
| Seller dashboard access | ✅ FULLY WORKING | SellerDashboardPage guarded by `hasSellerAccess(user)` | `src/pages/SellerDashboardPage.tsx` |
| Create listing | ✅ FULLY WORKING | ProductFormPage with all product fields (title, price, type, condition, images, specs, pallet info, weight) | `src/pages/ProductFormPage.tsx` |
| Edit listing | ✅ FULLY WORKING | Same ProductFormPage loads existing data from Supabase when `id` param present | `src/pages/ProductFormPage.tsx` |
| Delete listing | ❌ NOT IMPLEMENTED | No delete button found in SellerDashboardPage products tab or ProductFormPage | `src/pages/SellerDashboardPage.tsx`, `src/pages/ProductFormPage.tsx` |
| Upload product images | ⚠️ PARTIALLY WORKING | ImageUpload component uses Supabase Storage bucket `product-images`; requires bucket to be manually created in Supabase Console; falls back to error with "Add URL" if bucket missing | `src/components/ImageUpload.tsx` |
| Manage stock/quantity | ⚠️ PARTIALLY WORKING | `stockQuantity` stored in ProductFormPage, but no inventory management UI (e.g. auto-decrement on order, low stock alert) | `src/pages/ProductFormPage.tsx` |
| View seller orders | ✅ FULLY WORKING | SellerDashboardPage fetches orders by `sellerId` with status labels and revenue calculation | `src/pages/SellerDashboardPage.tsx` |
| View RFQ requests | ⚠️ PARTIALLY WORKING | SellerRFQPage (`/seller/rfq`) shows **all** `rfq_requests` from DB — not filtered by seller or product. Any seller sees every buyer's RFQ | `src/pages/SellerRFQPage.tsx` |
| Respond to RFQ | ⚠️ PARTIALLY WORKING | Reply is via `mailto:` link only — no in-platform response; no `rfq_responses` table is written to | `src/pages/SellerRFQPage.tsx` |
| See transport-related requests | ⚠️ PARTIALLY WORKING | SellerDashboardPage "Deliveries" tab reads transport requests from **localStorage** (key: `loadify_delivery_requests`), NOT from Supabase. Not persistent across browsers/devices | `src/pages/SellerDashboardPage.tsx` |
| View seller analytics | ⚠️ PARTIALLY WORKING | Analytics tab shows total revenue, orders, products — but no time-series charts, no product view stats from `product_analytics` table | `src/pages/SellerDashboardPage.tsx` |
| Seller store page | ✅ FULLY WORKING | `/seller/:slug` resolves via `seller_stores.storeSlug`, loads profile + active approved products | `src/pages/SellerPublicProfilePage.tsx` |
| Seller verification status | ⚠️ PARTIALLY WORKING | `VerificationBadge` component and `isApproved` flag used throughout; no document-upload verification flow or KYC step | `src/components/VerificationBadge.tsx`, `src/pages/SellerApprovalsPage.tsx` |

---

## 3. PRODUCT SYSTEM

| Feature | Status | Notes | Files |
|---|---|---|---|
| Product creation | ✅ FULLY WORKING | Full form with images, specs, dimensions, pallet info | `src/pages/ProductFormPage.tsx` |
| Product editing | ✅ FULLY WORKING | Loads existing data, updates on submit | `src/pages/ProductFormPage.tsx` |
| Product deletion | ❌ NOT IMPLEMENTED | No delete action in UI or API call | — |
| Product categories | ✅ FULLY WORKING | CategorySelector with parent/child hierarchy, DB-driven | `src/components/CategorySelector.tsx` |
| Product type flags | ✅ FULLY WORKING | `product`, `pallet`, `wholesale`, `clearance`, `logistics`, `handmade`, `lot` all mapped with icons in ProductCard | `src/components/ProductCard.tsx` |
| Condition | ✅ FULLY WORKING | `new`, `used`, `refurbished` displayed as badge | `src/components/ProductCard.tsx` |
| Location | ⚠️ PARTIALLY WORKING | Seller's business address stored in `seller_profiles.businessAddress`; no direct product-level location field; seller location shown on SellerPublicProfilePage only | `src/pages/SellerPublicProfilePage.tsx` |
| Seller linkage | ✅ FULLY WORKING | `products.sellerId` FK to `users.id`; seller info joined via `seller_profiles` in all queries | — |
| Image upload | ⚠️ PARTIALLY WORKING | Supabase Storage `product-images` bucket required; ImageUpload handles upload path `sellers/{sellerId}/{timestamp}.{ext}` | `src/components/ImageUpload.tsx` |
| Image persistence after refresh | ⚠️ PARTIALLY WORKING | Images stored as URLs in `products.images[]`; persist if bucket is configured and URLs don't expire | `src/components/ImageUpload.tsx` |
| Category fallback images | ✅ FULLY WORKING | `getCategoryFallbackImage()` maps product type/category to bundled placeholder images | `src/lib/categoryImages.ts` |
| Product cards | ✅ FULLY WORKING | ProductCard with type badge, condition badge, wishlist, seller name, rating, location, transport CTA | `src/components/ProductCard.tsx` |
| Product detail page | ✅ FULLY WORKING | Full detail page with image gallery, specs, seller panel, related products, reviews, QA, transport CTA | `src/pages/ProductPage.tsx` |
| Related products | ✅ FULLY WORKING | RelatedProducts component queries same category | `src/components/RelatedProducts.tsx` |
| Product visibility on homepage | ✅ FULLY WORKING | HomePage queries featured/trending products | `src/pages/HomePage.tsx` |
| Product visibility in catalog | ✅ FULLY WORKING | CatalogPage filters `isActive = true AND isApproved = true` | `src/pages/CatalogPage.tsx` |

**Assessment:** The product system is **not production-ready** due to missing delete functionality, the image bucket dependency, and no stock auto-management.

---

## 4. SEARCH / FILTERS / SORTING

| Feature | Status | Notes | Files |
|---|---|---|---|
| Search bar | ✅ FULLY WORKING | Header search navigates to `/search?q=...`; SearchPage has its own inline search bar | `src/components/layout/Header.tsx`, `src/pages/SearchPage.tsx` |
| Category filter | ✅ FULLY WORKING | Wired to real Supabase `eq('categoryId', ...)` query | `src/pages/CatalogPage.tsx`, `src/pages/SearchPage.tsx` |
| Price filter | ✅ FULLY WORKING | Min/max price with debouncing (500ms) in CatalogPage; direct in SearchPage | `src/pages/CatalogPage.tsx` |
| Condition filter | ✅ FULLY WORKING | `eq('condition', ...)` query applied | Both pages |
| Location filter | ❌ NOT IMPLEMENTED | No location filter in either CatalogPage or SearchPage; `SearchFilters.location` defined in types but never used in query | `src/lib/search.ts` |
| Seller rating filter | ⚠️ PARTIALLY WORKING | Exists in CatalogPage (`minSellerRating`) applied as `.gte('seller_profiles.rating', ...)` on joined table — depends on PostgREST join syntax working correctly | `src/pages/CatalogPage.tsx` |
| Listing type filter | ✅ FULLY WORKING | `pallet`, `retail`, `wholesale`, `handmade` filter applied via `eq('listingType', ...)` | Both pages |
| Sort by newest | ✅ FULLY WORKING | `createdAt` descending | Both pages |
| Sort by price | ✅ FULLY WORKING | `price` ascending/descending | Both pages |
| Sort by popularity | ❌ NOT IMPLEMENTED | `top_rated` sort uses `rating` field (seller or product); no view count / sales count sort available in UI | `src/lib/search.ts` |

---

## 5. SELLER STORE / SELLER TRUST

| Feature | Status | Notes | Files |
|---|---|---|---|
| Seller page route | ✅ FULLY WORKING | `/seller/:slug` registered in App.tsx | `src/App.tsx` |
| Seller profile page | ✅ FULLY WORKING | Loads via `seller_stores.storeSlug` join | `src/pages/SellerPublicProfilePage.tsx` |
| Seller listings page | ✅ FULLY WORKING | Fetches active approved products, shows up to 12 | `src/pages/SellerPublicProfilePage.tsx` |
| Seller name on cards | ✅ FULLY WORKING | `seller.businessName` shown in ProductCard | `src/components/ProductCard.tsx` |
| Seller location on cards | ❌ NOT IMPLEMENTED | No location field shown on ProductCard; `MapPin` icon defined in imports but not rendered | `src/components/ProductCard.tsx` |
| Verified seller badge | ✅ FULLY WORKING | VerificationBadge shown based on `seller.isApproved` and `verificationStatus` | `src/components/VerificationBadge.tsx` |
| Seller rating display | ✅ FULLY WORKING | Star rating shown on SellerPublicProfilePage and in SellerPerformance component | `src/components/SellerPerformance.tsx` |
| Seller reviews | ⚠️ PARTIALLY WORKING | Product reviews with verified purchase shown on product pages; no aggregate seller review page (e.g. `/seller/:slug/reviews`) | `src/components/ProductReviews.tsx` |
| Seller history / member since | ✅ FULLY WORKING | `formatDistanceToNow(user.createdAt)` shown on SellerPublicProfilePage | `src/pages/SellerPublicProfilePage.tsx` |
| Link from product card to seller page | ⚠️ PARTIALLY WORKING | Seller name rendered in ProductCard but **not wrapped in a link**; storeSlug is available on card but not linked | `src/components/ProductCard.tsx` |
| Link from product page to seller page | ✅ FULLY WORKING | "View Seller Store" button links to `/seller/:storeSlug` if storeSlug present | `src/pages/ProductPage.tsx` |

---

## 6. RFQ SYSTEM

| Feature | Status | Notes | Files |
|---|---|---|---|
| RFQ page exists | ✅ FULLY WORKING | `/rfq` route, full Zod-validated form | `src/pages/RFQPage.tsx` |
| RFQ form submits | ✅ FULLY WORKING | Handles submit, shows success/error state | `src/pages/RFQPage.tsx` |
| RFQ saves in database | ✅ FULLY WORKING | Inserts into `rfq_requests` Supabase table with status: 'pending' | `src/pages/RFQPage.tsx` |
| RFQ links to seller | ❌ NOT IMPLEMENTED | `rfq_requests` table has no `seller_id` or `seller_email` column; RFQs are not routed to specific sellers | `src/pages/RFQPage.tsx`, `supabase/00_consolidated_schema.sql` |
| RFQ links to product | ⚠️ PARTIALLY WORKING | `product_name` is a text field (prefilled from URL); no `product_id` FK — no hard link to a specific product listing | `src/pages/RFQPage.tsx` |
| Seller RFQ inbox exists | ✅ FULLY WORKING | `/seller/rfq` route and SellerRFQPage component | `src/pages/SellerRFQPage.tsx` |
| Seller can read RFQ | ⚠️ PARTIALLY WORKING | All sellers see **all** RFQ requests from all buyers — no seller-specific filtering | `src/pages/SellerRFQPage.tsx` |
| Seller can respond | ⚠️ PARTIALLY WORKING | Response is via `mailto:` link only; no in-platform response form; `rfq_responses` table not written to | `src/pages/SellerRFQPage.tsx` |
| RFQ status updates | ❌ NOT IMPLEMENTED | Status field exists in DB but no UI to change it from 'pending' to 'replied' | `src/pages/SellerRFQPage.tsx` |
| RFQ visible in dashboard | ⚠️ PARTIALLY WORKING | Accessible via `/seller/rfq` link; **not** shown in SellerDashboardPage overview or stats | `src/pages/SellerDashboardPage.tsx` |

---

## 7. BUYER ↔ SELLER COMMUNICATION

| Feature | Status | Notes | Files |
|---|---|---|---|
| Contact seller (from product page) | 🔴 UI ONLY | "Contact Seller" button links to `/contact` (general platform contact form), **not** to a seller-specific thread | `src/pages/ProductPage.tsx` |
| Contact seller (from seller page) | ⚠️ PARTIALLY WORKING | "Message Seller" button on SellerPublicProfilePage links to `/messages` — but no pre-populated conversation | `src/pages/SellerPublicProfilePage.tsx` |
| Messaging thread | ⚠️ PARTIALLY WORKING | MessagesPage has full thread UI (send, receive, mark as read, unread badge); queries `conversations` + `messages` tables; but no way to initiate a new conversation from scratch | `src/pages/MessagesPage.tsx` |
| Inbox | ⚠️ PARTIALLY WORKING | Lists existing conversations with unread count; empty state shown if no conversations | `src/pages/MessagesPage.tsx` |
| Seller inbox | ⚠️ PARTIALLY WORKING | Sellers use the same `/messages` page; no dedicated seller inbox or notification of new messages | `src/pages/MessagesPage.tsx` |
| Buyer sent messages | ⚠️ PARTIALLY WORKING | Works if conversation already exists; no way to create new conversation | `src/pages/MessagesPage.tsx` |
| Persistence in database | ⚠️ PARTIALLY WORKING | `conversations` and `messages` tables defined in schema; MessagesPage reads/writes to them — but the conversation creation entry point is missing | `supabase/00_consolidated_schema.sql` |
| Product-linked messages | ⚠️ PARTIALLY WORKING | `messages.productId` field exists in DB and is referenced in MessagesPage, but not used to initiate product-specific conversations | `src/pages/MessagesPage.tsx` |
| Real-time / notifications | ❌ NOT IMPLEMENTED | No Supabase realtime subscriptions on messages; no push/badge notifications for new messages | — |

**Summary:** The messaging system has backend tables and a functional thread UI, but **the entry point is broken** — there is no way to start a conversation. "Contact Seller" goes to the wrong page.

---

## 8. LOGISTICS / XDRIVE INTEGRATION

| Feature | Status | Notes | Files |
|---|---|---|---|
| Transport quote CTA on homepage | ✅ FULLY WORKING | Link to `/transport-quote` present in homepage checkout section | `src/pages/HomePage.tsx` |
| Transport quote CTA on product pages | ✅ FULLY WORKING | `buildTransportQuoteUrl()` populates form with listing ID, title, weight, pallets, seller name, pickup/dropoff | `src/pages/ProductPage.tsx`, `src/lib/transportQuote.ts` |
| Transport quote CTA on product cards | ✅ FULLY WORKING | ProductCard includes transport quote button using `buildTransportQuoteUrl()` | `src/components/ProductCard.tsx` |
| Transport quote page | ⚠️ PARTIALLY WORKING | Full form with Zod validation, pre-fill from URL params, email via Netlify SendGrid function; **NOT saved to Supabase `delivery_requests` table** (despite table existing in schema) | `src/pages/TransportQuotePage.tsx` |
| Product data passed into transport request | ✅ FULLY WORKING | Listing ID, title, weight, pallet count, category, qty, seller name, pickup location all passed as URL query params | `src/lib/transportQuote.ts` |
| Seller visibility of transport requests | 🔴 PARTIAL/BROKEN | SellerDashboardPage "Deliveries" tab reads from **localStorage** only (`loadify_delivery_requests`); not from Supabase; breaks across devices and incognito | `src/pages/SellerDashboardPage.tsx` |
| Buyer visibility of transport requests | 🔴 PARTIAL/BROKEN | Saved to localStorage only; buyer cannot see submitted requests after clearing browser storage | `src/pages/TransportQuotePage.tsx` |
| Persistence in database | ❌ NOT IMPLEMENTED | `delivery_requests` and `transport_quotes` tables exist in Supabase schema but are **never written to** from TransportQuotePage | `supabase/00_consolidated_schema.sql`, `src/pages/TransportQuotePage.tsx` |
| XDrive app deep-link | ⚠️ PARTIALLY WORKING | `buildXDriveAppUrl()` builds URL to `https://app.xdrivelogistics.co.uk/?...` with context params; shown in SellerDashboardPage deliveries tab "Book via XDrive" button; but the TransportQuotePage itself does **not** redirect to XDrive — it submits via email | `src/lib/transportQuote.ts`, `src/pages/SellerDashboardPage.tsx` |
| XDrive API integration | ❌ NOT IMPLEMENTED | No API calls to XDrive; integration is visual deep-link only; no webhook from XDrive back to Loadify | — |

**Overall XDrive Assessment: PARTIAL FUNCTIONAL** — The UI pre-fills correctly and links to XDrive exist, but transport requests are not saved to the database, seller visibility is localStorage-only (not persistent), and there is no two-way API integration with XDrive.

---

## 9. ADMIN SYSTEM

| Feature | Status | Notes | Files |
|---|---|---|---|
| Admin login / access | ✅ FULLY WORKING | `hasAdminAccess(user)` guards all admin routes; checks `user.role === 'admin' \|\| 'owner'` | `src/lib/roleUtils.ts` |
| Admin dashboard | ✅ FULLY WORKING | Overview tab with user/seller/product/order/dispute stats; date range filter; tabs for each entity type | `src/pages/AdminDashboardPage.tsx` |
| Seller moderation | ✅ FULLY WORKING | SellerApprovalsPage with approve/reject; filter by pending/approved/all | `src/pages/SellerApprovalsPage.tsx` |
| Listing moderation | ✅ FULLY WORKING | Admin can approve/reject products in AdminDashboardPage products tab | `src/pages/AdminDashboardPage.tsx` |
| Review moderation | ✅ FULLY WORKING | AdminReviewsPage with publish/hide/remove/flag actions and abuse detection | `src/pages/AdminReviewsPage.tsx` |
| Dispute handling | ⚠️ PARTIALLY WORKING | DisputesPage allows buyer to open disputes and add messages; admin can see disputes in AdminDashboardPage, but **no dedicated admin dispute resolution UI** (no resolve/close action for admin) | `src/pages/DisputesPage.tsx`, `src/pages/AdminDashboardPage.tsx` |
| Order oversight | ✅ FULLY WORKING | AdminDashboardPage orders tab with status, revenue, commission | `src/pages/AdminDashboardPage.tsx` |
| User management | ⚠️ PARTIALLY WORKING | Users tab shows all users; no ban/suspend/delete user functionality | `src/pages/AdminDashboardPage.tsx` |
| Analytics / reports | ⚠️ PARTIALLY WORKING | Basic summary stats; `exportToCSV` functions for orders/sales/commission/VAT/products/users are implemented | `src/pages/AdminDashboardPage.tsx`, `src/lib/exportUtils.ts` |
| Shipments admin | ✅ FULLY WORKING | AdminShipmentsPage with full shipment management | `src/pages/AdminShipmentsPage.tsx` |
| Category management | ✅ FULLY WORKING | CategoryManagementPage with CRUD operations | `src/pages/CategoryManagementPage.tsx` |
| Reported listings | ✅ FULLY WORKING | ReportedListingsPage with review/dismiss/resolve | `src/pages/ReportedListingsPage.tsx` |

---

## 10. REVIEWS / TRUST / PROTECTION

| Feature | Status | Notes | Files |
|---|---|---|---|
| Buyer protection UI | ✅ FULLY WORKING | BuyerProtectionPage with full coverage details; OrderDetailPage shows protection banner | `src/pages/BuyerProtectionPage.tsx` |
| Returns UI | ✅ FULLY WORKING | ReturnsPage allows creating return requests linked to orders, tracking status | `src/pages/ReturnsPage.tsx` |
| Dispute UI | ✅ FULLY WORKING | DisputesPage with messaging thread, protection reasons, resolution types, escrow status display | `src/pages/DisputesPage.tsx` |
| Product reviews | ✅ FULLY WORKING | ProductReviews component with star ratings, title, comment, images, helpful votes, verified purchase badge | `src/components/ProductReviews.tsx` |
| Seller reviews | ⚠️ PARTIALLY WORKING | SellerReviewsPage shows reviews on seller's products with response capability; but no standalone seller-level review (separate from product reviews) | `src/pages/SellerReviewsPage.tsx` |
| Review submission logic | ✅ FULLY WORKING | Checks `eligibleOrders` via Supabase query before showing review form; only verified purchasers can submit | `src/components/ProductReviews.tsx` |
| Restriction to real orders only | ✅ FULLY WORKING | `isVerifiedPurchase` flag checked; eligible order IDs fetched from DB | `src/components/ProductReviews.tsx` |
| Order tracking UI | ✅ FULLY WORKING | TrackingPage with status timeline, carrier info, estimated delivery | `src/pages/TrackingPage.tsx` |
| Order tracking actual functionality | ⚠️ PARTIALLY WORKING | Reads from `shipments` + `shipment_events` tables; events must be manually entered by seller via SellerShipmentsPage | `src/pages/TrackingPage.tsx`, `src/pages/SellerShipmentsPage.tsx` |
| Invoice generation | ✅ FULLY WORKING | `generateInvoicePDF()` in OrderDetailPage creates printable HTML invoice with VAT/company details | `src/pages/OrderDetailPage.tsx` |

---

## 11. LEGAL / PRODUCTION READINESS

| Feature | Status | Notes | Files |
|---|---|---|---|
| Terms page | ✅ FULLY WORKING | `/terms` → TermsPage | `src/pages/legal/TermsPage.tsx` |
| Privacy page | ✅ FULLY WORKING | `/privacy` → PrivacyPage | `src/pages/legal/PrivacyPage.tsx` |
| Cookie page | ✅ FULLY WORKING | `/cookies` → CookiePage | `src/pages/legal/CookiePage.tsx` |
| Returns policy page | ✅ FULLY WORKING | `/returns-policy` → ReturnsPolicyPage | `src/pages/legal/ReturnsPolicyPage.tsx` |
| Shipping policy page | ✅ FULLY WORKING | `/shipping-policy` → ShippingPolicyPage | `src/pages/legal/ShippingPolicyPage.tsx` |
| Footer company info | ✅ FULLY WORKING | Company name, number (13171804), address, support email from `BRAND` constants | `src/constants/brand.ts`, `src/components/layout/Footer.tsx` |
| VAT display | ✅ FULLY WORKING | 20% UK VAT calculated and displayed at checkout, in cart, in invoices; VAT number GB375949535 shown | `src/pages/CartPage.tsx`, `src/pages/CheckoutPage.tsx` |
| Company number | ✅ PRESENT | `13171804` hardcoded in `brand.ts` | `src/constants/brand.ts` |
| Legal links in footer | ✅ FULLY WORKING | All legal pages linked in Footer | `src/components/layout/Footer.tsx` |
| Social media links | ⚠️ PLACEHOLDER | Facebook/Twitter/Instagram/LinkedIn all link to `#` | `src/components/layout/Footer.tsx` |
| Company name inconsistency | ⚠️ WARNING | `.env.example` has `VITE_COMPANY_NAME=Danny Courier LTD`; `brand.ts` default is `"Loadify Market Ltd"` | `.env.example`, `src/constants/brand.ts` |

---

## A. FULLY WORKING MARKETPLACE FEATURES

1. **Browse / catalog / shop / bulk pages** — real Supabase queries with `isActive + isApproved`
2. **Product search** — full-text ilike search with pagination and sanitisation
3. **Product filters** — category, price, condition, listing type, all wired to Supabase
4. **Sorting** — newest, price asc/desc, top rated
5. **Product detail page** — images, specs, related products, reviews, seller panel
6. **Cart** — Zustand + localStorage, VAT display, save for later
7. **Checkout** — Stripe Checkout session via Netlify function, VAT + shipping
8. **Order history** — real DB queries, status filter tabs
9. **Product review system** — eligibility check, verified purchase, helpful votes
10. **Seller registration** — full flow: user + seller_profile + seller_store
11. **Seller dashboard** — products, orders, revenue stats, analytics tab
12. **Create / edit product** — full form, image upload to Supabase Storage
13. **Seller public profile page** — `/seller/:slug` with products and trust badges
14. **Seller moderation (admin)** — approve/reject sellers
15. **Product moderation (admin)** — approve/reject listings
16. **Review moderation (admin)** — publish/hide/remove/flag
17. **Admin dashboard** — full stats, CSV exports
18. **Reported listings** — admin review/dismiss
19. **Category management** — admin CRUD
20. **Returns system** — buyer creates request, status tracking
21. **Dispute system** — open dispute, messaging thread, escrow status
22. **Wishlist** — add/remove, persisted in Supabase
23. **Invoice PDF** — browser-print invoice with VAT and company details
24. **Order tracking page** — shipment timeline UI
25. **Shipment management (seller + admin)** — create/update shipments
26. **RFQ form** — saves to Supabase `rfq_requests`
27. **Seller RFQ inbox** — reads from Supabase
28. **Transport quote pre-fill** — URL params from product/listing data
29. **Legal pages** — all 5 pages exist and are linked
30. **Buyer protection page** — full coverage info
31. **Notification settings** — email preference storage in Supabase

---

## B. PARTIALLY WORKING FEATURES

1. **Checkout → order creation** — Stripe webhook must be configured with `STRIPE_WEBHOOK_SECRET` and `SUPABASE_SERVICE_ROLE_KEY` or orders are never saved in DB
2. **Image upload** — requires Supabase Storage `product-images` bucket to be created manually
3. **Transport quote persistence** — form submits via email but saves to **localStorage** only; `delivery_requests` table in DB is never written to
4. **RFQ seller routing** — all sellers see all RFQs; no `seller_id` or `product_id` FK
5. **Seller RFQ response** — mailto link only; no in-platform response; `rfq_responses` table unused
6. **Messaging thread** — backend tables exist, MessagesPage works for existing conversations, but there is no conversation creation entry point
7. **Contact seller (seller profile page)** — links to `/messages` but doesn't create a new conversation
8. **Seller analytics** — basic stats only; `product_analytics` table unused in UI
9. **Seller verification** — `isApproved` flag used but no document upload / KYC flow
10. **Stock management** — `stockQuantity` stored but no auto-decrement on order or low-stock alert
11. **Order tracking** — UI works but tracking events require manual seller input
12. **Seller rating filter** — applied via joined table filter; may fail depending on Supabase PostgREST version
13. **XDrive deep-link** — `buildXDriveAppUrl()` exists and is used in Deliveries tab, but transport requests not persisted in DB
14. **Seller location on profile** — shown on SellerPublicProfilePage but no location on ProductCard
15. **Dispute admin resolution** — admin can view disputes but no "resolve" action for admin
16. **User management (admin)** — list only; no ban/suspend/delete

---

## C. UI-ONLY FEATURES

1. **"Contact Seller" on ProductPage** — links to `/contact` (general contact form), not a seller message thread
2. **Seller location on ProductCard** — `MapPin` icon imported but not rendered
3. **Social media links in Footer** — all link to `#`
4. **Seller reviews aggregate page** — no `/seller/:slug/reviews` page; reviews shown per product only
5. **Location-based search filter** — `SearchFilters.location` defined in types but never applied in query
6. **Sort by popularity / views** — no view/sales-count sort in UI despite `product_analytics` table

---

## D. MISSING FEATURES

1. **Product deletion** — no delete button/action anywhere for sellers or admins
2. **New conversation initiation** — no "Start a conversation" flow from product page, seller page, or buyer dashboard
3. **Seller notification of new messages** — no real-time push, no badge counter in seller dashboard
4. **RFQ seller linkage** — RFQs not routed to specific sellers
5. **In-platform RFQ response** — `rfq_responses` table exists but is never used
6. **RFQ status management UI** — sellers cannot mark RFQs as 'replied'
7. **Transport request DB persistence** — `delivery_requests` table exists but is never written to
8. **XDrive API integration** — no API calls to XDrive; no webhook from XDrive back to Loadify
9. **Admin dispute resolution UI** — admin cannot resolve/close disputes from AdminDashboardPage
10. **User ban/suspend (admin)** — no action available
11. **Inventory auto-management** — no decrement of `stockQuantity` on order creation
12. **Low stock alerts** — no seller notification when stock is low
13. **Coupon/discount code system** — `coupons` and `coupon_usage` tables exist but no UI
14. **Featured / promoted listings** — `featured_listings` and `promoted_listings` tables exist but no admin UI or product card treatment
15. **Saved searches** — `saved_searches` table and `SavedSearches` component exist but no visible UI entry point
16. **Seller KYC / document verification flow**
17. **Guest checkout order tracking** — guest can check out but can't track without an account
18. **Payout management** — `payouts` table exists but no payout UI for sellers or admin

---

## E. PRODUCTION BLOCKERS

### CRITICAL (platform non-functional without these)

1. **`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` not set** → mock Supabase client used; all DB reads/writes return empty data. **Entire platform non-functional.**
   - Files: `src/lib/supabase.ts`, `src/lib/mocks/supabase-mock.ts`

2. **`STRIPE_SECRET_KEY` not set** → Netlify `create-checkout` function crashes; checkout completely broken.
   - Files: `netlify/functions/create-checkout.ts`

3. **`STRIPE_WEBHOOK_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` not set** → `stripe-webhook.ts` returns 501; orders are **never created in the database** after Stripe payment succeeds.
   - Files: `netlify/functions/stripe-webhook.ts`

4. **Supabase Storage `product-images` bucket not created** → ImageUpload fails with error; sellers cannot upload product photos.
   - Files: `src/components/ImageUpload.tsx`

### HIGH (significant marketplace functionality broken)

5. **`SENDGRID_API_KEY` not set** → all transactional emails fail (order confirmation, shipped, dispute opened, transport quote request).
   - Files: `netlify/functions/send-email.ts`

6. **Transport requests saved to localStorage only** → not persistent across devices; sellers cannot see requests in their dashboard if submitted from different browser; `delivery_requests` Supabase table is unused.
   - Files: `src/pages/TransportQuotePage.tsx`, `src/pages/SellerDashboardPage.tsx`

7. **RFQ not linked to sellers** → all sellers see all RFQs; this is a privacy and UX problem at scale.
   - Files: `src/pages/RFQPage.tsx`, `src/pages/SellerRFQPage.tsx`

8. **No conversation creation flow** → messaging backend is ready but unreachable; "Contact Seller" sends to wrong page.
   - Files: `src/pages/ProductPage.tsx`, `src/pages/MessagesPage.tsx`

### MEDIUM (features incomplete but platform still usable)

9. **Product deletion missing** — sellers cannot remove listings.
10. **Stock quantity not auto-decremented** on order — overselling risk.
11. **Seller analytics use basic stats only** — `product_analytics` table unused.
12. **Company name inconsistency**: `.env.example` contains `Danny Courier LTD` instead of `Loadify Market Ltd`.
    - Files: `.env.example`, `src/constants/brand.ts`
13. **Social media links are placeholder `#`** — looks unprofessional.
14. **No coupon system UI** despite tables existing in schema.
15. **No featured/promoted listing UI** despite tables existing in schema.

---

## F. PRIORITY FIX ORDER

### 1. URGENT — Platform cannot function without these

1. **Configure all required env vars** in Netlify and Supabase:
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SENDGRID_API_KEY`
   - `VITE_APP_URL` (for Stripe `success_url`)

2. **Create Supabase Storage `product-images` bucket** with public read policy.

3. **Verify Stripe webhook** is registered at `/.netlify/functions/stripe-webhook` with `checkout.session.completed` event — this is what actually creates orders in the DB.

4. **Fix "Contact Seller" button** on ProductPage — link to `/messages?newConversation=true&sellerId={sellerId}&productId={id}` instead of `/contact`; add new conversation creation logic to MessagesPage.

5. **Save transport quote requests to Supabase `delivery_requests` table** in TransportQuotePage `onSubmit`.

6. **Link RFQs to seller/product** — add `seller_id` (from product's `sellerId`) and `product_id` to `rfq_requests` schema; filter SellerRFQPage by `sellerId`.

### 2. IMPORTANT — Marketplace integrity requires these

7. **Add product deletion** to SellerDashboardPage (soft-delete: set `isActive = false` with confirmation modal).

8. **Auto-decrement `stockQuantity`** in stripe-webhook when order is created.

9. **Mark RFQ as replied** — add "Mark as Replied" button in SellerRFQPage that updates `rfq_requests.status`.

10. **Fix company name** in `.env.example`: change `Danny Courier LTD` to `Loadify Market Ltd`.

11. **Add seller location to ProductCard** — use `seller.businessAddress.city` already available in joined data.

12. **Add link from ProductCard seller name** to `/seller/:storeSlug`.

13. **Connect `product_analytics` table to Seller Analytics tab** — add views, cart adds, and conversion rate per product.

### 3. LATER — Polish and completeness

14. **New conversation flow** — once messaging entry point is fixed, add real-time subscription on `messages` table in MessagesPage.

15. **Coupon/discount code system** — build admin UI to create coupons, apply at checkout.

16. **Featured / promoted listings** — build admin UI and add visual treatment in CatalogPage/HomePage.

17. **Seller KYC** — add document upload step in SellerProfilePage for verification.

18. **Payout management** — seller payout view; admin payout trigger UI.

19. **Location search filter** — add location param to SearchPage and CatalogPage filter queries.

20. **Replace social media `#` links** with real URLs or remove from footer.

21. **Admin dispute resolution UI** — add resolve/close buttons for admin in AdminDashboardPage disputes tab.

---

*End of Audit 2 — Loadify Market Marketplace Functionality Review*
