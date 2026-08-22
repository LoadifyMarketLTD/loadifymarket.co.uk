# LOADIFY MARKET — IDENTITY, ONBOARDING & WORKSPACES MASTER EXECUTION PLAN

**Date:** 21 August 2026  
**Baseline:** `main@50302455a6c8afcd52da45150f7de6f0ce91d942`  
**Execution model:** plan first → stage implementation → evidence → Branch Guard → ledger update → next stage.

---

## 0. Objective

Build one coherent Loadify identity/onboarding architecture that routes each real commercial relationship into the correct dedicated workspace without creating duplicate commerce systems or confusing Marketplace Sellers with Supplier-Fulfilment partners.

Target high-level flow:

`PUBLIC INTENT → LOADIFY IDENTITY → ROLE/RELATIONSHIP-SPECIFIC ONBOARDING → READINESS/ACTIVATION → DEDICATED WORKSPACE`

Current principal destinations:

- Buyer → Buyer Space;
- Marketplace Seller → Seller Workspace;
- Admin/Operator → Operations/Admin;
- Supplier Partner → controlled qualification / future Supplier Partner surface only when authorised by Supplier Commerce stage;
- Loadify Direct → internal commercial mode, never a public account type.

---

## 1. Permanent invariants

These rules apply to every stage.

### 1.1 Commercial-role separation

`BUYER ≠ MARKETPLACE SELLER ≠ SUPPLIER PARTNER ≠ FULFILMENT PROVIDER ≠ ADMIN/OPERATOR`

`LOADIFY DIRECT` is a commercial mode, not a public user role.

### 1.2 No physical-warehouse assumption

Do not design registration, onboarding or workspaces around a Loadify-owned physical store or warehouse unless a future explicit business decision changes the operating model.

### 1.3 One identity, no unnecessary duplicate accounts

Prefer a future-safe identity model in which one human identity can participate in more than one permitted context without forcing duplicate logins.

Do not implement a schema migration for this principle until Stage 1 proves it is necessary and defines compatibility/security requirements.

### 1.4 No parallel commerce truth

Onboarding/workspace changes consume current canonical:

- auth;
- user/profile ownership;
- product/listing truth;
- orders;
- payments/Stripe;
- Supplier Commerce contracts;
- seller/supplier responsibility boundaries.

Do not create parallel role, order, payout, supplier or product systems to make UI work.

### 1.5 Security is server-enforced

Role/capability access, seller ownership, approval/readiness, sensitive actions and supplier/internal information must be enforced at server/RLS/guard boundaries where required — never UI-only.

### 1.6 No fake readiness

Do not label an account, Stripe connection, seller, supplier, product, store or workspace as ready/verified/live merely because the UI step was visited.

### 1.7 No speculative Supplier Portal

Supplier Commerce is at Controlled Pilot. Build only the supplier external surface that the authorised pilot demonstrably requires.

### 1.8 Homepage isolation

PR #529 stays a separate homepage lane and must not be merged without explicit owner approval.

### 1.9 Operations/Super Admin visual guard

Do not redesign Operations/Super Admin merely for visual consistency during public identity/onboarding work. Any required functional integration must be isolated and justified by a stage acceptance criterion.

---

# STAGE 0 — DOCUMENTED BASELINE + EXECUTION GOVERNANCE

## Purpose

Create the durable repository entry point, factual baseline, master plan and progress ledger before implementation.

## Deliverables

- this folder and README;
- factual current-state baseline;
- master stage plan;
- append-safe progress ledger;
- dedicated docs-only branch/PR.

## Acceptance gate

PASS only when:

- documents exist in repo branch;
- baseline main SHA is recorded;
- current Supplier Commerce phase is recorded;
- legacy vs current truth is distinguished;
- next stage is unambiguous;
- no production/UI implementation is mixed into the docs branch.

---

# STAGE 1 — IDENTITY / ROLE / RELATIONSHIP CONTRACT

## Purpose

Define the target account model before touching registration UI or database schema.

