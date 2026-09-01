# Loadify Command Center — Preparation Specification

Date: 2026-09-01
Status: PREPARATION ONLY / FAIL-CLOSED / NO RUNTIME ACTIVATION
Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
Preparation branch: `docs/loadify-command-center-preparation-20260901`
Base at creation: `main@26244a349a4c1ae521c7cc8dde1e1619de1ecda0`

## 1. Purpose

Define the canonical preparation contract for the future Loadify Market Super Admin control plane, working title **Loadify Command Center**.

This document is intentionally non-invasive. It does not activate provider writes, financial mutations, automatic refunds, customer PII disclosure, autonomous supplier publication, hosted Supabase changes, or production runtime behavior.

## 2. Non-negotiable safety boundary

The future control center MUST remain fail-closed.

- `main` is not modified by this preparation branch.
- No hosted Supabase schema/data mutation is part of preparation.
- No production Netlify environment mutation is part of preparation.
- No Stripe write or payment mutation is part of preparation.
- No automatic refund execution.
- No supplier order submission merely because a UI control exists.
- No customer PII disclosure without an explicit, separately verified capability grant.
- No automatic supplier-feed marketplace publication from unverified or quarantined data.
- No capability promotion from provider name, documentation snippets, historical behavior, or UI state alone.
- Every privileged server action must re-establish current account state and authorization server-side.
- User-editable `user_metadata.role` MUST NOT be treated as authorization truth.
- RLS, service-role boundaries, and security-definer functions must never be weakened to simplify the UI.

## 3. Identity / authorization direction

The repository currently uses `buyer | seller | admin` as the public role contract. The Command Center must not casually add `super_admin` to that role enum.

Preferred model:

- Keep the operator account as `admin` in `public.users.role`.
- Add a server-governed owner/control-plane authorization grant only if required by the final design.
- The privileged grant must not be writable by ordinary clients.
- The browser route guard is defense-in-depth only; server functions/RPCs remain authoritative.
- Any future `/admin/control-center` route must fail closed if owner-level authorization cannot be positively established.

Possible implementation shapes to evaluate before code:

1. dedicated `platform_admin_grants` / `control_plane_grants` table with RLS denying client mutation;
2. server-controlled auth `app_metadata` claim backed by current DB verification;
3. explicit server-side allowlist linked to an active `admin` identity;
4. another repo-native capability mechanism only if it preserves the existing three-role contract and is demonstrably non-escalatable.

No option is approved solely by this document. The least invasive secure option must be selected after schema/runtime reconciliation.

## 4. Canonical module structure

The target Command Center contains five primary modules.

### Module 1 — Overview & System Health

Purpose: give the platform owner a trustworthy operational picture without requiring shell access or manual database inspection for routine checks.

Target surfaces:

- production / deploy-preview health;
- release-gate state;
- migration-health result;
- Supabase RLS/security/advisor summary;
- critical RPC/function availability;
- Google GSI runtime probe status;
- Stripe webhook health / failed event count;
- provider adapter health;
- autonomous policy state;
- unresolved critical incidents;
- last known evidence timestamp for every displayed status.

Rules:

- UI must distinguish `PASS`, `FAIL`, `DEGRADED`, `UNKNOWN`, and `NOT EXECUTED`.
- `UNKNOWN` or missing evidence must never be displayed as healthy.
- Historical test results must display their timestamp and source/evidence reference.
- A green card must mean a verified current result, not the existence of code that could run a check.

### Module 2 — Vendor Feeds & Quarantine

Purpose: make supplier data ingestion observable and controllable before marketplace exposure.

Target surfaces:

- Avasam, BigBuy, Direct Supplier and future providers;
- provider capability state;
- latest feed/sync batch;
- item counts accepted / rejected / quarantined;
- schema validation failures;
- missing/invalid price;
- stock anomalies;
- invalid media / malformed attributes;
- duplicate or stale supplier records;
- provider and supplier circuit-breaker state;
- incident history and evidence.

Target controls:

- inspect quarantine record;
- acknowledge / classify exception;
- request revalidation;
- activate provider or supplier kill switch;
- release only after validation criteria pass;
- never provide a bulk "publish anyway" path that bypasses validation.

Circuit breaker rules:

- state must originate from server truth;
- activation requires actor, reason, severity and audit evidence;
- deactivation must require recovery evidence and authorization;
- UI color is presentation only and never the source of truth.

### Module 3 — Financial Ledger & Stripe Oversight

Purpose: reconcile commerce truth across order, payment, platform fee, transfer, payout, refund and reversal lifecycle.

Target surfaces:

