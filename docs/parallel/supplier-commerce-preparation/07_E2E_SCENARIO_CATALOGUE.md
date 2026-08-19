# SUPPLIER COMMERCE — E2E SCENARIO CATALOGUE

Status: PREPARATION ONLY.

Purpose: define the end-to-end evidence the future implementation must produce. These are test responsibilities, not proof that any capability exists today.

All scenarios must be reconciled against the frozen foundation and Gate B before execution.

## 1. Operator sourcing/import

### 1.1 Manual product candidate

Authorised Loadify operator enters factual product/source data.

Expected:
- source/provenance recorded;
- canonical identity check runs;
- duplicate candidate detected when applicable;
- supplier/source role classified;
- compliance/rights state is explicit;
- no publish without required review;
- no provider metadata dumped into canonical product truth.

### 1.2 External URL candidate

Operator provides an approved external URL.

Expected:
URL
→ extract permitted facts
→ source role identification
→ canonical product candidate/match
→ supplier offer candidate where factual
→ provenance/rights/compliance
→ economics
→ AI merchandising
→ review
→ publish.

Must prove:
URL ≠ automatic publish.

### 1.3 Retry after interrupted import

Import stops after extraction or normalisation.

Expected:
- retry resumes or deterministically restarts according to contract;
- no duplicate canonical product;
- no duplicate supplier offer;
- audit trail shows attempts/outcome.

## 2. Canonical identity / deduplication

### 2.1 Same product from two sources

Source A and Source B represent the same factual product.

Expected:
ONE CANONICAL PRODUCT
→ OFFER A
→ OFFER B.

### 2.2 Similar but not identical products

Two visually similar items differ materially.

Expected:
- system does not auto-merge beyond confidence policy;
- review can reject merge;
- evidence/rationale preserved.

### 2.3 Variant identity

Same base product with distinct size/colour/specification variants.

Expected:
- variant identity remains deterministic;
- supplier-specific variant references map without corrupting canonical facts.

## 3. AI Facts Lock

### 3.1 Verified facts only

AI receives verified factual input.

Expected:
- title/description/SEO/FAQ may improve presentation;
- factual values stay traceable to evidence.

### 3.2 Unsupported certification claim

Source does not prove certification.

Expected:
- AI cannot promote certification to canonical fact or buyer claim.

### 3.3 Unsupported material/origin/warranty/safety claim

Expected:
- unverified field remains absent/unverified;
- generated copy cannot create new truth.

## 4. Supplier qualification / control

### 4.1 Qualified active supplier

Expected:
- offer can become eligible subject to all other gates.

### 4.2 Supplier suspended before checkout

Expected:
- new sellability fails closed;
- historical orders/history remain visible;
- no destructive history mutation.

### 4.3 Supplier kill switch during active orders

Expected:
- new operations stop according to contract;
- existing orders enter controlled containment/recovery;
- history is preserved;
- customer impact is visible to operations.

## 5. Stock / sellability

### 5.1 Fresh positive supplier stock

Expected:
- raw stock ingested;
- policy converts it to Loadify sellable stock;
- reservation reduces sellable availability correctly.

### 5.2 Stale stock

Expected:
- fails closed according to freshness policy;
- no sale based only on stale positive quantity.

### 5.3 Unknown stock

Expected:
- unknown is not silently converted to safe sellable stock;
- policy outcome is explicit/auditable.

### 5.4 Concurrent last-unit reservation

Expected:
- only one buyer/order wins the last sellable unit;
- losing request receives deterministic unavailable result;
- no oversell.

## 6. Price / landed cost / margin

### 6.1 Normal supplier price movement

Expected:
- approved safe policy may update offer economics;
- buyer price/margin remains within policy.

### 6.2 Abnormal supplier price spike

Expected:
- offer pauses/reviews/fails closed according to policy;
- no loss-making checkout created silently.

### 6.3 Supplier shipping cost change

Expected:
- supplier fulfilment cost changes operational economics;
- it does NOT mutate historical customer shipping charge after payment.

### 6.4 FX/tax/rule version change

Expected:
- new transaction uses applicable current rule version;
- historical order remains tied to its applicable version/evidence.

## 7. Checkout / one customer order

### 7.1 Supplier-Fulfilled single leg

Expected:
- buyer sees one Loadify order;
- internal fulfilment leg snapshots selected offer/responsibility;
- no supplier external order is exposed as second customer order truth.

### 7.2 Multiple supplier legs, if Gate B allows

Expected:
- one customer order;
- multiple internal legs;
- independent fulfilment/tracking exceptions;
- customer totals remain canonical.

### 7.3 Mixed marketplace + supplier fulfilment, if Gate B allows

Expected:
- one customer experience/order contract;
- each leg has correct fulfiller/financial responsibility;
- no duplicated buyer payment/order truth.

## 8. Payment → supplier handshake

### 8.1 Happy path

Expected:
order validation
→ reservation
→ payment evidence
→ supplier stock recheck
→ price check if required
→ submit
→ acknowledgement
→ external reference
→ fulfilment.

### 8.2 Supplier rejects after buyer payment

