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
- [ ] PHASE D — **CURRENT NEXT PHASE**.
- [ ] PHASE E.
- [ ] PHASE F.
- [ ] PHASE G.
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
| [x] | #536 | merge commit `62b92d3987a84692f8319e922719ae6c99ec6d09` | Phase C1 / Phase C Platform Control Foundations; server-enforced fail-closed controls, operational evidence, incidents/recovery, provider capability evidence and retention framework |

## PR #531 — P1 closeout record

**Merged:** 20 August 2026  
**Merge commit:** `25dee644fcf8e5fb2aa0b2a2961d139f384715fa`  
**Head tested before merge:** `8b357821f47ab19435d08f55a8c7c548b449cae2`

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

## Current handoff

The repository is now past Gate B, P1 production deployment and Phase C implementation merge:

`P1 CLOSED + DEPLOYED → GATE B PASS → PHASE C PASS IN MAIN → PHASE D → ... → PHASE Q`

**CURRENT NEXT PHASE: PHASE D.**

Phase D must consume the Gate B contract and Phase C server-control foundations. Supplier/provider runtime activation remains fail-closed until the applicable control, qualification, evidence and downstream acceptance gates are satisfied.

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
