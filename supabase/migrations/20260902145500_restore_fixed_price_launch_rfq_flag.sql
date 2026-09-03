-- Restore the production launch posture to fixed-price commerce.
--
-- Audit evidence on 2026-09-02 found hosted feature_flags.rfqSystem=true even
-- though the canonical launch posture and server defaults are rfqSystem=false.
-- This migration changes only that flag and preserves every other feature flag.

UPDATE public.platform_settings
SET value = COALESCE(value, '{}'::jsonb)
  || jsonb_build_object('rfqSystem', false)
WHERE key = 'feature_flags';

DO $$
DECLARE
  v_flags jsonb;
BEGIN
  SELECT value INTO v_flags
  FROM public.platform_settings
  WHERE key = 'feature_flags';

  IF v_flags IS NULL
     OR COALESCE(jsonb_typeof(v_flags), '') <> 'object'
     OR COALESCE((v_flags ->> 'rfqSystem')::boolean, true) IS DISTINCT FROM false
  THEN
    RAISE EXCEPTION 'RFQ launch posture repair failed: feature_flags.rfqSystem is not false';
  END IF;
END
$$;
