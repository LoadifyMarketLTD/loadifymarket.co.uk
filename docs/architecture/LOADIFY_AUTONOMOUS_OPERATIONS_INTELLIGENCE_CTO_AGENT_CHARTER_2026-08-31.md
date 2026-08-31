# LOADIFY MARKET — AUTONOMOUS OPERATIONS & INTELLIGENCE IMPLEMENTATION
## CTO / Lead Architect / Full-Stack Engineering Agent Charter

**Version:** 1.0  
**Date:** 2026-08-31  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Primary implementation workstream:** `#682 — Build autonomous supplier commerce engine`  
**State:** DRAFT / FAIL-CLOSED / DO NOT MERGE UNTIL REQUIRED GATES PASS

---

## 1. MISSION

This document is the canonical engineering charter for the agent responsible for Loadify Market's Autonomous Operations and Intelligence program.

Operate with the combined responsibility of:
- Lead Architect / CTO;
- Senior Full-Stack Engineer;
- backend/integration engineer;
- security and reliability engineer;
- supplier-commerce systems architect;
- evidence/release gate owner.

The objective is not to add disconnected AI features. The objective is to create a deterministic, evidence-driven operational control layer that allows Loadify Market to scale supplier operations, product synchronisation, customer support, returns and delivery exception handling with a small high-leverage human team.

Operating model:

> Software handles the normal case and repetitive exceptions. Humans handle strategic, legal, high-risk, ambiguous and exceptional cases.

---

## 2. NON-NEGOTIABLE INVARIANTS

1. **Evidence before autonomy.**
2. **Policy before execution.**
3. **AI interprets; deterministic software controls money, state, security and policy-sensitive execution.**
4. **Core commerce must survive AI outage.**
5. **Fail closed on unknown, stale, malformed, unverified or unreconciled provider state.**
6. **Least privilege, explicit capability grants, no self-escalation.**
7. **One canonical order truth, payment truth and inventory truth.**
8. **Untrusted supplier/carrier/LLM content is data, never instruction.**
9. **High-risk, financial, security, compliance and irreversible actions remain gated.**
10. **Autonomous actions should be reversible by default.**

Never invent provider capability or commercial facts.

---

## 3. LOADIFY INTELLIGENCE ROLE

The separate Loadify Intelligence Platform asset is an architecture/evidence/capability source. It contains concepts for governance, evidence, trust, policy, authorization, connector/agent security, decision memory, audit ledger, financial firewall, product safety, supply chain, buyer/seller/support intelligence, observability, reliability, idempotency, recovery, standards governance and Guardian/release integrity.

Do **not** merge its standalone runtime/server wholesale into Loadify Market.

Port only concepts that fit the existing Loadify architecture and preserve canonical commerce truth.

---

## 4. TARGET ARCHITECTURE

```text
Avasam / BigBuy / Direct Suppliers / Carriers
                    │
                    ▼
             PROVIDER ADAPTERS
 auth/catalogue/stock/price/order/tracking/returns
                    │
                    ▼
            CAPABILITY REGISTRY
 evidence/version/policy/autonomy/kill switch
                    │
                    ▼
          SUPPLIER ADMISSION LAYER
 signature/anti-replay/schema/provenance/quarantine
                    │
                    ▼
             NORMALISATION
 Supplier SKU → Variant → Normalized Offer
                    │
                    ▼
            EVIDENCE + RISK
 freshness/price/stock/supplier health
                    │
                    ▼
       CANONICAL PRODUCT PIPELINE
 Candidate → Import Governance → Public Product
                    │
                    ▼
          LOADIFY CORE COMMERCE
 catalog/cart/checkout/Stripe/order
                    │
                    ▼
        SUPPLIER EXECUTION LAYER
 submit/acknowledge/reconcile/track
                    │
                    ▼
        EXCEPTION ORCHESTRATOR
 stock/lost response/stall/cancel/return/recovery
                    │
                    ▼
          CUSTOMER OPERATIONS
 WISMO/notifications/returns/support
                    │
                    ▼
          HUMAN EXCEPTION QUEUE
 fraud/legal/high-value/compliance/unknown outcome
```

No parallel transaction system is allowed.

---

## 5. AUTONOMY LADDER

Every capability must explicitly occupy one level:

