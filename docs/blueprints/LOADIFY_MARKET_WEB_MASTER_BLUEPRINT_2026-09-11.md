# Loadify Market — Web Marketplace Master Blueprint

**Date:** 2026-09-11  
**Scope:** WEBSITE / WEB PLATFORM ONLY  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Implementation baseline:** current `main` / `LoadifyMarket-Release-v4`  
**Source reference:** user-provided `loadify_master_blueprint.md`, reconciled against the current repository architecture.

> This document is the continuation checkpoint for the web implementation. It must not be treated as a mobile UI blueprint. Mobile/Capacitor parity is a separate phase after the website implementation is stable.

---

## 1. Platform model

Loadify Market operates as a **Pure Digital Multi-Vendor Marketplace**. Loadify provides marketplace technology, payments, transaction orchestration, notifications, trust/safety workflows and seller/buyer infrastructure. Physical stock, warehousing, packing, dispatch and physical return receipt remain the responsibility of sellers/vendors or their approved suppliers.

Current core stack:

- React + TypeScript + Vite
- Supabase Auth / PostgreSQL / Realtime
- Netlify Functions
- Stripe Connect
- Capacitor exists for Android, but is outside this document's implementation scope

Commercial/logistics target policy:

- stock located in approved UK/EU fulfilment locations;
- total delivery target 2–5 days where policy applies;
- Royal Mail primary carrier;
- Evri approved alternative;
- 0% promotional platform commission until 2026-12-31 23:59:59 UTC;
- 7% default platform commission from 2027-01-01, subject to existing code/config truth.

---

## 2. Implementation governance

### 2.1 Source of truth

`main` is the code source of truth. PR #736 is an audit/recovery source only and must not be merged wholesale.

Every #736 finding must be classified as:

- `ALREADY_IN_MAIN`
- `VALID_RECOVERY_DELTA`
- `SUPERSEDED`
- `DOCUMENTATION_ONLY`
- `STILL_MISSING`
- `SAFE_TO_DELETE_CANDIDATE`

### 2.2 Server authority

The browser must not be authoritative for:

- payment state;
- order state transitions;
- shipment ownership;
- refund amount;
- payout release;
- seller/buyer ownership;
- commission;
- inventory finalisation;
- return eligibility;
- carrier/SLA enforcement.

Critical mutations must use secured Netlify Functions and/or protected Supabase RPCs.

### 2.3 Immutable transaction history

Orders must retain immutable snapshots for dispute/audit purposes, including product, variant, quantity, price, shipping method and delivery address. Later edits to a listing/profile must not rewrite historical transactions.

---

## 3. Buyer addresses and checkout

Target flow:

`Signup/Login → Buyer Profile → Addresses → Cart/Buy Now → Checkout → Payment → Order Snapshot`

Requirements:

- Signup does not require an address merely to browse.
- Buyer has separate Shipping Address and Billing Address management.
- Checkout prefills from saved Buyer Shipping Address when present.
- Buyer can edit the address before payment.
- Checkout can save the confirmed address back to the Buyer profile according to final UX policy.
- Physical checkout requires a valid delivery address.
- `orders.shippingAddress` remains an immutable transaction snapshot.
- Updating Buyer Profile later must not alter an existing order.

Minimum address fields:

- recipient name;
- line 1;
- line 2 optional;
- city;
- county/region optional;
- postcode;
- country / country code;
- phone only where operationally justified.

---

## 4. Seller paid-order notification

Trigger only on the first authoritative paid transition:

`Stripe payment confirmed → order paid/materialised → seller notification`

Channels:

- in-app;
- push;
- email when enabled/configured.

Notification must be idempotent. Stripe webhook retries must not generate duplicate seller alerts.

Do not expose the buyer's full address in lock-screen push content. The seller opens authenticated Order Details to access fulfilment data.

---

## 5. Seller Web Order Details / Ship To

Required flow:

`Seller → Orders → View Order → Order Details → Ship To → Fulfilment`

Order Details must include:

- order number;
- payment/created date;
- recipient name;
- product snapshot;
- quantity;
- unit price / total;
- shipping fee/method;
- shipment status;
- tracking number;
- buyer delivery-address snapshot;
- cancellation / return / dispute state;
- payout state where appropriate.

For physical orders, the seller must see:

`Ship to → recipient → line1/line2 → city → region → postcode → country → delivery method`

Use `orders.shippingAddress`, not the buyer's current profile address.

