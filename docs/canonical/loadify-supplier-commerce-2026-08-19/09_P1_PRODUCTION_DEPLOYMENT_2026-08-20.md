# P1 TAX/PAYMENT — PRODUCTION DEPLOYMENT RECORD

**Deployment date:** 20 August 2026  
**Repository basis:** PR #531 merged to `main` as `25dee644fcf8e5fb2aa0b2a2961d139f384715fa`  
**Purpose:** record the production application and verification of the P1 tax/payment evidence migrations that were intentionally not claimed as deployed merely by the PR merge.

## Preflight

Immediately before cutover, production verification showed:

- pending `payment_sessions`: `0`;
- `awaiting_payment` orders: `0`;
- financially active orders in the checked paid/processing/shipped/out-for-delivery set: `0`.

The dedicated P1 cutover preflight was then applied successfully.

## Production migrations applied

The following P1 migration contracts were applied to the production Supabase project in canonical order:

1. `marketplace_tax_cutover_preflight` — corresponding repository file `611_zz_marketplace_tax_cutover_preflight.sql`;
2. `marketplace_tax_evidence_boundary` — corresponding repository file `612_marketplace_tax_evidence_boundary.sql`;
3. `seller_tax_declaration_evidence` — corresponding repository file `613_seller_tax_declaration_evidence.sql`;
4. `strengthen_marketplace_tax_snapshot_declaration` — corresponding repository file `614_strengthen_marketplace_tax_snapshot_declaration.sql`;
5. `authoritative_seller_tax_location_evidence` — corresponding repository file `615_authoritative_seller_tax_location_evidence.sql`.

Production migration history recorded them as versions:

- `20260820215217 / marketplace_tax_cutover_preflight`;
- `20260820215309 / marketplace_tax_evidence_boundary`;
- `20260820215323 / seller_tax_declaration_evidence`;
- `20260820215337 / strengthen_marketplace_tax_snapshot_declaration`;
- `20260820215356 / authoritative_seller_tax_location_evidence`.

## Post-deployment verification

Production verification confirmed all of the following exist:

- `seller_profiles.taxDeclarationConfirmed`;
- `seller_profiles.taxCountry`;
- `products.taxTreatmentStatus`;
- `orders.taxDecisionSnapshot`;
- `private.payment_session_has_marketplace_tax_snapshot_v1(jsonb)`;
- `public.server_materialize_paid_order_v1(uuid,text,numeric)`;
- `trg_00_protect_seller_tax_location_evidence_v1`.

All checks returned true.

## Result

**P1 repository implementation: PASS / merged.**  
**P1 production DB deployment: PASS / applied and verified.**

This record does not claim that every future Supplier Commerce tax mode is implemented. P1 remains the narrow marketplace evidence boundary defined by PR #531; broader Supplier Commerce tax/VAT/customs behavior is governed by Gate B and downstream phases.
