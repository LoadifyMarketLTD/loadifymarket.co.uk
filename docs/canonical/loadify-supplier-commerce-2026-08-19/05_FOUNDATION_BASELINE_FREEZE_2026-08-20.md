# LOADIFY SUPPLIER COMMERCE — FOUNDATION BASELINE FREEZE

**Freeze date:** 20 August 2026  
**Purpose:** factual Supplier Commerce foundation snapshot after atomic Checkpoint A PASS and before Gate B.  
**Controlling sequence:** `CHECKPOINT A → ATOMIC PASS → FOUNDATION BASELINE FREEZE → GATE B → GATE B PASS → SUPPLIER COMMERCE C→Q`.

This file is a factual freeze point. It does **not** authorize Supplier Commerce runtime/schema implementation and it does **not** replace the Canonical Execution Contract or the Product Direction Update in this directory.

---

## 1. FROZEN REPOSITORY STATE

- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Default branch: `main`
- Frozen `main` SHA: `99cece9932d02a8bb2f3b5f015785dd93feba529`
- Parent runtime-tested merge: PR #514 / `33268933271bb7496953a42a07433a1e3efeeb12`
- Change from #514 merge to frozen main: canonical documentation only (PR #516); no runtime, DB, Android, Stripe or UI code changed.
- Open PRs at freeze creation: `0`
- Supplier Commerce runtime/schema changes at freeze creation: `0`

Future changes to `main` are **not automatically absorbed** into this baseline. They must be explicitly reconciled against the contracts below.

---

## 2. FROZEN PRODUCTION DATABASE STATE

Supabase project:

- project: `loadify-market`
- project ref: `fwdfpmfvgygvqciecesx`
- status at freeze: `ACTIVE_HEALTHY`
- PostgreSQL: `17.6.1.084`
- migration head: `20260820083335 / reconcile_payment_safety_hold`

Canonical Checkpoint A migration chain present in production:

1. `603 / lock_push_token_writes_to_server`
2. `604 / protect_paid_orders_from_stale_cleanup`
3. `605 / lock_product_delete_to_server`
4. `606 / enforce_single_active_push_token_owner`
5. `607 / lock_shipment_writes_to_server`
6. `608 / enforce_active_account_authorization`
7. `609 / lock_storage_writes_to_bucket_contracts`
8. `610 / snapshot_order_commercial_identity`
9. `611 / reconcile_payment_safety_hold`

Live freeze checks:

- active physical push-token duplicate groups: `0`
- pending payment sessions: `0`
- financially active / escrow-held orders: `0`
- open / in-review disputes: `0`
- `payments_safety_hold = false`
- emergency payment-safety trigger remains installed
- obsolete web-shipping payment guard is absent
- `server_materialize_paid_order_v1(...)` exists
- `shipments_one_per_order` unique index exists
- product-image objects: `67`
- legacy `uploads/...` product-image objects: `63`
- canonical `sellers/...` product-image objects: `4`

No production history is rewritten by this freeze.

---

## 3. ATOMIC CHECKPOINT A — FINAL STATUS

Checkpoint A is frozen as **ATOMIC PASS** on the evidence accumulated before this document plus fresh production verification during freeze creation.

| Gate | Frozen status | Evidence / controlling result |
|---|---|---|
| AUTH | PASS | Migration 608 live-account authority; stale-session authorization suite PASS |
| PR #508 functional contract | PASS / CLOSED | Canonical seller listing deletion merged; migration 605 live |
| PR #504 functional contract | PASS / CLOSED VIA #511 | #504 superseded; clean #511 merged and verified |
| PUSH TOKEN PRIVACY | PASS | 603 + 606; server-only writes; one active physical-token owner invariant; live duplicate active token groups = 0 |
| MOBILE SESSION ISOLATION | PASS | Exact signed #514 release: push, logout, account switch/session isolation and correct conversation deep-link PASS on real device |
| SELLER OWNERSHIP | PASS | RLS live; cross-seller product update returns 0 rows; seller profile ownership protected |
| USER ISOLATION | PASS | Simulated authenticated JWT sees own private user row only; 0 other-user rows |
| CRITICAL RLS | PASS | Restrictive active-account policies + canonical service boundaries live; critical RPCs service-role-only where required |
| COMMERCIAL HISTORY SAFETY | PASS | `delete_product_if_history_free` returns `retained_history` for listing with retained history; immutable 610 snapshots live |
| CRITICAL MIGRATIONS | PASS | 603–611 applied through migration head `20260820083335` |
| TYPE SAFETY | PASS | production/local TypeScript build gate included in exact #514 acceptance evidence; no runtime changes after #514 |
| BUILD | PASS | exact #514 local PowerShell production build + Capacitor sync + signed APK/AAB release build PASS |
| NO FOUNDATION P0 | PASS | no unresolved foundation P0 found in final repository + live production audit |
| NO RELEVANT FOUNDATION P1 | PASS | verified P1s in authorization/storage/shipment/commercial history were repaired and production-tested; known deferred findings below do not constitute a demonstrated foundation bypass |