## Mandatory questions to resolve from code + contracts

1. What is the canonical human identity object today?
2. What is the canonical authorisation role today?
3. Which concepts are roles versus business relationships versus commercial modes?
4. Can a buyer safely become a Marketplace Seller without destructive role replacement?
5. What access should an authenticated-but-not-activated seller have?
6. Which readiness states are required before listings, checkout participation and payouts?
7. Which seller approval/verification states are actually canonical now?
8. What is the minimum safe future model for multi-context identity?
9. Is a membership/capability schema migration required now, later, or not at all?
10. What Supplier Partner identity representation exists in Supplier Commerce and how must it remain separate from `users.role = seller`?

## Required artifact

Create:

`03_IDENTITY_ROLE_RELATIONSHIP_CONTRACT.md`

It must contain:

- current model;
- target model;
- state diagram;
- role/capability matrix;
- account transition rules;
- workspace destination rules;
- explicit NOT-A-ROLE list;
- migration/no-migration decision with evidence;
- security/RLS implications;
- compatibility plan for existing users.

## Gate

No Stage 2 implementation until this contract is internally consistent with current auth, RLS, seller ownership, Gate B and current Supplier Commerce state.

Owner input is required only if a genuine unresolved business choice remains after repository/contract evidence is exhausted.

---

# STAGE 2 — PUBLIC ENTRYPOINT & REGISTRATION ARCHITECTURE

## Purpose

Replace the legacy one-form conceptual mixture with intent-specific, professional entry flows while preserving one secure account backend where appropriate.

## Target public entrypoints

### Buyer

`Shop / Create account`

Goal:

- minimal friction;
- identity + email verification;
- buyer profile enrichment later/at checkout where appropriate.

### Marketplace Seller

`Start selling`

Goal:

- create a Marketplace Seller identity/context;
- never label the seller as Supplier-Fulfilment Partner;
- collect only fields needed to establish account and begin seller activation;
- defer longer business/store/payment setup into progressive onboarding.

### Supplier/Commercial Partner

`Partner with Loadify`

For current Controlled Pilot:

- controlled application/contact/qualification path only if needed;
- no public self-service supplier account by default;
- no Supplier Portal implied by a Seller CTA.

## UX requirements

- professional Loadify visual language;
- desktop uses available width rather than a narrow tall legacy form;
- mobile remains single-column and touch-safe;
- progressive disclosure;
- conditional fields by factual account/business type;
- no giant warning banners where concise inline guidance is sufficient;
- no buyer/seller/supplier semantic mixing;
- legal/compliance copy linked to actual policies;
- no invented metrics/social proof.

## Functional requirements

- preserve rate limiting;
- preserve registration feature flags;
- preserve app-metadata authorisation boundary;
- preserve/repair email verification flow;
- duplicate-account handling must remain privacy-safe;
- current users and legacy links must be handled intentionally;
- route aliases/redirects must be explicit and tested.

## Gate

E2E registration PASS for buyer and seller, with no Supplier Commerce control activation and no regression in auth.

---

# STAGE 3 — MARKETPLACE SELLER ACTIVATION / ONBOARDING V2

## Purpose

Evolve the existing `/onboarding` system into a current Loadify Marketplace Seller activation flow rather than creating a disconnected replacement.

## Target conceptual stages

Exact UI grouping may compress these into fewer screens, but the business facts remain distinct:

1. **Seller identity / account type**
   - individual;
   - sole trader;
   - registered company/organisation where supported.

2. **Business/trader details**
   - legal/trading identity;
   - business/contact address;
   - phone;
   - company/VAT data when applicable.

3. **Seller verification/readiness**
   - email verified;
   - platform-required identity/business evidence;
   - risk/manual review where required;
   - clear status, no fake verification.

4. **Store identity**
   - public store name;
   - branding/description as supported;
   - separate legal identity from customer-facing store identity.

5. **Stripe Connect / payouts**
   - real connection status;
   - charges/payouts readiness;
   - no claim that Stripe replaces all platform verification obligations.

