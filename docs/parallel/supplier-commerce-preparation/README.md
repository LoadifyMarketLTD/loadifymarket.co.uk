# LOADIFY SUPPLIER COMMERCE — PARALLEL PREPARATION LANE

Status: PREPARATION ONLY / NO RUNTIME IMPLEMENTATION / NO MIGRATIONS / NO PRODUCTION CHANGES

This branch exists to prepare Supplier Commerce while the active agent finishes Checkpoint A.

It is intentionally based on the controlling contract branch `canonical-contract/supplier-commerce-20260819` so every preparation artifact inherits the full 2210-line Canonical Execution Contract plus the 19 August 2026 product-direction clarification.

## Hard boundary

Until Checkpoint A PASS → Foundation Baseline Freeze → Gate B PASS:

- no Supplier Commerce migration;
- no production DB write;
- no production Stripe change;
- no supplier credential/integration activation;
- no new runtime lifecycle;
- no final table names assumed;
- no provider-specific commerce-core code;
- no merge into active Checkpoint A branches;
- no modification of agent Checkpoint A implementation from this lane.

## Autonomous execution rule

This lane may continue autonomously without owner approval for technical preparation that remains inside the hard boundary above.

The assistant/engineer may independently:
- audit current/future integration seams;
- refine architecture;
- write responsibility contracts;
- prepare E2E/failure/recovery criteria;
- identify risks/conflicts;
- self-review and correct preparation artifacts;
- maintain a read-only reconciliation watch on Checkpoint A;
- keep PR #518 current.

Owner confirmation is required only when a genuine business/legal/commercial choice cannot be derived safely from the canonical contract/current authoritative sources, or when execution would cross an existing gate into runtime/schema/production implementation.

## What this lane IS allowed to prepare

1. Gate B business-decision pack.
2. Target architecture and boundaries.
3. Current-runtime integration map.
4. Discovery / sourcing / supplier capability taxonomy.
5. Operator-driven product import contract.
6. No-Loadify-warehouse Supplier-Fulfilled model.
7. Canonical Product / Supplier Offer responsibility split.
8. AI Product Builder / Facts Lock responsibilities.
9. Landed cost / stock / price / order / payment / tracking / return / recovery contracts at responsibility level.
10. Vertical-slice implementation backlog for Phases C→Q.
11. E2E scenario catalogue and failure paths.
12. Reconciliation protocol for rebasing onto the post-Checkpoint-A baseline.
13. Deep factual audit of the current seller-centric runtime and live schema seams.
14. Provider/source capability contracts that prevent external brands from becoming core architecture types.
15. Data ownership / source-of-truth boundaries.
16. Financial truth event/responsibility model.
17. Supplier fulfilment orchestration responsibilities.
18. Observability / incident / retry / replay / reconciliation contracts.
19. Compliance / provenance / rights responsibility contract.
20. Sellability / stock / price / margin responsibility contract.
21. AI Facts Lock / merchandising governance.
22. Server-enforced rollout / feature flag / kill-switch contract.
23. Supplier qualification / SLA / risk governance.
24. Controlled pilot / scale / Definition of Done evidence contract.
25. API versioning / adapter interface compatibility contract.
26. Privacy / retention / minimisation contract.
27. Tax / VAT / customs rule-versioning contract.
28. Supplier simulator / replay contract.
29. Supplier Control Centre governance contract.
30. Web/mobile parity and consumer contract.
31. Concurrency / idempotency / retry contract.
32. Backup / recovery / data-compatibility contract.
33. Checkpoint A reconciliation watch.
34. Post-Freeze rebase and validation runbook.
35. Gate B resolution playbook.
36. Implementation readiness matrix.
37. Vertical-slice acceptance/evidence matrix.

## Current product intent

Loadify supports three commercial surfaces without creating parallel platform truths:

- Marketplace Seller;
- Loadify-operated product sourcing/catalogue control;
- Loadify Supplier-Fulfilled commerce.

The target Supplier-Fulfilled model does NOT require a Loadify-owned physical warehouse. Approved supplier/fulfilment providers may hold stock and ship directly to the customer while Loadify controls the canonical customer-facing commerce experience according to Gate B.

External ecosystems may serve different roles:

DISCOVERY SOURCE
≠ CATALOG SOURCE
≠ SUPPLIER
≠ FULFILMENT PROVIDER.

TikTok, Amazon, Alibaba, AliExpress, wholesalers and manufacturers are examples only. Their actual capabilities, rights and policies must be verified from current official sources before provider-specific implementation.

## Read order