No partial PASS is being promoted to atomic PASS here. Each required Checkpoint A family has direct code/DB/device evidence.

---

## 4. AUTH / ACTIVE-ACCOUNT CONTRACT

Frozen invariant:

**live database account state is authoritative; stale JWT metadata is not authority.**

Required behavior now present:

- `users.isActive` is part of live authorization;
- live DB role is authoritative for protected role decisions;
- ordinary clients cannot directly manage `users.isActive`;
- ordinary users cannot self-promote to admin by writing `users.role`;
- account suspension closes application authority for already-issued sessions through restrictive RLS / live helper checks;
- inactive sellers synchronously become commercially suspended;
- inactive sellers are not checkout-ready;
- protected server boundaries re-check live account state;
- standard client access cannot bypass the server-managed account-control boundary;
- reactivation requires restored live account authority rather than trusting stale client state.

Rollback-safe production evidence for 608 proved a stale session after suspension cannot read private user state or write account-scoped private history.

---

## 5. MOBILE SESSION / PUSH CONTRACT

Frozen invariant:

**one physical active push token has at most one active Loadify account owner.**

Current contract:

- push-token mutation is server-controlled;
- direct client token writes are closed;
- duplicate active ownership is prevented by DB invariant 606;
- logout/account-switch flows deactivate/unregister native push state;
- session loss cannot preserve prior-account notification authority;
- real-device push delivery and exact-conversation navigation are verified;
- prior-account conversation/message state does not leak after account switch.

Current live check at freeze: 3 active token rows, 0 duplicate active physical-token groups.

---

## 6. SELLER LISTING / COMMERCIAL-HISTORY DELETION CONTRACT

Frozen invariant:

**commercial history must not be destructively deleted.**

Canonical boundary:

- seller/admin deletion routes through authenticated server logic;
- destructive decision is owned by `public.delete_product_if_history_free(...)`;
- product row is locked before ownership/history recheck;
- retained history includes orders, order items, offers, questions, reviews/reports, analytics, promotion history, conversations/messages and support history;
- listings with retained history return `retained_history` and remain preserved;
- direct client DELETE on `products` is closed;
- media objects are not eagerly deleted as part of the DB deletion transaction because Loadify image URLs can be reused and PostgreSQL + Storage cannot make that reference decision atomically.

A later verified orphan-GC mechanism may remove genuinely unreferenced objects; it must never weaken this contract.

---

## 7. SHIPMENT / FULFILMENT FOUNDATION CONTRACT

Current marketplace shipment mutations are canonical server-boundary operations:

- `create-shipment` → `server_upsert_shipment`
- `update-shipment-status` → `server_transition_shipment`
- `upload-proof-of-delivery` → `server_attach_shipment_proof`

DB contract:

- the three mutation RPCs are service-role-only;
- ordinary clients cannot mutate `shipments` or `shipment_events` directly;
- shipment/order/event writes are atomic/idempotent across the canonical boundary;
- POD is protected as immutable first attachment after delivered state;
- inactive actors fail closed;
- current marketplace invariant is one shipment row per customer order.

### Supplier Commerce architecture seam

`UNIQUE shipments(order_id)` / `shipments_one_per_order` is a **known future migration seam**, not a permanent Supplier Commerce assumption.

Supplier Commerce may require multiple independent fulfilment legs for one customer order. Gate B / later schema design must evolve this existing canonical order/fulfilment truth rather than creating a parallel order system.

