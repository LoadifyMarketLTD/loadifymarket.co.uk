# Testing Guide — Shipping & Tracking

**Status:** current test guidance  
**Reconciled:** 2026-09-10  
**Rule:** derive exact routes, transitions, prices and supported carriers from current code/configuration for the SHA under test.

---

## 1. Test prerequisites

Record before testing:

- exact branch/commit SHA;
- environment (local/preview/production/device);
- buyer account and seller account used;
- order ID/order number created for the test;
- whether the test is ordinary marketplace seller fulfilment or Supplier Commerce;
- any external carrier/provider involved.

Do not reuse historical test data as proof of current behavior.

---

## 2. Marketplace checkout → order → shipment

Verify the current supported flow:

1. create/use an eligible physical-product listing;
2. select an available shipping method from current listing/checkout data;
3. complete the applicable checkout test path;
4. verify authoritative order totals and shipping amount;
5. verify the seller sees the order;
6. create/progress the shipment through the authorised path;
7. verify buyer-visible status/tracking.

Expected invariants:

- no hard-coded shipping amount is invented by the client;
- tax/VAT is derived from current canonical evidence, not assumed as a universal 20%;
- order and shipment state remain consistent;
- actor ownership/authorization is enforced.

---

## 3. Shipment authorization

Test both allowed and denied cases:

- authorised seller can act on their shipment/order according to readiness/state rules;
- unrelated seller cannot mutate it;
- suspended/inactive actor fails closed where required;
- Admin behavior follows the privileged server/database contract;
- direct client mutation cannot bypass protected transitions where server authority is required.

---

## 4. Shipment status progression

For each status transition affected by a change:

- verify allowed prior state;
- verify authorised actor;
- verify persisted shipment state;
- verify associated order state only changes when the current contract requires it;
- verify event/audit history;
- verify repeated/replayed requests do not create unsafe duplicate effects.

Do not copy an old status list into a PASS report; record the exact current transition contract tested.

---

## 5. Public tracking

Test the current POST lookup boundary with:

- valid order + matching buyer email;
- valid order + wrong email;
- nonexistent order;
- malformed email;
- missing order identifier;
- leading/trailing whitespace normalization;
- rate-limit behavior where safe to test.

Security expectations:

- buyer email is not placed in a URL/query string;
- mismatched/nonexistent lookup returns the intended generic failure;
- private product/seller/shipment details are resolved only after identity/ownership verification;
- responses do not reveal whether a guessed order exists.

---

## 6. Proof of delivery

Verify:

- authorised shipment actor can start the current upload flow;
- unsupported MIME/size is rejected according to current handler rules;
- unauthorised actor is rejected before private storage access;
- successful upload is associated with the correct shipment;
- failed/uncommitted upload does not leave an unsafe public reference;
- buyer/admin visibility matches current privacy policy and role rules.

Test both mobile order UI and seller shipment UI if either path changed.

---

## 7. Notifications

For shipment/order transitions that currently generate a notification:

- verify the exact event/template path in current code;
- verify recipient identity;
- verify no duplicate notification on replay where idempotency applies;
- verify transactional email uses the current configured sending boundary;
- do not claim SMS delivery unless a real SMS provider/path is active and tested.

---

## 8. Carrier tracking links

Where carrier-aware links are shown:

- verify supported carrier mapping from current code;
- verify tracking number encoding;
- verify the link opens the intended official carrier destination;
- verify unknown carriers fail safely without fabricating a URL;
- verify mobile CTA visibility when relevant.

External carrier-page availability is not Loadify order-state authority.

---

## 9. Returns and disputes

For delivered/returned/disputed orders, verify the shipping state remains consistent with:

- buyer return/dispute eligibility;
- proof/tracking evidence;
- seller view;
- Admin resolution path;
- refund/payment state where applicable.

Do not infer refund eligibility solely from a shipment status.

---

## 10. Supplier Commerce shipping

Only run Supplier Commerce tests inside the currently authorised canonical phase/pilot boundary.

Where applicable verify:

- provider capability/allowlist is current;
- destination postcode/region handling;
- stock/price/shipping evidence freshness;
- provider order acknowledgement separately from Loadify payment success;
- tracking ingestion/normalisation;
- fallback does not change customer promise;
- provider failure/kill switch fails safely;
- customer order remains canonical and provider-specific state remains subordinate evidence.

---

## 11. Required evidence in a PASS report

A shipping PASS should state:

- exact SHA/build;
- tests executed and their result;
- environment/device/browser;
- exact flow(s) covered;
- database/server evidence inspected;
- production/provider evidence inspected if relevant;
- what was **not** tested.

A build-only PASS is not a shipping-flow PASS.
