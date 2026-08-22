# Phase O — Avasam Guard Matrix

Status: implementation guard; no pilot activation.

## Required before any Avasam capability becomes active

- provider identity evidence
- territory-specific capability evidence for GB
- verified authentication contract
- endpoint contract for every enabled capability
- request/response schema evidence
- webhook verification evidence where applicable
- real test evidence for catalog, stock, price, shipping and order acknowledgement
- idempotent order submission/recovery evidence
- tracking/cancellation/returns/reimbursement evidence for any advertised capability

## Fail-closed rules

- undocumented endpoint: unavailable
- missing authentication evidence: unavailable
- malformed response: failure, never empty/default data
- unknown stock: never converted to zero
- unknown price: never converted to zero
- unknown order outcome: recovery required before retry
- simulator evidence: not production pilot evidence
- missing GB provider evidence: adapter cannot become active
- raw credentials in repository/database fixtures: forbidden

## Source of truth

The provider-neutral `SupplierAdapterV1` contract is the sole commerce-engine adapter contract. Avasam-specific code may translate provider payloads at the boundary but must not leak provider-specific types into the core commerce model.
