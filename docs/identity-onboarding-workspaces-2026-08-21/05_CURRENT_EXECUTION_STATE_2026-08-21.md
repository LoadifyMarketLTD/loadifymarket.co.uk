# LOADIFY MARKET — IDENTITY / ONBOARDING / WORKSPACES CURRENT EXECUTION STATE

**Updated:** 21 August 2026  
**Current-main reference at refresh:** `a0fe19b6f6b3867e1c34ddbe5445666e26233940`  
**Status:** CURRENT OVERRIDE / RESUME POINTER

---

## 1. Why this file exists

The original baseline, master plan and early ledger entries in this folder were intentionally written before implementation and before the public-homepage visual lane was merged.

They remain historical evidence and must not be rewritten to pretend later events had already happened.

This file records the current execution truth and **overrides only time-sensitive status statements** in earlier documents. Permanent commercial/security invariants remain unchanged unless explicitly superseded here.

---

## 2. Current repository/public-homepage state

The earlier statements that PR #529 is an unmerged draft are now historical.

Current truth:

- PR #529 was explicitly approved and merged into `main`;
- the accepted #529 visual direction is now the public-homepage baseline in `main`;
- PR #563 subsequently aligned public navbar category promotion with live sellable approved inventory;
- PR #564 compacted the mobile footer navigation;
- PR #565 split the oversized Seller presentation block into separate cards and hardened the mobile footer three-column layout;
- `docs/HOMEPAGE_VISUAL_EXECUTION_LEDGER_2026-08-21.md` in `main` records this visual stabilisation history;
- final pixel-level/cross-platform polish remains deferred until functional platform completion and release-candidate stability.

Therefore the old rule:

`PR #529 remains unmerged / do not merge #529`

is no longer an active guard.

The active visual guard is now:

`PRESERVE THE MERGED #529 VISUAL BASELINE → MAKE ONLY FUNCTIONALLY NECESSARY/STABILISING VISUAL CHANGES → DEFER FINAL POLISH UNTIL FUNCTIONAL FREEZE.`

---

## 3. Identity/onboarding execution state

Stage status at this refresh:

| Stage | Name | Current status |
|---|---|---|
| 0 | Documented baseline + execution governance | **PASS** |
| 1 | Identity / role / relationship contract | **PASS** |
| 2 | Public entrypoint & registration architecture | **IN PROGRESS — PR #561** |
| 3 | Marketplace Seller activation / onboarding V2 | NOT STARTED |
| 4 | Buyer onboarding alignment | NOT STARTED |
| 5 | Workspace destination & readiness contract | NOT STARTED |
| 6 | Supplier Partner pilot boundary | NOT STARTED |
| 7 | Cross-platform auth/security/commerce validation | NOT STARTED |
| 8 | Documentation closeout & continuity | CONTINUOUS |

Stage 1 controlling decision remains:

**ADDITIVE CAPABILITY MIGRATION REQUIRED.**

Target model remains:

`Auth Identity → Loadify Account Control → server-governed Buyer/Seller capabilities → relationship readiness → dedicated workspace`

Supplier Partner remains separate from Marketplace Seller and is not a public UserRole.

---

## 4. Active implementation PR

Current Stage 2 implementation lane:

**PR #561 — Identity: add Buyer + Seller capability foundation and registration architecture**

Its intended scope includes:

- additive server-governed `account_capabilities` foundation;
- safe backfill for existing Buyer/Seller accounts;
- preservation of Admin as privileged system role;
- trusted Buyer → Seller activation start without destructive role replacement;
- capability-aware minimum routing/guard changes for Buyer+Seller coexistence;
- public Buyer/Seller registration semantics that do not label Marketplace Sellers as Supplier Partners;
- no public Supplier role;
- no Supplier Commerce control activation;
- no Seller Onboarding V2 yet;
- no Workspace/Admin/Super Admin visual redesign;
- no final visual polish.

PR #561 must be re-audited against current `main` before any merge because `main` advanced materially while the homepage workstream was being stabilised.

---

## 5. Current permanent guards

These remain active:

1. `BUYER ≠ MARKETPLACE SELLER ≠ SUPPLIER PARTNER ≠ FULFILMENT PROVIDER ≠ ADMIN/OPERATOR`.
2. Loadify Direct is a commercial mode, not a public account type.
3. No Loadify-owned physical warehouse/store is assumed.
4. Capability/role authority must be server-governed and fail-closed; profile existence alone is not authority.
5. Seller lifecycle/readiness remains distinct from possessing Seller capability.
6. Supplier Commerce remains at Phase O Controlled Pilot boundary; no broad public Supplier Portal/self-service activation is implied.
7. Operations/Super Admin visual redesign remains out of scope unless separately authorised.
8. The merged public-homepage visual baseline should not be casually replaced while functional identity/onboarding work proceeds.
9. Final visual polish remains deferred until functional release-candidate stability.

---

## 6. Exact resume order

1. Complete PR #560 documentation refresh and validate that it remains documentation-only.
2. Promote/merge PR #560 only when its current-state pointers are correct and Branch Guard is acceptable.
3. Audit PR #561 against current `main`:
   - changed files/diff;
   - migration ordering and idempotency;
   - RLS/server authority;
   - role/capability compatibility;
   - Buyer→Seller transition safety;
   - registration semantics;
   - route/guard behaviour;
   - tests/CI/build;
   - mobile/Capacitor compatibility where applicable.
4. Repair/reconcile PR #561 if needed.
5. Update the continuation ledger with tested HEAD and PASS/FAIL/HOLD.
6. Do not start Stage 3 until Stage 2 is genuinely PASS.

---

## 7. Authority / supersession rule

For time-sensitive status only, use this precedence:

`05_CURRENT_EXECUTION_STATE_2026-08-21.md → latest continuation ledger → original progress ledger → original baseline/master-plan status text`

For commercial/security architecture, the canonical Supplier Commerce contract and the Stage 1 identity contract remain controlling unless explicitly superseded by a later approved contract.