# LOADIFY MARKET — CANONICAL CONTINUATION PLAN / PHASE O → Q

**Date fixed:** 21 August 2026  
**Purpose:** single continuation document for all future agents/chats so the execution state, rules, sequencing, evidence standards and next actions are not lost or reinterpreted.  
**Status:** CONTROLLING CONTINUATION POINTER. This file does **not** rewrite the original canonical contract. Where anything conflicts, the canonical contract wins.

---

## 1. CONTROLLING SOURCE HIERARCHY

Every new agent/chat must use this hierarchy, in this order:

1. `AGENTS.md`
2. `docs/canonical/loadify-supplier-commerce-2026-08-19/README.md`
3. `00_PRODUCT_DIRECTION_UPDATE_2026-08-19.md`
4. `06_PRODUCT_DIRECTION_CLARIFICATION_2026-08-20.md`
5. `01_CANONICAL_EXECUTION_CONTRACT_LINES_0001_0750.md`
6. `02_CANONICAL_EXECUTION_CONTRACT_LINES_0751_1250.md`
7. `03_CANONICAL_EXECUTION_CONTRACT_LINES_1251_1750.md`
8. `04_CANONICAL_EXECUTION_CONTRACT_LINES_1751_2210.md`
9. `05_FOUNDATION_BASELINE_FREEZE_2026-08-20.md`
10. `07_EXECUTION_PROGRESS_LEDGER_2026-08-20.md`
11. `07B_EXECUTION_PROGRESS_LEDGER_CONTINUATION_2026-08-21.md`
12. `08_GATE_B_BUSINESS_CONTRACT_2026-08-20.md`
13. `09_P1_PRODUCTION_DEPLOYMENT_2026-08-20.md`
14. **THIS FILE — `10_CANONICAL_CONTINUATION_PLAN_PHASE_O_TO_Q_2026-08-21.md`**

Preparation lane is guidance only:
`parallel/supplier-commerce-preparation/docs/parallel/supplier-commerce-preparation/`

Relevant preparation files for O→Q:
- `19_PILOT_SCALE_AND_DEFINITION_OF_DONE_CONTRACT.md`
- `17_FEATURE_FLAGS_ROLLOUT_AND_KILL_SWITCH_CONTRACT.md`
- `18_SUPPLIER_QUALIFICATION_SLA_AND_RISK_CONTRACT.md`
- `23_SUPPLIER_SIMULATOR_AND_REPLAY_CONTRACT.md`
- `24_SUPPLIER_CONTROL_CENTRE_GOVERNANCE_CONTRACT.md`
- `25_WEB_MOBILE_PARITY_AND_CONSUMER_CONTRACT.md`
- `27_BACKUP_RECOVERY_AND_DATA_COMPATIBILITY_CONTRACT.md`
- `31_IMPLEMENTATION_READINESS_MATRIX.md`
- `32_VERTICAL_SLICE_ACCEPTANCE_EVIDENCE_MATRIX.md`
- `33_PRODUCT_DIRECTION_RECONCILIATION_2026-08-20.md`

Preparation artifacts never override the canonical contract.

---

## 2. FACTUAL STATE AT HANDOFF

Repository:
`LoadifyMarketLTD/loadifymarket.co.uk`

Current verified `main` at handoff:
`a0fe19b6f6b3867e1c34ddbe5445666e26233940`

Important ancestry:
- Phase N implementation PR #558 merge commit:
  `05349dcf505e84d7c2a4400c8e589d7d88e19d42`
- Phase N docs closeout PR #559 merge commit:
  `50302455a6c8afcd52da45150f7de6f0ce91d942`
- `main` moved later due unrelated homepage/documentation stabilization.
- Do not assume `503024...` is still current `main`.
- Always verify live `main` before any new write.

Supabase production project:
`fwdfpmfvgygvqciecesx`

Latest verified Supplier Commerce migration head:
- `20260821132556 / supplier_simulator_recovery_validation`
- `20260821132631 / supplier_simulator_recovery_validation_closure`
- `20260821132658 / supplier_simulator_full_replay_gate`

All verified global Supplier Commerce controls remain **OFF / fail-closed**:
- `*`
- `checkout`
- `import`
- `price_sync`
- `publish`
- `reservation`
- `return_recovery`
- `stock_sync`
- `supplier_order`
- `tracking_ingest`

