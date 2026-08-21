# LOADIFY MARKET — IDENTITY, ONBOARDING & WORKSPACES

**Created:** 21 August 2026  
**Status:** CONTROLLING EXECUTION PLAN CANDIDATE — documentation-only branch until merged  
**Repository baseline:** `main@50302455a6c8afcd52da45150f7de6f0ce91d942`  
**Purpose:** provide one durable, repo-native source of truth for the redesign of Loadify account creation, role-specific onboarding, activation, and workspace routing.

---

## Why this folder exists

Loadify Market is no longer accurately represented by the legacy public registration model that mixes Buyer / Supplier / Company / Private concepts in one long form.

The current platform has distinct commercial and operational boundaries:

- buyer commerce;
- Marketplace Seller commerce;
- Loadify Supplier-Fulfilled commerce;
- optional Loadify Direct commerce;
- internal Admin / Operations governance;
- Supplier Commerce qualification, control and orchestration.

The public identity and onboarding experience must therefore be aligned with the real platform contract instead of extending legacy registration UI.

This folder is the continuity layer for that work. A future engineer/agent must be able to read it and know:

1. what the real baseline was;
2. what architecture was selected;
3. what stages exist;
4. what has actually been completed;
5. what is currently blocked;
6. exactly where execution must resume.

---

## Mandatory read order

Read these files in order before any implementation in this workstream:

1. `00_CURRENT_STATE_BASELINE_2026-08-21.md`
2. `01_MASTER_EXECUTION_PLAN_2026-08-21.md`
3. `02_PROGRESS_LEDGER_2026-08-21.md`

Then read the existing canonical Supplier Commerce contract in:

`docs/canonical/loadify-supplier-commerce-2026-08-19/README.md`

The Supplier Commerce canonical contract always wins for commercial-mode, seller/supplier, payment, fulfilment, tax, compliance and production-safety boundaries.

---

## Permanent execution rule

No stage begins from memory.

Before every implementation stage:

`REFETCH main → REFRESH relevant branch/PR → READ current ledger → VERIFY real runtime contract → IMPLEMENT only the authorised stage → TEST → BRANCH GUARD → UPDATE ledger`

If `main`, a relevant PR, schema, auth contract, Supplier Commerce state or payment contract moved materially:

`STOP WRITE → reconcile → update plan/ledger if required → continue only after the stage remains valid.`

---

## Documentation discipline

### Master plan

`01_MASTER_EXECUTION_PLAN_2026-08-21.md` defines stages, scope, invariants and acceptance gates.

Do not silently rewrite completed history to make implementation look cleaner.

### Progress ledger

`02_PROGRESS_LEDGER_2026-08-21.md` is append-only in spirit.

After every closed stage it must record at minimum:

- date/time;
- stage ID;
- branch / PR;
- tested HEAD SHA;
- exact files/surfaces changed;
- tests and evidence;
- PASS / FAIL / HOLD;
- known residual risks;
- next exact stage / resume point.

If work stops mid-stage, record the current blocker and exact resume point before leaving the branch whenever possible.

---

## Scope guard

This workstream may define and implement, stage-by-stage:

- account/identity entry points;
- buyer registration;
- Marketplace Seller registration;
- email verification routing;
- seller activation/onboarding;
- role/capability routing;
- destination workspace contracts;
- minimum workspace adjustments required to support the new onboarding contract;
- future Supplier Partner entry/qualification boundary.

This workstream must NOT, by implication alone:

- connect Loadify Market to Loadify Intelligence live;
- connect external suppliers/providers live;
- enable Supplier Commerce controls;
- claim Supplier Commerce Pilot PASS;
- create a public self-service Supplier Portal before the controlled-pilot contract requires it;
- redesign Super Admin / Operations merely for cosmetic consistency;
- merge homepage PR #529 without explicit owner approval;
- invent business/commercial/legal policy not already resolved by the controlling contracts.

---

## Relationship to homepage PR #529

PR #529 remains a separate public-homepage visual review lane.

Its seller CTA and registration links depend on this identity/onboarding contract, but this documentation plan does not authorise merging #529.

Do not bury identity/onboarding architecture inside the homepage PR. The system must remain discoverable independently in repository documentation.

---

## Legacy documentation warning

Existing files such as:

- `docs/onboarding_flow.md`
- `docs/ONBOARDING_AUTH_AUDIT.md`

contain valuable historical evidence, but they are not automatically current truth.

Examples of legacy content include obsolete or unverified seller marketing claims, earlier registration defects, historical role assumptions and older payout/onboarding wording.

Use them as evidence of prior state only. Re-verify runtime and controlling contracts before implementation.

---

## Current status pointer

**CURRENT STAGE:** `STAGE 0 — DOCUMENTED BASELINE + EXECUTION PLAN`

See `02_PROGRESS_LEDGER_2026-08-21.md` for the exact latest state.