- total captured payments;
- pending / failed / processed Stripe events;
- order-to-payment linkage;
- platform fee / commission snapshot;
- seller/supplier payable amount;
- Connect transfer state;
- payout state;
- refunds and transfer reversals;
- reconciliation mismatches;
- duplicate-prevention/idempotency evidence;
- orders paid but commercially blocked or missing required downstream confirmation.

Rules:

- do not rewrite historical commercial snapshots to "fix" mismatches;
- corrections are explicit ledger/audit events;
- no automatic payment mutation from a monitoring screen;
- no automatic refund execution unless a separately approved future policy explicitly enables it and all financial safety gates pass;
- all amounts must identify currency and source-of-truth record.

### Module 4 — Logistics & Exceptions

Purpose: surface shipment, return and carrier problems before customers need to raise support requests manually.

Target surfaces:

- shipments by current status;
- latest tracking event and age;
- stalled shipment detection;
- carrier/provider context;
- returns state;
- unresolved delivery exceptions;
- customer notification recommendation;
- carrier-case recommendation/status;
- incident/evidence history.

Default stall policy target:

- a non-terminal shipment with no fresh tracking activity for 48 hours is a stall candidate;
- terminal states are excluded;
- missing tracking timestamps are treated as an exception, not as healthy;
- detection and external mutation are separate capabilities;
- automatic carrier ticket creation remains OFF until the relevant carrier capability is explicitly verified for external mutation.

### Module 5 — Autonomous Operations & Intelligence

Purpose: expose the safe decision layer behind Loadify automation rather than hiding autonomous state in code/configuration.

This module must reconcile with the work in PR #682 rather than creating a parallel autonomy framework.

Target surfaces:

- Provider Capability Registry;
- capability verification state;
- Autonomy Ladder level;
- read permission;
- external-write permission;
- PII permission;
- kill-switch state and reasons;
- Evidence / Decision Ledger;
- unified exception queue;
- human-approval queue;
- autonomous execution policy state;
- last verified evidence time / expiry;
- provider-specific blockers.

Required behavior:

- missing capability => unavailable;
- unverified capability => unavailable;
- active kill switch => external mutation denied;
- verified read capability does not imply write capability;
- write capability does not imply PII permission;
- financial mutation remains separately governed and must not be inferred from generic external-write capability.

## 5. Existing repository surfaces to reuse

The Command Center must reuse and reconcile existing contracts rather than duplicate them.

Current/main areas to integrate include:

- `src/components/auth/RequireAdmin.tsx`;
- `src/lib/roleUtils.ts`;
- `src/pages/pixel-perfect/admin/AdminShell.tsx`;
- existing `/admin/*` pages, including payouts and Stripe events;
- `netlify/functions/_shared/activeAccountAuth.ts`;
- `netlify/functions/admin-supplier-control-centre.ts`;
- supplier control-centre RPC contracts;
- Stripe webhook / payout / transfer / refund / reversal infrastructure;
- migration-health and release-gate tooling;
- role-isolation E2E coverage.

PR #682 areas to reconcile when stable include:

- `autonomousOperationsFoundation`;
- `autonomousCapabilityRegistry`;
- `autonomousDecisionEvidence`;
- `autonomousExceptionModel`;
- `autonomousKillSwitch`;
- supplier feed circuit breakers;
- shipment stall automation;
- autonomous supplier-commerce policy;
- customer order support and return eligibility automation.

## 6. Proposed route architecture

Target route:

`/admin/control-center`

Preferred approach:

- keep it inside the existing Admin shell for navigation/session consistency;
- add a stronger owner/control-plane guard around only this route;
- ordinary `admin` users may continue using the normal Admin Hub without automatically inheriting Command Center authority;
- no duplicate standalone login/authentication implementation.

Potential child routes after the first stable implementation:

- `/admin/control-center/health`
- `/admin/control-center/vendor-feeds`
- `/admin/control-center/financial`
- `/admin/control-center/logistics`
- `/admin/control-center/autonomy`

The first implementation may use tabs/sections under one route if that reduces risk. Route decomposition is not a requirement until data contracts are stable.

## 7. Data access boundary

Preferred architecture:

Browser UI
→ authenticated Netlify admin/control-plane function
→ current active-account + owner authorization check
→ narrow RPC/read model
→ private operational tables / source commerce tables

Avoid:

Browser UI
→ direct broad service-role-like access

Avoid creating new broad client SELECT policies merely to populate dashboards. When private operational truth should remain private, expose a bounded server/RPC read model.

## 8. Read models before mutation controls

Implementation sequence must be read-first.

Phase A — Observability only