---

## 8. STORAGE CONTRACT

Migration 609 is the frozen Storage boundary.

- generic cross-bucket authenticated write policies are removed;
- canonical new product-image uploads use `sellers/{sellerId}/...`;
- active seller ownership is required for canonical product-image mutation;
- unrelated sellers cannot mutate another seller's images;
- inactive sellers lose mutation authority;
- private seller-document writes cannot use a generic client fallback;
- existing legacy `uploads/...` product-image objects remain supported for owner-only UPDATE/DELETE compatibility;
- no new legacy `uploads/...` INSERT path may grow that historical surface.

Frozen live inventory:

- `product-images`: 67 objects
- legacy `uploads/...`: 63
- canonical `sellers/...`: 4

The 63 legacy objects are factual retained state, not a reason to reintroduce a legacy write contract.

---

## 9. ORDER / PAYMENT / IMMUTABLE COMMERCIAL TRUTH CONTRACT

Migration 610 freezes the checkout-time commercial identity contract.

Post-cutover Stripe-backed commerce requires versioned immutable evidence before materialisation:

- verified buyer identity;
- buyer company/VAT context when present;
- B2B / reverse-charge decision;
- verified seller identity;
- per-item product identity, title, image/null, listing context, quantity and verified price;
- `commercialSnapshotVersion = 1`.

Canonical post-payment materialisation is `public.server_materialize_paid_order_v1(...)` and is service-role-only.

Atomic invariant:

**verified pending payment-session evidence → order snapshot → complete expected order-item snapshots → stock/reservation finalisation → paid transition → payment-session completion**

must commit as one canonical unit or roll back.

Webhook retry remains idempotent; a committed success must not double-decrement stock or duplicate the first paid transition/notifications.

Post-cutover historical consumers prefer immutable checkout-time snapshots. Legacy rows with no authoritative snapshot may use explicit display fallback but must not be backfilled from today's mutable product/profile state.

---

## 10. PAYMENT SAFETY / ESCROW FOUNDATION CONTRACT

Migration 611 reconciles the historical emergency payment hold after escrow/shipping/payment hardening.

Frozen state:

- global blanket `payments_safety_hold` is `false`;
- the emergency fail-closed payment-safety mechanism remains installed and can still be switched on;
- the obsolete web-checkout shipping-charge guard is removed;
- no pending payment sessions existed at freeze;
- no financially active or escrow-held orders existed at freeze;
- no open/in-review disputes existed at freeze.

Legacy historical financial rows are retained factually and are not rewritten merely to make the current model look cleaner.

---

## 11. CANONICAL SERVER / API BOUNDARIES AT FREEZE

Important existing boundaries to extend/reuse rather than duplicate include:

### Identity / account
- `admin-user-status`
- `deactivate-account`
- server-managed push-token registration/deactivation

### Listing
- `delete-product`
- canonical product creation/update paths already protected by seller/account contracts

### Checkout / payment / commercial history
- `create-checkout`
- `create-payment-intent`
- `stripe-webhook`
- `server_materialize_paid_order_v1(...)`
- `generate-invoice`

### Shipment / tracking
- `create-shipment`
- `update-shipment-status`
- `upload-proof-of-delivery`
- `track-shipment`
- shipment service-role RPC family

Supplier Commerce must integrate with these canonical boundaries or deliberately version/evolve them. It must not create a second customer-order/payment/history truth.

---

## 12. PUBLIC SELLER PROFILE PRIVACY CONTRACT

Supabase Security Advisor currently flags `public.seller_profiles_public` as a SECURITY DEFINER / owner-rights view.

This is a **known intentional design**, not silently ignored:

- the view reads a private sanitized cache;
- the backing `private.seller_profiles_public_data` table is not directly granted to anon/authenticated;
- public clients have SELECT-only access to the view;
- the cache retains only explicitly public seller fields;
- `businessAddress` is reduced to `city` and `country`;
- `contactPhone` is always exposed as `NULL`;
- live freeze verification found 0 unexpected address keys and 0 public non-null phone values.

This advisor ERROR is therefore recorded as an accepted mechanism-specific finding at this baseline, not classified as an unresolved foundation P0/P1. Any future change to the view/cache fields must re-open the privacy review.