Fail closed:

`Paid physical order + missing shippingAddress → show warning + disable Create Shipment / Mark Shipped / Dispatch`.

---

## 6. Carrier policy and dispatch requirements

Approved new-shipment carriers:

- Royal Mail
- Evri

Remove contradictory carrier choices from Seller Web where the backend does not permit them.

For a tracked physical shipment:

- carrier must be approved;
- tracking number must be present before dispatch;
- backend validates the same rule so frontend bypass is impossible.

Existing implementation checkpoint on 2026-09-11:

- Seller Settings carrier UI normalized to Royal Mail / Evri;
- legacy `hermes` preference normalized to Evri;
- `create-shipment.ts` rejects dispatch without delivery address, tracking and approved carrier;
- seller shipment UI enforces the same guard.

---

## 7. Shipment state machine and correction

Shipment state is distinct from order state.

Canonical shipment states should cover:

`processing → ready_to_ship → dispatched → in_transit → out_for_delivery → delivered`

and exceptions such as:

`delivery_failed`, `returned_to_sender`, `cancelled`.

Every event must record source/actor and history. Suggested event sources:

- `seller_manual`
- `admin_manual`
- `courier_api`
- `system`

### Undo / Correct Delivery Status

Required concrete case:

`Processing → accidental Dispatched → Correct delivery status → Processing/Ready to ship`

Never delete the original event. History should retain:

`Dispatched → Status corrected by seller → Returned to Processing`.

Seller correction rules:

- Dispatched: reversible when seller-manual and no courier handoff/scan contradicts it.
- In Transit: limited correction only if manual and no external courier evidence.
- Out for Delivery: highly restricted; generally support/admin if any external evidence exists.
- Delivered: no simple seller Undo where courier proof/buyer confirmation/payout progression exists.
- Delivery Failed: correctable only when manual and not contradicted by courier data.

Courier/API events cannot be arbitrarily overwritten by a seller.

Payout must never advance on a shipment state that is subsequently invalidated as an error.

---

## 8. Separate state domains

Do not overload one status field to represent all lifecycle concerns.

Order domain examples:

`created, paid, processing, packed, shipped, delivered, completed, cancelled, disputed`

Payment domain examples:

`pending, paid, partially_refunded, refund_pending, refunded, failed, chargeback`

Return domain target:

`requested, approved/awaiting_buyer_dispatch, in_transit_to_seller, awaiting_seller_reception, received, refund_pending, refunded, rejected/cancelled`

Payout domain target:

`held, eligible, scheduled, paid, reversed, blocked`

Each transition must define Buyer actions, Seller actions, system effects, notifications, payout implications and audit events.

---

## 9. Buyer Cancel Order

Target flow:

`Order Details → Cancel Order → Select Reason → Confirm → Cancellation Successful → Refund Status`

Rules:

- before fulfilment commitment: allow cancellation;
- short instant-cancellation grace period may be used;
- once seller processing/fulfilment is materially committed, use `Cancellation Requested` where appropriate;
- after real dispatch/courier handoff, Cancel is unavailable and Return/Refund is used instead.

---

## 10. Seller shipping origin and return address

Seller Web Settings must provide private fulfilment data:

- Shipping Origin Address;
- Return Address;
- `Use shipping origin as return address` option.

For physical-product sellers, return address must be configured before return-enabled fulfilment can be considered complete.

This information is private operational data and must not appear on public seller projections.

Implementation checkpoint started on 2026-09-11:

- migration `20260911164000_seller_fulfilment_and_return_address.sql` introduced the website fulfilment/return-address foundation;
- the final schema must continue to use the repository's actual seller identity model rather than assuming a non-existent generic `public.sellers` table.

---

## 11. Direct-to-Seller return flow

Target flow:

`Buyer requests return → eligibility → approval → immutable seller return-address snapshot → buyer return instructions → buyer dispatches directly to seller → seller receives → receipt confirmed → refund processing → buyer notified`

The buyer must receive only the address snapshot for the authorised return. Seller profile changes must not alter an already-approved return.

Return-address snapshot belongs on the return record, not as a live reference only.

Seller approval must fail if no valid return address exists.

---

## 12. Stripe refund architecture

Do not implement refund from a client-supplied `sellerId`, `chargeId` or refund amount.

Backend must derive and verify:

