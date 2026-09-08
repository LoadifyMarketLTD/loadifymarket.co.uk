-- Loadify Market ? Google Play v1 compliance boundaries
-- 1) Enforces physical-goods-only commerce at the database write boundary.
-- 2) Adds dedicated in-app report queues for users and reviews.
-- Reporter identity and moderation fields are protected server-side.

CREATE OR REPLACE FUNCTION private.guard_play_v1_physical_goods_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW."listingContext" = 'service' THEN
    RAISE EXCEPTION 'Loadify Market Play v1 supports physical goods only' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.guard_play_v1_physical_goods_only() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_guard_play_v1_physical_goods_only ON public.products;
CREATE TRIGGER trg_guard_play_v1_physical_goods_only
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION private.guard_play_v1_physical_goods_only();

CREATE TABLE IF NOT EXISTS public.reported_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reportedUserId" uuid NOT NULL,
  "reportedBy" uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','hate','sexual','illegal','misleading','impersonation','other')),
  description text CHECK (description IS NULL OR length(description) <= 2000),
  context text NOT NULL DEFAULT 'other' CHECK (context IN ('seller_profile','review','message','other')),
  "contextId" uuid,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  "reviewedBy" uuid,
  "reviewNotes" text,
  "resolvedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reported_users_reported_user_fkey FOREIGN KEY ("reportedUserId") REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT reported_users_reported_by_fkey FOREIGN KEY ("reportedBy") REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT reported_users_reviewed_by_fkey FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT reported_users_no_self CHECK ("reportedUserId" <> "reportedBy")
);

CREATE TABLE IF NOT EXISTS public.reported_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reviewId" uuid NOT NULL,
  "reportedBy" uuid NOT NULL,
  reason text NOT NULL CHECK (reason IN ('spam','harassment','hate','sexual','illegal','misleading','impersonation','other')),
  description text CHECK (description IS NULL OR length(description) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','resolved','dismissed')),
  "reviewedBy" uuid,
  "reviewNotes" text,
  "resolvedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reported_reviews_review_fkey FOREIGN KEY ("reviewId") REFERENCES public.reviews(id) ON DELETE CASCADE,
  CONSTRAINT reported_reviews_reported_by_fkey FOREIGN KEY ("reportedBy") REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT reported_reviews_reviewed_by_fkey FOREIGN KEY ("reviewedBy") REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_reported_users_target_status ON public.reported_users ("reportedUserId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_reported_users_status ON public.reported_users (status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_reported_reviews_target_status ON public.reported_reviews ("reviewId", status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_reported_reviews_status ON public.reported_reviews (status, "createdAt" DESC);

ALTER TABLE public.reported_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reported_reviews ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.reported_users FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.reported_reviews FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reported_users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.reported_reviews TO authenticated;
GRANT ALL ON TABLE public.reported_users TO service_role;
GRANT ALL ON TABLE public.reported_reviews TO service_role;

CREATE OR REPLACE FUNCTION private.protect_reported_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW."reportedBy" := (SELECT auth.uid());
    NEW.status := 'pending';
    NEW."reviewedBy" := NULL;
    NEW."reviewNotes" := NULL;
    NEW."resolvedAt" := NULL;
    NEW."createdAt" := now();
  END IF;
  IF NEW."reportedUserId" = NEW."reportedBy" THEN
    RAISE EXCEPTION 'A user cannot report their own account';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.protect_reported_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS NOT NULL THEN
    NEW."reportedBy" := (SELECT auth.uid());
    NEW.status := 'pending';
    NEW."reviewedBy" := NULL;
    NEW."reviewNotes" := NULL;
    NEW."resolvedAt" := NULL;
    NEW."createdAt" := now();
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.reviews r
    WHERE r.id = NEW."reviewId" AND r."userId" = NEW."reportedBy"
  ) THEN
    RAISE EXCEPTION 'A user cannot report their own review';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.protect_reported_user_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.protect_reported_review_fields() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_reported_user_fields ON public.reported_users;
CREATE TRIGGER trg_protect_reported_user_fields
BEFORE INSERT ON public.reported_users
FOR EACH ROW EXECUTE FUNCTION private.protect_reported_user_fields();

DROP TRIGGER IF EXISTS trg_protect_reported_review_fields ON public.reported_reviews;
CREATE TRIGGER trg_protect_reported_review_fields
BEFORE INSERT ON public.reported_reviews
FOR EACH ROW EXECUTE FUNCTION private.protect_reported_review_fields();

DROP POLICY IF EXISTS reported_users_insert_own ON public.reported_users;
CREATE POLICY reported_users_insert_own ON public.reported_users
FOR INSERT TO authenticated
WITH CHECK (
  "reportedBy" = (SELECT auth.uid())
  AND (SELECT public.is_active_user())
);

DROP POLICY IF EXISTS reported_users_admin_select ON public.reported_users;
CREATE POLICY reported_users_admin_select ON public.reported_users
FOR SELECT TO authenticated
USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS reported_users_admin_update ON public.reported_users;
CREATE POLICY reported_users_admin_update ON public.reported_users
FOR UPDATE TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

DROP POLICY IF EXISTS reported_reviews_insert_own ON public.reported_reviews;
CREATE POLICY reported_reviews_insert_own ON public.reported_reviews
FOR INSERT TO authenticated
WITH CHECK (
  "reportedBy" = (SELECT auth.uid())
  AND (SELECT public.is_active_user())
);

DROP POLICY IF EXISTS reported_reviews_admin_select ON public.reported_reviews;
CREATE POLICY reported_reviews_admin_select ON public.reported_reviews
FOR SELECT TO authenticated
USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS reported_reviews_admin_update ON public.reported_reviews;
CREATE POLICY reported_reviews_admin_update ON public.reported_reviews
FOR UPDATE TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));
