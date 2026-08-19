# CONCURRENCY, IDEMPOTENCY AND RETRY CONTRACT

Status: PREPARATION ONLY. Final implementation waits for the canonical execution gates.

## Purpose

Prevent duplicate commercial effects, oversell, duplicate supplier orders, duplicate refunds and inconsistent state when requests race, retry or partially fail.

## Core rule

RETRYABLE REQUESTS MUST BE SAFE TO RETRY.

Where a state-changing external/internal effect cannot be proven absent after failure, treat the outcome as UNKNOWN until reconciled.

## Idempotency domains

Define separate idempotency scope for operations such as:
- product import;
- canonical product candidate creation;
- supplier offer upsert;
- stock/price sync batch;
- reservation;
- checkout/payment initialization;
- order orchestration;
- supplier order submission;
- supplier acknowledgement ingestion;
- shipment/tracking event ingestion;
- return creation;
- refund issuance;
- supplier recovery;
- financial event posting;
- reconciliation/replay.

Do not reuse one generic key where semantic scope differs.

## Idempotency key requirements

A canonical key should eventually bind to:
- operation type;
- canonical target/context;
- caller/system identity where relevant;
- stable request identity;
- payload fingerprint/version where required.

Same key + materially different payload must fail clearly rather than silently reuse an old result.

## Reservation concurrency

Supplier raw stock is not sellable stock.

Concurrent buyers must not both obtain the same limited sellable capacity if the contract promises exclusive reservation.

Design after Gate B must define:
- atomic reservation boundary;
- quantity semantics;
- expiry;
- release;
- provider reservation interaction where supported;
- recovery after payment/supplier failure.

## Price race

If supplier price changes between browse, checkout, payment and supplier submission:
- use explicit freshness/tolerance policy;
- do not silently absorb unbounded loss;
- do not silently charge buyer more after payment;
- route material changes to reject/review/refund according to contract.

## Supplier order submission

Highest-risk concurrency boundary.

Before external submit:
- canonical fulfilment leg must exist deterministically;
- submission idempotency identity must be durable;
- concurrent workers must not both submit;
- retries use provider idempotency/reference capability when available;
- timeout after send becomes UNKNOWN_OUTCOME, not ordinary failure.

## Webhook/event deduplication

External events may arrive:
- more than once;
- out of order;
- after polling already updated state;
- after manual recovery.

Canonical ingestion needs stable event identity/fingerprint and monotonic/domain-aware transition rules.

Duplicate event processing must be harmless.

## Refund idempotency

A retry must never issue a second customer refund for the same intended operation.

The canonical refund operation must reconcile with payment-provider truth before repeating after unknown outcome.

Supplier recovery remains a distinct idempotency domain.

## Financial events

Canonical financial truth must be append-safe and duplicate-safe.

Posting the same business event twice must not double revenue/cost/refund/recovery.

Corrections are explicit reversal/adjustment events, not mutation of prior event identity.

## Locking / atomicity

Implementation may use transactions, unique constraints, compare-and-set, advisory/application locks or other appropriate mechanisms, but mechanism follows the canonical invariant.

Do not depend on undocumented transaction behavior of a migration/runtime runner.

## Retry classification

Every failure should be classified at least as:
- retryable now;
- retryable after delay/backoff;
- rate limited;
- permanent/business rejection;
- configuration/auth failure;
- unknown outcome requiring reconciliation;
- manual review.

Never retry permanent rejection as if it were a network failure.

## Backoff

Automated retry policy should include:
- bounded attempts;
- exponential/backoff strategy where appropriate;
- jitter where useful;
- provider rate-limit respect;
- maximum age/deadline;
- escalation to incident/manual review.

## Recovery after process crash

Durable intent/state must make it possible to identify operations that were:
- prepared but not sent;
- sent but not acknowledged;
- acknowledged externally but not persisted;
- committed canonically but side effects incomplete.

Recovery jobs must converge state rather than create new parallel effects.

## Test matrix

Future tests must include:
- two simultaneous checkout/reservation requests;
- double-click submit;
- mobile retry after timeout;
- worker crash before provider call;
- worker crash after provider accepts;
- duplicate provider callback;
- out-of-order callback;
- refund response lost;
- duplicate reconciliation job;
- same idempotency key/different payload;
- concurrent admin recovery attempts.

## PASS criteria

Concurrency/idempotency is PASS only when:
- critical operations have explicit idempotency scope;
- duplicate requests/events are safe;
- unknown outcomes are reconciled;
- stock/reservation races are controlled;
- supplier orders/refunds cannot duplicate under retry;
- financial events are append-safe/duplicate-safe;
- retry classification/backoff is bounded;
- crash recovery converges canonical state.