- authenticated actor;
- seller ownership;
- buyer/order ownership;
- return status;
- refundable amount;
- prior refunds;
- Stripe payment evidence;
- transfer / payout state;
- disputes/chargebacks;
- idempotency.

Flow:

`Seller confirms return receipt → secured backend → calculate server-side refund entitlement → Stripe refund/reversal according to existing Connect architecture → update return/payment/order/payout states atomically/idempotently → notifications/audit`.

The example refund code in the source blueprint is reference-only and must not override the repository's existing financial controls.

---

## 13. Seller listing lifecycle

Website must support:

`Draft → Publish → Edit → Pause → Reactivate → Duplicate → Archive → Delete where safe`

If a listing has transaction history, archive is preferred over destructive deletion. Historical order snapshots remain intact.

There is no marketplace negotiation / Make Offer / Counteroffer feature in the target fixed-price marketplace flow.

---

## 14. Generic seller feed self-service

Seller Web integration flow:

`Seller → Integrations → Add Feed → URL → CSV/XML/JSON → Analyze → Preview → Map Fields → Validate → Activate`

Required mapping minimum:

- SKU;
- title;
- price;
- stock quantity;
- availability;
- stock origin;
- dispatch time.

Optional mappings can include brand, GTIN/EAN, images, category, dimensions, weight and variants.

Use the repository's existing Seller/Supplier Commerce model; do not blindly create foreign keys to an assumed `public.sellers` table.

Suggested governed feed record:

- seller identity;
- feed URL;
- feed type;
- mapping config;
- active state;
- sync interval;
- last sync;
- last success;
- last error;
- created/updated timestamps.

---

## 15. Feed security

Feed URLs are untrusted input. Feed analysis/sync runs server-side, never direct from the seller browser.

Mandatory SSRF controls:

- block localhost;
- block private IPv4/IPv6 ranges;
- block link-local;
- block cloud metadata services;
- validate DNS resolution and redirects;
- timeout;
- download-size cap;
- content-type checks;
- parser row/depth/size limits;
- HTTPS policy as appropriate.

No seller-provided URL may be allowed to turn the Netlify runtime into an internal network proxy.

---

## 16. Scheduled feed sync

Use scheduled server-side execution. Default target can be every 1–3 hours depending on operational policy.

Pipeline:

`load active integrations → fetch → validate → parse → normalize → map → SLA/geography checks → update only authorised fields → audit result`

Automated feed updates should default to fields such as:

- price;
- stock;
- availability;
- selected fulfilment metadata.

Do not overwrite curated descriptions/images/categories without explicit mapping and policy.

Out-of-stock rule:

`supplier stock = 0 → Loadify listing unavailable / Out of Stock`.

Checkout must still perform authoritative server-side inventory validation to protect against stale browser state.

---

## 17. Direct supplier/API integrations

The source blueprint proposes AppScenic, Spocket and Syncee integration concepts. Treat provider names, endpoints, auth formats and response schemas as **unverified placeholders until checked against each provider's current official documentation and commercial API access**.

Do not store seller API secrets in a public client-readable table. Secrets require a server/private storage model and controlled management functions.

Any direct integration should plug into the existing Supplier Commerce governance rather than bypass it.

---

## 18. SLA enforcement

Reuse existing Supplier Commerce SLA concepts where possible, including:

- `dispatch_hours`;
- `tracking_deadline_hours`;
- `stock_freshness_minutes`;
- `price_freshness_minutes`;
- stock accuracy / cancellation metrics where already supported.

Business target:

`maximum dispatch/tracking deadline = 48 hours`.

Do not blindly add these columns/triggers directly to `products` if the current schema owns SLA elsewhere.

Suggested escalation:

`24h reminder → 40h urgent reminder → 48h breach → automated/admin escalation → repeated breach review/restriction`.

---

## 19. Geography and lead-time policy

Source blueprint target is UK/EU stock with a 2–5 day total delivery window.

Represent provenance structurally:

- country code;
- region;
- warehouse/reference;
- verification timestamp;
- source.

Keep dispatch and transit separate:

- `dispatch_hours`;
- `transit_hours`;
- `estimated_delivery_days`.

Unsupported stock should preferably be `QUARANTINED / NEEDS REVIEW` with a reason rather than silently disappearing.

Important reconciliation: the source blueprint's sample API code only whitelists UK/GB strings even though the stated policy is UK/EU. Production implementation must resolve that inconsistency intentionally.

---

## 20. Seller Terms / operational policy

