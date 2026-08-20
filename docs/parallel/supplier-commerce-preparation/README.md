# LOADIFY SUPPLIER COMMERCE — PARALLEL PREPARATION LANE

Status: PREPARATION ONLY / NO RUNTIME IMPLEMENTATION / NO MIGRATIONS / NO PRODUCTION CHANGES

This branch exists to prepare Supplier Commerce implementation artifacts. The original preparation work was created while Checkpoint A was still active; Checkpoint A and the Foundation Baseline Freeze are now completed historical gates on `main`.

The preparation set must now be interpreted against the CURRENT controlling canonical contract on `main`, including:

- the original 2210-line Canonical Execution Contract;
- `00_PRODUCT_DIRECTION_UPDATE_2026-08-19.md`;
- `06_PRODUCT_DIRECTION_CLARIFICATION_2026-08-20.md`;
- the 20 August Foundation Baseline Freeze.

`33_PRODUCT_DIRECTION_RECONCILIATION_2026-08-20.md` is the controlling preparation overlay that reconciles files 01–32 with the current canonical product direction.

If any preparation artifact conflicts with the canonical contract on `main`, the canonical contract wins.

## Current execution boundary

Current canonical sequence:

FOUNDATION BASELINE FREEZE
→ GATE B BUSINESS CONTRACT
→ GATE B PASS
→ PHASE C → Q.

Until Gate B PASS:

- no Supplier Commerce migration;
- no production DB write;
- no production Stripe change;
- no supplier credential/integration activation;
- no new Supplier Commerce runtime lifecycle;
- no final table names assumed before schema design;
- no provider-specific commerce-core code;
- no production provider/channel activation.

## Autonomous execution rule

This lane may continue autonomously for technical preparation and reconciliation inside the hard boundary above.

The assistant/engineer may independently:
- audit integration seams;
- refine architecture without creating a parallel architecture;
- reconcile preparation artifacts with current canonical direction;
- write responsibility contracts;
- prepare E2E/failure/recovery criteria;
- identify risks/conflicts;
- self-review and correct preparation artifacts;
- maintain readiness and acceptance evidence rules.

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
12. Reconciliation protocol against the Foundation Baseline Freeze.
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
33. Checkpoint A reconciliation watch / historical reconciliation evidence.
34. Post-Freeze rebase and validation runbook.
35. Gate B resolution playbook.
36. Implementation readiness matrix.
37. Vertical-slice acceptance/evidence matrix.
38. 20 August product-direction reconciliation overlay.

## Current product intent

Loadify supports multiple commercial surfaces without creating parallel platform truths:

- Marketplace Seller;
- Loadify-operated product sourcing/catalogue control;
- Loadify Supplier-Fulfilled commerce;
- Loadify Direct only if Gate B gives that label a precise legal/commercial meaning.

The target Supplier-Fulfilled model does NOT require a Loadify-owned physical warehouse. Approved supplier/fulfilment providers may hold stock and ship directly to the customer while Loadify controls the canonical customer-facing commerce experience according to Gate B.

External ecosystems may serve different roles:

DISCOVERY SOURCE
≠ CATALOG SOURCE
≠ SUPPLIER
≠ FULFILMENT PROVIDER
≠ CARRIER
≠ SALES / CHANNEL CONNECTOR.

Provider names such as TikTok, TikTok Shop, Amazon, Alibaba, AliExpress, Avasam, wholesalers, distributors and manufacturers are examples/candidates only. Their actual capabilities, rights, commercial terms and policies must be verified from current official sources before provider-specific implementation.

## Read order

Read this file first, then:

