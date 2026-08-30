# Loadify Supplier Commerce — Continuity Checkpoint — 2026-08-30

## 1. What we are building

Loadify Market is being extended into a **multi-provider Supplier Commerce platform**, not merely a marketplace with manually-created seller products.

The target architecture is:

`Supplier / provider -> SupplierAdapterV1 -> normalized supplier catalogue/offers -> controlled Loadify import/listing -> stock/price synchronization -> Loadify checkout/order -> supplier order submission -> acknowledgement -> shipping/tracking -> cancellation/returns/reimbursement -> Loadify reconciliation`

The objective is to support multiple external sourcing models behind one canonical Loadify contract:

- Avasam;
- BigBuy;
- Direct Supplier / manufacturer / wholesaler feeds and APIs;
- later provider candidates such as Syncee, AppScenic, SaleHoo, Spocket and AliExpress/DSers only when their commercial/API/compliance gates allow it;
- marketplace/channel connectors such as ChannelEngine, Linnworks and Sellbrite remain a separate connector domain and must not be confused with supplier fulfilment adapters.

The implementation must result in a controlled sourcing and fulfilment engine where Loadify owns the customer experience, canonical product/order state, pricing policy, security and reconciliation, while each supplier integration is isolated behind a provider adapter and explicit capability gates.

## 2. Current authoritative repository baseline

Repository: `LoadifyMarketLTD/loadifymarket.co.uk`

Authoritative `main` at checkpoint creation:

`1484c564ee85b7a421efe6bb97ebad748590b57d`

This is the merge commit for PR #645.

Verification regime on current main:

- NO GitHub Actions dependency;
- local CLI is canonical for typecheck/lint/Vitest/migration inventory/Playwright/build;
- Netlify Deploy Preview is the remote build gate only;
- PR #645 made the local Playwright bootstrap Windows-safe and reproducible;
- local evidence before this checkpoint: 716/716 Vitest PASS, migration inventory script PASS, E2E typecheck PASS, guest/unauthenticated Playwright 5 PASS / 4 credential-gated SKIP, production build PASS, clean worktree;
- `main` branch protection remains disabled; do not claim otherwise.

## 3. SupplierAdapterV1 target capability model

Canonical provider capability vocabulary:

- `supplier_identity`
- `catalog`
- `variants`
- `stock`
- `price`
- `shipping`
- `order_submission`
- `acknowledgement`
- `tracking`
- `cancellation`
- `returns`
- `reimbursement`

A provider must advertise only capabilities that have been independently verified. Unknown or merely documented capabilities remain unavailable/fail-closed.

## 4. Avasam — current state

PR #608 (`Phase O: verify Avasam Seller API read-only pilot integration`) is **MERGED**. Its old PR body contains stale wording saying Draft/Not Merged; trust GitHub PR metadata and current main instead.

Verified provider facts already in the product code/history:

- Seller API authentication works;
- verified token transport is raw `Authorization: <access_token>` — NOT Bearer;
- controlled supplier terms reference: `GB010107`;
- controlled SKU: `S0671779793`;
- territory: `GB`;
- real `GetSellerProductList` read verified;
- real `SellerStockList` read verified;
- exact code capabilities are currently `catalog`, `stock`, `price`;
- adapter version is `1.1.0-read-only-pilot`;
- Orders permission remains OFF;
- PII permission remains OFF;
- no marketplace listing was activated merely from the read-only pilot;
- hosted Supplier Commerce activation remains OFF.

Canonical Avasam checkpoints already in repo:

- `16_AVASAM_VERIFIED_API_INTEGRATION_CHECKPOINT_2026-08-29.md`
- `17_AVASAM_GB010107_SUPPLIER_TERMS_GATE_2026-08-29.md`
- `18_AVASAM_READONLY_PILOT_VERIFICATION_CHECKPOINT_2026-08-29.md`
- `19_AVASAM_COMMERCIAL_CAPABILITY_GAP_CHECKPOINT_2026-08-29.md`
- `20_AVASAM_PROVIDER_TECHNICAL_CLARIFICATION_REQUEST_2026-08-29.md`

### Avasam Gate B / commercial-execution gap

Read-only integration is not the same as supplier-fulfilled commerce. Before order execution can be activated, resolve the transactional contract, including at minimum:

