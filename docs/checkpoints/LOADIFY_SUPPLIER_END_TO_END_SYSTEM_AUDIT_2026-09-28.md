# Loadify Supplier Commerce — End-to-End System Audit

**Date:** 28 September 2026  
**Scope:** supplier onboarding → catalogue acquisition → canonicalisation → rights/compliance → economics → market viability → publication → checkout/payment → supplier execution → tracking → returns/refunds/recovery → reconciliation → automation/scale.  
**Canonical phase:** Phase O — Controlled Pilot.  
**Production activation:** OFF / fail-closed.

## Executive result

The platform already contains the majority of the governed Supplier Commerce pipeline, but the complete end-to-end system is **not yet production-complete**.

Current production database truth at audit time:
- Supplier Foundation rows: 0
- Supplier onboarding profiles: 0
- Supplier integration profiles: 0
- Controlled pilot programmes: 0
- Controlled pilot offers: 0
- Supplier marketplace projections: 0
- Supplier pricing snapshots: 0
- Stock observations: 0
- Price observations: 0
- all global Supplier Commerce controls remain OFF, including pilot, publish, checkout, stock_sync, price_sync, supplier_order, tracking_ingest and return_recovery.

This is safe and expected before the first real supplier.

## End-to-end matrix

| Stage | Repository capability | Audit state |
|---|---|---|
| Supplier identity/onboarding | Supplier Foundation, qualification, SLA, compliance and audit evidence | PRESENT |
| Integration abstraction | Per-capability transport profiles: REST, GraphQL, feed URL, SFTP/FTPS, webhook, email/manual portal/file | PRESENT |
| Manual + scheduled acquisition | Direct Supplier acquisition runtime and 15-minute scheduled wrapper | PRESENT |
| Durable staging/quarantine | Atomic staging, replay protection, quarantine, batch evidence | PRESENT |
| Normalisation/canonical product | Supplier catalogue/import governance and canonical identity | PRESENT |
| Variant/SKU binding | Exact supplier offer/variant bindings | PRESENT |
| Media/content rights | Verified supplier media and rights provenance gates | PRESENT |
| Product compliance | Import/compliance gates, territory-specific evidence | PRESENT |
| Landed cost/tax/pricing | Versioned landed-cost, tax and pricing snapshots | PRESENT |
| Margin guard | expected contribution >= minimum contribution | PRESENT |
| UK market viability | Phase O benchmark/profitability gate added in PR #816 | IMPLEMENTED IN DRAFT PR |
| Merchandising | Facts-locked AI + reviewed merchandising ledger | PRESENT; HUMAN REVIEW BY DEFAULT |
| Buyer publication gate | Import/economics/stock guards and governed projection | PRESENT |
| Automatic publication | Autonomous policy currently forbids marketplace publication | NOT COMPLETE |
| Stock/price freshness | Sync policies, stale/missing/exhausted fail-closed, safety stock, price drift | PRESENT |
| Generic scheduled stock/price execution | Avasam-specific autonomous runner exists; universal per-supplier scheduler is not complete | GAP |
| Checkout revalidation | Server-side selected-offer stock/price and commercial readiness | PRESENT |
| Supplier commercial profile | Universal supplier contract matrix in PR #816 | IMPLEMENTED IN DRAFT PR |
| Stripe/settlement binding | Supplier Stripe account capability + market settlement readiness | FOUNDATION PRESENT; CONTRACT/EXECUTION NOT CLOSED |
| Customer payment | Supplier PaymentIntent boundary exists and remains fail-closed | PRESENT |
| Supplier order handshake | Idempotent submit/recovery/acknowledgement runtime | PRESENT FOR EXECUTABLE ADAPTERS |
| Manual supplier order route | Integration model can describe manual_only, but Phase O activation/runtime currently expects executable automated order+ack for Direct Supplier | GAP / BLOCKER FOR WHOLESALE FINDS MANUAL PILOT |
| Tracking | canonical tracking sync, mappings, exception engine | PRESENT |
| Cancellation | capability model and provider runtime contract | PRESENT / PROVIDER-EVIDENCE DEPENDENT |
| Returns | buyer return bridge + supplier return request | PRESENT |
| Buyer refund | independent from supplier reimbursement | PRESENT |
| Supplier recovery | reimbursement/recovery polling and ledger separation | PRESENT |
| Financial reconciliation | canonical supplier financial reconciliation and exception ledger | PRESENT |
| Kill switch | global/scoped Supplier Commerce controls | PRESENT |
| Pilot | bounded offers/cohort/order caps/evidence/readiness/acceptance | PRESENT |
| Supplier performance/scale | health/SLA recommendation foundation | PRESENT FOUNDATION; Phase P not completed |
| Full autonomous operation | policy intentionally observe/read-only; supplier order, PII, publication, payment/refund mutations hard-disabled | NOT COMPLETE / CORRECT FOR CURRENT PHASE |

