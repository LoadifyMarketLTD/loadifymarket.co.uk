# Phase O — Avasam integration contract foundation

Status: FOUNDATION ONLY — NOT PILOT READY

## Implemented

- Provider-neutral `SupplierAdapterV1` remains the only commerce-engine contract.
- Added `AvasamClient` as a server-side transport boundary.
- Added `AvasamAdapterV1` with provider key `avasam`.
- Added fail-closed error classification for authentication, rate limiting, retryable failures, permanent rejection and unknown outcomes.
- Added environment-backed configuration names without storing credentials in source control.

## Deliberately not implemented yet

No Avasam endpoint path, request payload, response payload, webhook signature scheme, stock event schema, price event schema, order schema, shipping schema, tracking schema, return schema or reimbursement schema is guessed here.

The adapter exposes no active capabilities until the provider contract is verified. This prevents a simulated or guessed Avasam integration from satisfying the Phase O real-evidence gate.

## Required evidence before activation

1. Official Avasam API documentation or provider-issued integration specification.
2. Verified authentication method and credential type.
3. Verified catalogue/product/variant contract.
4. Verified stock and price read or event contract.
5. Verified order submission and acknowledgement contract.
6. Verified shipping/tracking contract.
7. Verified cancellation/returns/reimbursement contract where supported.
8. Verified webhook authentication/signature mechanism, if webhooks are used.
9. A real provider test account or equivalent production-authorized test evidence.
10. Only after the above: populate provider capability evidence and register the adapter.

## Security rule

Credentials must remain in Netlify/Supabase server-side environment or secret storage. They must never be placed in frontend code, SQL fixtures, tests, documentation examples, or adapter registration `config_ref` values as raw secrets.
