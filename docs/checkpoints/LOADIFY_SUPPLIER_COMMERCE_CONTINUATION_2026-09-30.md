# Loadify Market — Supplier Commerce Continuation Checkpoint

Date: 2026-09-30
Owner: Daniel Preda / XDrive Logistics Ltd
Scope: verified continuation after LOADIFY_POSITIVE_SUPPLIER_EMAIL_AUDIT_HANDOFF_2026-09-30.md.

## Production database alignment

The Loadify Supabase production project was verified against the canonical repo.
Production was missing five already-reviewed Supplier Commerce migrations present on origin/main:

- 20260928220000_supplier_checkout_independent_seller_profile_snapshot.sql
- 20260928221500_supplier_settlement_intent_runtime.sql
- 20260930151000_supplier_offer_price_policy_enforcement.sql
- 20260930155000_supplier_brand_usage_policy.sql
- 20260930184500_universal_commercial_compatibility.sql

Targeted tests passed before application: 32 assertions across checkout profile snapshot, settlement runtime, price-policy, brand-policy, intermediary-model and universal-commercial-compatibility suites.
The five migrations were applied to production in order and verified afterwards.
GB and RO Supplier Commerce checkout remain blocked and checkout_enabled=false. No supplier was approved or published by these migrations.

## Wholesale Finds UK

Supplier remains verification / conditional pilot accepted.
Gmail thread: 1a0e83d49f6b6e17.
Latest message is Loadify's 2026-09-30 correction asking Wholesale Finds UK to confirm the independent-supplier Seller-of-Record / invoice-issuer arrangement.
No supplier reply has arrived after that correction.
Exactly 15 existing offers remain staged as candidate; do not duplicate them or send the shortlist until the commercial-role correction is accepted.

## Inkthreadable

Supplier remains verification / integration-approved but product-publication blocked.
Nineteen candidate offers exist.
No supplier response has arrived to the 2026-09-29 pilot SKU verification messages.
No supplier_integration_profiles, supplier_adapter_registrations or onboarding capability-evidence records currently bind Inkthreadable to an executable API integration.
Opera/browser account verification was unavailable, so automatic-payments state and credentials were not assumed. Do not create a test order until account configuration/secrets can be verified safely.

## Costway UK

A Supplier Foundation record now exists as costway-uk and lifecycle=verification.
Onboarding is qualification, direct_supplier / CSV / GB, daily 1440-minute catalogue-stock-price cadence, acquisition disabled.
Supplier-confirmed daily CSV capability and B2B tracking are recorded as verified evidence.
Identity, business identity, content rights, returns, costs and compliance remain unverified.
Important identity gate: the exact-name Companies House entity COSTWAY UK LIMITED (12382039) is dissolved; do not assume it is the contracting entity for the current Costway programme.
Await the existing Gmail follow-up; do not send a duplicate.

## Leaf Design UK

A Supplier Foundation record now exists as leaf-design-uk and lifecycle=verification.
Onboarding is qualification, direct_supplier / CSV / GB, hourly 60-minute catalogue-stock-price cadence, acquisition disabled.
Leaf Design UK Limited (11172250) was verified active at Companies House and supplier identity aligns with its email signature.
Supplier-confirmed feed capability, content rights, tracking, returns, documentation and membership/order-cost facts are recorded as verified evidence; warehouse origin, observed stock/price reliability and SKU compliance remain unverified.
Current Loadify Buyer Terms and checkout copy still define the independent supplier as Seller of Record. Leaf's standard programme instead requires XDrive/Loadify to purchase each order and act as retailer/reseller. Therefore no Leaf commercial profile was verified, no GB market policy was broadened, no membership was purchased, and no products were staged.

## Pending supplier inbox

Puckator, Treat Pod, Contrado, Julian Bowen, Furniture To Go and The Carat Shop remain acknowledgement/ticket-only; no substantive human approval was found.
Tradeprint remains OWNER-PAUSED and was not touched.

Operating rule remains VERIFY -> DECIDE IF EVIDENCE IS SUFFICIENT -> EXECUTE -> VERIFY AGAIN. Fail closed; no paid tests or publication without required evidence and approval.

## Capability evidence alignment — later 2026-09-30 continuation

Supplier capability evidence was aligned in production without enabling acquisition, checkout, publication or payments.

### Inkthreadable

Onboarding requested capabilities now reflect the confirmed transactional scope: supplier identity, catalogue, variants, stock, price, shipping, order submission, acknowledgement, tracking and cancellation.
Acknowledgement/status and tracking are verified as automated-read capabilities.
Order submission and cancellation are deliberately BLOCKED/manual-only at capability-execution level because provider idempotency and lost-response recovery semantics remain unverified. The database write-safety constraint correctly rejected an attempted verified automated-write state until those controls are known.
Current 2-4 product preflight is narrowed around directly observable official product pages. Exact staged SKU matches were verified for MUG-CER-WHI, JH001-BUPI-M, GD05-WHI-M and STTU169-NRW-M. Public supplier prices are observations only and were not promoted into publication pricing snapshots.

### Costway UK

Capability evidence now records manual B2B order-template submission and manual B2B tracking as verified.
Catalogue, stock and price capabilities remain BLOCKED until the promised daily CSV is actually issued after cooperation/application, and its delivery method/schema/authoritative fields are verified.

### Leaf Design UK

Capability evidence now records the supplier-confirmed hourly CSV catalogue/stock/price capabilities as automated-read capabilities, while acquisition remains disabled.
Order submission, tracking and returns are verified only as manual workflows.
The retailer/reseller legal incompatibility with current Loadify Buyer Terms remains the blocking gate; no membership, commercial-profile approval or publication was performed.