Nothing in Phase N enabled Supplier Commerce.

---

## 3. CANONICAL COMPLETION STATE

Completed:
- Critical Foundation
- Checkpoint A atomic PASS
- Foundation Baseline Freeze
- P1 tax/payment evidence repair + production deployment
- Gate B Business Contract PASS
- Phase C — Platform Control Foundations
- Phase D — Supplier Foundation
- Phase E — Canonical Supplier Data
- Phase F — Import / Normalisation
- Phase G — Commercial Economics
- Phase H — Stock + Price Sync
- Phase I — Order Orchestrator + Commerce Risk + Reservation
- Phase J — Payment → Supplier Handshake + Acknowledgement + Idempotency + Reconciliation
- Phase K — Tracking + Exceptions
- Phase L — Returns + Customer Refunds + Supplier Recovery + Financial Reconciliation
- Phase M — Supplier Control Centre + Security + Risk/SLA Governance + Kill Switch + Incident Visibility
- Phase N — Supplier Simulator + Recovery/Replay Validation

Current next:
**PHASE O — CONTROLLED PILOT**

After O:
**PHASE P — SUPPLIER PERFORMANCE + SLA PERFORMANCE + CONTROLLED SCALE**

After P:
**PHASE Q — FINAL LOADIFY MARKET PRODUCTION HARDENING**

No agent may skip O or P and jump directly to Q.

---

## 4. PERMANENT PRODUCT INVARIANTS

These are non-negotiable:

- one canonical product may have multiple governed supplier offers;
- canonical product ≠ supplier offer;
- supplier raw stock ≠ Loadify sellable stock;
- payment success ≠ supplier order success;
- customer refund ≠ supplier recovery;
- order completed ≠ financially reconciled;
- one customer order truth;
- one canonical financial truth;
- no provider-specific commerce core;
- no direct operator publish bypass;
- no AI-invented facts;
- no fake/laundered reviews;
- no assumed rights to third-party media/UGC;
- no drip pricing;
- no silent supplier substitution that changes the customer promise;
- simulator PASS ≠ pilot PASS;
- pilot PASS ≠ controlled-scale PASS;
- backup exists ≠ restore PASS;
- build PASS ≠ E2E PASS;
- documented ≠ tested;
- partial PASS ≠ gate PASS.

---

## 5. PERMANENT EXECUTION MODEL

Full-stack sequence:
`BUSINESS CONTRACT → DATA MODEL → AUTH → API → DATABASE → SIDE EFFECTS → FRONT-END → ADMIN GOVERNANCE → MOBILE IF RELEVANT → ERROR PATHS → E2E → BRANCH GUARD`

Branch Guard sequence:
`CREATOR → IMPLEMENT → BRANCH GUARD → VERIFY → FIX IF NECESSARY → ONLY THEN CONTINUE`

P0/P1 rule:
If a real P0/P1 is found, STOP downstream work, repair/reconcile, revalidate, then resume.

Repository/runtime evidence outranks any previous PASS claim.

---

## 6. POWERSHELL VALIDATION RULE

GitHub Actions is not the acceptance source for this project.

Mandatory validation source:
**PowerShell on the user's Windows repository**, using an isolated worktree whenever possible.

Windows repository:
`C:\Users\Danny\Desktop\LoadifyMarket-GitHub-20260820-0950`

Known unrelated local files historically:
- `android/app/capacitor.build.gradle`
- `android/capacitor.settings.gradle`

Never reset, overwrite, stash blindly, or include these unrelated local changes.

For every implementation phase:
1. finish autonomous implementation;
2. finish Branch Guard;
3. only then ask the owner to run one consolidated PowerShell validation block;
4. record exact tested HEAD;
5. run focused phase tests;
6. run all Supplier Commerce upstream tests;
7. TypeScript;
8. lint;
9. build;
10. full suite baseline comparison.

Known full-suite baseline at Phase N:
**27 failed / 441 passed / 468 total**, across the known historical baseline families.
A full-suite exit code 1 is not automatically a regression if the same baseline family/count remains unchanged.
Do not call PASS unless focused/upstream/type/lint/build are all PASS and full-suite comparison shows no new relevant failures.

---

## 7. PHASE O — CONTROLLED PILOT

### 7.1 Core rule

