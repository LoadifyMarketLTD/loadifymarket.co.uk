# OBSERVABILITY, INCIDENT AND RECOVERY CONTRACT

Status: PREPARATION ONLY. No runtime implementation is authorised here.

Purpose: ensure Supplier Commerce can be operated safely when external providers fail, responses are delayed, data becomes stale, or internal/external state diverges.

## 1. Core rule

If the platform cannot explain what happened, when, to which customer/order/supplier/provider, and what state it is in now, the capability is not production-ready.

## 2. Correlation

Every cross-system operation should be traceable through a canonical correlation identity.

Relevant flows include:
- operator import;
- catalog/supplier sync;
- stock sync;
- price sync;
- checkout/sellability evaluation;
- supplier order submission;
- acknowledgement;
- tracking ingestion;
- refund;
- supplier recovery;
- reconciliation;
- replay/retry.

Correlation identifiers must not expose secrets.

## 3. Structured operational evidence

Important events should capture enough context to answer:
- operation type;
- canonical entity IDs;
- provider/supplier capability involved;
- policy/version involved;
- start/end timestamps;
- result;
- retry count;
- idempotency identity/reference where safe;
- error class;
- external reference where safe;
- customer/financial impact classification;
- recovery state.

Do not log secrets, credentials, raw payment secrets or unnecessary personal data.

## 4. Error taxonomy

Conceptual error classes:
- validation;
- authentication/authorization;
- provider configuration;
- provider unavailable;
- timeout;
- rate limited;
- supplier rejection;
- stale data;
- stock mismatch;
- price mismatch;
- compliance/rights block;
- persistence failure;
- external success / internal persistence unknown;
- internal success / external result unknown;
- reconciliation mismatch;
- unrecoverable/manual review.

Provider-specific error codes should be mapped to canonical classes while retaining raw evidence safely.

## 5. Retry policy

Retry is allowed only where the operation is safe/idempotent or recovery logic can establish external truth.

Classify operations as:
- safe automatic retry;
- retry after backoff;
- query-before-retry;
- manual review required;
- never retry automatically.

Never blanket-retry supplier order creation, refunds or other money/order-changing operations without idempotency and external-state checks.

## 6. Backoff and rate limits

Provider adapters should respect:
- provider rate limits;
- retry-after guidance;
- exponential/backoff policy where appropriate;
- circuit-breaker/temporary disable policy where approved.

Current provider rules must be verified from official documentation during provider implementation.

## 7. Health states

Supplier/provider capability health should distinguish more than online/offline.

Conceptual dimensions:
- reachable;
- authenticated/configured;
- catalog healthy;
- stock healthy;
- price healthy;
- order submission healthy;
- tracking healthy;
- returns/recovery healthy;
- stale/degraded;
- disabled/kill-switched.

A provider may be healthy for catalog retrieval but unhealthy for order submission.

## 8. Freshness

Every time-sensitive fact must expose freshness evidence where needed:
- stock;
- price;
- delivery/SLA evidence;
- compliance expiry where applicable;
- supplier status;
- tracking.

Unknown/stale data must fail closed according to policy rather than masquerade as fresh.

## 9. Incident identity

An incident needs:
- incident ID;
- detected time;
- severity;
- affected supplier/provider/capability;
- affected orders/imports/offers where known;
- customer impact;
- financial impact;
- owner;
- mitigation;
- status;
- recovery evidence;
- closure rationale.

## 10. Severity

Severity must be tied to impact, not emotion.

Possible factors:
- customer orders blocked;
- paid orders unable to fulfil;
- risk of duplicate supplier order;
- wrong price/stock exposure;
- refund/recovery failure;
- personal-data/security exposure;
- compliance exposure;
- broad provider outage;
- isolated recoverable sync issue.

Final severity model waits for Phase C implementation.

## 11. Kill switch

Kill switch should be scoped where possible:
- whole Supplier Commerce;
- supplier;
- provider;
- provider capability;
- product/offer set;
- new order submission only;
- discovery/import only.

Kill switch behavior must be deterministic and server-enforced.

It must preserve historical records and open-order recovery visibility.

## 12. Circuit breaker