1. `01_GATE_B_DECISION_PACK.md`
2. `02_TARGET_ARCHITECTURE.md`
3. `03_CURRENT_RUNTIME_INTEGRATION_MAP.md`
4. `04_VERTICAL_SLICE_BACKLOG.md`
5. `05_RECONCILIATION_PROTOCOL.md`
6. `06_DEEP_BASELINE_AUDIT.md`
7. `07_E2E_SCENARIO_CATALOGUE.md`
8. `08_SOURCE_AND_PROVIDER_CAPABILITY_CONTRACT.md`
9. `09_DATA_OWNERSHIP_AND_BOUNDARY_MATRIX.md`
10. `10_OPERATOR_IMPORT_CONTRACT.md`
11. `11_FINANCIAL_TRUTH_EVENT_MODEL.md`
12. `12_SUPPLIER_FULFILMENT_ORCHESTRATION_CONTRACT.md`
13. `13_OBSERVABILITY_INCIDENT_AND_RECOVERY_CONTRACT.md`
14. `14_COMPLIANCE_PROVENANCE_AND_RIGHTS_CONTRACT.md`
15. `15_SELLABILITY_STOCK_AND_PRICE_CONTRACT.md`
16. `16_AI_FACTS_LOCK_AND_MERCHANDISING_CONTRACT.md`
17. `17_FEATURE_FLAGS_ROLLOUT_AND_KILL_SWITCH_CONTRACT.md`
18. `18_SUPPLIER_QUALIFICATION_SLA_AND_RISK_CONTRACT.md`
19. `19_PILOT_SCALE_AND_DEFINITION_OF_DONE_CONTRACT.md`
20. `20_API_VERSIONING_AND_ADAPTER_INTERFACE_CONTRACT.md`
21. `21_PRIVACY_RETENTION_AND_DATA_MINIMISATION_CONTRACT.md`
22. `22_TAX_VAT_CUSTOMS_RULE_VERSIONING_CONTRACT.md`
23. `23_SUPPLIER_SIMULATOR_AND_REPLAY_CONTRACT.md`
24. `24_SUPPLIER_CONTROL_CENTRE_GOVERNANCE_CONTRACT.md`
25. `25_WEB_MOBILE_PARITY_AND_CONSUMER_CONTRACT.md`
26. `26_CONCURRENCY_IDEMPOTENCY_AND_RETRY_CONTRACT.md`
27. `27_BACKUP_RECOVERY_AND_DATA_COMPATIBILITY_CONTRACT.md`
28. `28_CHECKPOINT_A_RECONCILIATION_WATCH.md`
29. `29_POST_FREEZE_REBASE_AND_VALIDATION_RUNBOOK.md`
30. `30_GATE_B_RESOLUTION_PLAYBOOK.md`
31. `31_IMPLEMENTATION_READINESS_MATRIX.md`
32. `32_VERTICAL_SLICE_ACCEPTANCE_EVIDENCE_MATRIX.md`

## Current verified baseline observations

The preparation audit currently confirms that the marketplace foundation is strongly seller-centric:

- current `products` and `orders` require seller ownership;
- web/mobile checkout currently enforce one seller per transaction;
- marketplace checkout requires seller Stripe Connect readiness;
- current product reservation is a marketplace listing reservation, not Supplier Commerce sellable-stock architecture;
- current customer order/payment/shipment/return/admin surfaces are valuable integration seams and must be extended rather than duplicated;
- no obvious live public Supplier Commerce supplier/catalog/ledger/fulfilment/inventory table family exists yet;
- commercial-history shipping mutation found in the current foundation belongs to Checkpoint A, not this lane.

Latest observed Checkpoint A work has split the shipment repair into DB-first and server-consumer layers, identified storage-policy drift, and prepared immutable commercial-history snapshots. Those drafts are deliberately NOT adopted as this lane's foundation until Checkpoint A is complete and Foundation Baseline Freeze is captured.

A Guardian correction has also identified rollout/integration conditions that must be reconciled before those draft layers can be treated as final: unique migration ordering, safe DB-to-consumer cutover and safe commercial-snapshot producer/materialization cutover.

Every baseline observation must be revalidated against the Foundation Baseline Freeze before implementation.

## Preparation completion condition

This lane is not considered `done` merely because the document set is large. Preparation is mature only when:

- the responsibility model covers every canonical phase C→Q;
- known current-runtime seams are mapped without taking ownership away from Checkpoint A;
- Gate B decisions are explicit enough to be resolved later without schema-first guessing;
- E2E, failure, recovery, security, financial and compliance expectations are documented;
- external provider assumptions remain behind current-source verification;
- API/versioning/privacy/tax/recovery/mobile/adapter boundaries are explicit;
- post-freeze reconciliation and implementation-readiness rules are explicit;
- acceptance evidence prevents fake PASS at each vertical slice;
- Branch Guard confirms docs-only isolation;
- all preparation assumptions are marked for revalidation against Foundation Baseline Freeze.

This lane may become implementation work only after the canonical sequence authorises it.