Phase O is a **real controlled-production gate**.

Simulator evidence alone cannot satisfy it.

Do not call Phase O PASS until real pilot evidence exists.

### 7.2 Before any pilot activation

Verify again:
- current `main`;
- exact Phase O branch base;
- current migration head;
- current production controls;
- current open PRs/branches;
- no unresolved P0/P1;
- supplier qualification current;
- SLA current;
- capability register current;
- rights/provenance current;
- product-safety/compliance current;
- stock/price evidence current;
- commercial economics current;
- tax/VAT/customs evidence current;
- payment/supplier-order boundaries current;
- tracking/returns/recovery/reconciliation current;
- observability + incident path current;
- kill switch current and callable;
- rollback/replay path current;
- mobile/web contract where applicable.

### 7.3 Default pilot shape

Unless a newer explicit owner/business decision changes it:
- Great Britain scope;
- one approved supplier;
- small low-risk product set;
- limited order value;
- limited order volume;
- explicit pilot cohort/feature flag;
- enhanced observability;
- operator review/escalation;
- kill switch available;
- no Loadify-owned warehouse requirement.

This is a safety operating recommendation, not a permanent legal mandate.

### 7.4 Pilot product criteria

Prefer:
- clear canonical identity;
- clear rights/provenance;
- low compliance complexity;
- stable stock;
- stable price;
- predictable fulfilment;
- clear return path;
- sufficient margin;
- reliable tracking;
- limited potential customer harm.

Do not use the hardest/highest-risk category to prove the first real pilot.

### 7.5 Pilot supplier criteria

Pilot supplier must have:
- verified identity;
- approved qualification;
- stable adapter/integration path;
- explicit capability evidence;
- SLA/contact/escalation;
- stock and price evidence;
- order acknowledgement;
- tracking;
- return/recovery process;
- reconciliation support.

### 7.6 Pilot data and control design

Phase O must implement/verify:
- explicit pilot cohort boundary;
- pilot-only supplier/product/order eligibility;
- order-value and order-volume caps;
- supplier scope cap;
- territory cap;
- product/category risk cap;
- admin-only pilot configuration;
- append-only pilot decision/audit evidence;
- kill-switch integration;
- automatic fail-closed when eligibility evidence is missing/stale;
- no global Supplier Commerce activation;
- no hidden fallback outside pilot scope;
- no silent supplier substitution;
- no bypass of canonical checkout/order/financial truth.

### 7.7 Pilot observability

For every pilot order, operator must be able to explain end-to-end:
- canonical product;
- selected supplier offer;
- stock evidence;
- price evidence;
- commercial/tax decision;
- payment state;
- reservation state;
- supplier submission state;
- acknowledgement;
- supplier order reference;
- fulfilment leg;
- tracking;
- exception state;
- customer communication impact;
- return/refund state if any;
- supplier recovery state if any;
- reconciliation state;
- correlation/incident IDs;
- who/what changed pilot controls.

If an operator cannot explain an order end-to-end, pilot observability is incomplete.

### 7.8 Pilot acceptance evidence

At minimum:
- one or more real pilot transactions inside the approved cohort;
- no duplicate supplier/customer financial side effects;
- no unexplained canonical-state divergence;
- tracking evidence;
- failure/exception evidence where encountered;
- customer refund + supplier recovery separation where applicable;
- terminal financial reconciliation;
- kill-switch demonstration;
- rollback/recovery demonstration;
- incident path demonstration;
- exact supplier/product/cohort config evidence;
- exact release/main SHA;
- exact migration head;
- exact control state;
- no open P0/P1 relevant to pilot.

A failed pilot order can still be acceptable if the platform detects, contains, explains, refunds/recovers/reconciles correctly.
Silent failure or unexplained financial discrepancy is a blocker.

### 7.9 Phase O activation rule

Do **not** enable all Supplier Commerce controls globally.

If real pilot activation requires production control changes:
- use the narrowest scope possible;
- prefer supplier/product/cohort-scoped controls;
- record actor, reason, version, timestamp, scope;
- preserve a deterministic rollback;
- verify fail-closed behavior;
- verify kill switch before first real order.

### 7.10 Phase O completion rule

