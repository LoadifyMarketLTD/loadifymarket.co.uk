# SQL Debug Notes — All Errors Explained & Fixed

All errors have been fixed in the individual SQL files (01–10) and in
`00_consolidated_schema.sql`. Below is a summary of every error and fix.

---

## ERROR 1 — PART 1: `42P01: relation "users" does not exist`

**File:** Part 1 / `10_rls_policies.sql` helper functions block

**Root cause:**
`is_admin_or_owner()`, `is_owner()`, `is_seller()` used `LANGUAGE sql`.
Postgres validates table references in `LANGUAGE sql` functions **at creation
time**, so they fail if `users` does not exist yet.

**Fix:** Changed to `LANGUAGE plpgsql` — table references are validated at
**call time**, not creation time. This is correct because the helpers must
be created in Part 1 (before any tables exist) and called in Part 9 (RLS).

```sql
-- BEFORE (broken):
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- AFTER (fixed):
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

---

## ERROR 2 — PART 2: `42883: function update_updated_at_column() does not exist`

**File:** Part 2 / `01_users_profiles.sql`

**Root cause:** Part 2 was run without running Part 1 first.
The `update_updated_at_column()` function is defined in Part 1.

**Fix:** Always run PART 1 before PART 2. The function is defined in:
- `00_consolidated_schema.sql` (single-file run)
- Or in `10_rls_policies.sql` preamble (individual run)

If running individual files, run `10_rls_policies.sql` helper section first,
OR run the helper block from the top of `10_rls_policies.sql` manually.

---

## ERROR 3 — PART 3: `42703: column "parentId" does not exist`

**File:** Part 3 / `02_categories_products.sql` — categories table

**Root cause:** The `categories` table in the OLD schema used `parent_id`
(snake_case). The `idx_categories_parent` index and any queries using
`"parentId"` (camelCase quoted) failed.

**Fix:** All column names in `categories` now consistently use camelCase
with quoted identifiers:
```sql
"parentId"  UUID  REFERENCES categories(id) ON DELETE SET NULL
```
The index is now:
```sql
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories ("parentId");
```

---

## ERROR 4 — PART 4 (wishlists), PART 5 (rfq), PART 6 (logistics):
## `42P01: relation "users" does not exist`

**Root cause:** These parts were run before PART 2 (users table).

**Fix:** Always run in order. See RUN ORDER below.

---

## ERROR 5 — PART 7: `42P01: relation "products" does not exist`

**Root cause:** PART 7 (reviews, disputes, conversations) references
`products(id)`. It was run before PART 3 (products table).

**Fix:** Run in order. PART 3 must precede PART 7.

---

## ERROR 6 — PART 8: `42P01: relation "products" does not exist`

Same as ERROR 5. PART 8 (admin/moderation) references `products(id)`.

**Fix:** Run in order.

---

## ERROR 7 — PART 9: `42P01: relation "users" does not exist`

**Root cause:** PART 9 (RLS policies) calls `is_admin_or_owner()` which
queries `users`. It was run before users table was created.

**Fix:** Run in order. Also ensure helpers use `LANGUAGE plpgsql` (see ERROR 1).

---

## ERROR 8 — PART 10 seed: `42703: column "description" does not exist`

**Root cause:** The OLD `categories` table in Supabase (created with the
old schema) had a different column set — it did not have a `description`
column, or the column was named differently.

**Fix:** The new `categories` table definition includes `description TEXT`.
If the table already exists from the old schema, either:
1. Run `00_reset.sql` first to drop all tables, then re-run from PART 1
2. Or manually `ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;`

---

## CORRECT RUN ORDER

```
PART 1 — Extensions + helper functions     (MANDATORY — run first)
PART 2 — Core identity tables              (MANDATORY — depends on PART 1)
PART 3 — Categories & products             (MANDATORY — depends on PART 2)
PART 4 — Wishlists, notifications          (depends on PART 2)
PART 5 — Cart, orders, payments            (depends on PART 2 + 3)
PART 6 — Reviews, disputes, messaging      (depends on PART 2 + 3 + 5)
PART 7 — Logistics, transport, RFQ         (depends on PART 2 + 3 + 5)
PART 8 — Admin, moderation, support        (depends on PART 2 + 3 + 5)
PART 9 — RLS policies                      (MANDATORY — run LAST)
PART 10 — Seed data + owner setup          (OPTIONAL — after PART 3)
```
