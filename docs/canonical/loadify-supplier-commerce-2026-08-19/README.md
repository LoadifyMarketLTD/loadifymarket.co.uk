# LOADIFY SUPPLIER COMMERCE — CANONICAL EXECUTION CONTRACT

## Controlling repository copy — 19–20 August 2026

This folder is the controlling GitHub copy of the complete Loadify Supplier Commerce execution brief plus the controlling product-direction clarifications agreed on 19 and 20 August 2026, the post-Checkpoint-A Foundation Baseline Freeze, and the canonical execution progress ledger.

Read in this exact order before continuing Supplier Commerce work:

1. `00_PRODUCT_DIRECTION_UPDATE_2026-08-19.md`
2. `06_PRODUCT_DIRECTION_CLARIFICATION_2026-08-20.md`
3. `01_CANONICAL_EXECUTION_CONTRACT_LINES_0001_0750.md`
4. `02_CANONICAL_EXECUTION_CONTRACT_LINES_0751_1250.md`
5. `03_CANONICAL_EXECUTION_CONTRACT_LINES_1251_1750.md`
6. `04_CANONICAL_EXECUTION_CONTRACT_LINES_1751_2210.md`
7. `05_FOUNDATION_BASELINE_FREEZE_2026-08-20.md`
8. `07_EXECUTION_PROGRESS_LEDGER_2026-08-20.md`

Files 00, 06 and the original 2210-line contract preserved across parts 01–04 together form ONE canonical execution contract. Files 00 and 06 are controlling business/product clarifications; they do not create parallel plans and do not change the execution sequence. File 05 is the mandatory factual Foundation Baseline Freeze recorded after atomic Checkpoint A PASS and before Gate B. File 07 is the append-only execution status pointer showing which PR-backed steps have actually reached `main` and what the next uncompleted gate is; it does not rewrite or relax the original contract.

## Current execution sequence remains mandatory

CRITICAL FOUNDATION
→ CHECKPOINT A
→ ATOMIC CHECKPOINT A PASS WITH REAL EVIDENCE
→ FOUNDATION BASELINE FREEZE
→ HARD STOP OLD EXTENSIVE HARDENING
→ GATE B BUSINESS CONTRACT
→ GATE B PASS
→ PHASE C → Q.

Checkpoint A and the Foundation Baseline Freeze are recorded historical gates. The post-freeze P1 tax/payment evidence repair was merged through PR #531. The current next execution gate remains **GATE B BUSINESS CONTRACT**.

No Supplier Commerce migration before Gate B PASS.

Product Discovery may start only after canonical supplier data exists, as already defined by the original contract, and must not block commerce infrastructure.

## Execution continuity rule

After every implementation PR that is merged to `main`, update `07_EXECUTION_PROGRESS_LEDGER_2026-08-20.md` in a separate documentation-only PR. Mark a contract item `[x]` only when its actual acceptance gate is satisfied, record the merge SHA/evidence state, distinguish merge from production deployment, and state the exact next uncompleted gate for the next agent.

Do not rewrite historical contract language merely to make progress look complete.

## Prepared implementation plan

The detailed implementation preparation is maintained in branch:

`parallel/supplier-commerce-preparation`

under:

`docs/parallel/supplier-commerce-preparation/`

That preparation lane contains the Gate B decision pack, target architecture, runtime integration map, vertical-slice implementation backlog, provider/source contracts, operator import contract, financial/fulfilment/compliance/stock/AI/tax/control-centre contracts, implementation-readiness matrix and vertical-slice acceptance/evidence matrix.

The preparation lane is NOT a parallel architecture and is NOT independently authoritative over this canonical contract.

Before using the implementation preparation, read its current `README.md` and then `33_PRODUCT_DIRECTION_RECONCILIATION_2026-08-20.md`. The 20 August reconciliation aligns the prepared implementation plan with the current canonical direction, including:

- no-Loadify-warehouse Supplier-Fulfilled commerce;
- governed operator product sourcing/import;
- Discovery/Catalog/Supplier/Fulfilment/Carrier/Sales-Channel role separation;
- one canonical product with multiple governed supplier offers;
- supplier fallback that cannot silently violate the customer promise;
- sellable-stock truth distinct from supplier raw stock;
- AI Product Builder under AI Facts Lock;
- commercial content/image/video/UGC rights;
- truthful review/rating provenance;
- price transparency;
- consignment-aware VAT/customs evidence;
- digital-platform reporting/due-diligence readiness where applicable;
- product-safety incident/recall governance;
- provider/legal capability register;
- explicit guard against unrelated visual redesign of Loadify Market.

If any preparation artifact conflicts with this canonical contract or a later controlling canonical clarification, the canonical contract wins.

The preparation lane does not authorise runtime/schema/provider implementation before Gate B PASS.

## Important repository rule

Do not modify implementation PR scope merely to store or revise the controlling contract. Canonical documentation changes must remain isolated so implementation PRs preserve exact diffs and Branch Guard evidence.
