-- ================================================================
-- Migration 370: Auth user sync + stripe_events table
-- ================================================================
--
-- ISSUES FIXED:
--
-- 1. ADMIN SEES 0 USERS / BUYERS / SELLERS
--    Root cause: public.users rows are missing for accounts that were
--    created directly in Supabase Auth (e.g. via the Supabase dashboard)
--    rather than through the register.ts Netlify function.
--    Without a public.users row the is_admin() helper returns FALSE
--    which causes the users_select RLS policy to return 0 rows for the
--    admin.  The same missing row causes product seller columns to show
--    "—" and seller/buyer pages to show 0.
--
--    Fix A: Create a trigger on auth.users that auto-inserts a
--    public.users stub whenever a new Supabase Auth account is created.
--
--    Fix B: Backfill public.users for all existing auth.users that
--    lack a matching row (using raw_app_meta_data.role, then
--    raw_user_meta_data.role, then defaulting to 'buyer').
--
--    Fix C: Backfill buyer_profiles / seller_profiles / seller_stores
--    for existing users that have the correct role but no profile row.
--
--    Fix D: Update the handle_new_user_profile trigger to also fire
--    on UPDATE OF role so that role changes (buyer → seller) create
--    the appropriate profile rows.
--
-- 2. STRIPE EVENTS PAGE BROKEN
--    Error: "Could not find the table 'public.stripe_events' in the
--    schema cache"
--    Root cause: migration 170_audit_fixes_2026_03_18.sql (which
--    defines stripe_events) was not applied to this database.
--    Fix: idempotently create the table + policies here.
--
-- SAFE: fully idempotent — CREATE IF NOT EXISTS, ON CONFLICT DO NOTHING,
--       DROP TRIGGER IF EXISTS before CREATE TRIGGER.
-- ================================================================


-- ── 1. Trigger function: auth.users → public.users ───────────────────────────
--
-- Fires on every INSERT to auth.users (i.e. every new Supabase Auth signup,
-- whether via register.ts, the Supabase dashboard, or OAuth).
-- Uses SECURITY DEFINER so it can write to public.users regardless of the
-- caller's role.
-- Role resolution order: raw_app_meta_data.role > raw_user_meta_data.role > 'buyer'
-- ON CONFLICT DO NOTHING: register.ts still inserts its own row first;
-- the trigger fires after and is a no-op if the row already exists.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, "isEmailVerified")
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN (NEW.raw_app_meta_data  ->>'role') IN ('admin','seller','buyer')
        THEN (NEW.raw_app_meta_data->>'role')
      WHEN (NEW.raw_user_meta_data ->>'role') IN ('admin','seller','buyer')
        THEN (NEW.raw_user_meta_data->>'role')
      ELSE 'buyer'
    END,
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (drop first for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();


-- ── 2. Backfill missing public.users rows ────────────────────────────────────
--
-- Creates a stub public.users row for every auth.users entry that doesn't
-- already have one.  Role is resolved from app_metadata, then user_metadata,
-- defaulting to 'buyer'.

INSERT INTO public.users (id, email, role, "isEmailVerified")
SELECT
  a.id,
  a.email,
  CASE
    WHEN (a.raw_app_meta_data  ->>'role') IN ('admin','seller','buyer')
      THEN (a.raw_app_meta_data->>'role')
    WHEN (a.raw_user_meta_data ->>'role') IN ('admin','seller','buyer')
      THEN (a.raw_user_meta_data->>'role')
    ELSE 'buyer'
  END,
  (a.email_confirmed_at IS NOT NULL)
FROM auth.users a
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = a.id)
ON CONFLICT (id) DO NOTHING;


-- ── 3. Sync role from app_metadata for existing rows ────────────────────────
--
-- If a public.users row exists but its role disagrees with raw_app_meta_data,
-- trust app_metadata (it is set/maintained by migration 340 and by the admin
-- promotion flow).  Only update when app_metadata explicitly carries a valid
-- role — never clobber a correctly-set role with an empty/missing metadata.

UPDATE public.users u
SET    role = (a.raw_app_meta_data->>'role')
FROM   auth.users a
WHERE  u.id = a.id
  AND  (a.raw_app_meta_data->>'role') IN ('admin','seller','buyer')
  AND  u.role != (a.raw_app_meta_data->>'role');


-- ── 4. Extend handle_new_user_profile to fire on role updates ────────────────
--
-- Previously the trigger only fired on INSERT.  This means that when a
-- buyer's role is changed to 'seller' no seller_profile / seller_stores rows
-- were created.  Firing on UPDATE OF role (as well as INSERT) fixes this.
-- The function already uses ON CONFLICT DO NOTHING so re-firing on existing
-- roles is harmless.