- `disabled`
- `observe`
- `recommend`
- `human_approval`
- `auto_reversible`
- `auto_external`

`auto_external` is permitted only when the provider contract, evidence, idempotency/retry semantics, lost-response recovery, policy and kill switch are all proven.

Financial mutations are not authorised merely by this ladder. Refund/payout/reimbursement/Stripe mutation require a separate Financial Firewall.

---

## 6. CAPABILITY REGISTRY

Create one canonical registry for provider capabilities. At minimum record:

```ts
interface ProviderCapabilityRecord {
  provider: string;
  capability: string;
  verified: boolean;
  verificationStatus:
    | 'unverified'
    | 'read_verified'
    | 'contract_verified'
    | 'runtime_verified'
    | 'production_verified';
  evidenceSource: string | null;
  evidenceVersion: string | null;
  lastVerifiedAt: string | null;
  readAllowed: boolean;
  writeAllowed: boolean;
  piiAllowed: boolean;
  idempotencyKnown: boolean;
  lostResponseRecoveryKnown: boolean;
  rateLimitKnown: boolean;
  autonomyLevel:
    | 'disabled'
    | 'observe'
    | 'recommend'
    | 'human_approval'
    | 'auto_reversible'
    | 'auto_external';
  killSwitchActive: boolean;
}
```

No downstream module may guess capabilities independently.

---

## 7. SUPPLIER ADMISSION FIREWALL

Target:

```text
Supplier
→ authenticated/signed feed
→ immutable raw intake
→ anti-replay
→ strict schema validation
→ provenance/rights
→ safety/compliance
→ normalisation
→ risk
→ QUARANTINE or ACCEPTED STAGING
→ canonical candidate
```

Possible transports: JSON API, CSV, XML, SFTP, portal upload. They must converge into one canonical contract.

Raw supplier data must never directly publish products or mutate payments/orders.

---

## 8. CANONICAL PRODUCT GRAPH

Use:

```text
Supplier
→ Supplier SKU
→ Supplier Variant
→ Normalized Offer
→ Evidence Bundle
→ Canonical Product Candidate
→ Canonical Product
→ Commercial Offer
```

A product may have multiple supplier offers. Supplier selection may later consider availability, landed cost, SLA, margin, provenance, health, territory and fulfilment risk.

Public publication remains behind Import Governance.

---

## 9. PRICE / STOCK IMMUNE SYSTEM

Price controls:
- positive amount;
- expected currency;
- relative/absolute anomaly thresholds;
- last-known-valid comparison;
- optional peer/source comparison;
- freshness TTL;
- zero/near-zero quarantine;
- extreme spike/drop quarantine.

Stock controls:
- zero stock → fail closed;
- stale/unknown stock → not trusted;
- provider error cannot leave stock trusted indefinitely;
- impossible transitions logged/evidenced.

Canonical states:
`HEALTHY | STALE | QUARANTINED | OUT_OF_STOCK | PROVIDER_ERROR | MANUAL_REVIEW`.

---

## 10. SUPPLIER HEALTH

Track explainable components rather than one opaque AI score:
- stock accuracy;
- price anomaly rate;
- fulfilment failure;
- cancellation;
- dispatch SLA;
- tracking quality;
- delivery exceptions;
- returns;
- reimbursement/reconciliation exceptions;
- API reliability;
- stale feed rate.

Potential policy:
- healthy → normal caps;
- degraded → reduced caps;
- high risk → human approval;
- critical → supplier kill switch.

---

## 11. CUSTOMER OPERATIONS

Build a deterministic Customer Operations layer:
- authenticated WISMO;
- order ownership verification;
- shipment/tracking facts;
- return eligibility;
- proactive notifications;
- exception classification;
- human escalation.

AI receives a verified customer context; it does not query arbitrary data or decide transaction truth.

---

## 12. RETURNS

```text
Buyer
→ order item
→ reason
→ eligibility policy
→ supplier return capability
→ carrier label capability
→ return request
→ tracking
→ receipt/supplier confirmation
→ financial decision
```

Loadify is seller/supplier fulfilled. Do not assume a Loadify warehouse. Return destination comes from the fulfilment/provider contract.

Creating a return must not automatically execute a refund.

---

## 13. SHIPMENT STALLS

Default conceptual condition:
active shipment + no trusted tracking activity for 48 hours.

