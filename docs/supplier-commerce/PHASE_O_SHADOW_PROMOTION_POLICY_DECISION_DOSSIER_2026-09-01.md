# Phase O Shadow Promotion Policy Decision Dossier — 2026-09-01

Status: **PROPOSAL ONLY — OWNER APPROVAL NOT RECORDED — NO POLICY ROW MAY BE CREATED FROM THIS DOCUMENT ALONE**

## Purpose

Provide an explicit, evidence-based decision surface for the future `order_submission` Shadow promotion policy without silently turning test data or engineering examples into business acceptance criteria.

This document is intentionally non-activating. It does not create, approve, retire or seed a promotion policy; it does not create pilot data or Shadow observations; and it does not authorize provider orders, PII disclosure, payments, refunds or any other external mutation.

## Canonical source facts

The current Phase O governance supports exactly these numeric policy dimensions:

- minimum sample size;
- minimum resolved comparisons;
- minimum agreement rate in basis points;
- maximum false-positive count;
- maximum false-negative count;
- maximum ambiguous count.

The repository currently contains **no owner-approved numeric threshold** for those dimensions. Existing tests and fixtures are implementation examples only and must not be treated as policy evidence.

The durable Shadow observation contract classifies comparisons as follows:

- `agreement`: system action equals resolved operator action;
- `false_positive`: system would `submit_order` while the resolved operator action is `no_action`;
- `false_negative`: system would `no_action` while the resolved operator action is `submit_order`;
- `ambiguous`: operator status is unresolved.

Shadow observations are accepted only while a controlled pilot is `preparing`, on contemporaneous in-scope orders, and are recorded with explicit safety flags that no external provider mutation, customer PII disclosure or payment mutation occurred.

## Risk interpretation

### False positive — highest severity

A false positive means the automation judges an order safe to submit when the human operator judges it should not be submitted.

If such behaviour were promoted into real autonomous execution, the plausible consequences include:

- an unwanted or duplicate supplier order;
- customer data being sent to a provider when it should not be;
- supplier-side financial obligation or recovery work;
- cancellation/return friction where provider contracts are incomplete;
- reconciliation uncertainty after timeout/lost-response conditions;
- customer-impacting fulfilment errors.

For that reason, every proposed option below uses **maximum false positives = 0**.

### False negative — materially safer, but still operationally important

A false negative means the automation blocks an order that the operator judges safe to submit. This generally creates missed automation, delay or manual workload rather than an unsafe external action.

A small tolerance can therefore be considered during a controlled promotion study, provided agreement remains high and provider/canonical readiness gates remain independently satisfied.

### Ambiguous — evidence quality problem

An ambiguous observation means there is no resolved human comparator. It should not be allowed to inflate confidence in the automation. A small bounded number can be tolerated as an operational reality, but the policy must require a high resolved-comparison ratio.

## Candidate policy options

These are **decision options, not approved policy**.

| Dimension | Option A — Limited evidence | Option B — Conservative pilot **RECOMMENDED** | Option C — High assurance |
| --- | ---: | ---: | ---: |
| Minimum sample size | 25 | **40** | 75 |
| Minimum resolved comparisons | 23 | **38** | 72 |
| Minimum agreement rate | 95.00% / 9500 bp | **97.00% / 9700 bp** | 98.50% / 9850 bp |
| Maximum false positives | 0 | **0** | 0 |
| Maximum false negatives | 1 | **1** | 1 |
| Maximum ambiguous | 2 | **2** | 3 |

### Option A — Limited evidence

Purpose: shortest credible observation window if order volume is low.

Trade-off: 25 observations provide relatively weak evidence for a capability that can later create real supplier orders and transmit PII. This option is not recommended as the default autonomous promotion gate.

### Option B — Conservative pilot — recommended proposal

Proposed values:

