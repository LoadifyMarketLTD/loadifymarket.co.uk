# Loadify Market - Complete Setup Guide

This guide walks you through setting up Loadify Market from scratch, including all core marketplace features.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the Application](#running-the-application)
6. [Core Features Overview](#core-features-overview)
7. [Testing](#testing)
8. [Deployment](#deployment)

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** and npm installed
- A **Supabase account** (free tier works)
- A **Stripe account** (for payments - test mode is fine)
- **SendGrid account** (optional - for email notifications)
- **Git** for version control

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/LoadifyMarketLTD/loadifymarket.co.uk.git
cd loadifymarket.co.uk
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- React 19, TypeScript, Vite
- Supabase client
- Stripe React components
- Tailwind CSS
- And more...

## Database Setup

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Choose organization, name your project, set a database password
5. Wait for project to be provisioned (~2 minutes)

### 2. Run Database Scripts

Open the Supabase SQL Editor (Database → SQL Editor) and run these files in order:

#### Step 1: Create All Tables
```sql
-- Copy and paste contents of: database-complete.sql
```

This creates all tables with proper relationships, indexes, and RLS policies.

#### Step 2: Seed Categories
```sql
-- Copy and paste contents of: database-seed-categories.sql
```

This populates 15 main categories and 60+ subcategories.

#### Step 3: Add Test Data (Development Only)
```sql
-- Copy and paste contents of: database-seed-testdata.sql
```

This creates test users and sample products for development.

For detailed database setup instructions, see [DATABASE_SETUP_COMPLETE.md](./DATABASE_SETUP_COMPLETE.md).

### 3. Get Your Supabase Credentials

1. In your Supabase project, go to Settings → API
2. Copy:
   - **Project URL** (under Project API)
   - **anon public** key
   - **service_role** key (for server-side operations)

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` and add your credentials:

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Stripe (use test keys for development)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# SendGrid (optional for email notifications)
SENDGRID_API_KEY=SG...
SENDGRID_TEMPLATE_ID_SHIPPED=d-...
SENDGRID_TEMPLATE_ID_OUT_FOR_DELIVERY=d-...
SENDGRID_TEMPLATE_ID_DELIVERED=d-...

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_SUPPORT_EMAIL=support@loadifymarket.co.uk
VITE_COMMISSION_RATE=0.07
```

### Stripe Setup (Optional for Development)

1. Create a Stripe account at [https://stripe.com](https://stripe.com)
2. Get test API keys from Dashboard → Developers → API keys
3. For Stripe Connect (seller payouts), set up Connect in your Stripe dashboard

### SendGrid Setup (Optional)

1. Create SendGrid account at [https://sendgrid.com](https://sendgrid.com)
2. Get API key from Settings → API Keys
3. Create transactional email templates for shipping notifications

**Note:** The app works without Stripe/SendGrid using mock services for development.

## Running the Application

### Development Server

```bash
npm run dev
```

The app will start at [http://localhost:5173](http://localhost:5173)

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Core Features Overview

Loadify Market includes all core marketplace features:

### 1. ✅ Product Listing System

**Sellers can:**
- Create listings for products, pallets, lots, or clearance items
- Upload up to 10 images per product
- Set pricing with automatic VAT calculation
- Choose from 15 main categories and 60+ subcategories
- Add product specifications, dimensions, and weight
- Manage stock quantities
- Edit and delete their listings

**Access:** `/seller/products/new`

### 2. ✅ Marketplace Categories

Complete category structure:
- Mixed Job Lots
- Clothing (Men's, Women's, Kids, Vintage, Activewear)
- Shoes (Men's, Women's, Kids, Trainers, Boots)
- Jewellery (Necklaces, Rings, Earrings, Bracelets, Watches)
- Media & Electronics (Phones, Computers, Tablets, Gaming, Audio, Cameras, TV)
- Accessories, Toys, Health & Beauty, Pets
- Memorabilia, Adult, Food & Drink
- Office Supplies, Home & Garden, Sports & Outdoors

### 3. ✅ Seller Dashboard

**Features:**
- Overview with sales statistics
- Analytics with revenue trends
- Product management (add/edit/delete)
- Order management
- Returns and shipments handling
- Profile and store editing
- Earnings overview

**Access:** `/seller`

### 4. ✅ Buyer Features

**Buyers can:**
- Browse catalog with grid/list view
- Search products by title/description
- Filter by category, price, condition, type
- Sort by date, price, rating
- Add items to wishlist
- Add to cart and checkout
- Track orders
- Message sellers
- Leave reviews

**Access:** `/catalog`, `/cart`, `/wishlist`

### 5. ✅ Authentication

**Registration:**
- Separate flows for buyers and sellers
- Email + password authentication via Supabase
- Automatic profile creation
- Email verification ready

**Login:**
- Secure authentication
- Role-based access control
- Session management

**Access:** `/register`, `/login`

### 6. ✅ Admin Panel

**Admins can:**
- View system metrics and analytics
- Approve/reject seller applications
- Approve/reject product listings
- Manage categories
- View and resolve reported listings
- Manage users (block/unblock)
- Export data (orders, sales, commissions, VAT)
- Monitor disputes

**Access:** `/admin`

### 7. ✅ Database Schema

Complete database with all entities:
- Users (buyer, seller, admin roles)
- Seller Profiles & Stores
- Products & Categories
- Orders & Order Items
- Reviews & Ratings
- Returns & Disputes
- Messages & Conversations
- Carts & Wishlists
- Payment Sessions
- Payouts

### 8. ✅ Additional Features

- Order tracking with shipment updates
- Returns management (14-day return policy)
- Dispute resolution center
- Wishlist functionality
- Messaging system
- Notification settings
- GDPR-compliant legal pages
- Mobile-responsive design

## Testing

### Test User Accounts (Development Only)

After running `database-seed-testdata.sql`:

**Buyer Account:**
- Email: buyer@test.com
- Password: (create via Supabase Auth dashboard)

**Seller Account:**
- Email: seller@test.com
- Password: (create via Supabase Auth dashboard)

**Admin Account:**
- Email: admin@loadifymarket.co.uk
- Password: (create via Supabase Auth dashboard)

### Manual Testing Checklist

- [ ] User registration (buyer and seller)
- [ ] User login and logout
- [ ] Browse catalog and filter products
- [ ] Product search functionality
- [ ] Add products to wishlist
- [ ] Add products to cart
- [ ] Checkout process (with Stripe test cards)
- [ ] Seller can create product listing
- [ ] Seller dashboard shows correct data
- [ ] Admin can approve sellers
- [ ] Admin can approve products
- [ ] Order tracking works
- [ ] Messages between buyers and sellers

### Test Cards (Stripe)

When testing checkout with Stripe:
- Success: 4242 4242 4242 4242
- Declined: 4000 0000 0000 0002
- Use any future expiry date and any CVV

## Deployment

### Netlify Deployment

The project is configured for Netlify:

1. **Connect Repository**
   - Go to [Netlify](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node version: 20

3. **Set Environment Variables**
   - Add all variables from `.env` in Netlify dashboard
   - Go to Site settings → Environment variables

4. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy automatically

The `netlify.toml` file is already configured with proper settings.

### Custom Domain

1. In Netlify dashboard, go to Domain settings
2. Add your custom domain (loadifymarket.co.uk)
3. Update DNS records as instructed
4. SSL certificate is automatically provisioned

## Troubleshooting

### "Supabase credentials not found" warning

**Issue:** App shows mock client warning

**Solution:** Add Supabase credentials to `.env`:
```env
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### Cannot login/register

**Issue:** Authentication fails

**Solutions:**
1. Check Supabase credentials are correct
2. Verify email provider is enabled in Supabase (Authentication → Providers)
3. Check browser console for errors
4. Verify database tables exist

### Products don't appear in catalog

**Issue:** No products showing

**Solutions:**
1. Check products exist in database: `SELECT * FROM products;`
2. Verify products have `isActive = true` and `isApproved = true`
3. Check RLS policies allow public read access
4. Verify categories are seeded

### Seller cannot create products

**Issue:** Product creation fails

**Solutions:**
1. Verify seller is approved: Check `seller_profiles.isApproved = true`
2. Check seller is logged in with seller role
3. Verify categories exist in database
4. Check browser console for specific errors

### Build errors

**Issue:** TypeScript or build errors

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps

1. **Customize Branding**
   - Update logo and colors in `tailwind.config.js`
   - Modify homepage content in `src/pages/HomePage.tsx`

2. **Configure Payment**
   - Set up Stripe Connect for seller payouts
   - Configure webhook endpoints
   - Test payment flows

3. **Set Up Email**
   - Create SendGrid templates
   - Configure email notifications
   - Test transactional emails

4. **Add Content**
   - Create real product listings
   - Add seller accounts
   - Populate categories with real items

5. **Launch**
   - Remove test data
   - Configure production environment
   - Set up monitoring and analytics
   - Deploy to production

## Support & Documentation

- **Database Setup:** See [DATABASE_SETUP_COMPLETE.md](./DATABASE_SETUP_COMPLETE.md)
- **Features:** See [FEATURES.md](./FEATURES.md)
- **API Docs:** See [MOCK_SERVICES_GUIDE.md](./MOCK_SERVICES_GUIDE.md)
- **Email:** loadifymarket.co.uk@gmail.com

## License

Copyright © 2024 Loadify Market LTD. All rights reserved.
