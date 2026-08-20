# LOADIFY SUPPLIER COMMERCE — CANONICAL EXECUTION PROGRESS LEDGER

**Purpose:** append-only execution status for the canonical contract.  
**Rule:** this file records what has actually reached `main`; it does not rewrite or relax the original contract.  
**Next-agent rule:** read this file after the canonical contract and Foundation Baseline Freeze before starting new implementation work.

## Status language

- `[x]` = merged to `main` and treated as completed for execution sequencing.
- `[ ]` = not yet completed / not yet merged to `main`.
- `HOLD` = work must not start until the controlling prerequisite is PASS.
- A merged PR does not by itself prove production migration/runtime deployment unless that evidence is explicitly recorded.

## Canonical sequence status

- [x] CRITICAL FOUNDATION — completed before Checkpoint A.
- [x] CHECKPOINT A — atomic PASS recorded in `05_FOUNDATION_BASELINE_FREEZE_2026-08-20.md`.
- [x] FOUNDATION BASELINE FREEZE — recorded and merged.
- [x] Post-freeze P1 tax/payment evidence repair — PR #531 merged to `main` on 20 August 2026.
- [x] P1 tax/payment production DB deployment — applied and verified on 20 August 2026; see `09_P1_PRODUCTION_DEPLOYMENT_2026-08-20.md`.
- [x] GATE B BUSINESS CONTRACT — PR #533 merged to `main` on 20 August 2026.
- [x] GATE B PASS — contract-level PASS recorded by `08_GATE_B_BUSINESS_CONTRACT_2026-08-20.md`.
- [x] PHASE C — Platform Control Foundations merged through PR #536; Branch Guard PASS recorded below.
- [x] PHASE D — Supplier Foundation merged through PR #538; Branch Guard PASS recorded below.
- [x] PHASE E — Canonical Supplier Data merged through PR #540; Branch Guard PASS recorded below.
- [x] PHASE F — Import / Normalisation merged through PR #542; Branch Guard PASS recorded below.
- [ ] PHASE G — **CURRENT NEXT PHASE**.
- [ ] PHASE H.
- [ ] PHASE I.
- [ ] PHASE J.
- [ ] PHASE K.
- [ ] PHASE L.
- [ ] PHASE M.
- [ ] PHASE N.
- [ ] PHASE O.
- [ ] PHASE P.
- [ ] PHASE Q.

## Completed implementation / contract PR register

| Status | PR | Main result | Role in canonical execution |
|---|---:|---|---|
| [x] | #508 | merged/closed | Checkpoint A seller-listing deletion functional contract |
| [x] | #511 | merged | clean replacement that closed the #504 functional-contract requirement |
| [x] | #514 | merged | Checkpoint A runtime/mobile acceptance basis recorded by the Foundation Freeze |
| [x] | #516 | merged | canonical Supplier Commerce contract / Foundation Baseline Freeze documentation |
| [x] | #530 | merged | mandatory repository agent entrypoint so future agents read the controlling contract and Branch Guard rules |
| [x] | #531 | merge commit `25dee644fcf8e5fb2aa0b2a2961d139f384715fa` | P1 evidence-driven marketplace tax/payment boundary; Branch Guard PASS before merge |
| [x] | #533 | merge commit `3ea7d1d22adf851561684463fda0186da7aed30b` | Gate B canonical business contract; contract-level PASS after current official-source verification |
| [x] | #536 | merge commit `62b92d3987a84692f8319e922719ae6c99ec6d09` | Phase C Platform Control Foundations; Branch Guard PASS before merge |
| [x] | #538 | merge commit `88969ee759b48e68bf133507f2b347e36f564800` | Phase D Supplier Foundation; provider-neutral adapter, qualification, SLA, compliance and provenance foundations; Branch Guard PASS before merge |
| [x] | #540 | merge commit `bf4cd7113fef82581639ca9a4425e9a0770b5053` | Phase E Canonical Supplier Data; canonical product identity, supplier offers, catalog identity and evidence-backed deduplication; Branch Guard PASS before merge |
| [x] | #542 | merge commit `004bc59e5e6c882c5f15ad64d7ec801224973af3` | Phase F Import / Normalisation; auditable, resumable and idempotent import with AI Facts Lock, rights/compliance review and Phase C kill-switch enforcement; Branch Guard PASS before merge |

