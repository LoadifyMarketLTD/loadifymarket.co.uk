# WEB / MOBILE PARITY AND CONSUMER CONTRACT

Status: PREPARATION ONLY. No UI/runtime implementation is authorised before the canonical gates.

## Core rule

WEB BUSINESS CONTRACT = MOBILE BUSINESS CONTRACT.

The platform may have different presentation layers, but not different product/order/payment/supplier semantics.

## Shared canonical responsibilities

Both web and mobile must ultimately consume the same server-authoritative rules for:
- authentication/active-account checks;
- product identity;
- supplier offer selection/sellability;
- price and shipping authority;
- reservation;
- checkout/payment evidence;
- order lifecycle;
- supplier fulfilment state;
- tracking;
- returns/refunds;
- buyer protection;
- notifications;
- privacy/security.

## No duplicated business engine

Do not implement a mobile-specific Supplier Commerce engine or direct provider integration.

MOBILE
→ CANONICAL LOADIFY API
→ DOMAIN SERVICE / ADAPTER
→ PROVIDER.

The same applies to web.

## Client trust boundary

Neither web nor mobile may authoritatively supply:
- product price;
- supplier cost;
- customer shipping price;
- stock truth;
- seller/supplier identity;
- commission/margin;
- payment success;
- refund result;
- protected fulfilment transitions.

Clients may propose selections/inputs; server verifies canonical truth.

## Offline/intermittent mobile behavior

Mobile connectivity can be unreliable. Design must distinguish:
- request not sent;
- request sent but response lost;
- server committed but client timed out;
- retry after app restart.

State-changing mobile calls require idempotency/reconciliation where duplication could create commercial effects.

## Authentication/session

The frozen Checkpoint A auth boundary wins. Supplier Commerce must not introduce weaker mobile authentication, cached role authority or local-only active-account checks.

## Push notifications

Push is a notification channel, not canonical state.

Opening a push must refetch current server state. Duplicate/missing push must not change order truth.

## Deep links

Supplier/order/tracking/return deep links should resolve to canonical identifiers and enforce authorization after navigation. Link possession is not permission.

## Checkout parity

Web/mobile checkout must use the same authoritative product/seller/supplier/stock/price/shipping validation.

If a capability is temporarily web-only, mobile must fail/redirect cleanly rather than implement a weaker alternative contract.

## Tracking parity

Both clients read normalized Loadify tracking state. Provider-specific statuses/URLs may be displayed only as approved detail, not as a separate lifecycle.

## Returns/refunds parity

Mobile/web request flows can differ visually, but:
- eligibility;
- return reason/evidence;
- authorization;
- refund state;
- supplier recovery state
must be canonical server truth.

## Feature flags

Flags are evaluated/enforced server-side for commercial behavior. Client flags may control presentation only.

A stale mobile app must not bypass a server kill switch or rollout restriction.

## API evolution

Canonical API versioning must consider older installed mobile versions.

For breaking changes:
- define compatibility window;
- support safe server fallback where appropriate;
- fail closed for unsafe obsolete clients;
- surface upgrade requirement cleanly;
- preserve order/history access where possible.

## Error model

Web/mobile should receive stable canonical error classes suitable for UX, e.g.:
- not authenticated;
- inactive account;
- product unavailable;
- stale stock;
- price changed;
- shipping unavailable;
- payment pending/failed;
- supplier outcome pending;
- action already completed;
- manual review required.

Do not leak provider raw errors/secrets.

## Consumer contract tests

Future E2E must prove equivalent outcomes for web and mobile on:
- successful purchase;
- stale stock;
- price change;
- duplicate submit;
- payment completed but client response lost;
- supplier pending/failed;
- tracking update;
- return/refund request;
- suspended account;
- supplier kill switch;
- older supported client version.

## PASS criteria

Parity is PASS only when:
- web/mobile share canonical APIs and lifecycle;
- clients cannot author commercial truth;
- mobile retry/offline behavior is safe;
- push/deep links are non-authoritative;
- server flags/kill switches cannot be bypassed;
- supported app versions have explicit compatibility behavior;
- equivalent E2E scenarios produce equivalent canonical outcomes.
