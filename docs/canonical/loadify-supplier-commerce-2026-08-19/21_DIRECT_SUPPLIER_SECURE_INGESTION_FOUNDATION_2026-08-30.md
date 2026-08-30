# Direct Supplier Secure Ingestion Foundation — 2026-08-30

## Purpose

Prepare Loadify Market to onboard UK/EU manufacturers and wholesalers directly, without depending on Avasam or another supplier network and without activating any supplier commercially.

This phase builds validation and security boundaries only. It does not expose a public ingestion endpoint and does not write supplier feed data into hosted commerce tables.

## New onboarding boundary

`netlify/functions/_shared/directSupplierOnboarding.ts`

Direct Supplier Onboarding Manifest V1 captures only business/operational readiness metadata:

- stable Loadify supplier key;
- legal name;
- registration country and optional registration/VAT numbers;
- requested feed transport;
- warehouse declarations;
- supported territories;
- requested Supplier Adapter capabilities.

The manifest deliberately excludes:

- API keys/secrets;
- bank/payment details;
- customer PII;
- any activation token.

The validator requires `commercialApproval: false` and `hostedActivation: off`. An onboarding document therefore cannot itself activate a supplier.

## Webhook envelope validation

`directSupplierContract.ts` now validates the shared webhook envelope in addition to feed batches.

Accepted event families remain provider-neutral and PII-free at this boundary:

- `catalog.updated`;
- `stock.updated`;
- `price.updated`;
- `order.acknowledged`;
- `shipment.updated`;
- `order.cancelled`;
- `return.updated`;
- `reimbursement.updated`.

Unknown event types, malformed event IDs, invalid supplier keys, timestamps or non-object payloads fail validation.

## Signed webhook boundary

`netlify/functions/_shared/directSupplierSecurity.ts`

The proposed Direct Supplier webhook authentication contract is:

- timestamp header supplied as 10-digit Unix seconds;
- signature format `v1=<64 hex characters>`;
- HMAC-SHA256 over the exact string `<timestamp>.<raw request body>`;
- minimum shared secret length: 32 characters;
- default timestamp tolerance: 300 seconds;
- constant-time signature comparison;
- malformed, stale or invalid signatures fail closed.

The verifier authenticates the exact raw body and does not re-serialize parsed JSON before verification.

## Replay protection

After signature verification, callers must atomically claim the webhook `eventId` through `DirectSupplierReplayStore` before performing any business side effect.

The code intentionally does **not** provide an in-memory production replay store. The interface states that production must use durable shared storage. This prevents an ephemeral Netlify process cache from being mistaken for a reliable anti-replay boundary.

Default replay retention is 24 hours. The allowed configured retention range is 5 minutes to 7 days.

## Activation state

Direct Supplier remains:

- code state: `scaffolded_unverified`;
- hosted activation: `OFF`;
- verified capabilities: `[]`;
- runtime Supplier Adapter capabilities: `[]`.

No supplier feed is imported by this phase. No API/webhook route is published.

## Explicitly out of scope

- public Netlify ingestion endpoint;
- hosted replay/idempotency table creation;
- supplier secret provisioning/storage;
- automatic supplier approval;
- product listing;
- stock/price synchronization jobs;
- customer PII disclosure;
- order submission;
- supplier settlement;
- returns/reimbursements execution;
- hosted Supplier Commerce activation.

## Required next gates

1. Verify this foundation with targeted tests, ESLint, TypeScript and production build.
2. Design a durable replay/idempotency store with RLS/service-role boundaries before publishing any webhook endpoint.
3. Define supplier secret provisioning/rotation and audit logging.
4. Build a server-side ingestion route that verifies signature -> claims event -> validates envelope -> writes only to a staging/import queue.
5. Add quarantine/rejection state for malformed or policy-ineligible catalogue records.
6. Only after a real supplier contract and compliance review may a supplier receive any verified capability.

## Quality gate plan

Targeted test coverage must include:

- onboarding manifest hosted-OFF enforcement;
- duplicate/invalid operational declarations;
- webhook envelope validation;
- valid HMAC signature;
- tampered-body rejection;
- stale timestamp rejection;
- weak/missing secret rejection;
- malformed signature/timestamp rejection;
- atomic replay claim and duplicate-event rejection;
- malformed event ID rejection before replay-store access;
- Direct Supplier activation guard.
