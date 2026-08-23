# Loadify Market - Complete Database Setup Guide

This guide provides step-by-step instructions to set up your Loadify Market database with all required tables, indexes, and seed data.

## Prerequisites

- A Supabase account with a project created
- Access to the Supabase SQL Editor

## Setup Steps

### 1. Create Database Schema

Run the following SQL files in order in your Supabase SQL Editor:

#### Option A: Use Complete Schema (Recommended)
```sql
-- Run: database-complete.sql
```
This file contains all tables including:
- Users, Buyer Profiles, Seller Profiles
- Products, Categories
- Orders, Reviews, Returns, Disputes
- Messages, Conversations
- Carts, Payment Sessions
- Seller Stores
- Reported Listings
- Wishlists, Banners, Payouts
- All RLS policies and indexes

#### Option B: Build Incrementally
If you prefer to build the schema step by step:

1. Run `database-schema.sql` - Base tables
2. Run `database-schema-additions.sql` - Additional tables
3. Verify all tables are created

### 2. Seed Categories

After creating tables, populate the categories:

```sql
-- Run: database-seed-categories.sql
```

This creates:
- 15 main categories (Mixed Job Lots, Clothing, Shoes, Jewellery, etc.)
- 60+ subcategories organized hierarchically

### 3. Add Test Data (Development Only)

For development and testing:

```sql
-- Run: database-seed-testdata.sql
```

This creates:
- 1 test buyer (buyer@test.com / password123)
- 1 test seller (seller@test.com / password123)
- 1 admin user (admin@loadifymarket.co.uk / admin123)
- 5 sample products across different categories

**Important:** Delete test data before going to production!

## Verification

After running all scripts, verify your setup:

### Check Tables Exist

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- banners
- buyer_profiles
- carts
- categories
- conversations
- disputes
- messages
- orders
- payment_sessions
- payouts
- products
- reported_listings
- returns
- reviews
- seller_profiles
- seller_stores
- users
- wishlists

### Check Categories

```sql
SELECT COUNT(*) as total_categories FROM categories;
SELECT COUNT(*) as main_categories FROM categories WHERE "parentId" IS NULL;
SELECT COUNT(*) as subcategories FROM categories WHERE "parentId" IS NOT NULL;
```

Expected results:
- Total categories: ~75
- Main categories: 15
- Subcategories: ~60

### Check Test Data

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM seller_profiles;
```

Expected results:
- Users: 3
- Products: 5
- Seller profiles: 1

## Authentication Setup

### Enable Email Authentication

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Email provider
3. Configure email templates (optional)

### Set Email Confirmation (Optional)

For production, enable email confirmation:
1. Go to Authentication → Settings
2. Enable "Confirm email"
3. Configure confirmation redirect URL

### Create Your First User via UI

The RegisterPage handles:
1. Creating auth user via Supabase Auth
2. Creating user profile in `users` table
3. Creating role-specific profile (buyer_profiles or seller_profiles)
4. Creating seller_stores entry (for sellers)

## Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- **Users**: Can view/update own profile
- **Products**: Public read, sellers can manage their own
- **Orders**: Buyers and sellers can view their own orders
- **Messages**: Users can view conversations they're part of
- **Wishlists**: Users can manage their own wishlist
- **Seller Stores**: Public can view active stores, sellers manage their own

## Next Steps

1. Configure your `.env` file with Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. Test authentication:
   - Register a new user
   - Login
   - Verify profile creation

3. Test seller registration:
   - Register as seller (add `?type=seller` to register URL)
   - Verify seller_profiles and seller_stores creation
   - Login as admin to approve seller

4. Test product listing:
   - Login as approved seller
   - Create a product listing
   - Verify product appears in catalog

## Troubleshooting

### "relation does not exist" errors
- Run database-complete.sql again
- Check table names match exactly (case-sensitive)

### RLS Policy errors
- Verify user is authenticated
- Check user.role matches required role
- Review RLS policies in database-complete.sql

### Cannot insert into tables
- Check RLS policies allow insert
- Verify foreign key references exist
- Ensure required fields are provided

### Test users cannot login
- Create auth users manually in Supabase dashboard
- Or use signup flow and manually insert test IDs

## Production Deployment

Before deploying to production:

1. **Remove test data**:
   ```sql
   DELETE FROM products WHERE "sellerId" = '22222222-2222-2222-2222-222222222222';
   DELETE FROM seller_stores WHERE "userId" = '22222222-2222-2222-2222-222222222222';
   DELETE FROM seller_profiles WHERE "userId" = '22222222-2222-2222-2222-222222222222';
   DELETE FROM buyer_profiles WHERE "userId" = '11111111-1111-1111-1111-111111111111';
   DELETE FROM users WHERE id IN (
     '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222',
     '99999999-9999-9999-9999-999999999999'
   );
   ```

2. **Review and adjust**:
   - Commission rates
   - VAT rates
   - Category structure
   - Email templates

3. **Configure production environment variables**

4. **Enable Supabase email confirmation**

5. **Set up Stripe Connect for real payments**

6. **Configure SendGrid for transactional emails**

## Support

For issues or questions:
- Check Supabase logs
- Review database policies
- Consult this documentation
- Contact: loadifymarket.co.uk@gmail.com