Update Seller Terms only after corresponding functionality exists.

Terms should align with actual platform behaviour and cover seller responsibilities for:

- accurate stock and pricing;
- dispatch SLA;
- tracking;
- packing/fulfilment;
- return address;
- direct receipt of physical returns;
- carrier policy;
- buyer communication;
- refunds/disputes cooperation.

Legal wording must not claim unimplemented technical functionality.

---

## 21. Website test/release gates

Before considering the website implementation complete:

### Gate A — TypeScript

`npm run typecheck`

### Gate B — Unit/integration tests

Must cover at least:

- checkout address persistence/snapshot;
- Seller Ship To;
- seller order notification idempotency;
- dispatch address/tracking/carrier guard;
- shipment status correction;
- seller return-address privacy;
- return-address snapshot;
- return state transitions;
- refund idempotency;
- feed SSRF/security;
- feed parsing/mapping;
- SLA/geography enforcement.

### Gate C — Production build

`npm run build`

### Gate D — Web E2E

Required scenarios:

`Buyer address → checkout → paid order → seller notified → seller sees Ship To → valid dispatch → accidental dispatch correction → delivery → return approval → direct-to-seller return → seller receipt → refund`.

---

## 22. Known implementation checkpoint — 2026-09-11

Confirmed/implemented or in-progress in `LoadifyMarket-Release-v4` during the 2026-09-11 work session:

- Buyer checkout address prefill/save/snapshot work present in local v4;
- Seller Web/Mobile Ship To and missing-address guards present in local worktree;
- seller paid-order notification path exists;
- safe accidental-dispatch correction exists with audit history work;
- carrier UI being reconciled to Royal Mail/Evri;
- physical shipment dispatch guard now requires address + tracking + approved carrier;
- direct-to-seller return foundation started;
- return-address snapshot and expanded return-state work started;
- `seller-return-decision.ts` started as secured seller return decision boundary;
- relevant delivery/shipment tests passed 14/14 at checkpoint;
- full TypeScript validation subsequently exposed unrelated/incomplete route work, including a `SellerCoupons` import without a corresponding component file. Do not hide that issue by deleting functionality without determining its intended source.

---

## 23. Next implementation order

1. Finish Seller Web Shipping & Return Address settings.
2. Finish secured seller return decision endpoint.
3. Snapshot return address on approval.
4. Add Buyer return instructions/status UI.
5. Add Buyer return tracking submission.
6. Add Seller Confirm Receipt.
7. Integrate secured/idempotent Stripe refund/reversal with existing payment architecture.
8. Finish return/refund notifications and audit.
9. Resolve current unrelated TypeScript blockers without deleting intended features blindly.
10. Implement Generic Feed schema + RLS/private secret model.
11. Implement feed analyze endpoint with SSRF controls.
12. Implement CSV/XML/JSON mapping UI.
13. Implement scheduled sync and stock/price health/audit.
14. Implement 48h SLA enforcement/escalation in the correct Supplier Commerce boundary.
15. Implement UK/EU provenance + 2–5 day policy enforcement/quarantine.
16. Update Seller Terms/Guidelines once code is real.
17. Run full web test/build/E2E gates.
18. Only after web is stable, create a separate mobile implementation blueprint and parity plan.

---

## 24. Definition of done — Website

Website implementation is complete when:

- Buyer can store/reuse addresses and checkout keeps immutable delivery snapshots.
- Seller receives exactly one paid-order alert per transaction.
- Seller sees the correct order-specific Ship To address.
- Physical dispatch cannot occur without required address/tracking/approved carrier.
- Manual delivery mistakes can be corrected only where safe and remain auditable.
- Order/payment/shipment/return/payout domains remain coherent.
- Seller return address exists privately and is snapshotted for approved returns.
- Buyer ships returns directly to seller/vendor.
- Seller receipt leads to secure, idempotent refund/reversal handling.
- Seller feed/API integrations are server-secured and governed.
- Supplier stock can drive automatic Out of Stock behaviour safely.
- 48h SLA and geography/lead-time policies are enforced consistently.
- Seller-facing terms match actual behaviour.
- TypeScript, tests, production build and web E2E are green.

---

## Continuation note

If a future conversation starts without this chat context, begin by reading this file and then inspect `git status`, current `main`, open PRs (especially any audit/recovery PRs), and the migrations/functions/components named in the **Known implementation checkpoint** section before making new changes.