1. authoritative order-create endpoint (`CreateSellerOrder` vs `AddNewOrder` or provider-confirmed equivalent);
2. usable stable provider order identifier;
3. idempotency and lost-response recovery;
4. authoritative order lookup / acknowledgement semantics;
5. shipping-service discovery / quote or service-selection contract;
6. tracking contract and its PII/minimisation implications;
7. cancellation support;
8. return-creation flow;
9. reimbursement / repayment reconciliation;
10. actual Seller API rate limits, retry/backoff rules and transactional throttling;
11. order lifecycle webhook/event contract beyond stock/price.

Next Avasam action is to work from checkpoint 20 and classify each missing capability as:

- `VERIFIED_IMPLEMENTABLE`
- `VERIFIED_MANUAL_ONLY`
- `REQUIRES_PII_PERMISSION`
- `REQUIRES_ORDERS_PERMISSION`
- `PROVIDER_CONTRACT_STILL_MISSING`
- `NOT_SUPPORTED`

Do NOT enable Orders or PII merely to probe undocumented behaviour. Do NOT weaken the commercial readiness gate to make the read-only pilot look complete.

## 5. BigBuy — current state

PR #635 (`Scaffold BigBuy read-only API contracts`) is MERGED.

Current state:

- fixed-host sandbox/production transport exists;
- Bearer API-key ownership is enforced by the client boundary;
- GET-only transport;
- missing credentials fail before network access;
- caller auth overrides are rejected;
- write methods and untrusted endpoint paths fail closed;
- strict documented response parsers exist for the initial read-only contract work;
- no BigBuy credential has been committed;
- no live/sandbox provider request has yet been claimed from this foundation;
- BigBuy remains `scaffolded_unverified`;
- `verifiedCapabilities=[]`;
- runtime SupplierAdapter capabilities remain `[]`;
- hosted activation remains OFF;
- no BigBuy order/PII/listing/payment execution is active.

Next BigBuy objective:

1. obtain/confirm authorized sandbox or provider credential path;
2. verify authentication and exact live response shapes;
3. verify the read-only catalogue/variant/stock/price contracts one by one;
4. promote only independently proven capabilities;
5. then research and gate shipping/order/ack/tracking/cancel/return/reimbursement separately.

Do not wire BigBuy into live Supplier Commerce before the relevant capabilities are proven.

## 6. Direct Supplier — current state

PR #637 (`Prepare secure Direct Supplier ingestion foundation`) is MERGED.

Current state:

- provider remains `scaffolded_unverified`;
- hosted activation OFF;
- runtime capabilities `[]`;
- Direct Supplier Contract V1 exists for future API/feed/CSV/XML/SFTP style ingestion;
- strict webhook envelope validation exists;
- HMAC-SHA256 raw-body verification exists;
- timestamp freshness / anti-replay boundary exists;
- durable replay-store interface + atomic event claim boundary exists;
- no supplier secret is provisioned;
- no public commercial ingestion endpoint is activated;
- no hosted replay table was created by the foundation;
- no product import/listing/order/PII/payment capability is active.

Next Direct Supplier objective is to build the canonical provider onboarding + ingestion pipeline for a real approved supplier without creating a parallel commerce architecture:

1. approved supplier manifest/config;
2. transport-specific fetch/receive adapter;
3. schema validation and quarantine of invalid rows/events;
4. supplier identity/SKU/variant binding;
5. normalization into Loadify's canonical supplier offer/product candidate model;
6. deterministic dedupe/idempotency;
7. stock/price freshness and stale-data rules;
8. import approval/listing gate;
9. only later, separately verified order/tracking/returns capabilities.

## 7. Multi-provider foundation already merged

PR #633 (`Prepare multi-provider supplier and channel foundation`) is MERGED.

It established:

- zero-capability fail-closed provider scaffolding;
- provider readiness registry;
- `SupplierAdapterV1` capability model;
- Direct Supplier Contract V1;
- separate Marketplace Channel Connector boundary.

Provider readiness remains fail-closed. A provider is not considered active because a registry entry or scaffold exists.

## 8. Commerce contracts that must remain canonical

Do not create a second order/payment architecture while implementing suppliers.

Preserve:

- current Loadify checkout single-seller invariant;
- server-side product/seller/price/shipping/VAT validation;
- canonical order state inside Loadify;
- canonical Stripe webhook/idempotency paths;
- canonical escrow/release and payout/reconciliation path;
- existing dispute/refund and notification contracts;
- one source of truth per domain.

PR #639 documented the hosted Supabase reconciliation guard. Noncanonical parallel structures must not silently become runtime dependencies.

## 9. Database / migration truth boundary

PR #625 (`P0: make Supabase migration governance honest and drift-safe`) is still OPEN / DRAFT / NOT MERGED and is stale relative to the new no-GitHub-Actions verification regime.

