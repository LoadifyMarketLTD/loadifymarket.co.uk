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
- [x] GATE B BUSINESS CONTRACT — PR #533 merged to `main` on 20 August 2026.
- [x] GATE B PASS — contract-level PASS recorded by `08_GATE_B_BUSINESS_CONTRACT_2026-08-20.md`.
- [ ] PHASE C — **CURRENT NEXT PHASE**.
- [ ] PHASE D.
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

**Important:** merging #531 to `main` does not itself claim that migrations 611_zz/612/613/614/615 have been applied to production. Production deployment/migration evidence must be recorded separately when actually executed.

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

## Current handoff

The repository is now past Gate B:

`P1 CLOSED IN MAIN → GATE B PASS IN MAIN → PHASE C → PHASE D → ... → PHASE Q`

**CURRENT NEXT PHASE: PHASE C.**

Phase C must consume the Gate B contract as fixed business input. It may design/evolve canonical schema, data ownership and governance according to the original contract, but it must not invent a parallel order/payment/financial truth or silently change the Gate B responsibilities.

Any newly demonstrated P0/P1 foundation defect still stops the sequence and returns to Branch Guard repair before downstream continuation.

## Permanent update rule after each future PR

After every implementation or contract PR is merged to `main`:

1. verify the actual merge commit on `main`;
2. update this ledger in a **separate documentation-only PR**;
3. mark the relevant contract item `[x]` only when its acceptance gate is truly satisfied;
4. record PR number, merge SHA, evidence status and any production/deployment distinction;
5. state the exact next uncompleted gate for the next agent;
6. never rewrite historical contract language merely to make progress look complete.

This ledger is the canonical execution pointer for continuity; the original contract remains the controlling definition of what each gate means.