6. **Catalogue readiness**
   - first product/draft/canonical listing action as current product contract permits;
   - remove legacy `service listing` wording/seams where factually obsolete.

7. **Activation/readiness summary**
   - clear checklist derived from persisted truth;
   - determine whether activation is automatic or review-gated from actual policy/flags;
   - no `Complete` state before required gates are actually satisfied.

## UX model

Prefer a professional onboarding cockpit:

- compact progress rail/header;
- focused current task;
- status summary / next action;
- responsive two-column use on desktop where appropriate;
- minimal unnecessary scrolling;
- save/resume support based on persisted stage truth.

## Existing code reuse target

Audit and evolve:

`src/pages/onboarding/SellerOnboarding.tsx`

Do not create `SellerOnboardingV2` as an abandoned parallel path unless migration constraints make that unavoidable and the plan explicitly records deprecation/removal.

## Gate

PASS requires:

- persistent resume;
- correct email verification behavior;
- correct seller status/approval behavior;
- correct Stripe readiness behavior;
- no ability to bypass mandatory gates through URL or `Skip`;
- seller is routed to correct workspace state;
- mobile/web parity for business rules.

---

# STAGE 4 — BUYER ONBOARDING ALIGNMENT

## Purpose

Make Buyer account creation intentionally simpler than Seller activation while preserving optional B2B buyer capabilities without forcing them on ordinary buyers.

## Principles

- buyer account does not need seller/business setup;
- shipping/billing address can be captured at checkout/profile when appropriate;
- company/VAT information is an optional buyer-business extension where supported;
- Buyer Space remains separate from Seller Workspace;
- existing buyer can later initiate seller activation through an explicit controlled path if the Stage 1 identity contract permits it.

## Gate

Buyer signup → verify → Buyer Space must be short, deterministic and regression-safe.

---

# STAGE 5 — WORKSPACE DESTINATION & READINESS CONTRACT

## Purpose

Align existing workspace shells with the new onboarding contract without creating one generic mega-workspace.

## Current workspace policy

### Buyer Space

Keep separate.

### Marketplace Seller Workspace

Keep separate and evolve only as needed to consume seller readiness/status correctly.

### Admin / Operations

Keep separate. Functional integration only where required; visual redesign is not implicitly authorised.

### Supplier Partner

Do not reuse Seller Workspace.

If/when a supplier external surface becomes necessary, it must be designed around the Supplier Commerce relationship, not seller retail/store functions.

## Seller Workspace audit questions

- What should a pending/incomplete seller see?
- Can an incomplete seller enter the shell in a restricted mode, or must they stay in onboarding?
- Which nav items must be hidden/disabled versus server-blocked?
- Where are verification, Stripe, store, product and payout readiness shown?
- Does dashboard answer `what needs my action now?`
- Are Products / Orders / Shipments / Returns / Payments semantically aligned with Marketplace Seller responsibilities?
- Are current route guards consistent with activation states?

## Gate

No visual redesign for its own sake. Any workspace change must be traceable to the identity/onboarding/readiness contract and pass functional guardrails.

---

# STAGE 6 — SUPPLIER PARTNER PILOT BOUNDARY

## Purpose

Ensure the new identity system does not accidentally create a Supplier Partner self-service model that conflicts with Controlled Pilot.

## Required decisions

- what minimum external supplier interaction is required for Phase O;
- whether supplier pilot users need any login at all;
- if yes, which capabilities are required;
- which supplier data must remain internal/private;
- how qualification/approval maps to Supplier Commerce canonical entities;
- how supplier credentials/API/feed operations remain separated from Marketplace Seller data;
- what evidence is needed before a broader portal can be justified in Phase P/Q.

## Explicit exclusions

Do not build a broad supplier portal simply because Buyer and Seller have dashboards.

Do not expose:

- supplier API credentials;
- supplier cost/internal margin;
- private risk notes;
- internal purchasing/recovery controls;
- provider secrets.