Phase O PASS only after:
- implementation PASS;
- PowerShell PASS;
- production deployment verified;
- real controlled pilot executed;
- pilot evidence reviewed;
- reconciliation closed;
- no relevant P0/P1;
- separate documentation-only ledger closeout PR merged.

Then advance to Phase P.

---

## 8. PHASE P — SUPPLIER PERFORMANCE + SLA PERFORMANCE + CONTROLLED SCALE

Phase P is not "turn everything on".

### 8.1 Build/verify supplier performance truth

Track evidence-backed metrics such as:
- supplier submit/ack success;
- timeout rate;
- unknown outcome rate;
- stock rejection/oversell;
- price drift;
- on-time dispatch;
- on-time delivery;
- tracking completeness;
- exception rate;
- cancellation rate;
- return rate;
- refund rate;
- supplier recovery rate;
- unreconciled financial exceptions;
- support/operator intervention burden;
- incident severity/count.

Metrics must derive from canonical events/financial truth, not manual vanity counters.

### 8.2 SLA performance

SLA must be:
- versioned;
- effective-dated;
- tied to supplier;
- auditable;
- measured against actual canonical timestamps;
- breach-detectable;
- breach evidence idempotent;
- linked to risk/governance actions.

### 8.3 Controlled scale dimensions

Scale independently by:
- supplier count;
- product count;
- category risk;
- territory;
- order value;
- order volume;
- automation level;
- provider/connector count.

Never expand every dimension at once.

### 8.4 Promotion criteria

Before each scale increase:
- previous pilot/scale cohort reconciled;
- no unresolved P0/P1;
- supplier performance acceptable;
- SLA performance acceptable;
- operator burden manageable;
- exception backlog controlled;
- financial exception backlog controlled;
- kill switch proven;
- observability sufficient;
- support/admin workflows sufficient;
- privacy/compliance/provenance still valid;
- current provider capability evidence still valid.

### 8.5 Phase P completion

PASS requires real performance/scale evidence, not code only.
When PASS:
- merge implementation/configuration evidence;
- verify production state;
- documentation-only ledger closeout;
- advance to Q.

---

## 9. PHASE Q — FINAL LOADIFY MARKET PRODUCTION HARDENING

Q is a complete final audit, not another feature slice.

Audit at minimum:

### Identity / Auth / Access
- authentication;
- active-account/suspension;
- authorization;
- RLS;
- grants;
- service-role boundaries;
- admin/super-admin boundaries;
- multi-tenancy;
- storage access.

### Commerce
- buyer;
- seller;
- marketplace seller;
- Loadify Supplier-Fulfilled;
- Loadify Direct if active;
- products;
- catalog;
- categories;
- search;
- cart;
- checkout;
- Stripe;
- payments;
- orders;
- reservations;
- supplier orders;
- fulfilment;
- tracking;
- returns;
- refunds;
- disputes;
- supplier recovery;
- financial reconciliation;
- invoices;
- tax/VAT/customs;
- digital-platform reporting readiness.

### Supplier system
- qualification;
- capability evidence;
- adapters/versioning;
- provenance/rights;
- compliance/product safety/recall;
- stock;
- price;
- landed cost;
- margin;
- SLA;
- risk;
- control centre;
- kill switch;
- incidents;
- performance;
- scale governance.

### Reliability / Security / Operations
- observability;
- alerting;
- correlation IDs;
- incident response;
- idempotency;
- replay;
- retry;
- unknown outcomes;
- backup;
- restore;
- recovery;
- derived-state rebuild;
- data compatibility;
- migration drift;
- rollback;
- capacity/performance;
- privacy;
- retention;
- secret handling;
- webhook verification.

### Client surfaces
- web;
- mobile;
- buyer flows;
- seller flows;
- admin governance;
- super admin only where functionally required;
- responsive behavior;
- error states;
- accessibility;
- no unrelated UI redesign.

Q must not import rejected/historical visual directions merely because they exist in old branches.

### Q evidence packet

Before claiming production ready, prepare:
- exact main/release SHA;
- migration head;
- deployed configuration versions;
- Supplier Commerce control state;
- supplier/provider capability versions;
- executed PowerShell evidence;
- E2E evidence;
- pilot evidence;
- controlled-scale evidence;
- reconciliation status;
- unresolved/deferred risks;
- security/privacy findings;
- backup/restore/replay evidence;
- rollback evidence;
- monitoring/alert coverage;
- incident contacts/escalation;
- final Branch Guard;
- final no-open-P0/P1 proof.

