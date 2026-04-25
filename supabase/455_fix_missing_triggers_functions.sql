-- Migration 455: Idempotent fix for all missing functions and triggers
-- Re-creates all 28 expected functions and all 49 expected triggers.
-- Safe to re-run: all functions use CREATE OR REPLACE, triggers use DROP IF EXISTS + CREATE

-- ============================================================================
-- SECTION 1: HELPER / UTILITY FUNCTIONS
-- ============================================================================

-- Camel-case updatedAt columns (most tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Snake-case updated_at columns (shipments, shipping_zones, etc.)
CREATE OR REPLACE FUNCTION public.update_updated_at_column_snake()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generic snake_case updated_at helper (used by services tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 2: AUTH / USER FUNCTIONS
-- ============================================================================

-- Creates a stub public.users row when a new auth.users row is inserted.
-- ON CONFLICT DO NOTHING (no target) suppresses all unique constraint violations.
-- EXCEPTION guard prevents the trigger from ever blocking auth user creation.
-- Latest definition: 430_fix_auth_trigger_robustness.sql
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
      WHEN (NEW.raw_app_meta_data->>'role') IN ('admin', 'seller', 'buyer')
        THEN (NEW.raw_app_meta_data->>'role')
      WHEN (NEW.raw_user_meta_data->>'role') IN ('admin', 'seller', 'buyer')
        THEN (NEW.raw_user_meta_data->>'role')
      ELSE 'buyer'
    END,
    (NEW.email_confirmed_at IS NOT NULL)
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_auth_user: non-fatal error for auth user % (email: %): %',
    NEW.id, NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

-- Creates buyer_profiles/seller_profiles/seller_stores rows on user INSERT or role UPDATE.
-- Latest definition: 370_user_sync_stripe_events.sql (fires on INSERT OR UPDATE OF role)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'buyer' THEN
    INSERT INTO buyer_profiles ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSIF NEW.role = 'seller' THEN
    INSERT INTO seller_profiles ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
    INSERT INTO seller_stores ("userId") VALUES (NEW.id) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Corrects isEmailVerified = FALSE on INSERT when Supabase Auth already has
-- email_confirmed_at set. Latest definition: 442_fix_sync_email_verified_trigger.sql
CREATE OR REPLACE FUNCTION public.sync_email_verified_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_confirmed BOOLEAN;
BEGIN
  IF NEW."isEmailVerified" = FALSE THEN
    SELECT (email_confirmed_at IS NOT NULL)
    INTO   v_confirmed
    FROM   auth.users
    WHERE  id = NEW.id;

    IF v_confirmed = TRUE THEN
      NEW."isEmailVerified" := TRUE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Keeps auth.users.raw_app_meta_data.role in sync with public.users.role.
-- Latest definition: 340_sync_role_to_auth_metadata.sql
CREATE OR REPLACE FUNCTION public.sync_role_to_auth_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- SECTION 3: BUSINESS LOGIC FUNCTIONS
-- ============================================================================

-- JWT fast-path + DB fallback; UUID regex guard prevents 22P02 errors.
-- Named dollar-quote tag prevents Supabase SQL editor's bare-$$ splitting bug.
-- Latest definition: 00_consolidated_schema.sql (consolidates 380/389/390 fixes)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    OR (
      (auth.jwt() ->> 'sub') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id       = (auth.jwt() ->> 'sub')::uuid
          AND role     = 'admin'
          AND "isActive" = TRUE
      )
    ),
    false
  )
$func$;

-- Backward-compat alias — delegates to is_admin().
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT public.is_admin()
$func$;

CREATE OR REPLACE FUNCTION public.is_seller()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'seller'
    OR (
      (auth.jwt() ->> 'sub') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id       = (auth.jwt() ->> 'sub')::uuid
          AND role     = 'seller'
          AND "isActive" = TRUE
      )
    ),
    false
  )
$func$;

