# SQL Run Guide — Loadify Market

All SQL errors that occurred during schema setup, their root causes, and their fixes.

---

## CORRECT RUN ORDER

```
STEP 1  →  PART_1_extensions_helpers.sql   (MANDATORY — run FIRST)
STEP 2  →  01_users_profiles.sql           (MANDATORY — depends on STEP 1)
STEP 3  →  02_categories_products.sql      (MANDATORY — depends on STEP 2)
STEP 4  →  03_cart_orders_checkout.sql     (depends on STEP 2 + 3)
STEP 5  →  04_sellers_reviews_ratings.sql  (depends on STEP 2 + 3 + 4)
STEP 6  →  05_rfq_messages.sql             (depends on STEP 2 + 3)
STEP 7  →  06_delivery_transport_xdrive.sql(depends on STEP 2 + 3 + 4)
STEP 8  →  07_admin_moderation.sql         (depends on STEP 2 + 3 + 4)
STEP 9  →  10_rls_policies.sql             (MANDATORY — run LAST)
```

Alternatively, run `00_consolidated_schema.sql` as a single file.

For a **fresh install**, run `00_reset.sql` first to clear any old tables.

---

## KNOWN ERRORS & FIXES

### ERROR A — `42601: syntax error at or near "$$ LANGUAGE sql STABLE SECURITY DEFINER"`

**What happened:** An older version of the Part 1 SQL used `LANGUAGE sql`
(instead of `LANGUAGE plpgsql`) in the helper functions. With `LANGUAGE sql`,
PostgreSQL validates table references at **function creation time**, so
creating `is_admin_or_owner()` before the `users` table exists fails.

**Root cause:** Do NOT run old SQL snippets saved from previous attempts.
Always run the SQL files from this repository directly.

**Fix in repo:** All helper functions in `PART_1_extensions_helpers.sql`,
`10_rls_policies.sql`, and `00_consolidated_schema.sql` use `LANGUAGE plpgsql`,
which defers table resolution to call time.

**Do NOT manually copy-paste function fragments** — run the full file.

---

### ERROR B — `42601: syntax error at or near ""parentId""` / `LINE 1: "parentId" UUID REFERENCES categories(id)`

**What happened:** The `categories` table was seeded from an older schema
that did not include the `"parentId"` (camelCase) column. When Part 3 ran,
`CREATE TABLE IF NOT EXISTS categories` was silently skipped (table exists),
leaving the column absent.

**Do NOT** run a bare column definition like:
```
"parentId" UUID REFERENCES categories(id) ON DELETE SET NULL
```
That is a column definition inside a `CREATE TABLE` body — it is NOT a
standalone SQL statement. Running it alone produces a syntax error.

**Fix in repo:** `02_categories_products.sql` and `00_consolidated_schema.sql`
now include `ALTER TABLE categories ADD COLUMN IF NOT EXISTS` statements
immediately after the `CREATE TABLE IF NOT EXISTS categories` block.
These are safe no-ops if the column already exists.

If the `categories` table already exists from the old schema, run `PART_1_extensions_helpers.sql`
first (for the helper function), then run:

```sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "parentId"  UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "imageUrl"  TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS icon        TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "order"     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "isActive"  BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();
```

---

### ERROR C — `42P01: relation "users" does not exist` (in helper functions)

Covered by ERROR A above. Use `LANGUAGE plpgsql` and run STEP 1 first.

---

### ERROR D — `42883: function update_updated_at_column() does not exist`

**Cause:** Part 2 (`01_users_profiles.sql`) was run without running Part 1
(`PART_1_extensions_helpers.sql`) first.

**Fix:** Always run PART 1 / STEP 1 before any other file.

---

### ERROR E — `42P01: relation "products" does not exist` (in Parts 7/8)

**Cause:** Parts 7 or 8 were run before Part 3 (products table).

**Fix:** Follow the CORRECT RUN ORDER above.

---

### ERROR F — `42703: column "description" of relation "categories"` (in seed)

**Cause:** Old seeded `categories` table lacked the `description` column.

**Fix:** Same as ERROR B above — run the `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` block.

---

### ERROR G — `42601: syntax error at or near ""isVerified""` / `LINE 1: "isVerified" BOOLEAN NOT NULL DEFAULT FALSE,`

**What happened:** An existing `seller_profiles` table (created from an older
schema) is missing columns that were added later: `isVerified`, `paymentBehaviour`,
`profileCompleteness`, `contactPhone`, and the performance-metric columns.
Because the table already exists, `CREATE TABLE IF NOT EXISTS seller_profiles`
in the migration files is silently skipped — leaving the new columns absent.

**Same root cause as ERROR B** (columns added to a `CREATE TABLE` body never
backfilled via `ALTER TABLE`).

**Fix in repo:** `01_users_profiles.sql` and `20_fix_users_table.sql` now
include `ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS` statements
immediately after the `CREATE TABLE IF NOT EXISTS seller_profiles` block.
These are safe no-ops if the column already exists.

If the `seller_profiles` table already exists from an old schema, run:

```sql
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "disputeRate"         DECIMAL(5,4) NOT NULL DEFAULT 0.0000;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "deliverySuccessRate" DECIMAL(5,4) NOT NULL DEFAULT 1.0000;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "responseTimeHours"   DECIMAL(5,2) NOT NULL DEFAULT 0.00;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "onTimeShipmentRate"  DECIMAL(5,2) NOT NULL DEFAULT 100.00;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "marketplaceRole"     TEXT         CHECK ("marketplaceRole" IN ('carrier','broker','seller'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "paymentBehaviour"    TEXT         CHECK ("paymentBehaviour" IN ('pays_on_time','sometimes_late','repeated_delays'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "isVerified"          BOOLEAN      NOT NULL DEFAULT FALSE;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "profileCompleteness" INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "contactPhone"        TEXT;
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "stripeConnectStatus" TEXT         CHECK ("stripeConnectStatus" IN ('pending', 'restricted', 'active'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "sellerStatus"        TEXT         NOT NULL DEFAULT 'draft' CHECK ("sellerStatus" IN ('draft', 'submitted', 'active', 'suspended'));
ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS "activatedAt"         TIMESTAMPTZ;
```

---

## FRESH INSTALL vs UPGRADE

### Fresh install (recommended)

1. Run `00_reset.sql`  ← drops all old tables
2. Run `00_consolidated_schema.sql`  ← creates everything from scratch

### Upgrade from old schema

1. Run `PART_1_extensions_helpers.sql`
2. Run `01_users_profiles.sql` through `07_admin_moderation.sql` in order
3. Run `10_rls_policies.sql`

The `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` blocks in each file handle
missing columns from the old schema automatically.
