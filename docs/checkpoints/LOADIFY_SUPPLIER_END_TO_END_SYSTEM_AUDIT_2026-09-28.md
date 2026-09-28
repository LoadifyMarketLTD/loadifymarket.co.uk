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
| Generic scheduled stock/price execution | Universal provider-neutral 15-minute supplier stock/price scheduler in PR #816 | IMPLEMENTED IN DRAFT PR |
| Checkout revalidation | Server-side selected-offer stock/price and commercial readiness | PRESENT |
| Supplier commercial profile | Universal supplier contract matrix in PR #816 | IMPLEMENTED IN DRAFT PR |
| Stripe/settlement binding | Exact supplier commercial profile snapshot + settlement intent + payable ledger + manual settlement evidence/reconciliation in PR #816 | MANUAL PILOT PATH IMPLEMENTED; AUTOMATED CONNECT EXECUTION NOT CLOSED |
| Customer payment | Supplier PaymentIntent boundary exists and remains fail-closed | PRESENT |
| Supplier order handshake | Idempotent submit/recovery/acknowledgement runtime | PRESENT FOR EXECUTABLE ADAPTERS |
| Manual supplier order route | Verified manual_only order + acknowledgement bindings are accepted for Phase O without autonomous shadow promotion | IMPLEMENTED IN DRAFT PR |
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

### 1. Verified manual Phase O path is now implemented in PR #816

The Universal Supplier Integration Kit `manual_only` path is now carried through both readiness and the post-payment runtime boundary.

Implemented boundaries:
- verified manual order + acknowledgement bindings are accepted for `email`, `manual_portal` and `manual_file`;
- canonical-ready manual pilots do not falsely require autonomous shadow promotion;
- post-payment handshake preparation accepts the same reviewed manual bindings;
- an active admin may record manual supplier acceptance only with an external supplier-order reference and non-empty evidence;
- manual acceptance updates canonical handshake/orchestration/reservation state but performs no provider mutation and no payment mutation;
- automated Direct Supplier execution retains its stronger write/config/idempotency requirements.

This removes the earlier Wholesale Finds UK manual-pilot blocker without pretending the workflow is automated.

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

### 4. Manual-pilot settlement runtime is now implemented; automated settlement remains fail-closed

PR #816 now carries the supplier contract through checkout and settlement without relying on whichever commercial profile is current later:

- future supplier orders snapshot the independent supplier as seller and invoice issuer;
- Loadify is snapshotted only as marketplace operator; no unsupported merchant/payment-recipient assumption is inserted;
- the exact supplier commercial profile ID/version and settlement model are stored on the order;
- payment reloads that exact historical profile snapshot;
- a canonical settlement intent derives the supplier payable from immutable order/pricing/landed-cost/profile evidence;
- customer payment and supplier payable are materialised in the append-only financial ledger;
- manual supplier settlement requires active-admin authority, exact payable amount, external payment reference and non-empty evidence;
- recording a manual payment appends the payout ledger entry and runs supplier financial reconciliation;
- the runtime itself never performs an external manual payment.

Supported payable bases for this controlled path are deterministic `supplier_trade_price_plus_agreed_shipping` and `fixed_contract_amount`. `retail_less_attributable_costs`, arbitrary order-level formulas, protection-window execution and automated Stripe Connect supplier settlement remain explicitly fail-closed until the required actual-fee/formula/timing/payment evidence exists.

No supplier marketplace settlement model is active in production and the GB market control remains blocked/unconfigured. Do not promise supplier payout timing/deductions from production yet.

### 5. No real supplier evidence exists in production yet

The architecture is extensive, but production currently has zero real supplier/onboarding/integration/pilot data. Therefore no real supplier E2E PASS exists and Phase O cannot be claimed complete.

## Correct execution order from here

1. Close PR #816's validated manual-pilot Supplier Commerce foundation without enabling production.
2. Keep Wholesale Finds UK first pilot manual and bounded.
3. Onboard the first authentic supplier data and 10–15 candidate products.
4. Run product market/economic selection and admit only viable offers.
5. Configure reviewed GB market/supplier commercial evidence for the controlled pilot without enabling unsupported automated settlement.
6. Execute the real Phase O pilot with exact cohort/order caps, manual supplier acceptance/settlement evidence, tracking and reconciliation.
7. Close actual-fee/formula/protection-window and Stripe Connect automated settlement only from real Phase O evidence.
8. Only after Phase O evidence, promote automation dimensions gradually in Phase P; automatic publication/order execution remains policy-controlled and fail-closed until proved.

## No Fake PASS

Repository capability does not equal production readiness. At this audit point:

**Architecture coverage: strong.**
**Phase O implementation coverage: substantial.**
**Real supplier production E2E: NOT YET EXECUTED.**
**Universal automation: NOT YET COMPLETE.**
**Production Supplier Commerce controls: OFF.**

This is the safe state for the current canonical phase.
