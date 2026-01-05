# LoadifyMarket - Application Inventory

**Date:** January 5, 2026  
**Repository:** loadifymarket.co.uk  
**Branch:** copilot/full-product-audit-upgrade-plan

## Routes/Pages List

### Public Routes
1. `/` - HomePage (HomePage.tsx)
2. `/catalog` - Product catalog/listing page (CatalogPage.tsx)
3. `/product/:id` - Individual product detail page (ProductPage.tsx)
4. `/login` - Login page (LoginPage.tsx)
5. `/register` - Registration page (RegisterPage.tsx)
6. `/contact` - Contact page (ContactPage.tsx)
7. `/help` - Help/FAQ page (HelpPage.tsx)
8. `/track-order` - Public order tracking (TrackOrderPage.tsx)
9. `/tracking/:orderNumber` - Tracking details (TrackingPage.tsx)

### Legal Pages
10. `/terms` - Terms & Conditions (legal/TermsPage.tsx)
11. `/privacy` - Privacy Policy (legal/PrivacyPage.tsx)
12. `/cookies` - Cookie Policy (legal/CookiePage.tsx)
13. `/returns-policy` - Returns Policy (legal/ReturnsPolicyPage.tsx)
14. `/shipping-policy` - Shipping Policy (legal/ShippingPolicyPage.tsx)

### Buyer Routes (Protected)
15. `/cart` - Shopping cart (CartPage.tsx)
16. `/checkout` - Checkout/payment (CheckoutPage.tsx)
17. `/dashboard` - Buyer dashboard (DashboardPage.tsx)
18. `/orders` - Orders list (OrdersPage.tsx)
19. `/orders/:id` - Order details (OrderDetailPage.tsx)
20. `/returns` - Returns management (ReturnsPage.tsx)
21. `/disputes` - Disputes/claims (DisputesPage.tsx)
22. `/wishlist` - Saved products (WishlistPage.tsx)
23. `/messages` - Messaging system (MessagesPage.tsx)
24. `/notifications` - Notification settings (NotificationSettingsPage.tsx)

### Seller Routes (Protected)
25. `/seller` - Seller dashboard (SellerDashboardPage.tsx)
26. `/seller/profile` - Seller profile management (SellerProfilePage.tsx)
27. `/seller/products/new` - Create new product listing (ProductFormPage.tsx)
28. `/seller/products/:id/edit` - Edit product listing (ProductFormPage.tsx)
29. `/seller/returns` - Seller returns management (SellerReturnsPage.tsx)
30. `/seller/shipments` - Seller shipments (SellerShipmentsPage.tsx)

### Admin Routes (Protected)
31. `/admin` - Admin dashboard (AdminDashboardPage.tsx)
32. `/admin/categories` - Category management (CategoryManagementPage.tsx)
33. `/admin/sellers` - Seller approvals (SellerApprovalsPage.tsx)
34. `/admin/reported-listings` - Moderation (ReportedListingsPage.tsx)
35. `/admin/shipments` - Admin shipments oversight (AdminShipmentsPage.tsx)

### Missing Routes (Not Implemented)
- ❌ `/pricing` - Pricing page
- ❌ `/how-it-works` - How it works page
- ❌ `/about` - About us page
- ❌ `/seller/:id` - Public seller profile view
- ❌ `/investors` or `/press` - Imperiul Leilor pitch page

## Key Components

### Layout Components (src/components/layout/)
- **Header** - Main navigation
- **Footer** - Footer with links
- **Layout** - Main layout wrapper

### Hero & Homepage Components (src/components/cinematic/)
- **CinematicHero** - Homepage hero section with 3 category panels (Logistics, Pallets, Handmade)
- **CinematicMarketplaceSwitch** - Tab-based category switcher
- **CinematicStoryStrip** - Story/how-it-works preview
- **DailyTrendingHandmade** - Trending handmade products

### Product Components
- **ProductCard** - Product display card
- **ProductQA** - Q&A functionality
- **ProductReviews** - Review system
- **TrendingProducts** - Trending products display
- **RecentlyViewed** - Recently viewed products
- **RelatedProducts** - Related products
- **FrequentlyBoughtTogether** - Product recommendations

### Functional Components
- **CategorySelector** - Category selection UI
- **ImageUpload** - Image upload component
- **SellerPerformance** - Seller metrics display
- **SellerShipmentForm** - Shipment creation
- **SavedSearches** - Saved search management
- **CookieBanner** - GDPR cookie consent
- **LazyImage** - Lazy image loading

## Data Sources

