# VERTICAL SLICE ACCEPTANCE EVIDENCE MATRIX

Status: PREPARATION ONLY

## Purpose

Define what evidence is required to call a Supplier Commerce vertical slice PASS. This prevents build, preview, migration or UI evidence from being mistaken for complete business correctness.

## Principle

A vertical slice is complete only when one real business capability is coherent across:

- data model;
- authorization;
- server boundary;
- external adapter/provider behavior where applicable;
- financial truth;
- customer-facing state;
- operational state;
- failure/retry/recovery;
- observability;
- rollback/data compatibility;
- web/mobile consumers where applicable.

## Evidence classes

### E1 — Static contract evidence

Examples:

- exact diff;
- schema constraints;
- policy/function definitions;
- API types/contracts;
- adapter interface;
- feature flag placement.

Proves design implementation shape only.

Does not prove runtime success.

### E2 — Build/type evidence

Examples:

- TypeScript compile;
- production build;
- Android build;
- lint/static checks.

Proves code can compile/package under the tested configuration.

Does not prove DB/provider/business behavior.

### E3 — Unit/component evidence

Examples:

- idempotency tests;
- adapter parsing tests;
- state transition tests;
- AI Facts Lock tests;
- landed-cost arithmetic tests.

Proves focused behavior under controlled fixtures.

Does not prove integration/live configuration.

### E4 — Database/invariant evidence

Examples:

- migration applied to controlled environment;
- constraints/indexes installed;
- RLS probes;
- duplicate/reconciliation checks;
- forbidden writes fail;
- expected RPCs/functions exist.

Proves DB boundary only.

Does not prove consumers use the boundary correctly.

### E5 — Integration evidence

Examples:

- checkout producer writes expected evidence;
- webhook materializes expected immutable facts;
- orchestrator creates one supplier request;
- adapter retry is idempotent;
- shipment transition updates customer-facing state;
- refund and supplier recovery remain separate.

Proves connected components work together in the tested environment.

### E6 — Failure/recovery evidence

Examples:

- provider timeout;
- duplicate callback;
- stock disappears;
- price changes;
- supplier rejects after buyer payment;
- webhook replay;
- partial DB failure;
- kill switch activation;
- rollback/redeploy;
- delayed tracking;
- refund succeeds while supplier recovery fails.

A slice cannot be mature if only the happy path passes.

### E7 — Security/privacy evidence

Examples:

- unauthorized client mutation denied;
- inactive/suspended user denied;
- supplier cannot see unrelated buyer/order data;
- operator actions audited;
- credentials unavailable to client;
- buyer PII minimized in supplier payload;
- storage bucket/path policy verified.

### E8 — Financial evidence

Examples:

- buyer charged amount matches immutable order commercial snapshot;
- supplier payable derived from approved supplier commercial facts;
- processor fees/recovery/refund are not silently mixed;
- no fulfilment event rewrites paid commercial terms;
- reconciliation balances expected events.

### E9 — Observability evidence

Examples:

- correlation/order/supplier IDs present;
- failure category visible;
- retry count visible;
- alert/incident trigger works;
- replay can be traced;
- operator can distinguish buyer payment state from supplier order state.

### E10 — Controlled production/pilot evidence

Examples:

- feature flag limits scope;
- approved supplier only;
- real provider acknowledgement;
- real tracking flow;
- real reconciliation;
- kill switch tested safely;
- customer-support path ready.

Required before scale, not before every development PR.

## Slice acceptance template

For each vertical slice record:

### Identity

- slice name;
- implementation branch/PR;
- base main SHA;
- Gate B contract version;
- migration head;
- feature flag.

### Intended business outcome

State one customer/platform outcome in plain language.

### Source of truth

Identify the canonical source for:

- identity;
- price/cost;
- stock/sellability;
- order state;
- supplier state;
- financial state;
- tracking/fulfilment evidence.

### Authorized writers

List every actor that may mutate the slice and the server boundary used.

Client direct writes require explicit proof and justification; privileged commerce state should normally remain server-controlled.

### Invariants

List conditions that must never become false.

Examples:

- one idempotency key cannot create two supplier orders;
- a paid customer shipping amount cannot be changed by fulfilment;
- a supplier response cannot change a different customer's order;
- unknown stock cannot silently become sellable;
- customer refund does not imply supplier recovery completed.

### Happy path evidence

Required relevant E1-E9 evidence.

### Failure path evidence

At least the failure paths capable of causing:

- financial loss;
- duplicate action;
- customer misinformation;
- privacy/security breach;
- historical corruption;
- stuck state.

### Rollback

Show:

- how new writes are stopped;
- whether old code can coexist with new schema;
- what immutable facts remain;
- how queues/retries are handled;
- how provider-side effects are reconciled.

### Branch Guard

Record exact changed files and prove no unrelated scope was modified.

## Example evidence requirements by capability

### Supplier onboarding slice

Required:

- qualification state cannot be client-forged;
- credentials server-only;
- compliance/provenance evidence retained;
- suspended supplier cannot transact;
- operator actions audited;
- kill switch blocks new commerce without deleting history.

### Product import slice

Required:

- external URL cannot publish directly;
- source role identified;
- canonical product match/create candidate deterministic enough for review;
- supplier offer separate from canonical product;
- rights/provenance status recorded;
- AI cannot invent factual attributes;
- operator approval required where policy says so.

### Stock/sellability slice

Required:

- stale/unknown stock fails according to policy;
- concurrent reservations cannot oversell beyond allowed rule;
- supplier raw availability does not directly equal sellable quantity;
- failure/retry does not duplicate reservations;
- stock observation timestamps visible.

### Pricing/landed-cost slice

Required:

- formula inputs traceable;
- rule versions recorded;
- supplier price change handled deterministically;
- margin guard works;
- post-payment terms immutable;
- rounding/currency rules tested.

### Supplier order submission slice

Required:

- buyer payment evidence verified;
- supplier request idempotency key stable;
- duplicate retry cannot create duplicate supplier order;
- timeout/unknown acknowledgement state represented explicitly;
- payment success not treated as supplier success;
- cancellation/refund policy triggered according to Gate B.

### Tracking slice

Required:

- provider tracking mapped to canonical events;
- duplicate/out-of-order events safe;
- buyer sees canonical status, not raw provider jargon where inappropriate;
- paid amounts untouched;
- notification retry does not duplicate state transition.

### Returns/refunds/recovery slice

Required:

- customer remedy can proceed according to policy even if supplier recovery is delayed;
- payment refund is independently verified;
- supplier credit/recovery is separate financial event;
- no double refund;
- no double supplier recovery;
- unresolved recovery remains visible.

## No-fake-PASS rules

Do not call a slice PASS when:

- tests exist but were not executed;
- deploy preview succeeds but DB was never exercised;
- migration applies but consumers still use old unsafe path;
- simulator passes but live provider contract is unverified;
- a screenshot looks correct but authorization was not tested;
- only one platform (web/mobile) works where both are required;
- financial totals are not reconciled;
- failure paths are untested;
- rollback is theoretical only;
- a known P0/P1 remains inside the slice.

## Final slice verdict

Allowed verdicts:

- NOT READY;
- IMPLEMENTATION IN PROGRESS;
- REPO PREPARED;
- ENVIRONMENT VERIFIED;
- PILOT READY;
- PASS.

`PASS` must cite the evidence set. If evidence is partial, use the more precise partial state rather than optimistic wording.
