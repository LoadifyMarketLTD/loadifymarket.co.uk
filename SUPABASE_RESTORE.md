# Supabase Project Restoration Guide

> **Use this guide if the Supabase project has been deleted and needs to be
> recreated from scratch.** All SQL scripts referenced here are already in
> the repository — no data export is required.

---

## Overview

The Loadify Market application requires a Supabase project with:

| Resource | Details |
|---|---|
| Project name | Loadify Market |
| Organisation | xdrivelogistics.co.uk |
| Database | PostgreSQL (managed by Supabase) |
| Auth | Supabase Auth (email/password + magic link) |
| Storage buckets | `product-images` (public) · `proof-of-delivery` (private) |
| Edge/Serverless | **Not used** — functions run on Netlify |

---

## Step 1 — Create a new Supabase project

1. Go to <https://supabase.com/dashboard> and sign in with the
   **xdrivelogistics.co.uk** organisation account.
2. Click **New project**.
3. Fill in:
   - **Name**: `Loadify Market`
   - **Database password**: choose a strong password and save it securely
   - **Region**: `eu-west-2` (London) — or the closest region to your users
4. Click **Create new project** and wait ~2 minutes for provisioning.

---

## Step 2 — Retrieve API credentials

Once the project is ready, go to **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Project URL (e.g. `https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | `anon` / `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (**keep secret — never expose in frontend**) |

Copy these values — you will need them in **Step 6**.

---

## Step 3 — Run the main database schema

Open **SQL Editor** in the Supabase dashboard (left sidebar → SQL Editor →
New query) and run the following files **in order**:

### 3a. Complete schema (tables + indexes + triggers + RLS + category seed)

Paste the full contents of:

```
supabase/00_consolidated_schema.sql
```

This single file creates all 44+ tables, indexes, triggers, Row Level
Security policies, and seeds the 15 root product categories.

> ✅ The script is fully idempotent — safe to re-run if it fails partway
> through (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.).

### 3b. Users-table fix migration

Paste the full contents of:

```
supabase/20_fix_users_table.sql
```

This ensures `public.users`, `buyer_profiles`, `seller_profiles`, and
`seller_stores` exist with the correct schema, triggers, and RLS. It also
backfills any `auth.users` rows that were created before `public.users`
existed.

> ✅ Also fully idempotent.

---

## Step 4 — Create Storage buckets

Still in **SQL Editor**, paste the full contents of:

```
supabase/30_storage_buckets.sql
```

This creates:

| Bucket | Visibility | Max file size | Accepted types |
|---|---|---|---|
| `product-images` | **Public** | 5 MB | JPEG, PNG, WebP, GIF |
| `proof-of-delivery` | **Private** | 10 MB | JPEG, PNG, WebP, PDF |

It also sets the correct RLS policies:
- `product-images`: public read; sellers upload under their own `sellers/{userId}/` path
- `proof-of-delivery`: authenticated read; writes via service-role (Netlify function)

---

## Step 5 — Configure Supabase Auth

### 5a. Email settings (Dashboard → Authentication → Email Templates)

Ensure the following redirect URLs are set under
**Authentication → URL Configuration**:

| Setting | Value |
|---|---|
| Site URL | `https://loadifymarket.co.uk` |
| Redirect URLs (allow-list) | `https://loadifymarket.co.uk/**` |

### 5b. Enable email confirmations (optional but recommended)

**Authentication → Providers → Email**:
- ✅ Enable email confirmations
- ✅ Secure email change

### 5c. SMTP (optional — uses Supabase default if not set)

If you have a custom SMTP (e.g. SendGrid transactional SMTP), configure it
under **Authentication → SMTP Settings**.

---

## Step 6 — Update environment variables

### Local development (`.env`)

Copy `.env.example` to `.env` and fill in the values from Step 2:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### Production (Netlify dashboard)

In the Netlify dashboard for `loadifymarket.co.uk`:

1. Go to **Site configuration → Environment variables**.
2. Update (or add) the three Supabase variables above with the new project's
   values.
3. Trigger a new deploy: **Deploys → Trigger deploy → Deploy site**.

---

## Step 7 — Promote the owner account

After the owner registers through the site (email: `loadifymarket.co.uk@gmail.com`),
run the following in **SQL Editor** to grant the `owner` role:

```sql
UPDATE users
SET role = 'owner'
WHERE email = 'loadifymarket.co.uk@gmail.com';
```

> The owner role gives full admin access and bypasses all RLS policies via
> the `is_owner()` / `is_admin_or_owner()` helper functions.

---

## Step 8 — Verify the restoration

Run the following verification queries in **SQL Editor**:

```sql
-- 1. Check all expected tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Expected: ~44 tables

-- 2. Verify categories were seeded
SELECT COUNT(*) AS total_categories FROM categories;
-- Expected: 15

-- 3. Verify storage buckets exist
SELECT id, name, public FROM storage.buckets ORDER BY name;
-- Expected: product-images (public=true), proof-of-delivery (public=false)

-- 4. Verify RLS is enabled on core tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = TRUE
ORDER BY tablename;
-- Expected: all 44 tables listed
```

---

## Rollback / clean restart

If something goes wrong during schema creation and you want a clean slate:

```sql
-- ⚠️  WARNING: This permanently drops ALL tables and data.
-- Only run this if the project is freshly created and has no real data.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;
```

Then repeat from **Step 3**.

---

## Quick reference — SQL files in this repo

| File | Purpose |
|---|---|
| `supabase/00_consolidated_schema.sql` | **Primary restore file** — all tables, RLS, category seed |
| `supabase/10_rls_policies.sql` | Standalone RLS policies (already included in `00_`) |
| `supabase/20_fix_users_table.sql` | Users/profiles migration — run after `00_` |
| `supabase/30_storage_buckets.sql` | Storage bucket creation with RLS |
| `database-seed-categories.sql` | Extended category seed (already in `00_`) |
| `database-seed-testdata.sql` | Optional test data for development only |

---

## Support

- Supabase status: <https://status.supabase.com>
- Supabase support (for project recovery within grace period):
  <https://supabase.com/dashboard/support>
- Platform email: `loadifymarket.co.uk@gmail.com`