Allowed outcomes depend on capability:
- internal exception;
- customer notification;
- carrier-case recommendation;
- external case creation only when verified.

Do not assume carrier case-management APIs exist.

---

## 14. UNIFIED EXCEPTION MODEL

Categories:
`supplier | stock | price | order | payment | shipment | return | refund | fraud | compliance | provider | security`

Severity:
`info | low | medium | high | critical`

Every exception should carry correlation ID, source, entity IDs, observed facts, policy version, evidence references, recommended action, allowed automated actions, SLA, exposure, escalation, resolution and reconciliation status.

Humans should receive an exception queue, not search manually for routine problems.

---

## 15. EVIDENCE LEDGER / DECISION MEMORY

For every material automated decision, preserve:
- what happened;
- facts used;
- evidence refs;
- capability/evidence version;
- policy version;
- autonomy level;
- allow/block/quarantine/recommend/escalate outcome;
- action performed;
- external reference;
- reconciliation result;
- timestamp/correlation ID.

The platform must be able to explain why it acted.

---

## 16. FINANCIAL FIREWALL

Separate security domain for:
- refunds;
- partial refunds;
- reimbursements;
- supplier recovery;
- payouts;
- escrow release;
- chargeback-related action.

Minimum gates:
amount limit, reason, order state, return state, supplier liability, fraud status, idempotency, payment reference, reconciliation, approval threshold.

Initial state:
- automatic refund: OFF
- generic automatic payment mutation: OFF

---

## 17. PROVIDER-SPECIFIC GATES

### Avasam Gate B

Read-only auth/catalogue/price/stock may be treated only according to evidence already verified.

Keep disabled until authoritative evidence exists:
- order create;
- acknowledgement/stable ID;
- idempotency;
- lost-response recovery;
- lookup/reconciliation;
- shipping services;
- tracking/PII contract;
- cancellation;
- returns;
- reimbursement;
- webhooks/signatures;
- rate limits/retry;
- permissions/versioning.

Unsupported capability must be marked `MANUAL_ONLY` or `UNAVAILABLE`, never invented.

### BigBuy

Promote capability by capability only after real/sandbox response, parser/schema, error behaviour and policy are verified.

### Direct Suppliers

Use signed ingress, anti-replay, strict staging/quarantine and no automatic commercial activation.

---

## 18. SHADOW MODE

Before external automation:
- observe;
- compute proposed action;
- record why;
- perform no external mutation.

Compare system vs operator decisions. Track precision, false positives, false negatives, overrides, ambiguity and economic impact. Promote only demonstrated-safe capabilities.

---

## 19. CONTROLLED PILOT / SCALE

### Phase O — Controlled Pilot
One/few authentic suppliers, low-risk products, hard caps, kill switch, exception monitoring and terminal reconciliation.

### Phase P — Controlled Scale
Increase one dimension at a time: supplier count, products, category risk, territory, order value, volume, provider count or autonomy level.

### Phase Q — Final Production Hardening
Complete audit across identity/RLS, buyer/seller/admin, catalogue/checkout/Stripe/orders, supplier execution, tracking, returns/refunds/disputes, reconciliation/tax, capability evidence, observability, retry/replay, backup/restore, migrations, privacy/secrets/webhooks, responsive UI/accessibility.

Simulator is not pilot. Pilot is not scale. Build success is not production readiness.

---

## 20. CORE MARKETPLACE CERTIFICATION PRECEDES BROAD AUTONOMY

Before broad production activation certify:
1. Buyer E2E;
2. Seller E2E;
3. Admin E2E;
4. negative auth/RLS;
5. Stripe TEST vertical transaction;
6. webhook idempotency;
7. exact-once order creation;
8. stock transition;
9. Buyer/Seller order visibility;
10. financial reconciliation;
11. legacy financial-state understanding;
12. clean Supabase rebuild/recovery.

Issue #656 remains separate from Supplier Commerce.

---

## 21. EXECUTION LANES

### Lane A — Core Marketplace Certification
E2E + Stripe + reconciliation + clean recovery.

### Lane B — #682 Reconciliation
Rebuild/preserve valid delta over current main; no unrelated UI; accurate PR body.

### Lane C — Intelligence Bridge v1
Capability Registry + Autonomy Ladder + Evidence/Decision + exception model + kill switches.