-- Checks whether the calling user owns a product (bypasses RLS to avoid recursion).
CREATE OR REPLACE FUNCTION public.owns_product(p_product_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $func$
  SELECT COALESCE(
    (auth.jwt() ->> 'sub') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND EXISTS (
      SELECT 1 FROM public.products
      WHERE id         = p_product_id
        AND "sellerId" = (auth.jwt() ->> 'sub')::uuid
    ),
    false
  )
$func$;

-- Keeps isApproved/activatedAt in sync whenever sellerStatus changes.
-- Latest definition: 00_consolidated_schema.sql (consolidates 210 changes)
CREATE OR REPLACE FUNCTION public.sync_seller_approval_from_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."sellerStatus" = 'active' THEN
    NEW."isApproved" = TRUE;
    IF NEW."activatedAt" IS NULL THEN
      NEW."activatedAt" = NOW();
    END IF;
  ELSIF NEW."sellerStatus" IN ('draft', 'submitted', 'suspended') THEN
    NEW."isApproved" = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sets isVerified/listingLimit/verifiedAt when verificationStatus changes.
CREATE OR REPLACE FUNCTION public.handle_seller_verification_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."verificationStatus" = 'verified' AND OLD."verificationStatus" != 'verified' THEN
    NEW."isVerified"   = TRUE;
    NEW."listingLimit" = NULL;
    NEW."verifiedAt"   = NOW();
  END IF;
  IF NEW."verificationStatus" = 'suspended' AND OLD."verificationStatus" != 'suspended' THEN
    NEW."isVerified" = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Marks onboardingCompleted=TRUE when all required seller steps are done.
-- Stripe fields do NOT gate onboarding — only payments.
-- Latest definition: 453_stripe_free_onboarding.sql
CREATE OR REPLACE FUNCTION public.sync_seller_onboarding_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW."profileCompleted"     IS TRUE AND
    NEW."storeCreated"         IS TRUE AND
    NEW."hasServiceCapability" IS TRUE AND
    COALESCE(NEW."sellerStatus", 'pending') NOT IN ('suspended', 'rejected')
  ) THEN
    UPDATE users
    SET "onboardingCompleted" = TRUE,
        "onboardingStep"      = 8
    WHERE id = NEW."userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sets hasServiceCapability=TRUE on seller_profiles when a product becomes active.
-- Latest definition: 447_service_first_onboarding.sql
CREATE OR REPLACE FUNCTION public.set_seller_service_capability()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE seller_profiles
  SET "hasServiceCapability" = TRUE
  WHERE "userId" = NEW."sellerId"
    AND "hasServiceCapability" IS DISTINCT FROM TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sets hasServiceCapability=TRUE on seller_profiles when a service becomes active.
-- Latest definition: 447_service_first_onboarding.sql
CREATE OR REPLACE FUNCTION public.set_seller_service_capability_from_services()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE seller_profiles
  SET "hasServiceCapability" = TRUE
  WHERE "userId" = NEW.seller_id
    AND "hasServiceCapability" IS DISTINCT FROM TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recomputes product rating/reviewCount after any review INSERT/UPDATE/DELETE.
CREATE OR REPLACE FUNCTION public.refresh_product_rating()
RETURNS TRIGGER AS $$
DECLARE v_pid UUID;
BEGIN
  v_pid := COALESCE(NEW."productId", OLD."productId");
  UPDATE products SET
    rating        = (SELECT COALESCE(AVG(rating), 0) FROM reviews
                     WHERE "productId" = v_pid AND status = 'published'),
    "reviewCount" = (SELECT COUNT(*) FROM reviews
                     WHERE "productId" = v_pid AND status = 'published'),
    "updatedAt"   = NOW()
  WHERE id = v_pid;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Atomically decrements product stock with row-level lock and stock status update.