Only then may the project be evaluated as:
**LOADIFY MARKET — PRODUCTION READY**

---

## 10. HOMEPAGE / UI CONCURRENCY GUARD

Supplier Commerce execution must not overwrite unrelated current homepage or visual stabilization work.

At this handoff:
- current `main` already moved after Phase N due homepage/documentation stabilization;
- preserve the current main truth;
- do not resurrect rejected historical visual work;
- do not redesign Workspace or Super Admin under Supplier Commerce scope;
- UI changes are allowed only when a Supplier Commerce function genuinely needs a control/status/evidence/workflow.

Always inspect current main and current open PRs before touching UI.

---

## 11. PR / MERGE / LEDGER DISCIPLINE

For every remaining phase O/P/Q:

1. verify current main before branch;
2. create clean phase branch from current main;
3. implement only phase scope;
4. Branch Guard exact diff;
5. one consolidated PowerShell validation;
6. if PASS, create implementation PR;
7. re-check main movement and mergeability;
8. merge;
9. deploy migrations/configuration only if phase requires it;
10. verify production reality;
11. keep controls at narrowest safe scope;
12. create **separate documentation-only closeout PR**;
13. update `07B_EXECUTION_PROGRESS_LEDGER_CONTINUATION_2026-08-21.md` or its later append-only successor;
14. record exact PR, merge SHA, tested HEAD, migrations, production state, controls, evidence, unresolved items;
15. state exact next gate.

Never rewrite old history merely to make progress look complete.

---

## 12. COMMUNICATION MODE WITH OWNER

Default autonomous mode:

Do not ask:
- "Vrei să continui?"
- "Să repar?"
- "Ce fac acum?"
- "Ce alegem?"

when the next action is technical and follows from the contract.

The owner should receive primarily:
- **"Rulează asta"** only when physical intervention is actually needed;
- **"Gata / PASS / HOLD"** when a stage closes;
- concise blocker explanation only when genuinely blocked.

Do not burden the owner with intermediate technical chatter.

---

## 13. NEW CHAT START INSTRUCTION

In a new chat, attach this file and send:

**CONTINUĂ LOADIFY MARKET EXACT DIN DOCUMENTUL CANONIC DE CONTINUITATE ATAȘAT.  
NU REINTERPRETA PLANUL.  
RECUPEREAZĂ STAREA REALĂ GITHUB + SUPABASE ÎNAINTE DE ORICE WRITE.  
VERIFICĂ MAI ÎNTÂI CURRENT MAIN, MIGRATION HEAD, CONTROLS ȘI OPEN PRs.  
PHASE N ESTE PASS + MERGED + DEPLOYED + LEDGER ÎNCHIS.  
CURRENT NEXT = PHASE O — CONTROLLED PILOT.  
CONTINUĂ AUTONOM CONFORM CONTRACTULUI, POWERSHELL RULE ȘI BRANCH GUARD.**

The new agent must not start from memory alone. It must read the attached file and verify repository/runtime state.

---

## 14. CURRENT EXACT NEXT ACTION

**PHASE O — CONTROLLED PILOT**

Start Phase O with:
1. factual state verification;
2. current main ancestry/recent movement;
3. current Supabase migration head;
4. current controls;
5. open PR/branch conflict check;
6. Phase O business/evidence boundary;
7. pilot cohort/control model;
8. implementation only if required;
9. Branch Guard;
10. PowerShell;
11. production pilot activation only after pre-pilot gate is truly satisfied.

No global Supplier Commerce activation is authorised by this document.

---

## 15. FINAL ANTI-REINTERPRETATION RULE

If a future agent believes this plan is ambiguous:
- do not invent a new roadmap;
- do not skip a phase;
- do not silently relax evidence;
- do not convert preparation recommendations into business/legal mandates;
- do not treat simulator as pilot;
- do not treat pilot as scale;
- do not treat build as production readiness;
- verify the repository/runtime;
- apply the canonical hierarchy;
- preserve one business/commerce/financial truth;
- continue O → P → Q exactly.

**THE EXECUTION PLAN IS CLOSED. THE REMAINING SEQUENCE IS PHASE O → PHASE P → PHASE Q.**