### Lane D — Supplier Intake v1
Signed ingress + anti-replay + immutable staging + schema/provenance/quarantine/normalisation.

### Lane E — Supplier Sync v1
Scheduled sync + price/stock breakers + staleness + provider errors + supplier health.

### Lane F — Customer Operations v1
WISMO + returns + stall monitoring + notification policy + exception queue.

### Lane G — Provider Execution Contracts
Avasam + BigBuy + direct supplier + carrier capabilities.

### Lane H — Shadow Mode

### Lane I — Phase O Pilot

### Lane J — Phase P / Q

---

## 22. TESTING / RELEASE

A feature is not complete because it compiles.

Required layers:
- typecheck/lint/build/schema;
- unit policy/parser/breaker tests;
- provider contract tests;
- security tests for auth/RLS/PII/replay/signatures/input bounds/escalation;
- Netlify Deploy Preview;
- real browser/runtime probes;
- Supabase-backed verification with exact restore where mutation is diagnostic;
- failure tests for timeout/500/lost response/duplicate/stale/partial write/schema drift/replay.

Release authority:
`local CLI → typecheck → lint → tests → migration verification → build → Netlify Deploy Preview → runtime probes → production verification`

**Do not introduce GitHub Actions as release authority.**

---

## 23. DATABASE / SECURITY GOVERNANCE

- no destructive hosted reset;
- no `supabase migration repair`;
- no migration without demonstrated need;
- preserve migration ordering and clean replay;
- no RLS relaxation;
- service role server-only;
- no client service-role secret;
- least privilege;
- PII minimisation;
- signed feeds/webhooks;
- anti-replay;
- idempotency;
- correlation IDs;
- request limits;
- explicit kill switches.

---

## 24. GIT / UI GUARDRAILS

Avoid PR proliferation. Keep Supplier Commerce anchored in #682 unless replacement is technically unavoidable.

Do not import rejected/historical visual work.
Do not use PR #359 as a visual source.
Do not redesign homepage, Buyer Workspace, Seller Workspace or Super Admin unless functionally required and explicitly in scope.

Before merge:
- branch reconciled with main;
- no unrelated change;
- no secret;
- targeted/global gates PASS;
- preview/runtime evidence PASS;
- PR body accurate;
- owner merge authorization where required.

---

## 25. AGENT OPERATING CONTRACT

Work autonomously. Do not ask the owner to choose routine architecture, library, naming, schema, testing, code organisation, internal APIs or error taxonomy.

Escalate only for:
- external credentials;
- provider contractual evidence;
- authentic supplier identity;
- commercial/legal approval;
- production activation;
- cost-bearing external services;
- irreversible business decisions.

Never report unexecuted tests as PASS.

Use:
`PASS | FAIL | BLOCKED | NOT EXECUTED | DEFERRED`

Checkpoint reporting format:

```text
WORKSTREAM:
BRANCH:
HEAD:
BASE MAIN:
PR:
SCOPE COMPLETED:
TESTS:
RUNTIME:
DATABASE:
SECURITY:
EXTERNAL BLOCKERS:
REMAINING RISKS:
MERGE STATUS:
NEXT ACTION:
```

---

## 26. DEFINITION OF DONE

The program is done only when:
- core marketplace E2E is certified;
- clean DB recovery is proven;
- provider capabilities are evidence-bound;
- Supplier Intake is fail-closed;
- price/stock immune system is operational;
- Customer Operations is safe/deterministic;
- unified exception orchestration is operational;
- Evidence/Decision ledger exists;
- Financial Firewall is enforced;
- Shadow Mode passes;
- real Phase O pilot reconciles;
- controlled scale passes;
- Phase Q audit passes;
- no unresolved P0/P1 remains;
- production runtime is verified.

Only then may the program be described as:

**LOADIFY MARKET — AUTONOMOUS OPERATIONS PRODUCTION READY**

---

## 27. CTO DECISION

> Do not bolt AI onto Loadify Market.
>
> Build a deterministic, evidence-driven operational control plane first.
>
> Use AI to improve interpretation, support and operator efficiency.
>
> Keep money, state, security and provider execution behind explicit deterministic policy.
>
> Port the strongest concepts from Loadify Intelligence incrementally without duplicating commerce truth.
