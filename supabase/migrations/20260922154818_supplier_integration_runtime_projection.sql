-- Server-only runtime projection for verified Universal Supplier Integration Kit bindings.
-- Returns no secret material and performs no external access or commerce activation.

CREATE OR REPLACE FUNCTION public.server_supplier_integration_runtime_v1(
  p_supplier_id uuid,
  p_territory text DEFAULT 'GB'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_territory text := upper(BTRIM(COALESCE(p_territory,'GB')));
  v_supplier private.supplier_foundation_suppliers%ROWTYPE;
  v_profiles jsonb;
BEGIN
  IF p_supplier_id IS NULL OR v_territory !~ '^[A-Z]{2}$' THEN
    RETURN jsonb_build_object('eligible',false,'reason','invalid_scope','profiles','[]'::jsonb,'interfaceVersion',1);
  END IF;

  SELECT * INTO v_supplier
  FROM private.supplier_foundation_suppliers
  WHERE id=p_supplier_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('eligible',false,'reason','supplier_not_found','profiles','[]'::jsonb,'interfaceVersion',1);
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'capability',p.capability,
        'transport',p.transport,
        'executionMode',p.execution_mode,
        'configRef',p.config_ref,
        'mapping',p.mapping,
        'contractRef',p.contract_ref,
        'status',p.status
      )
      ORDER BY p.capability
    ),
    '[]'::jsonb
  )
  INTO v_profiles
  FROM private.supplier_integration_profiles p
  WHERE p.supplier_id=p_supplier_id
    AND p.territory=v_territory
    AND p.status='verified';

  RETURN jsonb_build_object(
    'eligible',true,
    'reason','verified_integration_profiles_loaded',
    'supplierId',v_supplier.id,
    'supplierKey',v_supplier.supplier_key,
    'territory',v_territory,
    'profiles',v_profiles,
    'secretMaterialReturned',false,
    'externalAccessPerformed',false,
    'interfaceVersion',1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_supplier_integration_runtime_v1(uuid,text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_supplier_integration_runtime_v1(uuid,text)
  TO service_role;

COMMENT ON FUNCTION public.server_supplier_integration_runtime_v1(uuid,text) IS
  'Server-only non-secret runtime projection of verified supplier integration bindings. Secret values remain in server environment configuration.';
