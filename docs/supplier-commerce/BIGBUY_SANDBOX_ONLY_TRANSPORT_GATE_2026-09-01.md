# BigBuy Sandbox-Only Transport Gate — 2026-09-01

## Status

**TRANSPORT HARDENING ONLY — BIGBUY REMAINS UNVERIFIED AND OFF**

## Purpose

Close a safety gap in the BigBuy read-only scaffold before authorised sandbox verification is complete.

The existing `BigBuyClient` already rejected all non-GET requests, protected the Bearer header, required a correlation id and rejected untrusted absolute/host-like paths. However, it also allowed the caller to select the BigBuy Production host explicitly.

That was too permissive for the current provider state: BigBuy still has no verified Loadify runtime capability and no authorised sandbox evidence in this workstream.

## Change

`BigBuyClient` is now sandbox-only.

When `environment = production` is supplied, the client returns `CAPABILITY_UNAVAILABLE` **before network access**.

The active transport constant contains only:

`https://api.sandbox.bigbuy.eu`

The client continues to reject:

- missing API key;
- missing correlation id;
- invalid environment values;
- POST or any other non-GET method;
- caller-controlled Authorization or correlation headers;
- absolute, protocol-relative or backslash-host endpoint paths.

## Why Production remains blocked

A documented Production API host is not equivalent to Loadify production-read approval.

Production access remains blocked until all relevant gates are separately satisfied, including at minimum:

1. authorised BigBuy sandbox credential;
2. controlled taxonomy/product/variation identifiers;
3. successful controlled sandbox read-only probe;
4. evidence review for catalogue/variation/stock/price semantics;
5. explicit capability promotion through Loadify governance;
6. explicit owner approval for the production-read boundary.

This PR does not define or grant those approvals.

## Provider state remains unchanged

`bigbuy` remains:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- `hostedActivation = off`;
- represented by the inactive zero-capability adapter in `supplierProviderRegistry.ts`.

## Non-effects

This hardening performs no:

- BigBuy sandbox or Production network call;
- credential creation/storage/disclosure;
- provider capability promotion;
- adapter registration;
- order CHECK/CREATE;
- customer PII disclosure;
- marketplace publication;
- Supabase mutation;
- payment/refund/payout mutation.

## Next gate

The next external gate remains obtaining authorised sandbox credentials and controlled identifiers, then running the existing `bigbuy-sandbox-readonly-probe.mjs`. Only real evidence from that gate may support later read-capability promotion.
