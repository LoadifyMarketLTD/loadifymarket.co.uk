# Loadify Market - Database Setup Guide

This guide will help you set up the complete database schema for Loadify Market, including all core tables, categories, and test data.

## Prerequisites

- Supabase account (or PostgreSQL database)
- Database access credentials
- SQL editor or Supabase SQL Editor access

## Setup Steps

### Step 1: Create Base Schema

Run the main database schema file to create all core tables:

```bash
# In Supabase SQL Editor or your PostgreSQL client
# Run: database-schema.sql
```

This creates the following tables:
- users
- buyer_profiles
- seller_profiles
- categories
- products
- orders
- reviews
- returns
- disputes
- payouts
- wishlists
- banners

### Step 2: Add Additional Tables

Run the schema additions file to add messaging, cart, and admin features:

```bash
# Run: database-schema-additions.sql
```

This adds:
- messages
- conversations
- carts
- payment_sessions
- seller_stores
- reported_listings

### Step 3: Seed Categories

Populate the database with the complete category tree:

```bash
# Run: database-seed-categories.sql
```

This creates:
- 15 main categories
- 60+ subcategories
- All categories needed for a complete marketplace

Main categories include:
- Mixed Job Lots
- Clothing
- Shoes
- Jewellery
- Media & Electronics
- Accessories
- Toys
- Health & Beauty
- Pets
- Memorabilia
- Adult
- Food & Drink
- Office Supplies
- Home & Garden
- Sports & Outdoors

### Step 4: Add Test Data (Optional)

For development and testing, you can add sample users and products:

```bash
# Run: database-seed-testdata.sql
```

This creates:
- 1 test buyer (buyer@test.com)
- 1 test seller (seller@test.com)
- 1 admin user (admin@loadifymarket.co.uk)
- 5 sample products across different categories
- Sample wishlist and banner

**Note:** You'll need to create the actual Supabase Auth users separately with matching IDs.

## Creating Auth Users in Supabase

For the test data to work, you need to create users in Supabase Auth:

1. Go to Authentication > Users in your Supabase dashboard
2. Click "Invite User" or "Add User"
3. Create users with these emails:
   - buyer@test.com
   - seller@test.com
   - admin@loadifymarket.co.uk
4. After creating, note their UUIDs and update the test data SQL if needed

## Verification

After running all scripts, verify your setup:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Count categories
SELECT 
  COUNT(CASE WHEN "parentId" IS NULL THEN 1 END) as main_categories,
  COUNT(CASE WHEN "parentId" IS NOT NULL THEN 1 END) as subcategories,
  COUNT(*) as total
FROM categories;

-- Check test data
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as category_count FROM categories;
```

## Environment Variables

Make sure to set up your `.env` file with Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Row Level Security (RLS)

All tables have RLS enabled by default. The policies are defined in the schema files and ensure:

- Users can only view/edit their own data
- Products are publicly viewable but only editable by sellers
- Orders are visible to buyers and sellers involved
- Admins have special access through role checks

## Troubleshooting

### Foreign Key Constraints

If you get foreign key errors, ensure you're running the scripts in order:
1. Base schema first
2. Schema additions second
3. Categories third
4. Test data last

### RLS Policy Errors

If users can't access their data:
1. Verify RLS policies are created
2. Check that auth.uid() matches user IDs
3. Ensure users have the correct role assigned

### Migration Errors

If you need to re-run migrations:

```sql
-- Drop all tables (WARNING: This deletes all data!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Then re-run all setup scripts
```

## Next Steps

After database setup:

1. Configure Stripe for payments
2. Set up SendGrid for emails
3. Configure Supabase Storage for images
4. Test user registration and login
5. Create your first products

## Support

For issues or questions:
- Email: loadifymarket.co.uk@gmail.com
- Check IMPLEMENTATION_STATUS.md for current features
- Review the code comments in schema files