For repeated provider failures, an automatic or operator-controlled circuit breaker may prevent repeated harmful calls.

It must not silently mark operations successful.

Recovery requires health evidence before reopening according to policy.

## 13. Replay

Replay is a governed recovery operation.

Before replay:
- inspect current internal state;
- inspect provider state where possible;
- confirm idempotency identity;
- determine whether external side effect may already have happened;
- choose query/reconcile/retry/manual action.

Replay must preserve audit history.

## 14. Dead-letter / unresolved operations

Operations that cannot be safely resolved automatically need a durable unresolved/manual-review path.

Examples:
- supplier order may have succeeded but external reference unavailable;
- refund provider succeeded but internal persistence failed;
- supplier recovery response ambiguous;
- tracking references conflicting;
- import source facts ambiguous.

No unresolved operation should disappear merely because retries were exhausted.

## 15. Reconciliation jobs

Periodic or event-driven reconciliation may verify:
- supplier orders submitted vs acknowledged;
- open fulfilment legs vs provider orders;
- tracking freshness;
- payment/refund evidence;
- supplier recovery;
- supplier payable/invoice evidence;
- stock/price sync health.

Reconciliation must not mutate history blindly; mismatches become explicit remediation work.

## 16. Alerts

Alert only when actionable.

Useful categories:
- provider/capability down;
- repeated supplier-order failure;
- paid order awaiting supplier acknowledgement beyond SLA;
- stale stock/price threatening sellability;
- refund succeeded but internal reconciliation failed;
- supplier recovery overdue;
- tracking stale beyond SLA;
- margin/commercial anomaly;
- compliance expiry/block;
- kill switch activated;
- replay/manual review queue growing.

Avoid noisy alerting that operators learn to ignore.

## 17. Customer communication

Operational incidents may require customer-facing communication, but internal/provider error details must not leak unnecessarily.

Customer messaging should be derived from canonical order/exception state and approved communication policy.

## 18. Supplier performance

Operational evidence feeds supplier performance, but scoring must be explainable.

Potential metrics:
- acknowledgement latency;
- refusal rate;
- stock mismatch;
- price mismatch;
- dispatch SLA;
- tracking freshness;
- delivery success;
- return rate;
- recovery success/time;
- provider error contribution.

Do not penalize supplier for platform/provider faults without attribution evidence.

## 19. Privacy and security

Logs/telemetry must follow privacy/security requirements:
- minimum necessary personal data;
- no credentials/secrets;
- no card/payment secrets;
- retention policy;
- access control;
- audit access where required.

Current UK GDPR/security requirements must be verified from authoritative sources at implementation.

## 20. Dashboard / Control Centre

Supplier Control Centre ultimately needs views for:
- provider capability health;
- supplier health;
- sync freshness;
- active incidents;
- open fulfilment exceptions;
- unresolved/replay queue;
- reconciliation mismatches;
- refunds/recovery issues;
- kill switches;
- SLA breaches.

Dashboard is a projection of canonical operational state, not a substitute for it.

## 21. Recovery drills

Before pilot, demonstrate recovery for:
- provider outage;
- duplicate callback;
- lost supplier submission response;
- stale stock feed;
- stale price feed;
- tracking outage;
- refund persistence failure;
- supplier recovery ambiguity;
- kill switch activation/recovery;
- replay after process crash.

Written design alone is not PASS.

## 22. Backup/recovery

Supplier Commerce data needed to reconstruct order/financial/compliance history must participate in platform backup/recovery strategy.

Recovery design must consider:
- canonical DB records;
- provider references;
- audit/evidence metadata;
- replay/idempotency evidence;
- secrets/configuration separately;
- data compatibility after rollback.

## 23. PASS criteria

Observability/recovery is PASS only when evidence proves:
- cross-system operations are traceable;
- provider failures map to canonical error states;
- dangerous operations are not blindly retried;
- unknown external outcomes have a recovery path;
- stale data is visible and policy-enforced;
- incidents have owners and mitigation;
- kill switches preserve history/open-order recovery;
- reconciliation surfaces mismatches;
- unresolved work cannot vanish;
- recovery drills succeed;
- no fake PASS from logs existing without operational recovery capability.
