-- Explicit Romania launch cutover control.
-- This is a private operational switch and does not replace per-product checkout gates.

CREATE TABLE IF NOT EXISTS private.market_launch_controls (
  market_code text PRIMARY KEY,
  status text NOT NULL,
  catalog_enabled boolean NOT NULL,
  checkout_enabled boolean NOT NULL,
  payment_enabled boolean NOT NULL,
  change_reason text NOT NULL,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_launch_controls_market_check CHECK (market_code IN ('GB','RO')),
  CONSTRAINT market_launch_controls_status_check CHECK (status IN ('prelaunch','live','paused')),
  CONSTRAINT market_launch_controls_payment_requires_checkout CHECK (NOT payment_enabled OR checkout_enabled),
  CONSTRAINT market_launch_controls_live_checkout_check CHECK (NOT checkout_enabled OR status='live'),
  CONSTRAINT market_launch_controls_reason_check CHECK (NULLIF(BTRIM(change_reason),'') IS NOT NULL)
);

INSERT INTO private.market_launch_controls(
  market_code,status,catalog_enabled,checkout_enabled,payment_enabled,change_reason
) VALUES
  ('GB','live',true,true,true,'Existing UK production boundary'),
  ('RO','prelaunch',true,false,false,'Romania remains prelaunch pending final E2E launch evidence')
ON CONFLICT (market_code) DO NOTHING;

REVOKE ALL ON TABLE private.market_launch_controls
  FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.guard_market_launch_control_v1()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_compliance jsonb;
  v_payment jsonb;
BEGIN
  IF NEW.market_code='GB' THEN
    IF TG_OP='UPDATE' AND (
      NEW.status IS DISTINCT FROM OLD.status
      OR NEW.catalog_enabled IS DISTINCT FROM OLD.catalog_enabled
      OR NEW.checkout_enabled IS DISTINCT FROM OLD.checkout_enabled
      OR NEW.payment_enabled IS DISTINCT FROM OLD.payment_enabled
    ) THEN
      RAISE EXCEPTION 'UK launch boundary is managed by the existing production controls';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.checkout_enabled OR NEW.payment_enabled OR NEW.status='live' THEN
    v_compliance:=public.server_market_compliance_readiness_v1('RO');
    v_payment:=public.server_market_payment_readiness_v1('RO');

    IF COALESCE((v_compliance->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Romania compliance readiness is incomplete';
    END IF;
    IF COALESCE((v_payment->>'eligible')::boolean,false) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Romania payment readiness is incomplete';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_market_launch_control_v1
  ON private.market_launch_controls;
CREATE TRIGGER trg_guard_market_launch_control_v1
BEFORE INSERT OR UPDATE ON private.market_launch_controls
FOR EACH ROW EXECUTE FUNCTION private.guard_market_launch_control_v1();

REVOKE ALL ON FUNCTION private.guard_market_launch_control_v1()
  FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.server_set_romania_launch_control_v1(
  p_status text,
  p_checkout_enabled boolean,
  p_payment_enabled boolean,
  p_reason text,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_row private.market_launch_controls%ROWTYPE;
BEGIN
  IF p_status NOT IN ('prelaunch','live','paused') THEN
    RAISE EXCEPTION 'invalid Romania launch status';
  END IF;
  IF p_payment_enabled AND NOT p_checkout_enabled THEN
    RAISE EXCEPTION 'payment cannot be enabled while checkout is disabled';
  END IF;
  IF NULLIF(BTRIM(COALESCE(p_reason,'')),'') IS NULL THEN
    RAISE EXCEPTION 'launch-control reason is required';
  END IF;
  IF p_actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id=p_actor_id AND role='admin' AND "isActive"=true
  ) THEN
    RAISE EXCEPTION 'active admin identity is required';
  END IF;

  UPDATE private.market_launch_controls
  SET status=p_status,
      checkout_enabled=p_checkout_enabled,
      payment_enabled=p_payment_enabled,
      change_reason=BTRIM(p_reason),
      changed_by=p_actor_id,
      changed_at=now()
  WHERE market_code='RO'
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'market','RO',
    'status',v_row.status,
    'catalogEnabled',v_row.catalog_enabled,
    'checkoutEnabled',v_row.checkout_enabled,
    'paymentEnabled',v_row.payment_enabled,
    'changedAt',v_row.changed_at,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_set_romania_launch_control_v1(text,boolean,boolean,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_set_romania_launch_control_v1(text,boolean,boolean,text,uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.server_market_launch_control_v1(
  p_market_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_market text:=upper(BTRIM(COALESCE(p_market_code,'')));
  v_row private.market_launch_controls%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM private.market_launch_controls
  WHERE market_code=v_market;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','market_launch_control_missing','interfaceVersion',1);
  END IF;

  RETURN jsonb_build_object(
    'eligible',v_row.status='live' AND v_row.checkout_enabled,
    'market',v_row.market_code,
    'status',v_row.status,
    'catalogEnabled',v_row.catalog_enabled,
    'checkoutEnabled',v_row.checkout_enabled,
    'paymentEnabled',v_row.payment_enabled,
    'reason',v_row.change_reason,
    'changedAt',v_row.changed_at,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_market_launch_control_v1(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.server_market_launch_control_v1(text)
  TO service_role;

COMMENT ON TABLE private.market_launch_controls IS
  'Private explicit market launch switch. RO defaults prelaunch and cannot become live until compliance/payment evidence is ready.';