## Gate

Supplier external surface is `MINIMUM NECESSARY FOR AUTHORISED PILOT` or `NOT REQUIRED`, with evidence.

---

# STAGE 7 — CROSS-PLATFORM AUTH / SECURITY / COMMERCE VALIDATION

## Purpose

Prove that the redesign is not only visually correct.

## Mandatory validation matrix

### Auth

- new buyer;
- new seller;
- existing buyer;
- existing seller;
- email unverified;
- email verified;
- blocked/inactive user;
- logout/login;
- duplicate registration;
- password reset;
- OAuth/social flow if active at execution time.

### Routing

- homepage seller CTA;
- buyer account CTA;
- protected route redirect;
- post-verification redirect;
- onboarding resume;
- onboarding completion;
- pending/restricted seller;
- seller dashboard destination;
- buyer dashboard destination;
- admin isolation.

### Security / data

- RLS/ownership;
- role escalation prevention;
- seller A cannot access seller B data;
- buyer cannot enter seller/admin surfaces;
- supplier/internal data not exposed;
- app metadata/source-of-truth consistency.

### Stripe/payment

- Connect initiation;
- return/refresh;
- details submitted;
- charges/payouts readiness;
- no false ready state;
- no change to Marketplace Seller MoR contract without explicit payment work.

### Web/mobile

- responsive public registration;
- seller onboarding on phone;
- APK/deep-link behavior where relevant;
- same business contract on web/mobile.

### Quality

- TypeScript;
- lint;
- production build;
- relevant unit/integration tests;
- targeted E2E/smoke;
- accessibility keyboard/focus;
- no critical console/runtime errors;
- CI status;
- exact diff Branch Guard.

---

# STAGE 8 — DOCUMENTATION CLOSEOUT & CONTINUITY

## Purpose

Make completed implementation resumable and auditable.

For each completed stage:

1. append progress ledger entry;
2. record tested HEAD and PR;
3. record actual files changed;
4. record tests/evidence;
5. record residual risks/deferred work;
6. mark only genuinely satisfied acceptance criteria PASS;
7. state exact next stage.

At major architecture decisions, add/update durable contract documents rather than leaving the reasoning only in chat or PR comments.

---

## 2. Branch / PR discipline

Recommended execution pattern:

- documentation contract changes: isolated docs branch/PR;
- registration implementation: dedicated implementation branch/PR;
- seller onboarding implementation: dedicated branch/PR unless safely atomic with registration by evidence;
- workspace functional alignment: separate PR if diff becomes broad;
- Supplier Partner pilot surface: separate Supplier Commerce-aligned PR only when authorised.

Do not let #529 become a catch-all PR for auth/onboarding/workspace architecture.

---

## 3. Stage update template

Every closed stage appends this template to the ledger:

```md
## YYYY-MM-DD HH:MM — STAGE X — <NAME>

Status: PASS | FAIL | HOLD | PARTIAL — NEVER use PASS for partial evidence.

Baseline/main before work:
Branch:
PR:
Tested HEAD:

Implemented:
- ...

Exact changed surfaces:
- ...

Evidence:
- TypeScript: PASS/FAIL/N/A
- Lint: PASS/FAIL/N/A
- Build: PASS/FAIL/N/A
- Targeted tests: ...
- E2E: ...
- Branch Guard: ...

No-change assertions:
- Supplier Commerce live controls: unchanged
- PR #529 merge state: unchanged
- Operations/Super Admin visual: unchanged unless explicitly in stage

Residual risks / deferred:
- ...

Exact resume point:
- ...
```

---

## 4. Definition of success

This workstream is complete only when a new visitor can enter Loadify through the correct intent, create/verify one secure identity, complete only the onboarding relevant to their factual commercial relationship, and arrive in the correct dedicated workspace without role confusion, fake readiness, duplicated commerce truth or hidden security bypasses.

The finished experience should make the platform feel simpler to the user precisely because the underlying commercial distinctions remain explicit and well controlled.