## PR #531 — P1 closeout record

**Merged:** 20 August 2026  
**Merge commit:** `25dee644fcf8e5fb2aa0b2a2961d139f384715fa`  
**Head tested before merge:** `8b357821f47ab35d08f55a8c7c548b449cae2`

Verified PowerShell Branch Guard evidence before merge:

- P1 marketplace tax-evidence tests: 25/25 PASS;
- TypeScript: PASS;
- ESLint: PASS;
- production build: PASS;
- full suite retained the same 27 known baseline failures reproduced on isolated `main`; no new P1 failure family was introduced;
- unrelated local Android Gradle changes were not included in the PR.

P1 scope closed by #531:

- blanket 20% VAT inference removed from the supported marketplace path;
- automatic buyer-VAT reverse-charge inference removed;
- seller tax declaration made explicit, versioned and server-stamped;
- seller tax location bound to server-side Stripe Connect evidence;
- unsupported tax regions/cases fail closed;
- payment/order tax snapshots are evidence-driven and immutable;
- invoice generation no longer attributes generic Loadify VAT/20% VAT to seller transactions without evidence;
- existing atomic paid-order materialization remains the canonical order boundary.

## P1 production deployment record

On 20 August 2026 the production Supabase project was checked before cutover and had:

- pending `payment_sessions`: `0`;
- `awaiting_payment` orders: `0`;
- financially active orders in the checked paid/processing/shipped/out-for-delivery set: `0`.

The P1 migration chain was then applied successfully in canonical order and recorded in production migration history as:

- `20260820215217 / marketplace_tax_cutover_preflight`;
- `20260820215309 / marketplace_tax_evidence_boundary`;
- `20260820215323 / seller_tax_declaration_evidence`;
- `20260820215337 / strengthen_marketplace_tax_snapshot_declaration`;
- `20260820215356 / authoritative_seller_tax_location_evidence`.

Post-deployment verification confirmed the seller declaration/tax-location columns, product tax evidence, order tax snapshot, marketplace tax validator, canonical paid-order materializer and seller tax-location guard are all live.

**P1 production DB deployment: PASS.**  
See `09_P1_PRODUCTION_DEPLOYMENT_2026-08-20.md` for the deployment evidence record.

## PR #533 — Gate B closeout record

**Merged:** 20 August 2026  
**Merge commit:** `3ea7d1d22adf851561684463fda0186da7aed30b`  
**Gate B contract:** `08_GATE_B_BUSINESS_CONTRACT_2026-08-20.md`

Gate B fixed the following canonical business responsibilities before schema design:

- Marketplace Seller: third-party seller is legal seller and merchant of record; Loadify is platform/agent and earns commission;
- Loadify Supplier-Fulfilled: Loadify/XDrive Logistics Ltd is legal seller and merchant of record; supplier is procurement/fulfilment party and Loadify earns retail margin;
- Loadify Direct: optional Loadify-sale mode distinguished by inventory/title ownership, not by warehouse location;
- one canonical order/payment/financial truth across all modes;
- customer refund and supplier recovery are separate;
- payment success and supplier-order success are separate;
- canonical product and supplier offer remain separate truths;
- supplier raw stock is not Loadify sellable stock;
- tax/VAT/customs are evidence-, consignment-, territory- and rule-version-aware;
- UK digital-platform reporting derives from canonical transaction/financial truth;
- review/media rights provenance and product-safety/recall governance are mandatory;
- provider capabilities require current official-source verification and versioning;
- no unrelated visual redesign is authorised by Supplier Commerce.

Gate B used current official HMRC, CMA, OPSS/GOV.UK and Stripe documentation as recorded in the Gate B contract.

**Important:** Gate B PASS is a business-contract PASS. It does not claim that Supplier Commerce schema/runtime exists, that current marketplace Stripe charge configuration already conforms to every target-mode responsibility, or that provider/NI rules are permanently verified. Those matters must be reconciled in the applicable downstream phase before activation.