Its important audit facts remain relevant:

- hosted migration ledger and repository migrations are materially divergent;
- `supabase/migrations/` is not yet proven as a clean empty-database bootstrap;
- historical migration reconstruction is incomplete.

Before any significant new hosted Supplier Commerce schema activation, rework migration governance for the current local-CLI + Netlify model. Do not restore GitHub Actions.

Do not claim hosted Supabase parity merely because `npm run verify:migrations` is green; the current main script is an inventory guard, not a hosted-ledger proof.

## 10. Paused E2E fixture work — NOT the Supplier Commerce objective

A separate WIP branch was started immediately before this checkpoint:

`test/e2e-role-fixtures-20260830`

It contains unfinished dedicated Buyer/Seller/Admin fixture provisioning work. There is no reason to make this the next Supplier Commerce task.

Status for handoff:

- PAUSED by owner request;
- do not merge it into main;
- do not resume it unless the owner explicitly asks to return to role-fixture E2E work;
- the already-merged PR #645 verification infrastructure remains valid and should be used as a gate, not treated as the product objective.

## 11. What the next agent should build next

The primary workstream is **Supplier Commerce commercial execution**, in this order:

### Phase A — Re-establish truth

1. fetch current `main` and verify HEAD;
2. read this checkpoint and Avasam checkpoints 18-20;
3. verify current provider registries/adapters before changing anything;
4. do not restart the historical audit from zero.

### Phase B — Avasam Gate B

Resolve the missing transactional capability matrix using authoritative provider evidence. Implement only capabilities that are contractually and technically verified. Keep Orders/PII OFF until legitimately required and authorized.

### Phase C — BigBuy read-only verification

Move BigBuy from scaffolded/unverified to independently verified read-only capabilities using authorized credentials/sandbox evidence. Do not guess response shapes or promote capabilities from documentation alone.

### Phase D — Direct Supplier ingestion

Implement a real, provider-isolated ingestion route for an approved direct supplier using the existing security contracts, then normalize it into the same canonical supplier product/offer model used by the multi-provider engine.

### Phase E — Canonical product import and synchronization

Build/complete the provider-neutral path for:

- supplier product candidate ingestion;
- supplier SKU/variant identity;
- canonical product mapping;
- stock sync;
- price sync;
- shipping data when verified;
- freshness/staleness policy;
- retry/recovery/idempotency;
- controlled import/listing approval;
- no automatic public listing simply because supplier data exists.

### Phase F — Supplier order lifecycle

Once provider order contracts are verified, connect the existing Loadify order to supplier execution:

- supplier order submission;
- idempotency key / lost-response recovery;
- provider acknowledgement + provider order ID;
- shipment/tracking updates;
- cancellation;
- returns;
- reimbursement reconciliation;
- failure/retry/manual intervention states;
- audit trail.

This must extend the canonical Loadify order, not replace it.

### Phase G — Hosted activation

Activate Supplier Commerce provider-by-provider and capability-by-capability only after:

- migration governance is honest;
- provider capability evidence is complete;
- security/RLS remains fail-closed;
- local verification passes;
- Netlify preview passes;
- no live payment/order/PII mutation is used as an undocumented experiment.

## 12. Non-negotiable guardrails

- NO GitHub Actions.
- Use local CLI + Netlify Deploy Preview.
- Do not touch Web Mobile unless explicitly asked.
- Do not import PR #359 Workspace visual changes.
- Do not redesign Seller Workspace or Super Admin while doing supplier work.
- Do not weaken RLS/security.
- Do not invent provider credentials, permissions, endpoints or capabilities.
- Do not expose service-role/provider secrets to the browser.
- Do not activate Orders/PII merely for discovery.
- Do not create parallel checkout/order/payment/escrow systems.
- Do not alter the canonical single-seller checkout invariant as part of supplier integration.
- Do not perform real Stripe transfer/refund/capture or real supplier fulfilment merely as an E2E test.
- Keep provider integrations fail-closed until evidence promotes a capability.

## 13. Handoff sentence

The correct short description of the project is:

> **We are building Loadify Market's multi-provider Supplier Commerce engine: verified supplier integrations (Avasam, BigBuy and Direct Suppliers), canonical catalogue/variant import, stock and price synchronization, controlled marketplace listing, and the complete supplier-fulfilled order lifecycle from Loadify order submission through acknowledgement, shipping/tracking, cancellation, returns and reimbursement — all behind capability gates, without creating parallel commerce/payment architecture.**
