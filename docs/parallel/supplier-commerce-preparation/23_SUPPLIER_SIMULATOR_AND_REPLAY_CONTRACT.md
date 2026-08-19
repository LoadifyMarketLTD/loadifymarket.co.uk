# SUPPLIER SIMULATOR AND REPLAY CONTRACT

Status: PREPARATION ONLY. Simulator/replay implementation waits for the canonical execution sequence.

## Purpose

Allow Supplier Commerce to prove orchestration, idempotency, failure handling and recovery before any real supplier pilot.

## Core rule

SIMULATOR MUST MODEL THE CANONICAL ADAPTER CONTRACT, NOT A HAPPY-PATH DEMO.

A simulator PASS is evidence for implementation readiness only. It is not supplier pilot PASS and not production PASS.

## Required simulator modes

The simulator should eventually support configurable behavior for:
- catalog success/failure;
- stock available/out/unavailable/stale;
- price stable/changed/unavailable;
- reservation supported/unsupported/success/failure;
- supplier order accepted/rejected;
- slow acknowledgement;
- timeout before response;
- request accepted but response lost;
- duplicate request;
- duplicate acknowledgement;
- malformed response;
- rate limit;
- auth/config failure;
- partial fulfilment where canonical contract permits;
- dispatch/tracking events;
- out-of-order tracking;
- duplicate tracking;
- delivery failure;
- return accepted/rejected;
- reimbursement delayed/failed;
- provider outage and recovery.

## Deterministic scenarios

Every simulator scenario should be seedable/reproducible.

Test evidence must include:
- scenario identifier;
- canonical API/interface version;
- simulator behavior configuration;
- input references;
- expected state transitions;
- expected financial consequences;
- expected alerts/incidents;
- actual result;
- correlation IDs.

## Unknown-outcome simulation

Critical scenario:

LOADIFY SENDS SUPPLIER ORDER
→ SUPPLIER ACCEPTS
→ NETWORK RESPONSE LOST
→ LOADIFY SEES TIMEOUT.

Expected behavior:
- state becomes UNKNOWN_OUTCOME / reconciliation required;
- no blind duplicate order submission;
- reconciliation queries provider by idempotency/reference where capability exists;
- final result converges to exactly one canonical fulfilment leg/order outcome.

## Idempotency simulation

Repeat identical state-changing requests with the same canonical idempotency key.

Expected:
- one external effect;
- one canonical effect;
- duplicate/retry is safe;
- audit records explain replay/reuse.

Also test accidental request with a different idempotency key to prove duplicate-risk detection/reconciliation where possible.

## Event replay

Replay must distinguish:
- replaying an external event into canonical normalization;
- retrying a failed internal side effect;
- re-running a state transition;
- reprocessing a financial event.

Replay must not duplicate already-committed effects.

## Tracking replay

Test:
- same event twice;
- older event arrives after newer event;
- provider clock anomalies;
- unknown provider status;
- delivered event followed by stale in-transit event.

Canonical lifecycle must remain deterministic and preserve raw evidence without regressing state incorrectly.

## Financial replay

Test that replaying:
- payment evidence;
- supplier cost acknowledgement;
- refund;
- supplier recovery;
- chargeback;
- reconciliation
cannot create duplicate canonical financial consequences.

Append/reversal/adjustment semantics must remain deterministic.

## Failure injection

Simulator should permit controlled injection at boundaries:
- before DB commit;
- after DB commit before provider call;
- after provider call before response persistence;
- after state persistence before notification;
- webhook/event handling;
- recovery job;
- refund/recovery path.

This proves compensation and reconciliation rather than only success paths.

## State inspection

For every scenario, test tooling should expose canonical facts such as:
- customer order state;
- fulfilment leg state;
- supplier request/ack state;
- stock/reservation state;
- shipment/tracking state;
- customer refund state;
- supplier recovery state;
- reconciliation state;
- incident/exception state;
- financial truth events.

## No fake PASS

Simulator suite is NOT PASS if:
- tests only mock internal functions without exercising canonical boundaries;
- failure paths are skipped;
- assertions only check HTTP 200;
- duplicate/replay behavior is untested;
- finance is not checked;
- unknown outcomes are treated as ordinary failures;
- state convergence is not proven.

## Production isolation

Simulator credentials/data must never reach real suppliers or production side effects.

Use explicit environment/feature controls. Production must fail closed if a simulator-only adapter is selected accidentally.

## Pilot handoff

After simulator PASS, the controlled pilot should rerun equivalent end-to-end scenarios using the approved real supplier, starting with low-risk cases.

Simulator evidence informs pilot readiness but cannot replace:
- real provider latency;
- real stock/price behavior;
- real operational fulfilment;
- real tracking;
- real reconciliation.

## PASS criteria

Simulator/replay architecture is ready when it can prove:
- deterministic success/failure scenarios;
- unknown-outcome recovery;
- idempotency;
- duplicate event safety;
- out-of-order event safety;
- financial replay safety;
- compensation/reconciliation;
- incident visibility;
- clean separation from production.
