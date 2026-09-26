-- Romania/EU Marketplace Seller tax contract foundation.
-- Evidence-only and fail-closed: no tax rule is seeded or activated by this migration.

CREATE TABLE IF NOT EXISTS private.marketplace_tax_route_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_code text NOT NULL,
  destination_country text NOT NULL,
  origin_scope text NOT NULL,
  seller_tax_status text NOT NULL,
  buyer_tax_status text NOT NULL,
  supply_class text NOT NULL,
  consignment_value_class text NOT NULL,
  product_vat_class text NOT NULL,
  interface_vat_role text NOT NULL,
  vat_scheme text NOT NULL,
  vat_rate_bps integer NOT NULL,
  price_tax_mode text NOT NULL,
  legal_basis_version text NOT NULL,
  legal_effective_from date NOT NULL,
  legal_effective_to date,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  reviewed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT marketplace_tax_route_rules_market_check
    CHECK (market_code = 'RO'),
  CONSTRAINT marketplace_tax_route_rules_destination_check
    CHECK (destination_country = 'RO'),
  CONSTRAINT marketplace_tax_route_rules_origin_check
    CHECK (origin_scope IN ('RO','EU','NON_EU')),
  CONSTRAINT marketplace_tax_route_rules_seller_status_check
    CHECK (seller_tax_status IN (
      'private_non_taxable_reviewed',
      'taxable_eu',
      'taxable_non_eu'
    )),
  CONSTRAINT marketplace_tax_route_rules_buyer_status_check
    CHECK (buyer_tax_status = 'consumer_non_taxable'),
  CONSTRAINT marketplace_tax_route_rules_supply_check
    CHECK (supply_class IN (
      'domestic_goods',
      'intra_eu_distance_goods',
      'import_distance_goods'
    )),
  CONSTRAINT marketplace_tax_route_rules_value_check
    CHECK (consignment_value_class IN (
      'not_applicable',
      'lte_150_eur',
      'gt_150_eur'
    )),
  CONSTRAINT marketplace_tax_route_rules_product_vat_class_check
    CHECK (product_vat_class IN (
      'standard',
      'reduced_11',
      'outside_scope_reviewed'
    )),
  CONSTRAINT marketplace_tax_route_rules_interface_role_check
    CHECK (interface_vat_role IN ('underlying_supplier','deemed_supplier')),
  CONSTRAINT marketplace_tax_route_rules_scheme_check
    CHECK (vat_scheme IN (
      'none_reviewed',
      'ro_domestic',
      'union_oss',
      'ioss',
      'import_vat_non_ioss'
    )),
  CONSTRAINT marketplace_tax_route_rules_rate_check
    CHECK (vat_rate_bps IN (0,1100,2100)),
  CONSTRAINT marketplace_tax_route_rules_price_mode_check
    CHECK (price_tax_mode IN ('no_vat','vat_inclusive')),
  CONSTRAINT marketplace_tax_route_rules_status_check
    CHECK (status IN ('draft','verified','expired','rejected')),
  CONSTRAINT marketplace_tax_route_rules_source_refs_check
    CHECK (jsonb_typeof(source_refs) = 'array' AND jsonb_array_length(source_refs) > 0),
  CONSTRAINT marketplace_tax_route_rules_evidence_check
    CHECK (jsonb_typeof(evidence) = 'object'),
  CONSTRAINT marketplace_tax_route_rules_hash_check
    CHECK (NULLIF(BTRIM(evidence_hash),'') IS NOT NULL),
  CONSTRAINT marketplace_tax_route_rules_legal_dates_check
    CHECK (legal_effective_to IS NULL OR legal_effective_to > legal_effective_from),
  CONSTRAINT marketplace_tax_route_rules_valid_dates_check
    CHECK (valid_to IS NULL OR valid_to > valid_from),
  CONSTRAINT marketplace_tax_route_rules_verified_check
    CHECK (
      status <> 'verified'
      OR (
        reviewed_by IS NOT NULL
        AND reviewed_at IS NOT NULL
        AND evidence <> '{}'::jsonb
      )
    ),
  CONSTRAINT marketplace_tax_route_rules_rate_mode_check
    CHECK (
      (price_tax_mode = 'no_vat' AND vat_rate_bps = 0)
      OR
      (price_tax_mode = 'vat_inclusive' AND vat_rate_bps IN (1100,2100))
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_tax_route_rules_current_verified_unique
  ON private.marketplace_tax_route_rules (
    market_code,
    destination_country,
    origin_scope,
    seller_tax_status,
    buyer_tax_status,
    supply_class,
    consignment_value_class,
    product_vat_class
  )
  WHERE status = 'verified' AND valid_to IS NULL;

CREATE INDEX IF NOT EXISTS marketplace_tax_route_rules_lookup_idx
  ON private.marketplace_tax_route_rules (
    market_code,
    destination_country,
    origin_scope,
    seller_tax_status,
    supply_class,
    consignment_value_class,
    product_vat_class,
    status
  );

REVOKE ALL ON TABLE private.marketplace_tax_route_rules
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.server_marketplace_ro_tax_rule_v1(
  p_origin_scope text,
  p_seller_tax_status text,
  p_buyer_tax_status text,
  p_supply_class text,
  p_consignment_value_class text,
  p_product_vat_class text,
  p_as_of date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_rule private.marketplace_tax_route_rules%ROWTYPE;
BEGIN
  SELECT *
    INTO v_rule
    FROM private.marketplace_tax_route_rules r
   WHERE r.market_code = 'RO'
     AND r.destination_country = 'RO'
     AND r.origin_scope = UPPER(BTRIM(COALESCE(p_origin_scope,'')))
     AND r.seller_tax_status = BTRIM(COALESCE(p_seller_tax_status,''))
     AND r.buyer_tax_status = BTRIM(COALESCE(p_buyer_tax_status,''))
     AND r.supply_class = BTRIM(COALESCE(p_supply_class,''))
     AND r.consignment_value_class = BTRIM(COALESCE(p_consignment_value_class,''))
     AND r.product_vat_class = BTRIM(COALESCE(p_product_vat_class,''))
     AND r.status = 'verified'
     AND r.reviewed_by IS NOT NULL
     AND r.reviewed_at IS NOT NULL
     AND r.valid_from <= now()
     AND (r.valid_to IS NULL OR r.valid_to > now())
     AND r.legal_effective_from <= COALESCE(p_as_of,CURRENT_DATE)
     AND (r.legal_effective_to IS NULL OR r.legal_effective_to > COALESCE(p_as_of,CURRENT_DATE))
   ORDER BY r.reviewed_at DESC
   LIMIT 1;

  IF v_rule.id IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'ro_marketplace_tax_evidence_missing',
      'market', 'RO',
      'destinationCountry', 'RO',
      'interfaceVersion', 1
    );
  END IF;

  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'reviewed_ro_marketplace_tax_rule',
    'market', 'RO',
    'destinationCountry', 'RO',
    'originScope', v_rule.origin_scope,
    'sellerTaxStatus', v_rule.seller_tax_status,
    'buyerTaxStatus', v_rule.buyer_tax_status,
    'supplyClass', v_rule.supply_class,
    'consignmentValueClass', v_rule.consignment_value_class,
    'productVatClass', v_rule.product_vat_class,
    'interfaceVatRole', v_rule.interface_vat_role,
    'vatScheme', v_rule.vat_scheme,
    'vatRateBps', v_rule.vat_rate_bps,
    'priceTaxMode', v_rule.price_tax_mode,
    'legalBasisVersion', v_rule.legal_basis_version,
    'legalEffectiveFrom', v_rule.legal_effective_from,
    'legalEffectiveTo', v_rule.legal_effective_to,
    'evidenceHash', v_rule.evidence_hash,
    'reviewedAt', v_rule.reviewed_at,
    'interfaceVersion', 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.server_marketplace_ro_tax_rule_v1(text,text,text,text,text,text,date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_marketplace_ro_tax_rule_v1(text,text,text,text,text,text,date)
  TO service_role;

COMMENT ON FUNCTION public.server_marketplace_ro_tax_rule_v1(text,text,text,text,text,text,date) IS
  'Fail-closed Romania Marketplace Seller tax-rule lookup. Returns eligible only for a currently valid, explicitly reviewed evidence row; it never infers seller tax status, VAT role, scheme or rate.';