## PR #536 — Phase C Platform Control Foundations closeout record

**Merged:** 20 August 2026  
**Merge commit:** `62b92d3987a84692f8319e922719ae6c99ec6d09`  
**Head tested before merge:** `8cf08f22cbeb10a3ca6d6a79794fd4566d7e52f1`

Verified PowerShell Branch Guard evidence before merge:

- focused Phase C1 control-foundation tests: 10/10 PASS;
- TypeScript: PASS;
- ESLint: PASS;
- production build: PASS;
- full suite retained the same 27 known baseline test failures and added no new failing test family;
- validation ran in an isolated clean worktree, preserving unrelated local Android changes.

Phase C scope closed by #536:

- Supplier Commerce server-enforced control plane and kill switches;
- fail-closed global and operation defaults;
- versioned control-decision and admin mutation boundaries;
- structured operational/correlation evidence;
- incident and durable recovery framework;
- provider/legal capability evidence and re-verification framework;
- privacy/retention registry framework;
- no provider-specific core model and no unrelated UI redesign.

**Deployment distinction:** migration `supabase/616_supplier_commerce_platform_control_foundations.sql` is merged to `main`, but this ledger entry does not claim that migration 616 has been applied to production unless a separate verified deployment record is later added.

## PR #538 — Phase D Supplier Foundation closeout record

**Merged:** 20 August 2026  
**Merge commit:** `88969ee759b48e68bf133507f2b347e36f564800`  
**Head tested before merge:** `8f9a214e540c3f71ce798732e07263f9d4289874`

Verified PowerShell Branch Guard evidence before merge:

- focused Phase D supplier-foundation tests: 14/14 PASS;
- TypeScript: PASS;
- ESLint: PASS;
- production build: PASS;
- full suite retained the same 27 known baseline failures and added no new failing test family;
- validation ran in an isolated clean worktree.

Phase D scope closed by #538:

- provider-neutral, explicitly versioned `SupplierAdapterV1` contract and capability envelope;
- canonical supplier lifecycle: candidate → verification → approved → restricted → suspended → banned;
- evidence-driven supplier qualification separate from product approval;
- versioned, effective-dated and auditable supplier SLA foundation;
- GREEN/AMBER/RED compliance model with fail-closed readiness decisions;
- source/content provenance and rights evidence foundation;
- active-admin-only mutation boundary and server-side readiness decision;
- guard constraints strengthening lifecycle, evidence, SLA, compliance and adapter registration invariants;
- no provider-specific commerce core and no Supplier Commerce runtime activation.

**Deployment distinction:** migrations `supabase/617_supplier_foundation.sql` and `supabase/618_supplier_foundation_guards.sql` are merged to `main`, but this ledger entry does not claim they have been applied to production. Production deployment requires a separate verified deployment record.

## PR #540 — Phase E Canonical Supplier Data closeout record

**Merged:** 20 August 2026  
**Merge commit:** `bf4cd7113fef82581639ca9a4425e9a0770b5053`  
**Head tested before merge:** `0419d2a88544822df764ba2b6754d79921a8f6c7`

Verified PowerShell Branch Guard evidence before merge:

- focused Phase E canonical-supplier-data tests: 13/13 PASS;
- Phase C/D upstream control tests: 24/24 PASS;
- TypeScript: PASS;
- ESLint: PASS;
- production build: PASS;
- full suite retained the same 27 known baseline failures and added no new failing test family;
- validation ran in an isolated clean worktree.

Phase E scope closed by #540:

- canonical product identity separated from supplier catalog identity and supplier offers;
- deterministic, namespace-aware catalog identifiers and verification evidence;
- supplier catalog items bound to the Phase D supplier foundation instead of a parallel supplier model;
- one canonical product can be linked to multiple governed supplier offers;
- evidence-backed deduplication candidates with explicit same-product/different-product/manual-review decisions;
- no implicit AI/title-based merge and terminal dedup decisions are guarded;
- approved offer identity, verified identifiers and external supplier identity are protected against unsafe rewrites;
- unresolved or conflicting dedup evidence blocks offer approval;
- service-role-only readiness decisions and active-admin mutation boundary;
- Phase F import/normalisation explicitly remains deferred;
- no Supplier Commerce runtime activation.