Expected:
- payment success is not treated as supplier success;
- exception gets owner/next action;
- buyer outcome follows contract;
- refund/recovery/reconciliation are explicit.

### 8.3 Supplier timeout before acknowledgement

Expected:
- no blind duplicate order submission;
- idempotency key/reference preserved;
- status remains unknown/pending rather than falsely failed/succeeded;
- recovery query/retry follows adapter contract.

### 8.4 Supplier accepted but response lost

Expected:
- retry/recovery does not create second supplier order;
- external order is reconciled when recovered.

### 8.5 Duplicate acknowledgement/webhook

Expected:
- idempotent processing;
- one operational order state change;
- no duplicate financial entry.

## 9. Tracking normalisation

### 9.1 Standard dispatch → delivery

Supplier/carrier events map to Loadify statuses.

Expected:
- buyer sees canonical Loadify tracking;
- provider-native statuses remain internal mapping evidence.

### 9.2 Unknown provider status

Expected:
- no invented buyer status;
- exception/review or safe mapping policy is used.

### 9.3 Duplicate/reordered tracking events

Expected:
- lifecycle remains deterministic;
- history preserves evidence without regressing completed state incorrectly.

## 10. Returns / customer refund / supplier recovery

### 10.1 Customer refund before supplier reimbursement

Expected:
- customer refund can complete;
- supplier recovery remains pending separately;
- order is not falsely financially reconciled.

### 10.2 Supplier refuses reimbursement

Expected:
- customer outcome remains according to customer contract;
- unrecovered loss is explicit;
- reconciliation state reflects exception/loss.

### 10.3 Return ships directly to supplier

Expected:
- return destination is supplier/contract-defined;
- no Loadify warehouse assumption;
- tracking/recovery links remain auditable.

### 10.4 Partial refund / partial supplier recovery

Expected:
- amounts are independently represented;
- final contribution/loss reconciles correctly.

## 11. Financial ledger / reconciliation

### 11.1 Successful order fully reconciled

Expected reconciliation across:
CUSTOMER PAYMENT
↔ PROCESSOR
↔ CANONICAL LEDGER
↔ SUPPLIER PAYABLE/COST
↔ REFUNDS/RECOVERIES if any.

### 11.2 Buyer refund succeeds, supplier recovery fails

Expected:
- customer refund entry exists;
- supplier recovery remains exception;
- unrecovered loss visible;
- no destructive rewrite of original sale.

### 11.3 Chargeback

Expected:
- chargeback and fee tracked;
- supplier recovery/hold responsibility follows contract;
- final reconciliation state explicit.

### 11.4 Late external settlement information

Expected:
- append-safe adjustment/reconciliation;
- historical paid price not rewritten.

## 12. Feature flags / rollout

### 12.1 Supplier Commerce off

Expected:
- existing marketplace works unchanged;
- server blocks new Supplier Commerce operations.

### 12.2 Controlled supplier/product cohort

Expected:
- only approved cohort enabled;
- flag is server-enforced;
- observability can identify cohort/version.

### 12.3 Flag change mid-order

Expected:
- existing order keeps deterministic lifecycle contract;
- rollout toggle does not rewrite order responsibility mid-flight.

## 13. Incident / recovery / replay

### 13.1 Provider outage

Expected:
- incident visible;
- new operations held/blocked according to policy;
- affected orders identifiable;
- replay/recovery path explicit.

### 13.2 Webhook/event processing outage

Expected:
- idempotent replay;
- no duplicate financial/order effects.

### 13.3 Rollback

Expected evidence includes:
- code rollback/rollforward plan;
- data compatibility;
- feature-flag containment;
- no requirement to delete commercial history.

## 14. Mobile/web parity

For every buyer/seller/operator capability exposed to mobile:

Expected:
- same server business contract;
- same auth/authorization;
- same order/payment/financial truth;
- same error semantics where platform-appropriate;
- no mobile-only lifecycle.

## 15. No Fake PASS matrix

The following remain distinct:

- UNIT PASS ≠ E2E PASS;
- ADAPTER MOCK PASS ≠ REAL PROVIDER PASS;
- SIMULATOR PASS ≠ PILOT PASS;
- PAYMENT PASS ≠ SUPPLIER ACK PASS;
- CUSTOMER REFUND PASS ≠ SUPPLIER RECOVERY PASS;
- ORDER DELIVERED ≠ FINANCIAL RECONCILIATION PASS;
- BACKUP EXISTS ≠ RESTORE/REPLAY PASS;
- FEATURE FLAG EXISTS ≠ ROLLBACK PASS;
- LOG EXISTS ≠ OBSERVABILITY PASS.

## 16. Pilot evidence target

Controlled pilot must prove the entire commercial loop with a deliberately small, low-risk scope chosen by the final contract:

SOURCE/APPROVE PRODUCT
→ LIVE SELLABILITY
→ CUSTOMER CHECKOUT
→ PAYMENT
→ SUPPLIER SUBMISSION
→ ACK
→ DIRECT-TO-CUSTOMER DISPATCH
→ TRACKING
→ DELIVERY
→ FINANCIAL RECONCILIATION
→ at least one exercised exception/refund/recovery path before scale.

Pilot success is evidence, not assumption.