# BigBuy Sandbox Evidence Assessment — 2026-09-01

## Status

**EVIDENCE REVIEW PREPARATION ONLY — NO CAPABILITY PROMOTION — BIGBUY REMAINS OFF**

## Purpose

Separate two different questions that must never be conflated:

1. did a controlled BigBuy sandbox probe produce evidence consistent with a read capability; and
2. may Loadify advertise or activate that capability.

This gate answers only the first question.

`assessBigBuySandboxProbeEvidence()` consumes the sanitized output contract produced by the existing manual `bigbuy-sandbox-readonly-probe.mjs` and creates per-capability review decisions for:

- catalogue;
- variants;
- stock;
- price.

It performs no network request and has no path to `supplierProviderRegistry.ts`.

## Decision vocabulary

The strongest result this evaluator can emit is:

`CANDIDATE_EVIDENCE_COMPLETE`

That phrase deliberately does **not** mean:

- `VERIFIED_IMPLEMENTABLE`;
- `verifiedCapabilities` promotion;
- adapter advertisement;
- provider activation;
- Production access;
- automated order execution.

Every decision always carries:

- `registryPromotionAllowed = false`;
- `automatedExecutionAllowed = false`.

The overall assessment always carries:

- `manualReviewRequired = true`;
- `automaticRegistryPromotionPerformed = false`.

## Global trust and safety requirements

All candidate read evidence is blocked when any of these conditions fail:

- evidence gate is not `bigbuy-sandbox-readonly-contract-probe`;
- environment is not sandbox;
- host is not exactly `https://api.sandbox.bigbuy.eu`;
- unauthenticated negative control was not rejected with HTTP 401/403;
- Bearer authentication was not proven;
- controlled product SKU did not match;
- controlled variation SKU did not match;
- controlled variation→product binding did not match;
- an order endpoint was called;
- customer PII was processed;
- capability promotion occurred during the probe;
- a full provider payload was logged.

Structurally malformed evidence returns `MALFORMED_RESPONSE` instead of being coerced.

## Capability-specific evidence

### Catalogue

Candidate evidence requires:

- controlled product matched;
- documented active flag validated.

### Variants

Candidate evidence requires:

- controlled variation matched;
- variation→product binding validated.

### Stock

Candidate evidence requires both controlled product-stock and controlled variation-stock contracts to be matched and their handling-day stock buckets validated.

Missing or incomplete stock evidence blocks **stock evidence only** when the global trust boundary is otherwise intact; it does not fabricate failure of unrelated read contracts.

### Price

Candidate evidence requires controlled product and variation rows to be matched and both documented `wholesalePrice` values to be proven numeric.

This assessment does not perform FX conversion and does not alter the already integrated EUR canonical projection rule.

## Separation from Avasam policy

Avasam currently has a separate executable commercial capability policy because controlled live evidence already exists for selected read capabilities.

BigBuy is not at that stage.

This evaluator is intentionally one gate earlier. Even a completely successful real sandbox probe followed by `CANDIDATE_EVIDENCE_COMPLETE` still requires an explicit human evidence review and a separate policy/registry change before any BigBuy capability can become verified.

## Current provider state

This change does not modify the provider registry.

BigBuy therefore remains:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- `hostedActivation = off`;
- represented by the inactive zero-capability adapter.

## Non-effects

This gate performs no:

- BigBuy sandbox or Production request;
- credential storage or disclosure;
- provider adapter registration;
- registry mutation;
- capability promotion;
- marketplace listing/publication;
- order CHECK/CREATE;
- cancellation/returns/tracking/reimbursement action;
- customer PII processing;
- Supabase mutation;
- Stripe/payment/refund/payout mutation.

## External blocker remains unchanged

A real evidence assessment still cannot occur until Loadify has:

1. an authorised BigBuy sandbox credential;
2. controlled taxonomy/product/variation identifiers;
3. a successful sandbox-only manual probe;
4. the sanitized evidence output from that real probe.

Only then can this evaluator help structure the manual capability-by-capability review.