1. `33_PRODUCT_DIRECTION_RECONCILIATION_2026-08-20.md`
2. `01_GATE_B_DECISION_PACK.md`
3. `02_TARGET_ARCHITECTURE.md`
4. `03_CURRENT_RUNTIME_INTEGRATION_MAP.md`
5. `04_VERTICAL_SLICE_BACKLOG.md`
6. `05_RECONCILIATION_PROTOCOL.md`
7. `06_DEEP_BASELINE_AUDIT.md`
8. `07_E2E_SCENARIO_CATALOGUE.md`
9. `08_SOURCE_AND_PROVIDER_CAPABILITY_CONTRACT.md`
10. `09_DATA_OWNERSHIP_AND_BOUNDARY_MATRIX.md`
11. `10_OPERATOR_IMPORT_CONTRACT.md`
12. `11_FINANCIAL_TRUTH_EVENT_MODEL.md`
13. `12_SUPPLIER_FULFILMENT_ORCHESTRATION_CONTRACT.md`
14. `13_OBSERVABILITY_INCIDENT_AND_RECOVERY_CONTRACT.md`
15. `14_COMPLIANCE_PROVENANCE_AND_RIGHTS_CONTRACT.md`
16. `15_SELLABILITY_STOCK_AND_PRICE_CONTRACT.md`
17. `16_AI_FACTS_LOCK_AND_MERCHANDISING_CONTRACT.md`
18. `17_FEATURE_FLAGS_ROLLOUT_AND_KILL_SWITCH_CONTRACT.md`
19. `18_SUPPLIER_QUALIFICATION_SLA_AND_RISK_CONTRACT.md`
20. `19_PILOT_SCALE_AND_DEFINITION_OF_DONE_CONTRACT.md`
21. `20_API_VERSIONING_AND_ADAPTER_INTERFACE_CONTRACT.md`
22. `21_PRIVACY_RETENTION_AND_DATA_MINIMISATION_CONTRACT.md`
23. `22_TAX_VAT_CUSTOMS_RULE_VERSIONING_CONTRACT.md`
24. `23_SUPPLIER_SIMULATOR_AND_REPLAY_CONTRACT.md`
25. `24_SUPPLIER_CONTROL_CENTRE_GOVERNANCE_CONTRACT.md`
26. `25_WEB_MOBILE_PARITY_AND_CONSUMER_CONTRACT.md`
27. `26_CONCURRENCY_IDEMPOTENCY_AND_RETRY_CONTRACT.md`
28. `27_BACKUP_RECOVERY_AND_DATA_COMPATIBILITY_CONTRACT.md`
29. `28_CHECKPOINT_A_RECONCILIATION_WATCH.md`
30. `29_POST_FREEZE_REBASE_AND_VALIDATION_RUNBOOK.md`
31. `30_GATE_B_RESOLUTION_PLAYBOOK.md`
32. `31_IMPLEMENTATION_READINESS_MATRIX.md`
33. `32_VERTICAL_SLICE_ACCEPTANCE_EVIDENCE_MATRIX.md`

## Site-direction guard

Supplier Commerce extends Loadify Market; it does not redesign or replace Loadify Market.

Existing visual identity, navigation logic and established Buyer/Seller/Admin/Super Admin/Workspace direction remain the baseline.

UI changes are permitted only where a Supplier Commerce capability genuinely requires a new control, status, field, evidence view, workflow or operational action.

Do not perform unrelated visual redesign under Supplier Commerce scope.

Do not import visual direction from unrelated historical PRs.

Every implementation PR must include a Branch Guard statement on visual impact.

## Current verified baseline observations

The preparation audit confirmed that the marketplace foundation was strongly seller-centric at preparation time:

- current `products` and `orders` required seller ownership;
- web/mobile checkout enforced one seller per transaction;
- marketplace checkout required seller Stripe Connect readiness;
- current product reservation was a marketplace listing reservation, not Supplier Commerce sellable-stock architecture;
- current customer order/payment/shipment/return/admin surfaces are valuable integration seams and must be extended rather than duplicated;
- no obvious live public Supplier Commerce supplier/catalog/ledger/fulfilment/inventory table family existed yet.

These observations MUST be revalidated against the actual Foundation Baseline Freeze and current `main` before each implementation slice. Historical Checkpoint A draft observations are evidence history, not authority to overwrite the frozen baseline.

## Preparation completion condition

Preparation is mature only when:

- the responsibility model covers every canonical phase C→Q;
- known current-runtime seams are mapped against the frozen foundation;
- Gate B decisions are explicit enough to resolve without schema-first guessing;
- E2E, failure, recovery, security, financial and compliance expectations are documented;
- external provider assumptions remain behind current-source verification;
- provider/legal capability register requirements are explicit;
- API/versioning/privacy/tax/recovery/mobile/adapter boundaries are explicit;
- review provenance, content/UGC rights, price transparency, consignment-aware tax, digital-platform reporting and product-safety/recall governance are represented;
- implementation-readiness and acceptance evidence prevent fake PASS;
- Supplier Commerce does not create unrelated visual redesign;
- Branch Guard confirms scope isolation.

This preparation set may become runtime implementation only after the canonical sequence authorises it.