### Primary Database (Supabase/PostgreSQL)
Based on schema files:
- `database-complete.sql` - Full schema
- Tables implemented:
  - `users` - User accounts with roles (buyer/seller/admin)
  - `products` - Product listings
  - `categories` - Category tree (15 main + 60 subcategories)
  - `orders` - Order records
  - `order_items` - Order line items
  - `carts` - Shopping carts
  - `cart_items` - Cart items
  - `wishlists` - Wishlists
  - `wishlist_items` - Wishlist items
  - `reviews` - Product reviews
  - `messages` - Messaging system
  - `conversations` - Conversation threads
  - `seller_stores` - Seller store profiles
  - `shipments` - Shipping/tracking
  - `returns` - Returns management
  - `disputes` - Dispute handling
  - `payouts` - Seller payouts
  - `payment_sessions` - Stripe payment sessions
  - `reported_listings` - Content moderation
  - `saved_searches` - Saved search queries
  - `notifications` - User notifications

### APIs & External Services
- **Supabase** - Authentication, database, storage
- **Stripe Connect** - Payments & payouts
- **SendGrid** - Email notifications (optional)
- Mock services available if not configured (lib/mocks/)

### Static Data
- `database-seed-categories.sql` - Category tree
- `database-seed-testdata.sql` - Test users & products

## Auth Flow

### Provider: Supabase Auth
- Email/password authentication
- Session management via Supabase client
- JWT tokens stored in localStorage

### Registration Flow:
1. Separate buyer/seller registration (`/register?type=buyer` or `type=seller`)
2. Email/password collection
3. Supabase Auth account creation
4. User record created in `users` table with role
5. Sellers require admin approval (`seller_approved` flag)

### Protected Routes:
- Role-based access control
- User role checked from `users` table
- Zustand store manages auth state (`useAuthStore`)

### Roles:
- `buyer` - Can browse, purchase, review
- `seller` - Can list products, manage orders, view analytics
- `admin` - Full system access, moderation, approvals

## Payments/Checkout

### Payment Provider: Stripe Connect
- Integrated via `@stripe/stripe-js` and `@stripe/react-stripe-js`
- Checkout flow:
  1. Cart → Checkout page
  2. Stripe payment session created
  3. Redirect to Stripe hosted checkout
  4. Webhook handles payment confirmation
  5. Order created in database

### Netlify Functions:
- `/netlify/functions/` - Serverless API endpoints
- Payment session creation
- Webhook handling
- Email notifications

### Commission System:
- Platform takes commission from sellers
- Tracked in orders and payouts tables
- Seller dashboard shows earnings after commission

## Admin Capabilities

### Seller Management
- ✅ Approve/reject seller applications
- ✅ View seller profiles and performance
- ✅ Suspend/deactivate sellers

### Content Moderation
- ✅ Review reported listings
- ✅ Remove/edit inappropriate content
- ✅ Handle disputes

### Category Management
- ✅ Add/edit/delete categories
- ✅ Organize category hierarchy

### System Analytics
- ✅ View sales metrics
- ✅ User statistics
- ✅ Platform revenue tracking

### Shipment Oversight
- ✅ Monitor all shipments
- ✅ Track delivery issues
- ✅ Admin shipment dashboard

### Data Export
- ✅ Export capabilities mentioned in README

## Technical Stack

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (custom cinematic theme)
- **Routing:** React Router DOM v7
- **State:** Zustand
- **Forms:** React Hook Form + Zod validation
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage (product images)
- **Payments:** Stripe Connect
- **Email:** SendGrid
- **Hosting:** Netlify
- **Icons:** Lucide React
- **PDF:** jsPDF

## Build & Deploy

### Development
```bash
npm install
npm run dev  # Runs on http://localhost:5173
```

### Production Build
```bash
npm run build  # Outputs to dist/
```

### Deployment
- Platform: Netlify
- Build command: Defined in `netlify.toml`
- Environment variables required:
  - Supabase credentials
  - Stripe keys
  - SendGrid API key (optional)

## Notable Features Present

✅ **Complete Marketplace:**
- Product listings (individual, pallets, bulk lots)
- Shopping cart & checkout
- Order management
- Wishlist functionality
- Advanced search & filtering
- Multiple product images (up to 10)
- Category tree navigation

✅ **Seller Features:**
- Complete seller dashboard
- Product management (CRUD)
- Order tracking
- Earnings overview
- Store profile
- Shipment management
- Returns handling
- Analytics

✅ **Trust & Safety:**
- User reviews & ratings
- Seller approval workflow
- Content moderation (reported listings)
- Disputes system
- Returns & refunds

✅ **Compliance:**
- Terms & Conditions
- Privacy Policy
- Cookie Policy
- Returns Policy
- Shipping Policy
- Cookie consent banner

✅ **Communication:**
- Messaging system
- Notification settings
- Email notifications (SendGrid)

✅ **Advanced Features:**
- Saved searches
- Recently viewed products
- Trending products
- Related products
- Product Q&A
- Frequently bought together
- Shipment tracking (DHL-like system)
- Proof of delivery

## Performance Optimizations

- Lazy loading for secondary pages
- Image lazy loading component
- Code splitting with React.lazy
- Suspense boundaries
- Optimized bundle size
