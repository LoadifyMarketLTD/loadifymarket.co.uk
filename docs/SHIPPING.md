# Loadify Market — Shipping & Tracking

**Status:** current architectural/operational guide  
**Reconciled:** 2026-09-10  
**Authority:** current handlers, migrations, UI and production evidence win if volatile implementation details drift.

---

## 1. Scope

Loadify shipping/tracking connects the customer order to seller or authorised fulfilment activity while preserving one canonical customer-facing order truth.

Current marketplace capabilities include, as applicable:

- seller-selected shipping methods during listing/checkout;
- shipment records associated with orders;
- courier/tracking information;
- shipment events/status progression;
- buyer order visibility;
- public order tracking with identity/email verification;
- proof-of-delivery upload;
- seller/admin shipment management;
- carrier-aware tracking links where supported;
- return/dispute flows connected to order state.

Supplier Commerce may introduce additional fulfilment legs/provider shipping evidence, but those remain governed by the canonical Supplier Commerce contract and provider capability state.

---

## 2. Core data concepts

### Customer order

The customer order is the canonical buyer-facing commerce record.

### Shipment / fulfilment evidence

Shipment data can include:

- order/seller/buyer relationship;
- courier/carrier context;
- tracking number;
- status;
- proof-of-delivery reference;
- timestamps/events.

### Supplier Commerce

For supplier-fulfilled commerce, customer order, fulfilment leg, consignment and supplier/provider state are distinct concepts. Do not collapse provider raw state into the customer order or tax/financial truth.

---

## 3. Public tracking privacy boundary

The current `track-shipment` server function accepts a POST request and requires:

- an order number or order ID; and
- the buyer email associated with the authoritative order identity/snapshot.

The function deliberately:

- normalises lookup inputs;
- validates email format;
- rate limits public lookup;
- verifies ownership/identity before resolving related private data;
- returns a generic lookup failure when order/email details do not match.

Do not move buyer email into the URL or expose order-existence-specific errors that weaken enumeration protection.

---

## 4. Shipment management

Seller/admin shipment workflows use authorised server/database boundaries for operations such as:

- creating or associating a shipment;
- adding/updating courier and tracking context;
- transitioning shipment status;
- recording shipment events;
- attaching proof of delivery.

Exact allowed transitions and actor permissions must be derived from current server/RLS/RPC code and tests, not from an old static status list in this document.

---

## 5. Proof of delivery

The current proof-of-delivery path uses `upload-proof-of-delivery` and Supabase Storage.

The server flow validates applicable actor access and upload metadata, prepares/handles the storage upload and associates the resulting proof with the authorised shipment through the current server boundary.

Current mobile order and seller shipment surfaces call this server path. MIME/size rules are implementation details that must be checked in the current handler/migrations before changing UI or policy.

Do not expose private upload tokens or storage authority to unauthorised clients.

---

## 6. Shipping methods and price

Do **not** treat historical fixed examples such as “Standard £5 / Express £12 / Pallet £50” as universal current truth.

Shipping availability/cost must come from the current listing/shipping-method/checkout contract and, for Supplier Commerce, from the applicable provider/canonical shipping evidence.

Customer-facing checkout must consume the authoritative calculated shipping amount and preserve price transparency. Do not invent shipping prices in UI or documentation.

---

## 7. Notifications

Shipment/order state can trigger transactional notifications according to current server templates and event logic.

Transactional email currently uses the server email boundary backed by Resend. Do not use this document to infer that every shipment transition sends an email; verify the exact current event/template behavior.

SMS must not be described as active unless an actual provider, runtime credentials, consent/compliance controls and sending path are verified.

---

## 8. Carrier links and external tracking

Where Loadify provides links to carrier tracking pages, they are navigation to the relevant external carrier experience and do not make that carrier's system the canonical Loadify order ledger.

Carrier/API capability must be treated as external, potentially volatile evidence.

---

## 9. Supplier-fulfilled shipping

For Supplier Commerce:

- supplier/fulfilment provider may hold stock and dispatch directly to the buyer;
- Loadify maintains the customer-facing order/tracking/support boundary according to the controlling business contract;
- provider raw shipping capability and Loadify sellable/deliverable truth are distinct;
- postcode/region capability must fail safely when required provider evidence is absent;
- supplier fallback must not silently change the customer delivery promise;
- dispatch origin, customs/tax or fulfiller disclosure must remain accurate where material/required.

Current Supplier Commerce phase/readiness is governed by the canonical Phase O → P → Q plan; this document does not authorise provider activation.

---

## 10. Testing expectations

A credible shipping release gate should cover the affected path, as applicable:

- seller creates/updates shipment through an authorised boundary;
- actor cannot mutate another party's shipment;
- status transition rules;
- public tracking valid and invalid email/order combinations;
- enumeration-safe failures;
- proof-of-delivery upload/access controls;
- buyer/mobile visibility;
- carrier link generation;
- inactive/suspended account behavior;
- return/dispute interaction;
- Supplier Commerce provider failure/stale-evidence behavior where relevant.

Build success alone is not shipping E2E evidence.

---

## 11. Operational troubleshooting

When a shipping/tracking problem is reported:

1. establish the exact order and actor using authorised access;
2. inspect canonical order/shipment state;
3. check the relevant server logs and current function behavior;
4. verify storage/proof state if involved;
5. verify carrier/provider evidence if external state is involved;
6. do not manually rewrite order/shipment truth merely to make the UI look correct;
7. repair through an authorised, auditable path.

---

## 12. Related current sources

Use these as starting points and verify current HEAD:

- `netlify/functions/track-shipment.ts`
- `netlify/functions/upload-proof-of-delivery.ts`
- shipment/status server functions and tests
- `src/pages/MobileOrdersPage.tsx`
- `src/pages/pixel-perfect/seller/SellerShipments.tsx`
- `supabase/migrations/`
- canonical Supplier Commerce documentation for supplier-fulfilled paths

Historical shipping documents/examples do not override current code or production evidence.