## Critical findings

### 1. Manual pilot and automated pilot are conflated in the current Direct Supplier activation path

The Universal Supplier Integration Kit correctly supports `manual_only`, but the latest Direct Supplier Phase O readiness requires an automated order binding and automated acknowledgement binding. The Phase O runtime wrapper also treats `manual_only` as not ready for autonomous activation.

That is incompatible with an intentionally manual first pilot such as Wholesale Finds UK.

Required correction:
- preserve a verified manual pilot path;
- require documented operator workflow, acknowledgement evidence, tracking path and PII controls;
- do not pretend the manual route is automated;
- keep automated activation subject to the stronger shadow/autonomy evidence.

### 2. Provider-neutral stock/price scheduled execution is now implemented in PR #816

PR #816 now contains a universal 15-minute scheduled read loop driven by approved supplier offers, approved sync policies and verified `automated_read` stock + price integration profiles.

Implemented boundaries:
- provider-neutral runtime through `UniversalDirectSupplierAdapterV1`; no Avasam-specific dependency;
- service-role-only due-target selector with bounded batches;
- global/scoped `stock_sync` and `price_sync` controls checked before provider access;
- circuit breaker checks price drift, missing/zero/negative stock and rejects unrequested variant responses;
- unsafe/quarantined observations are not persisted by the scheduler;
- accepted observations use the existing idempotent append-only server RPC;
- public sellability, marketplace publication, checkout, orders and payments are not activated by this runner.

This closes the architecture/code gap identified by the audit. It is not yet a production E2E PASS: the new migration has not been applied to production, the branch validation gate still needs to run, and production has no real approved supplier target to exercise it.

### 3. Automatic publication is intentionally disabled and therefore not "finished"

Current autonomous policy hard-codes `marketplacePublicationAllowed: false`, and the publication pipeline requires an approved operator merchandising review.

This is safe for Phase O, but it does not meet the future "human review by exception" operating target.

Required future controlled capability:
- a versioned supplier/product/category publication automation policy;
- only low-risk, fully evidenced products eligible;
- all canonical import, rights, compliance, economics, stock/price and market-viability gates must PASS;
- automatic publication must create the same immutable review/audit truth, never bypass it;
- exceptions, uncertainty and high-risk categories remain human review;
- rollout only after Phase O evidence and Phase P controlled scale support it.

### 4. Settlement is still the highest financial gap

The platform has:
- supplier Stripe account binding;
- market settlement readiness;
- supplier payable / payout / refund / recovery / chargeback ledger concepts;
- PR #816 per-supplier fee and settlement policy.

But no supplier marketplace settlement model is active in production and the GB market control remains blocked/unconfigured.

Do not promise supplier payout timing/deductions until this is closed and validated.

### 5. No real supplier evidence exists in production yet

The architecture is extensive, but production currently has zero real supplier/onboarding/integration/pilot data. Therefore no real supplier E2E PASS exists and Phase O cannot be claimed complete.

## Correct execution order from here

1. Close PR #816's universal commercial profile + Phase O market-viability changes.
2. Reconcile the verified manual-pilot path with the Direct Supplier readiness/runtime boundary.
3. Close the marketplace settlement contract/runtime.
4. Add provider-neutral scheduled stock/price execution.
5. Keep Wholesale Finds UK first pilot manual and bounded.
6. Onboard the first authentic supplier data and 10–15 candidate products.
7. Run product market/economic selection and admit only viable offers.
8. Execute real Phase O pilot with exact cohort/order caps, tracking and reconciliation.
9. Only after Phase O evidence, promote automation dimensions gradually in Phase P.
10. Automatic publication/order execution remains policy-controlled and fail-closed until proved.

## No Fake PASS

Repository capability does not equal production readiness. At this audit point:

**Architecture coverage: strong.**
**Phase O implementation coverage: substantial.**
**Real supplier production E2E: NOT YET EXECUTED.**
**Universal automation: NOT YET COMPLETE.**
**Production Supplier Commerce controls: OFF.**

This is the safe state for the current canonical phase.