DROP TRIGGER IF EXISTS trg_new_user_profile ON public.users;
CREATE TRIGGER trg_new_user_profile
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_profile();


-- ── 5. Backfill profile rows for existing users ──────────────────────────────
--
-- Creates missing buyer_profiles / seller_profiles / seller_stores for every
-- existing public.users row that already has the matching role.

INSERT INTO public.buyer_profiles ("userId")
SELECT u.id FROM public.users u
WHERE u.role = 'buyer'
  AND NOT EXISTS (SELECT 1 FROM public.buyer_profiles bp WHERE bp."userId" = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.seller_profiles ("userId")
SELECT u.id FROM public.users u
WHERE u.role IN ('seller','admin')
  AND NOT EXISTS (SELECT 1 FROM public.seller_profiles sp WHERE sp."userId" = u.id)
ON CONFLICT DO NOTHING;

INSERT INTO public.seller_stores ("userId")
SELECT u.id FROM public.users u
WHERE u.role IN ('seller','admin')
  AND NOT EXISTS (SELECT 1 FROM public.seller_stores ss WHERE ss."userId" = u.id)
ON CONFLICT DO NOTHING;


-- ── 6. stripe_events table ───────────────────────────────────────────────────
--
-- This table was defined in 00_consolidated_schema.sql and
-- 170_audit_fixes_2026_03_18.sql but may not have been applied to the live DB.
-- The stripe-webhook Netlify function writes to it for idempotency tracking.
-- The admin Stripe Events page reads from it.

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       TEXT        NOT NULL,
  event_type     TEXT        NOT NULL,
  livemode       BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status         TEXT        NOT NULL DEFAULT 'processed'
                   CHECK (status IN ('processed','failed','skipped')),
  error_message  TEXT,
  metadata       JSONB,
  CONSTRAINT stripe_events_event_id_unique UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id
  ON public.stripe_events (event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type
  ON public.stripe_events (event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed
  ON public.stripe_events (processed_at DESC);

COMMENT ON TABLE public.stripe_events IS
  'Idempotency log for Stripe webhook events processed by stripe-webhook.ts.';

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stripe_events_admin_read"  ON public.stripe_events;
DROP POLICY IF EXISTS "stripe_events_admin_write" ON public.stripe_events;

CREATE POLICY "stripe_events_admin_read"
  ON public.stripe_events
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "stripe_events_admin_write"
  ON public.stripe_events
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.stripe_events TO authenticated;


-- ── 7. Ensure products RLS + product_shipping policies are current ────────────
--
-- Re-applies the definitive fix from migration 360 (idempotent).
-- Guarantees the live DB has the correct policies regardless of which prior
-- migrations were applied.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND "isActive" = TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'seller'
      AND "isActive" = TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owns_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   public.products
    WHERE  id         = p_product_id
      AND  "sellerId" = (SELECT auth.uid())
  );
$$;

GRANT EXECUTE ON FUNCTION public.owns_product(UUID) TO authenticated;

-- Products policies
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

CREATE POLICY "products_select" ON public.products
  FOR SELECT
  USING (
    ("isActive" = TRUE AND "isApproved" = TRUE)
    OR (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  );

CREATE POLICY "products_insert" ON public.products
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    AND public.is_seller()
  );

CREATE POLICY "products_update" ON public.products
  FOR UPDATE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  )
  WITH CHECK (
    (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  );

CREATE POLICY "products_delete" ON public.products
  FOR DELETE
  USING (
    (SELECT auth.uid()) = "sellerId"
    OR public.is_admin()
  );

-- product_shipping write policies (non-recursive via owns_product SECURITY DEFINER)
DROP POLICY IF EXISTS product_shipping_auth_insert ON public.product_shipping;
DROP POLICY IF EXISTS product_shipping_auth_update ON public.product_shipping;
DROP POLICY IF EXISTS product_shipping_auth_delete ON public.product_shipping;

CREATE POLICY product_shipping_auth_insert
  ON public.product_shipping
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.owns_product(product_id)
    OR public.is_admin()
  );

CREATE POLICY product_shipping_auth_update
  ON public.product_shipping
  FOR UPDATE
  TO authenticated
  USING (
    public.owns_product(product_id)
    OR public.is_admin()
  )
  WITH CHECK (
    public.owns_product(product_id)
    OR public.is_admin()
  );

CREATE POLICY product_shipping_auth_delete
  ON public.product_shipping
  FOR DELETE
  TO authenticated
  USING (
    public.owns_product(product_id)
    OR public.is_admin()
  );


DO $$ BEGIN
  RAISE NOTICE '370_user_sync_stripe_events: applied — auth.users trigger, public.users backfill, role sync, profile backfill, stripe_events table, products/product_shipping RLS re-applied.';
END $$;
