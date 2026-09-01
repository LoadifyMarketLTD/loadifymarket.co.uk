# Phase O Shadow Promotion Policy Governance — 2026-09-01

## Purpose

Make Shadow promotion criteria explicit, versioned, pre-registered and auditable without inventing or approving any threshold.

## Source baseline

- Main at branch creation: `371700af66d5e591c3de8769246f994466a23d94`.
- Hosted Supabase project: `fwdfpmfvgygvqciecesx`.
- Before this work: `supplier_pilot_programs = 0`, `supplier_pilot_shadow_observations = 0`.
- No Shadow promotion policy or audit table existed.

## Governance model

The migration introduces a private, RLS-protected policy registry with an explicit lifecycle:

1. create a **draft** with explicit criteria and non-empty decision evidence;
2. separately approve the draft with an approval reason and approval evidence;
3. at most one approved policy may exist for a provider/territory/capability/observation-policy tuple;
4. approved criteria are immutable;
5. replacement requires retiring the approved policy and creating/approving a new version;
6. audit history is append-only.

No policy row is seeded by the migration. No threshold is chosen by code.

## Prospective evidence rule

Shadow observations are valid only when:

- an approved promotion policy already exists;
- the observed order was created after pilot preparation;
- the observed order was created after promotion-policy approval;
- buyer cohort membership and product allowlisting already existed when the order was created;
- the observation is durably bound to the exact promotion policy ID/version.

The migration deliberately refuses to backfill a policy onto pre-policy observations. A changed policy requires new evidence under that policy.

## Promotion evaluation

The reader evaluates only observations bound to the currently approved policy. The policy itself supplies all numeric criteria; code supplies no default acceptance threshold.

The supported dimensions are:

- minimum sample size;
- minimum resolved comparisons;
- minimum agreement rate in basis points;
- maximum false-positive count;
- maximum false-negative count;
- maximum ambiguous count.

Runtime readiness v3 also rejects any claimed PASS without a valid promotion policy identity/version/approval timestamp that predates the reviewed evidence.

## Hosted reconciliation

Migration `phase_o_shadow_promotion_policy_governance` is applied in hosted history as version `20260901150548`.

Observed after apply:

- promotion policy table: RLS enabled, 0 rows;
- policy audit table: RLS enabled, 0 rows;
- Shadow observation table: RLS enabled, 0 rows;
- pilot programs: 0 rows;
- `promotion_policy_id` and `promotion_policy_version` are mandatory on Shadow observations;
- no direct table grants exist for PUBLIC, anon, authenticated or service_role;
- policy, audit and observation immutability triggers are active;
- create/approve/retire governance RPCs and record/review RPCs are SECURITY DEFINER with empty search path and active-admin guards;
- anon/authenticated cannot execute those five RPCs; service_role can;
- security advisor reports only the intentional RLS-enabled/no-policy informational notices for the new private tables, with no new authenticated SECURITY DEFINER warning for these RPCs.

No policy row, threshold, pilot data or Shadow observation was created during hosted reconciliation.

## Safety boundary

This work does not:

- create or approve a policy;
- choose a Shadow acceptance threshold;
- create pilot data;
- create Shadow observations;
- activate a pilot or provider;
- submit/cancel/return supplier orders;
- disclose customer PII;
- mutate payments or refunds;
- relax RLS or direct table privileges.