**Deployment distinction:** migrations `supabase/619_canonical_supplier_data.sql`, `supabase/620_canonical_supplier_data_guards.sql` and `supabase/621_canonical_supplier_data_integrity.sql` are merged to `main`, but this ledger entry does not claim they have been applied to production. Production deployment requires a separate verified deployment record.

## PR #542 — Phase F Import / Normalisation closeout record

**Merged:** 20 August 2026  
**Merge commit:** `004bc59e5e6c882c5f15ad64d7ec801224973af3`  
**Head tested before merge:** `220d126c0d67157c360e31c96b790aa29375c425`

Verified PowerShell Branch Guard evidence before merge:

- Phase F `supplier-import` tests: 13/13 PASS;
- Phase F `supplier-import-runtime` tests: 6/6 PASS;
- upstream Phase C/D/E control and supplier-data gate command: PASS;
- TypeScript: PASS;
- ESLint: PASS;
- production build: PASS;
- full suite retained exactly the same 27 known baseline failures and added no new Phase F failing test family;
- validation ran in an isolated clean worktree.

Phase F scope closed by #542:

- supplier import batches and items are auditable, resumable and idempotent;
- import mapping consumes Phase E canonical product and supplier-catalog identity instead of creating parallel product truth;
- AI Facts Lock prevents AI-proposed facts from becoming verified product facts;
- verified facts require non-AI evidence and become immutable against unsafe factual rewrites;
- asset/content rights are evidence-backed and unresolved/restricted/prohibited rights block approval;
- complete current GB compliance review classes are required before import approval;
- mutation is active-admin-only and secret-bearing import payloads are rejected;
- Phase C server-side `import` kill switch controls runtime mutations;
- fact-level idempotency prevents retry-driven duplicate facts;
- no direct URL-to-publish bypass and no Phase G commercial economics were activated.

**Deployment distinction:** migrations `supabase/622_supplier_import_normalisation.sql`, `supabase/623_supplier_import_normalisation_guards.sql`, `supabase/624_supplier_import_runtime_guards.sql` and `supabase/625_supplier_import_fact_idempotency_closure.sql` are merged to `main`, but this ledger entry does not claim they have been applied to production. Production deployment requires a separate verified deployment record.

## Current handoff

The repository is now past Gate B, P1 production deployment, Phase C, Phase D, Phase E and Phase F implementation merges:

`P1 CLOSED + DEPLOYED → GATE B PASS → PHASE C PASS → PHASE D PASS → PHASE E PASS → PHASE F PASS IN MAIN → PHASE G → ... → PHASE Q`

**CURRENT NEXT PHASE: PHASE G — COMMERCIAL ECONOMICS.**

Phase G must implement True Landed Cost, versioned Tax/VAT/Customs rules, pricing controls and the canonical commerce financial ledger on top of the fixed Gate B legal/business model. It must preserve one canonical financial truth and keep customer money, supplier payable/cost, tax, processor fees, refunds, recoveries and adjustments evidence-linked rather than reconstructed independently by UI consumers.

Supplier Commerce runtime activation remains fail-closed until the applicable downstream gates are satisfied.

Any newly demonstrated P0/P1 foundation defect still stops the sequence and returns to Branch Guard repair before downstream continuation.

## Permanent update rule after each future PR

After every implementation or contract PR is merged to `main`:

1. verify the actual merge commit on `main`;
2. update this ledger in a **separate documentation-only PR**;
3. mark the relevant contract item `[x]` only when its actual acceptance gate is truly satisfied;
4. record PR number, merge SHA, evidence status and any production/deployment distinction;
5. state the exact next uncompleted gate for the next agent;
6. never rewrite historical contract language merely to make progress look complete.

This ledger is the canonical execution pointer for continuity; the original contract remains the controlling definition of what each gate means.
