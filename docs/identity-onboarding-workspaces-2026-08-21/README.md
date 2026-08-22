# LOADIFY MARKET — IDENTITY, ONBOARDING & WORKSPACES

**Created:** 21 August 2026  
**Status:** CONTROLLING EXECUTION PLAN CANDIDATE — documentation-only branch until merged  
**Original repository baseline:** `main@50302455a6c8afcd52da45150f7de6f0ce91d942`  
**Current-state refresh reference:** `main@a0fe19b6f6b3867e1c34ddbe5445666e26233940`  
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

Read these files before any implementation in this workstream.

### Current truth first

1. `05_CURRENT_EXECUTION_STATE_2026-08-21.md`
2. `02B_PROGRESS_LEDGER_CONTINUATION_2026-08-21.md`

These two files contain the current execution state and supersede older **time-sensitive status statements** where the repository has moved since the original baseline was recorded.

### Architecture and historical evidence

3. `00_CURRENT_STATE_BASELINE_2026-08-21.md` — original factual baseline at the recorded SHA; treat later status changes as historical unless confirmed by the current-state file.
4. `01_MASTER_EXECUTION_PLAN_2026-08-21.md` — stages, scope, invariants and acceptance gates.
5. `03_IDENTITY_ROLE_RELATIONSHIP_CONTRACT.md` — Stage 1 controlling identity/capability decision.
6. `04_VISUAL_BASELINE_AND_FINAL_POLISH_SEQUENCE_2026-08-21.md` — visual sequencing decision; its old statement that #529 was unmerged is historical and is overridden by `05_CURRENT_EXECUTION_STATE_2026-08-21.md`.
7. `02_PROGRESS_LEDGER_2026-08-21.md` — original append-safe execution history.

Then read the existing canonical Supplier Commerce contract in:

`docs/canonical/loadify-supplier-commerce-2026-08-19/README.md`

The Supplier Commerce canonical contract always wins for commercial-mode, seller/supplier, payment, fulfilment, tax, compliance and production-safety boundaries.

Also read the current homepage visual execution history when public-entry routing or visual integration is in scope:

`docs/HOMEPAGE_VISUAL_EXECUTION_LEDGER_2026-08-21.md`

---

## Permanent execution rule

No stage begins from memory.

Before every implementation stage:

`REFETCH main → REFRESH relevant branch/PR → READ current-state override + latest ledger → VERIFY real runtime contract → IMPLEMENT only the authorised stage → TEST → BRANCH GUARD → UPDATE ledger`

If `main`, a relevant PR, schema, auth contract, Supplier Commerce state or payment contract moved materially:

`STOP WRITE → reconcile → update plan/ledger if required → continue only after the stage remains valid.`

---

## Documentation discipline

### Master plan

`01_MASTER_EXECUTION_PLAN_2026-08-21.md` defines stages, scope, invariants and acceptance gates.

Do not silently rewrite completed history to make implementation look cleaner.

### Progress ledger

`02_PROGRESS_LEDGER_2026-08-21.md` and continuation file `02B_PROGRESS_LEDGER_CONTINUATION_2026-08-21.md` are append-only in spirit.

After every closed stage they must record at minimum:

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
- replace or casually regress the merged #529 public-homepage visual baseline;
- start final visual polish before functional release-candidate stability;
- invent business/commercial/legal policy not already resolved by the controlling contracts.

---

## Relationship to the merged #529 homepage baseline

PR #529 is no longer an open visual-review lane. It was explicitly approved and merged into `main` and is now the accepted public-homepage visual baseline.

Its seller CTA and registration links still depend on this identity/onboarding contract, but identity/onboarding architecture must remain independently discoverable in repository documentation and must not be hidden inside homepage styling work.

Functional identity/onboarding changes may adjust public-entry destinations or truthful copy when required, but should preserve the merged visual direction unless a functional/security/business requirement proves otherwise.

Final visual polish remains deferred.

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

**CURRENT STAGE:** `STAGE 2 — PUBLIC ENTRYPOINT & REGISTRATION ARCHITECTURE — IN PROGRESS IN PR #561`

Stage 0 and Stage 1 are PASS. Do not start Stage 3 until Stage 2 is validated and recorded PASS.

See, in this order:

1. `05_CURRENT_EXECUTION_STATE_2026-08-21.md`
2. `02B_PROGRESS_LEDGER_CONTINUATION_2026-08-21.md`
3. `02_PROGRESS_LEDGER_2026-08-21.md`