- `minimum_sample_size = 40`
- `minimum_resolved_comparisons = 38`
- `minimum_agreement_rate_basis_points = 9700`
- `maximum_false_positive_count = 0`
- `maximum_false_negative_count = 1`
- `maximum_ambiguous_count = 2`

Why this is the recommended proposal:

1. **Zero unsafe-to-submit disagreements.** Any false positive prevents PASS.
2. **High evidence coverage.** At least 38/40 observations must have a resolved human comparator.
3. **One safer-side miss can be tolerated.** With 38 resolved observations, 37 agreements and one false negative still produce approximately 97.37% agreement and can satisfy the 97% floor.
4. **Ambiguity is tightly bounded.** No more than two observations can remain unresolved.
5. **The sample remains operationally achievable.** It is materially stronger than a small fixture-like sample while not requiring production-scale order volume before a controlled decision can be made.

This recommendation is a risk-engineering proposal only. It becomes policy only after explicit owner approval is recorded through the governed policy lifecycle.

### Option C — High assurance

Purpose: stronger statistical/operational evidence before autonomous order submission.

Trade-off: materially longer evidence collection and potentially slow progression where controlled pilot order volume is low.

With 72 resolved observations, 71 agreements and one false negative produce approximately 98.61% agreement, satisfying the proposed 98.5% floor while still maintaining zero false positives.

## Non-negotiable gates independent of the numeric policy

A Shadow PASS must never override any of the following:

- provider `order_submission` contract must be independently verified;
- stable provider order identifier/reconciliation contract must be known;
- idempotency and lost-response recovery must be known or otherwise safely governed;
- required Orders and PII permissions must be deliberately enabled only for the approved provider/pilot scope;
- canonical pilot readiness must remain true;
- buyer cohort and product allowlist must be contemporaneously valid;
- order value must remain within the controlled pilot cap;
- provider/circuit-breaker/kill-switch controls must remain available;
- financial mutation authority must remain separately gated;
- a Shadow policy PASS is evidence for promotion review, not permission to bypass provider, security, PII, payment or recovery controls.

## Provider reality at dossier creation

The policy decision is intentionally separate from provider readiness.

At the time this dossier is prepared:

- Avasam read-side catalogue/price/stock evidence exists, but transactional `order_submission` remains blocked on authoritative provider clarification including canonical create endpoint, stable order identifier, idempotency/lost-response recovery and related order-lifecycle contracts;
- BigBuy public documentation/scaffolding is not a substitute for the required authorized sandbox/runtime evidence;
- Direct Supplier requires a real approved supplier identity, canonical mappings and provider execution evidence before a real pilot can be promoted.

Therefore selecting a numeric Shadow policy would **not** activate any provider today.

## Decision record — deliberately blank until explicit approval

- Selected option: **NONE**
- Custom values selected: **NONE**
- Owner approval: **NOT RECORDED**
- Approval reason: **NOT RECORDED**
- Approval evidence: **NOT RECORDED**
- Policy row created: **NO**
- Policy row approved: **NO**
- Prospective Shadow evidence collection under approved policy: **NOT STARTED**

## Required sequence after an explicit owner decision

1. Re-read the chosen values and confirm they are internally consistent.
2. Create a **draft** promotion policy through the existing active-admin guarded governance RPC.
3. Record non-empty decision evidence that identifies the approved values and rationale.
4. Separately approve the exact draft policy with explicit approval reason/evidence.
5. Only after approval, collect **new prospective** Shadow observations on orders created after the policy approval timestamp.
6. Do not recycle pre-policy observations into the new policy.
7. Let the server-side reader calculate PASS from the exact approved policy.
8. Even after PASS, re-run provider, canonical readiness, security, PII, recovery and activation gates before any real execution authority changes.

## Current safe conclusion

The repository is ready to record a real policy decision, but **no decision has yet been made**. Option B is the recommended proposal because it keeps the most dangerous error class at zero, requires high resolved coverage and high agreement, while remaining feasible for a controlled pilot.

Until explicit approval is recorded, Phase O remains fail-closed.
