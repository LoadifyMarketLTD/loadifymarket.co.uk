# Error Handling — Loadify Market

**Status:** current architectural guidance  
**Rule:** current code and tests win if implementation details drift from this document.

---

## 1. Principles

Loadify error handling must:

- fail closed where security, authorization, tax, money or provider capability is uncertain;
- avoid exposing private/internal details to users;
- preserve actionable server-side logging/evidence;
- distinguish retryable operational failures from business-rule rejections;
- never report success before the authoritative server/database action succeeds;
- preserve generic responses where a more specific error could leak account/order existence.

---

## 2. Client-side boundaries

The React application uses global and section/page-level error handling plus explicit loading/error states in individual flows.

Current route composition is primarily maintained in `src/AppRoutes.tsx`; do not use the historical statement that all routing lives in `src/App.tsx` as a current route inventory.

Client errors may be captured through `src/lib/errorTracking.ts` and the server error-reporting boundary where configured.

For user-facing errors:

- explain the recoverable next action;
- do not expose stack traces, SQL details, Supabase service errors or secrets;
- keep marketplace/account wording appropriate to the current native/web surface;
- preserve privacy-safe generic failures for public lookup/auth-related cases.

---

## 3. Netlify function responses

Functions should return JSON with an appropriate HTTP status and a safe error message/code as required by the flow.

Common semantics:

| Status | Typical meaning |
|---|---|
| 400 | invalid/missing request data |
| 401 | authentication required/invalid |
| 403 | authenticated but not authorised |
| 404 | not found or intentionally generic privacy-safe lookup failure |
| 405 | unsupported HTTP method |
| 409 | business/state conflict |
| 429 | rate limit / abuse control |
| 500 | unexpected server/configuration failure |
| 503 | required service/configuration unavailable |

Do not force every function into an identical payload if the current contract requires a stable structured code/state; preserve backwards compatibility and tests.

---

## 4. Authentication and authorization failures

Authorization must be established by current trusted boundaries, not UI state alone.

Relevant controls include:

- active/suspended account state;
- server-governed Buyer/Seller capabilities;
- Seller lifecycle/readiness;
- privileged Admin authority;
- RLS/service-role boundaries;
- transaction/resource ownership.

If authoritative authorization state cannot be established for a sensitive action, fail closed.

---

## 5. Payments, tax and financial failures

Payment/tax errors require special handling because retrying an apparently failed operation can create duplicate or inconsistent state.

Protect:

- checkout reservation state;
- Stripe session/payment creation;
- webhook signature verification;
- idempotency/replay handling;
- order/payment separation;
- payout/refund/reconciliation separation;
- tax-evidence fail-closed behavior.

A client transport/UI error does not prove Stripe or database mutation did not already occur. Investigate canonical state before retrying potentially mutating financial actions.

---

## 6. Public order tracking privacy

The current public tracking boundary intentionally requires order identity plus buyer email verification and returns a generic lookup failure when details do not match.

This is a privacy/security behavior, not a UX defect. Do not replace it with order-existence-specific errors that enable enumeration.

---

## 7. Supplier/provider failures

Provider/network errors must not silently become commerce truth.

Supplier Commerce should distinguish, where applicable:

- provider unavailable;
- auth/permission denied;
- stale stock/price evidence;
- unsupported capability;
- order submission not acknowledged;
- provider kill switch/incident state;
- policy/pilot rejection.

Do not interpret provider authentication success as authority to place orders or activate a capability.

---

## 8. Upload/storage failures

Product media, proof-of-delivery and other uploads must validate applicable ownership, MIME/size rules and storage authority before persisting references.

Failed or uncommitted upload objects should be cleaned up where the current server flow supports that behavior. Never expose private storage paths/tokens unnecessarily.

---

## 9. Rate limiting and abuse handling

Public/auth-sensitive functions may use the shared rate limiter and other anti-abuse controls.

The appropriate fail-open/fail-soft/fail-closed policy depends on the endpoint risk. Security-sensitive/public-enumeration boundaries should not weaken protection merely because telemetry/storage for rate limiting is degraded.

---

## 10. CSP and browser security reporting

`netlify.toml` and the edge/security-header implementation define the current browser security policy. CSP violations may be reported to the current CSP reporting function.

Do not copy historical CSP snippets into new documentation without checking current Netlify/edge configuration.

---

## 11. Operational evidence

Useful evidence may include:

- client error reports;
- Netlify function logs;
- CSP reports;
- Stripe event/idempotency records;
- Supabase/database state;
- provider/API response evidence;
- device/browser reproduction;
- current tests for the exact failure path.

Never expose secrets or unrelated personal data while collecting evidence.

---

## 12. Debugging deploy/chunk failures

For a suspected stale frontend chunk or deploy mismatch:

1. verify the failing asset/route against the current deploy;
2. confirm which commit/deploy is actually serving production;
3. reproduce with cache bypass/new session where appropriate;
4. verify the current production build/deploy rather than assuming a local build represents production;
5. preserve user work/state where possible.

A hard reload can help with a stale client cache but is not a substitute for proving the deployed artifact is correct.

---

## 13. No Fake PASS

A resolved UI symptom is not proof that the underlying server/data issue is resolved.

Before closing an error with meaningful security/commerce impact, verify the relevant vertical path:

**client → auth → server/API → database/external service → side effect → user-visible state → audit evidence.**

*Reconciled with current repository architecture: 2026-09-10.*