- health summary;
- feed/quarantine summary;
- financial reconciliation summary;
- logistics exception summary;
- autonomy/capability/kill-switch summary;
- evidence timestamps and unknown-state handling.

Phase B — Manual bounded controls

Only after Phase A is validated:

- provider/supplier kill switch;
- incident transitions;
- quarantine review transitions;
- SLA/exception transitions;
- human-approval decisions.

Phase C — External actions

Remain OFF unless provider-specific capability gates are verified independently.

Examples:

- carrier case creation;
- supplier order submission;
- cancellation/return calls;
- customer PII disclosure;
- supplier feed publication;
- any payment/refund mutation.

## 9. Audit / evidence requirements

Every privileged mutation must record at minimum:

- actor ID;
- action type;
- target type / target ID;
- requested state;
- previous state where meaningful;
- reason;
- evidence reference / structured evidence;
- timestamp;
- result;
- idempotency key where applicable;
- correlation/request ID where applicable.

The audit ledger must be append-oriented. User-facing correction workflows must not silently erase prior decisions.

## 10. UI state model

Do not reduce operational truth to red/green.

Canonical display states:

- HEALTHY / PASS
- DEGRADED
- BLOCKED
- FAIL
- UNKNOWN
- NOT EXECUTED
- MANUAL ONLY
- KILL-SWITCHED
- UNVERIFIED

Every status component should expose:

- state;
- plain-language explanation;
- last evidence timestamp;
- source/evidence reference;
- permitted next action;
- whether the next action is read-only, internal mutation, or external mutation.

## 11. Initial acceptance criteria

The first real Command Center implementation is not considered complete merely because the page renders.

Minimum acceptance gates:

1. unauthorized guest cannot enter;
2. buyer cannot enter;
3. seller cannot enter;
4. ordinary admin without owner/control-plane grant cannot enter if a separate grant is adopted;
5. authorized owner/admin can enter;
6. route guard and server guard agree;
7. no `user_metadata` escalation path;
8. private operational truth is not made broadly client-readable;
9. all five modules render from real bounded data contracts or explicitly show UNKNOWN/NOT EXECUTED;
10. circuit-breaker state comes from server truth;
11. no financial mutation is exposed in Phase A;
12. no external supplier/carrier mutation is exposed in Phase A;
13. every manual mutation in Phase B is audited;
14. production build/typecheck/lint/targeted tests pass on the actual implementation branch;
15. role-isolation E2E is extended for `/admin/control-center`;
16. Deploy Preview is inspected before merge;
17. hosted Supabase changes, if eventually required, are migrated/replayed/validated separately and never inferred from local SQL presence.

## 12. Work that is safe to do in parallel now

The following preparation work can continue while PR #682 evolves, because it does not depend on activating its runtime:

- canonical module inventory;
- dependency map from UI cards to existing tables/RPCs/functions;
- read-model/API contract design;
- owner/control-plane authorization design comparison;
- status vocabulary / UX truth model;
- audit-event contract;
- test matrix;
- route-isolation acceptance tests design;
- reconciliation map for Admin Payouts / Stripe Events / Supplier Control Centre;
- gap ledger identifying which fields exist today vs require new server read models;
- wireframe/component hierarchy without live data writes;
- threat model for privilege escalation and service-role boundaries.

## 13. Explicitly deferred work

Do not do these until dependent runtime truth is stable and separately approved:

- merging this preparation directly into `main`;
- adding a new public `super_admin` role;
- creating hosted production tables merely to support mock UI;
- enabling automatic supplier writes;
- enabling automatic refunds;
- enabling automatic payment mutations;
- enabling automatic PII disclosure;
- bulk publishing quarantined supplier records;
- changing Stripe commercial behavior;
- changing production schedules for autonomous functions.

## 14. Immediate next safe preparation steps

1. Build a dependency matrix for every Command Center widget/metric.
2. Classify each data source as: existing client-safe read, existing privileged RPC/function, new bounded read model required, or unavailable/unverified.
3. Produce the owner/control-plane authorization decision record.
4. Produce the mutation-risk matrix: read-only / internal audited mutation / external mutation / financial mutation / PII disclosure.
5. Reconcile PR #682 capability names with the five-module UI taxonomy after #682 stabilizes.
6. Only then scaffold the UI on a preview-only implementation branch.

## 15. Definition of "safe progress"

Safe progress means we reduce implementation uncertainty without changing production behavior.

A preparation commit is safe only if it cannot:

- grant a new production privilege;
- make private data publicly readable;
- send money;
- refund money;
- submit an external order;
- disclose customer PII;
- publish supplier products;
- alter production scheduling;
- weaken RLS/security;
- change live hosted data.

This document itself satisfies that boundary.