---

## 13. KNOWN RISKS / INTENTIONALLY DEFERRED FOUNDATION WORK

These items exist at freeze but do not authorize bypassing a future P0/P1 if evidence changes:

1. **Supabase Auth leaked-password protection** is disabled and remains a security-hardening backlog item.
2. Supabase advisor reports **RLS-enabled/no-policy INFO** on private/rate-limit/internal tables that are intentionally not client data surfaces.
3. Advisor reports generic **SECURITY DEFINER executable WARNs**. Critical functions inspected during freeze enforce live caller/admin/seller boundaries; future new functions must be reviewed individually rather than assuming every warning is benign.
4. Existing performance advisor backlog (RLS init-plan/multiple-policy/unused-index/FK indexing items) is deferred unless it becomes a correctness or material production-performance blocker.
5. `shipments_one_per_order` is the current-marketplace invariant and a known Supplier Commerce multi-leg evolution seam.
6. The 63 legacy Storage `uploads/...` objects remain factual compatibility state; no new legacy INSERT capability is allowed.
7. Legacy marketplace UI polish/refactoring is deliberately not expanded after Checkpoint A unless a P0/P1 affects security, privacy, payments, auth, data integrity, RLS, commercial history, mobile sessions or production safety.
8. Existing legacy commercial/financial rows remain factual. Unknown historical immutable facts are not reconstructed from current mutable state.

Deferred does **not** mean PASS forever. If new evidence elevates an item to P0/P1, Branch Guard must stop the sequence and repair it.

---

## 14. NO PARALLEL ARCHITECTURE — FROZEN RULE

From this baseline forward, do not create:

- a parallel marketplace;
- a parallel customer-order system;
- a parallel payment system;
- a parallel financial truth;
- a parallel mobile lifecycle;
- a provider-specific commerce engine;
- a duplicate business contract.

Web and Mobile must consume the same canonical business truth.

Supplier/provider-specific behavior belongs behind versioned adapters/capabilities, not inside the commerce core.

---

## 15. GATE B ENTRY CONDITION

With this baseline recorded, the next canonical phase is **GATE B — BUSINESS CONTRACT**.

Gate B must formally distinguish at minimum:

1. Marketplace Seller
2. Loadify Direct
3. Loadify Supplier-Fulfilled

For each, establish factual responsibility for:

- seller / legal seller of record;
- merchant of record where relevant;
- supplier;
- fulfilment provider;
- customer-facing identity;
- invoice issuer;
- payment flow;
- platform fee;
- supplier payable;
- VAT/tax responsibility;
- refund responsibility;
- return responsibility;
- chargeback responsibility;
- product-liability responsibility;
- support responsibility;
- stock ownership/responsibility;
- fulfilment ownership/responsibility.

Volatile legal/tax/payment rules must be verified against current authoritative sources during Gate B.

**No Supplier Commerce schema design, migration or runtime implementation is authorized until Gate B itself is PASS.**

---

## 16. CHANGE CONTROL AFTER FREEZE

Any future change that touches one of these foundation contracts must be evaluated against this baseline.

Required flow:

`REFETCH CURRENT MAIN`  
`→ COMPARE TO FROZEN BASELINE`  
`→ IDENTIFY INTENDED CONTRACT CHANGE`  
`→ IMPLEMENT`  
`→ BRANCH GUARD`  
`→ E2E / PRODUCTION-SAFE EVIDENCE AS REQUIRED`  
`→ UPDATE BASELINE ONLY IF THE CANONICAL CONTRACT DELIBERATELY CHANGES`

Do not silently absorb drift.

---

## 17. FREEZE DECLARATION

At frozen `main` SHA `99cece9932d02a8bb2f3b5f015785dd93feba529` and production migration head `20260820083335 / reconcile_payment_safety_hold`:

**CHECKPOINT A = ATOMIC PASS**  
**FOUNDATION BASELINE = FROZEN BY THIS DOCUMENT ONCE MERGED**  
**OLD EXTENSIVE MARKETPLACE HARDENING = HARD STOP except real P0/P1**  
**NEXT = GATE B BUSINESS CONTRACT**  
**SUPPLIER COMMERCE RUNTIME / MIGRATIONS = NOT YET AUTHORIZED**