-- Latest definition: 445_add_decrement_product_stock.sql
CREATE OR REPLACE FUNCTION public.decrement_product_stock(
  p_product_id UUID,
  p_qty        INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current INTEGER;
BEGIN
  SELECT "stockQuantity"
  INTO   v_current
  FROM   public.products
  WHERE  id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product % not found', p_product_id;
  END IF;

  IF v_current IS NULL THEN
    v_current := 0;
  END IF;

  UPDATE public.products
  SET
    "stockQuantity" = GREATEST(v_current - p_qty, 0),
    "stockStatus"   = CASE
                        WHEN GREATEST(v_current - p_qty, 0) <= 0  THEN 'out_of_stock'
                        WHEN GREATEST(v_current - p_qty, 0) <= 10 THEN 'low_stock'
                        ELSE 'in_stock'
                      END,
    "updatedAt"     = NOW()
  WHERE id = p_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_product_stock(UUID, INTEGER) TO authenticated;

-- Increments product views and upserts recently_viewed + product_analytics.
CREATE OR REPLACE FUNCTION public.track_product_view(
  p_product_id UUID,
  p_user_id    UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET views = COALESCE(views, 0) + 1, "lastViewedAt" = NOW()
  WHERE id = p_product_id;
  IF p_user_id IS NOT NULL THEN
    INSERT INTO recently_viewed ("userId", "productId", "viewedAt")
    VALUES (p_user_id, p_product_id, NOW())
    ON CONFLICT ("userId", "productId") DO UPDATE SET "viewedAt" = NOW();
  ELSIF p_session_id IS NOT NULL THEN
    INSERT INTO recently_viewed ("sessionId", "productId", "viewedAt")
    VALUES (p_session_id, p_product_id, NOW())
    ON CONFLICT ("sessionId", "productId") DO UPDATE SET "viewedAt" = NOW();
  END IF;
  INSERT INTO product_analytics ("productId", date, views, "uniqueVisitors")
  VALUES (p_product_id, CURRENT_DATE, 1, 1)
  ON CONFLICT ("productId", date) DO UPDATE SET
    views            = product_analytics.views + 1,
    "uniqueVisitors" = product_analytics."uniqueVisitors" + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updates conversations.lastMessageAt when a new message is inserted.
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET "lastMessageAt" = NEW."createdAt" WHERE id = NEW."conversationId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Validates that categoryId/subcategoryId exist and are active before product insert/update.
-- Latest definition: 400_global_category_system.sql
CREATE OR REPLACE FUNCTION public.validate_product_category_assignment()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
DECLARE
  category_active BOOLEAN;
BEGIN
  SELECT "isActive" INTO category_active
  FROM categories
  WHERE id = NEW."categoryId";

  IF category_active IS NULL THEN
    RAISE EXCEPTION 'Invalid category assignment: category does not exist.';
  END IF;

  IF category_active = FALSE THEN
    RAISE EXCEPTION 'Invalid category assignment: category is inactive.';
  END IF;

  IF NEW."subcategoryId" IS NOT NULL THEN
    PERFORM 1 FROM categories WHERE id = NEW."subcategoryId";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid subcategory assignment: subcategory does not exist.';
    END IF;
  END IF;

  RETURN NEW;
END;
$func$;

-- Keeps parent_id and "parentId" columns aligned on the categories table.
-- Latest definition: 400_global_category_system.sql
CREATE OR REPLACE FUNCTION public.sync_category_parent_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $func$
BEGIN
  IF NEW.parent_id IS NOT NULL AND NEW."parentId" IS NULL THEN
    NEW."parentId" := NEW.parent_id;
  ELSIF NEW."parentId" IS NOT NULL AND NEW.parent_id IS NULL THEN
    NEW.parent_id := NEW."parentId";
  ELSIF NEW.parent_id IS NOT NULL AND NEW."parentId" IS NOT NULL AND NEW.parent_id <> NEW."parentId" THEN
    NEW.parent_id := NEW."parentId";
  END IF;

  RETURN NEW;
END;
$func$;

-- ============================================================================
-- SECTION 4: RPC / PAYOUT FUNCTIONS
-- ============================================================================

-- Logs an admin action to audit_logs (SECURITY DEFINER bypasses RLS).
-- Latest definition: 90_launch_features.sql
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action     TEXT,
  p_table_name TEXT  DEFAULT NULL,
  p_record_id  UUID  DEFAULT NULL,
  p_old_data   JSONB DEFAULT NULL,
  p_new_data   JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (
    "actorId", action, "tableName", "recordId", "oldData", "newData"
  ) VALUES (
    auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data
  );
END;
$$;

-- Seller-callable RPC: validates available balance, inserts request, reserves amount.
-- Latest definition: 90_launch_features.sql
CREATE OR REPLACE FUNCTION public.request_payout(p_amount DECIMAL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_seller_id  UUID := auth.uid();
  v_available  DECIMAL(12,2);
  v_request_id UUID;
BEGIN
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'request_payout: caller is not authenticated';
  END IF;

  SELECT "availableAmount" INTO v_available
    FROM seller_balance
   WHERE "sellerId" = v_seller_id;

  IF v_available IS NULL OR v_available < p_amount THEN
    RAISE EXCEPTION
      'Insufficient available balance — available: %, requested: %',
      COALESCE(v_available, 0), p_amount;
  END IF;

  INSERT INTO payout_requests ("sellerId", amount, status)
    VALUES (v_seller_id, p_amount, 'requested')
  RETURNING id INTO v_request_id;

  UPDATE seller_balance
    SET "availableAmount" = "availableAmount" - p_amount,
        "pendingAmount"   = "pendingAmount"   + p_amount,
        "updatedAt"       = NOW()
   WHERE "sellerId" = v_seller_id;

  RETURN v_request_id;
END;
$$;

-- Credits seller balance after a paid order (called by Stripe webhook).
-- Latest definition: 454_payout_rpc_security.sql (SET search_path = '')
CREATE OR REPLACE FUNCTION public.credit_seller_balance(
  p_seller_id UUID,
  p_order_id  UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subtotal   DECIMAL(12,2);
  v_commission DECIMAL(12,2);
  v_net        DECIMAL(12,2);
BEGIN
  SELECT subtotal, commission
    INTO v_subtotal, v_commission
    FROM public.orders
   WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'credit_seller_balance: order % not found', p_order_id;
  END IF;

  v_net := COALESCE(v_subtotal, 0) - COALESCE(v_commission, 0);

  IF v_net < 0 THEN
    v_net := 0;
  END IF;

  INSERT INTO public.seller_balance ("sellerId", "availableAmount", "totalEarned", "updatedAt")
    VALUES (p_seller_id, v_net, v_net, NOW())
  ON CONFLICT ("sellerId") DO UPDATE
    SET "availableAmount" = public.seller_balance."availableAmount" + EXCLUDED."availableAmount",
        "totalEarned"     = public.seller_balance."totalEarned"     + EXCLUDED."totalEarned",
        "updatedAt"       = NOW();
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_seller_balance(UUID, UUID) TO authenticated;

-- Admin: moves payout request from 'requested' → 'approved'.
-- Latest definition: 454_payout_rpc_security.sql (SET search_path = '')
CREATE OR REPLACE FUNCTION public.approve_payout(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.payout_requests
    SET status       = 'approved',
        "reviewedBy" = auth.uid(),
        "reviewedAt" = NOW()
   WHERE id = p_request_id AND status = 'requested';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_payout: request % not found or not in requested state', p_request_id;
  END IF;

  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId")
    VALUES (auth.uid(), 'approve_payout', 'payout_requests', p_request_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_payout(UUID) TO authenticated;

-- Admin: moves 'approved' → 'paid', drains pending balance, records in payouts ledger.
-- Latest definition: 454_payout_rpc_security.sql (SET search_path = '')
CREATE OR REPLACE FUNCTION public.complete_payout(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_amount    DECIMAL(12,2);
BEGIN
  SELECT "sellerId", amount
    INTO v_seller_id, v_amount
    FROM public.payout_requests
   WHERE id = p_request_id AND status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'complete_payout: request % not found or not in approved state', p_request_id;
  END IF;

  UPDATE public.payout_requests
    SET status   = 'paid',
        "paidAt" = NOW()
   WHERE id = p_request_id;

  UPDATE public.seller_balance
    SET "pendingAmount" = GREATEST("pendingAmount" - v_amount, 0),
        "updatedAt"     = NOW()
   WHERE "sellerId" = v_seller_id;

  INSERT INTO public.payouts ("sellerId", amount, status, "paidAt")
    VALUES (v_seller_id, v_amount, 'paid', NOW());

  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId")
    VALUES (auth.uid(), 'complete_payout', 'payout_requests', p_request_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_payout(UUID) TO authenticated;

-- Admin: rejects a requested/approved payout, returning amount to available balance.
-- Latest definition: 454_payout_rpc_security.sql (SET search_path = '')
CREATE OR REPLACE FUNCTION public.reject_payout(
  p_request_id UUID,
  p_notes      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_amount    DECIMAL(12,2);
BEGIN
  SELECT "sellerId", amount
    INTO v_seller_id, v_amount
    FROM public.payout_requests
   WHERE id = p_request_id AND status IN ('requested', 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reject_payout: request % not found or already processed', p_request_id;
  END IF;

  UPDATE public.payout_requests
    SET status       = 'rejected',
        notes        = COALESCE(p_notes, notes),
        "reviewedBy" = auth.uid(),
        "reviewedAt" = NOW()
   WHERE id = p_request_id;

  UPDATE public.seller_balance
    SET "availableAmount" = "availableAmount" + v_amount,
        "pendingAmount"   = GREATEST("pendingAmount" - v_amount, 0),
        "updatedAt"       = NOW()
   WHERE "sellerId" = v_seller_id;

  INSERT INTO public.audit_logs ("actorId", action, "tableName", "recordId", "newData")
    VALUES (auth.uid(), 'reject_payout', 'payout_requests', p_request_id,
            jsonb_build_object('notes', p_notes));
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_payout(UUID, TEXT) TO authenticated;

-- ============================================================================
-- SECTION 5: TRIGGERS
-- (DROP IF EXISTS + CREATE pattern — idempotent, PostgreSQL-compatible)
-- ============================================================================

-- ── auth.users ───────────────────────────────────────────────────────────────
-- NOTE: on_auth_user_created fires on auth.users (not public schema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- ── public.users ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_users_updatedAt ON public.users;
CREATE TRIGGER trg_users_updatedAt
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fires on INSERT and on UPDATE OF role (creates profile rows for role changes).
-- Latest definition: 370_user_sync_stripe_events.sql
DROP TRIGGER IF EXISTS trg_new_user_profile ON public.users;
CREATE TRIGGER trg_new_user_profile
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Corrects isEmailVerified on INSERT from auth.users state.
-- Latest definition: 442_fix_sync_email_verified_trigger.sql
DROP TRIGGER IF EXISTS trg_sync_email_verified ON public.users;
CREATE TRIGGER trg_sync_email_verified
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_email_verified_on_insert();

-- Syncs public.users.role into auth.users.raw_app_meta_data on INSERT or role UPDATE.
-- Latest definition: 340_sync_role_to_auth_metadata.sql
DROP TRIGGER IF EXISTS trg_sync_role_to_auth_metadata ON public.users;
CREATE TRIGGER trg_sync_role_to_auth_metadata
  AFTER INSERT OR UPDATE OF role ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_role_to_auth_metadata();

-- ── public.buyer_profiles ────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_buyer_profiles_updatedAt ON public.buyer_profiles;
CREATE TRIGGER trg_buyer_profiles_updatedAt
  BEFORE UPDATE ON public.buyer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.seller_profiles ───────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_seller_profiles_updatedAt ON public.seller_profiles;
CREATE TRIGGER trg_seller_profiles_updatedAt
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keeps isApproved/activatedAt in sync when sellerStatus changes.
DROP TRIGGER IF EXISTS trg_seller_status_sync ON public.seller_profiles;
CREATE TRIGGER trg_seller_status_sync
  BEFORE UPDATE OF "sellerStatus" ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_seller_approval_from_status();

-- Upgrades isVerified/listingLimit when verificationStatus becomes 'verified'.
DROP TRIGGER IF EXISTS trg_seller_verification_upgrade ON public.seller_profiles;
CREATE TRIGGER trg_seller_verification_upgrade
  BEFORE UPDATE OF "verificationStatus" ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_seller_verification_upgrade();

-- Marks onboardingCompleted when all required seller steps are done.
-- Function latest: 453_stripe_free_onboarding.sql (Stripe removed from gate).
DROP TRIGGER IF EXISTS trg_sync_seller_onboarding ON public.seller_profiles;
CREATE TRIGGER trg_sync_seller_onboarding
  AFTER UPDATE ON public.seller_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_seller_onboarding_completed();

-- ── public.seller_stores ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_seller_stores_updatedAt ON public.seller_stores;
CREATE TRIGGER trg_seller_stores_updatedAt
  BEFORE UPDATE ON public.seller_stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.seller_verifications ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_seller_verifications_updatedAt ON public.seller_verifications;
CREATE TRIGGER trg_seller_verifications_updatedAt
  BEFORE UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.categories ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_categories_updatedAt ON public.categories;
CREATE TRIGGER trg_categories_updatedAt
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keeps parent_id and "parentId" columns aligned.
-- Latest definition: 400_global_category_system.sql
DROP TRIGGER IF EXISTS trg_categories_parent_sync ON public.categories;
CREATE TRIGGER trg_categories_parent_sync
  BEFORE INSERT OR UPDATE OF "parentId", parent_id ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_category_parent_columns();

-- ── public.category_filter_definitions ──────────────────────────────────────
DROP TRIGGER IF EXISTS trg_category_filter_definitions_updatedAt ON public.category_filter_definitions;
CREATE TRIGGER trg_category_filter_definitions_updatedAt
  BEFORE UPDATE ON public.category_filter_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.products ──────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_products_updatedAt ON public.products;
CREATE TRIGGER trg_products_updatedAt
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validates category/subcategory existence and active state before product insert/update.
-- Latest definition: 400_global_category_system.sql
DROP TRIGGER IF EXISTS trg_products_validate_category_assignment ON public.products;
CREATE TRIGGER trg_products_validate_category_assignment
  BEFORE INSERT OR UPDATE OF "categoryId", "subcategoryId" ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_product_category_assignment();

-- Sets hasServiceCapability=TRUE on seller_profiles when a product becomes active.
-- Latest definition: 447_service_first_onboarding.sql
DROP TRIGGER IF EXISTS trg_products_service_capability ON public.products;
CREATE TRIGGER trg_products_service_capability
  AFTER INSERT OR UPDATE OF "isActive" ON public.products
  FOR EACH ROW
  WHEN (NEW."isActive" IS TRUE)
  EXECUTE FUNCTION public.set_seller_service_capability();

-- ── public.services ──────────────────────────────────────────────────────────
-- Sets hasServiceCapability=TRUE on seller_profiles when a service becomes active.
-- Latest definition: 447_service_first_onboarding.sql
DROP TRIGGER IF EXISTS trg_services_service_capability ON public.services;
CREATE TRIGGER trg_services_service_capability
  AFTER INSERT OR UPDATE OF status ON public.services
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION public.set_seller_service_capability_from_services();

-- ── public.carts ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_carts_updatedAt ON public.carts;
CREATE TRIGGER trg_carts_updatedAt
  BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.cart_items ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_cart_items_updatedAt ON public.cart_items;
CREATE TRIGGER trg_cart_items_updatedAt
  BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.orders ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_orders_updatedAt ON public.orders;
CREATE TRIGGER trg_orders_updatedAt
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.payment_sessions ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_payment_sessions_updatedAt ON public.payment_sessions;
CREATE TRIGGER trg_payment_sessions_updatedAt
  BEFORE UPDATE ON public.payment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.payouts ───────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_payouts_updatedAt ON public.payouts;
CREATE TRIGGER trg_payouts_updatedAt
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.payout_requests ───────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_payout_requests_updatedAt ON public.payout_requests;
CREATE TRIGGER trg_payout_requests_updatedAt
  BEFORE UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.coupons ───────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_coupons_updatedAt ON public.coupons;
CREATE TRIGGER trg_coupons_updatedAt
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.reviews ───────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_reviews_updatedAt ON public.reviews;
CREATE TRIGGER trg_reviews_updatedAt
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recomputes product rating/reviewCount after any review change.
DROP TRIGGER IF EXISTS trg_reviews_refresh_rating ON public.reviews;
CREATE TRIGGER trg_reviews_refresh_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();

-- ── public.product_questions ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_product_questions_updatedAt ON public.product_questions;
CREATE TRIGGER trg_product_questions_updatedAt
  BEFORE UPDATE ON public.product_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.product_offers ────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_product_offers_updatedAt ON public.product_offers;
CREATE TRIGGER trg_product_offers_updatedAt
  BEFORE UPDATE ON public.product_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.returns ───────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_returns_updatedAt ON public.returns;
CREATE TRIGGER trg_returns_updatedAt
  BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.disputes ──────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_disputes_updatedAt ON public.disputes;
CREATE TRIGGER trg_disputes_updatedAt
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.messages ──────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_messages_updatedAt ON public.messages;
CREATE TRIGGER trg_messages_updatedAt
  BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updates conversations.lastMessageAt when a new message is inserted.
DROP TRIGGER IF EXISTS trg_messages_update_conversation ON public.messages;
CREATE TRIGGER trg_messages_update_conversation
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ── public.delivery_requests ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_delivery_requests_updatedAt ON public.delivery_requests;
CREATE TRIGGER trg_delivery_requests_updatedAt
  BEFORE UPDATE ON public.delivery_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.transport_quotes ──────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_transport_quotes_updatedAt ON public.transport_quotes;
CREATE TRIGGER trg_transport_quotes_updatedAt
  BEFORE UPDATE ON public.transport_quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.shipments ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_shipments_updated_at ON public.shipments;
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_snake();

-- ── public.shipping_zones ────────────────────────────────────────────────────
-- Latest definition: 441_add_shipping_zones.sql
DROP TRIGGER IF EXISTS trg_shipping_zones_updated_at ON public.shipping_zones;
CREATE TRIGGER trg_shipping_zones_updated_at
  BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_snake();

-- ── public.rfq_requests ──────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_rfq_requests_updatedAt ON public.rfq_requests;
CREATE TRIGGER trg_rfq_requests_updatedAt
  BEFORE UPDATE ON public.rfq_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.rfq_responses ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_rfq_responses_updatedAt ON public.rfq_responses;
CREATE TRIGGER trg_rfq_responses_updatedAt
  BEFORE UPDATE ON public.rfq_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.reported_listings ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_reported_listings_updatedAt ON public.reported_listings;
CREATE TRIGGER trg_reported_listings_updatedAt
  BEFORE UPDATE ON public.reported_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.support_tickets ───────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_support_tickets_updatedAt ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updatedAt
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.notification_settings ────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_notification_settings_updatedAt ON public.notification_settings;
CREATE TRIGGER trg_notification_settings_updatedAt
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.wishlists ─────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_wishlists_updatedAt ON public.wishlists;
CREATE TRIGGER trg_wishlists_updatedAt
  BEFORE UPDATE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.saved_searches ────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_saved_searches_updatedAt ON public.saved_searches;
CREATE TRIGGER trg_saved_searches_updatedAt
  BEFORE UPDATE ON public.saved_searches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.featured_listings ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_featured_listings_updatedAt ON public.featured_listings;
CREATE TRIGGER trg_featured_listings_updatedAt
  BEFORE UPDATE ON public.featured_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.banners ───────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_banners_updatedAt ON public.banners;
CREATE TRIGGER trg_banners_updatedAt
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.promoted_listings ─────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_promoted_listings_updatedAt ON public.promoted_listings;
CREATE TRIGGER trg_promoted_listings_updatedAt
  BEFORE UPDATE ON public.promoted_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── public.checkout_rate_limits ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_checkout_rate_limits_updatedAt ON public.checkout_rate_limits;
CREATE TRIGGER trg_checkout_rate_limits_updatedAt
  BEFORE UPDATE ON public.checkout_rate_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
DO $$ BEGIN
  RAISE NOTICE '455_fix_missing_triggers_functions: All 28 functions and 49 triggers created/replaced. Safe to re-run.';
END $$;
