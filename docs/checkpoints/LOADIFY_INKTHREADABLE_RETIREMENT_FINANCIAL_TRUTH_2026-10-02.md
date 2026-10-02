# Loadify Market — Inkthreadable Retirement + Financial Truth Checkpoint

Date: 2026-10-02  
Owner decision date: 2026-10-01  
Scope: Loadify Market Supplier Commerce, GB / Phase O

## Controlling owner decision

Inkthreadable is permanently removed from the active Loadify Market supplier strategy.

Do not:
- reactivate the supplier;
- create a new pilot;
- publish or re-publish its offers;
- submit supplier orders;
- run provider writes;
- resume supplier communication;
- reuse the old POD route as the first Supplier Commerce pilot.

Historical technical/email evidence remains retained for audit only.

## Verified production retirement state

Production Supabase project: `fwdfpmfvgygvqciecesx`.

Post-retirement verification:
- supplier lifecycle: `banned`;
- non-retired Inkthreadable offers: `0`;
- non-retired marketplace projections: `0`;
- active Inkthreadable pilots: `0`;
- unblocked integration profiles: `0`;
- unblocked capability evidence: `0`;
- active commercial profiles: `0`.
The historical 19 offers and related evidence were not hard-deleted. They were retired/blocked to preserve audit history.

The global Inkthreadable Phase O preparation was also stopped.

Verified global Supplier Commerce controls after retirement:
- `pilot = false`;
- `checkout = false`;
- `publish = false`;
- `reservation = false`;
- `supplier_order = false`;
- `stock_sync = false`;
- `price_sync = false`;
- `tracking_ingest = false`;
- `return_recovery = false`.

## Financial Truth repair

The Supplier Commerce financial repair is present on GitHub `main`.

Implementation commit in ancestry:
`1e0d9b84` — `fix: close supplier contribution and financial truth gaps`.

Verified capabilities:
- expected contribution is derived server-side;
- buyer-facing tax is deducted from expected contribution;
- verified landed cost is part of the contribution equation;
- explicit processor/provider/returns/operational/supplier-failure allowances are represented;
- minimum contribution remains fail-closed;
- actual Stripe processor-fee evidence is sourced from the balance transaction;
- supplier cost components are materialised in the append-only financial ledger;
- realised contribution uses the contractual supplier payable and avoids double-counting product/shipping detail;
- manual Phase O supplier settlement requires complete financial truth;
- no automatic Stripe supplier payout executor was activated or added.

## Validation evidence

Verified before production deployment:
- focused tests: `12/12 PASS`;
- full Vitest: `303/303 files PASS`, `1747/1747 tests PASS`;
- TypeScript: PASS;
- ESLint: PASS;
- production build: PASS with build-only public configuration;
- migration health: PASS;
- migration SQL: validated against production schema inside a rolled-back transaction.

Production migration:
- canonical repository migration: `20261001143000_supplier_contribution_financial_truth.sql`;
- production deployment record also created version `20261002091449`;
- migration-history reconciliation is represented in repository by a no-op audit migration;
- PR #827 merged migration-history reconciliation to `main`.

Post-deployment verification confirmed:
- all five pricing allowance columns exist;
- `server_record_supplier_processor_fee_v1` exists;
- `server_materialize_supplier_cost_ledger_v1` exists;
- `server_supplier_order_financial_truth_v1` exists;
- Supplier Commerce transactional controls remain OFF.

## Next supplier rule

Do not return to Inkthreadable.
Continue with suppliers offering products suitable for the current Loadify objective, while keeping all external-evidence gates fail-closed.
