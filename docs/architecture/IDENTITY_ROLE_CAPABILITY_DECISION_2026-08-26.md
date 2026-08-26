# Loadify Market — Identity, Role, Capability and Relationship Decision

**Date:** 26 August 2026  
**Status:** Architecture decision / controlling guidance  
**Scope:** account identity, public signup, Buyer/Seller coexistence, Admin authority, Supplier separation, future internal permissions, workspace routing, and social registration invariants.

---

## 1. Executive decision

Loadify must **not** be designed as a simple mutually exclusive three-box role system.

The correct long-term model is:

`ONE AUTH IDENTITY → LOADIFY ACCOUNT CONTROL → COMMERCE CAPABILITIES / BUSINESS RELATIONSHIPS → READINESS / LIFECYCLE → DEDICATED WORKSPACE`

The technical `UserRole` compatibility values remain exactly:

- `buyer`
- `seller`
- `admin`

No additional public `UserRole` values should be introduced for Supplier, Fulfilment Provider, Support, Finance, Compliance, Loadify Direct, or other platform functions.

However, these three values are **not the complete business authorization model**. Buyer and Seller are ordinary commerce capabilities that may coexist on the same normal account. Admin is a privileged system role and remains isolated.

This decision is aligned with the existing repository identity contract and the existing additive `account_capabilities` architecture.

---

## 2. Public signup model

Public registration exposes only two choices:

1. **Buyer — I want to buy**
2. **Marketplace Seller — I want to sell**

The public registration surface must never expose:

- Admin
- Supplier Partner
- Fulfilment Provider
- Platform Staff
- Support
- Finance
- Compliance
- Operations
- Loadify Direct
- Supplier-Fulfilled
- internal system modes

### Required registration invariant

Every new public user must choose the intended account journey before account creation.

For all authentication methods:

`Choose Buyer/Seller → authenticate/register → server validates authorization → create Loadify account → grant correct capabilities → route to correct workspace`

No authentication provider may silently assign Buyer because no explicit role was supplied.

---

## 3. Buyer

Buyer is an ordinary commerce capability.

A new Buyer receives:

- one Supabase Auth identity;
- one Loadify account row;
- Buyer capability;
- Buyer profile/data as required;
- Buyer Space access subject to normal active-account and verification rules.

Typical Buyer responsibilities/capabilities include:

- shopping;
- favourites/wishlist;
- cart;
- orders and purchase history;
- delivery/tracking information;
- returns/refunds/disputes;
- reviews;
- addresses;
- payment methods;
- messages;
- account/security.

Buyer is not an internal privilege and must not be represented by user-editable authorization metadata.

---

## 4. Marketplace Seller

Marketplace Seller is **not merely a mutually exclusive replacement for Buyer**.

It is:

- a server-governed Seller commerce capability;
- a Marketplace Seller business relationship;
- a Seller profile/store relationship;
- a lifecycle/readiness process;
- access to a dedicated Seller onboarding/workspace when readiness allows it.

### New Seller account

A new Seller receives, under the same identity:

- Buyer capability;
- Seller capability;
- Seller profile;
- Seller store relationship;
- initial Seller lifecycle state such as `draft`;
- Seller onboarding destination.

A Seller therefore remains able to act as a Buyer under the same identity.

This is intentional. A user must not need two Loadify logins simply because they both buy and sell.

### Existing Buyer starts selling

Do not replace/delete Buyer identity or Buyer history.

The trusted Seller activation boundary must:

1. authenticate an active normal account;
2. reject Admin self-service;
3. preserve Buyer capability;
4. grant Seller capability idempotently;
5. initialise Seller profile/store safely if absent;
6. preserve any existing Seller lifecycle state;
7. route the user to Seller onboarding;
8. never imply Seller readiness merely because Seller capability exists.

---

## 5. Seller lifecycle/readiness is separate from role/capability

Canonical Seller lifecycle remains conceptually:

`draft → submitted → active → suspended`

Seller capability means only:

> this active Loadify account has entered the Marketplace Seller relationship.

It does **not** automatically mean:

- verified;
- approved;
- payout ready;
- Stripe ready;
- allowed to publish;
- allowed to receive orders;
- full Seller Workspace ready.

Full Seller Workspace remains fail-closed and must require the canonical Seller readiness conditions, including the relevant active-account, Seller status, compliance, payment/payout and action-level controls.

A Seller suspension may block Seller activity while preserving Buyer access when the overall Loadify account remains active. Whole-account suspension remains a stronger separate control.

---

## 6. Admin

Admin remains an actual privileged system role.

Admin must:

- remain server-controlled;
- never appear in public signup;
- never be selected through Google/Facebook/email signup;
- never be granted from client-controlled `user_metadata`;
- never be granted through Seller activation;
- require authoritative database-backed authorization;
- remain isolated from normal Buyer/Seller self-service capability grants.

Public signup must never be able to create or promote an Admin account.

---

## 7. Supplier Partner and Fulfilment Provider

Supplier Partner / Fulfilment Provider are **commercial organisation relationships**, not normal marketplace account roles.

Do not add:

`users.role = 'supplier'`

and do not add `supplier` to `UserRole` or ordinary Buyer/Seller `account_capabilities`.

Supplier Commerce remains governed by its own canonical supplier identity, qualification, lifecycle, evidence, SLA, integration and control model.

If Loadify later requires external Supplier users to log in, use an organisation-membership model, conceptually for example:

`Supplier organisation ↔ supplier membership ↔ Loadify user identity`

with fields such as:

- `user_id`;
- `supplier_id`;
- `organisation_role`;
- scoped permissions;
- invitation/activation state;
- revocation/suspension state.

Such membership must not automatically grant Marketplace Seller capability.

A Supplier Portal, if ever authorised, receives its own workspace/guard and must not reuse Buyer/Seller role switching.

---

## 8. Loadify Direct, Supplier-Fulfilled and other commercial modes

The following are commercial/operational modes, not public user roles:

- Loadify Direct;
- Loadify Supplier-Fulfilled;
- internal fulfilment modes;
- Loadify Intelligence;
- provider integrations such as Avasam.

They describe how Loadify sources, fulfils, operates or analyses commerce. They must not appear as selectable account roles.

---

## 9. Future internal staff permissions

Do not expand `UserRole` into a long list such as:

- support;
- finance;
- compliance;
- moderator;
- catalogue manager;
- operations;
- risk;
- customer service.

When staff delegation is genuinely required, use an internal permission model under an authorised staff/Admin boundary.

Conceptually:

- `support.read`
- `orders.manage`
- `sellers.review`
- `compliance.review`
- `refunds.manage`
- `finance.read`
- `supplier.manage`
- other tightly scoped permissions as required.

This allows least-privilege access without inventing many global roles.

Do not implement this staff permission layer as part of the current Auth signup PR unless separately authorised. It is a future internal-access workstream.

---

## 10. Seller legal structure is not a role

Seller legal/business type must remain separate from Seller capability.

Examples include:

- individual;
- sole trader;
- registered company/company.

These are Seller profile/legal relationship attributes and may drive verification, tax, compliance or payout requirements. They must never become top-level `UserRole` values.

---

## 11. Workspace model

Keep dedicated workspaces. Do not create one giant role-based mega-workspace.

### Buyer Space

Eligibility is based on:

- active Loadify account;
- Buyer capability;
- applicable verification/action rules.

### Seller onboarding

Eligibility is based on:

- active account;
- Seller capability;
- Seller relationship/profile;
- lifecycle/readiness state.

### Full Seller Workspace

Eligibility remains fail-closed and requires active Seller readiness, not merely Seller capability.

### Multi-capability account

An account with Buyer + Seller capability has:

- one login;
- one identity;
- Buyer Space available;
- Seller onboarding/workspace available according to lifecycle;
- no capability rewrite when switching workspaces.

Workspace selection is navigation/context, not authorization mutation.

### Admin/Operations

Admin uses its own privileged internal surface and does not participate in public Buyer/Seller signup selection.

### Supplier workspace

No Supplier workspace should be implied merely because a supplier entity exists. A future Supplier workspace requires an explicit supplier organisation membership architecture and separate authorization.

---

## 12. Authorization model

The authoritative model is additive and server-governed.

Ordinary commerce capabilities are conceptually:

- `buyer`
- `seller`

They may coexist.

Capability grants/revocations must happen only through trusted server/database boundaries.

Never use these shortcuts as authorization:

- client-editable role metadata;
- seller profile existence alone;
- merely visiting a Seller page;
- OAuth provider alone;
- UI selection without server validation.

Account suspension remains authoritative across private account access.

Seller readiness remains an additional independent requirement for Seller operations.

Transaction ownership remains important even when one identity has both Buyer and Seller capability: e.g. `buyerId` and `sellerId` continue to distinguish commerce sides.

The Buyer+Seller coexistence migration must preserve or enforce any self-purchase prohibition required by marketplace policy.

---

## 13. Authentication and social registration invariant

The current Auth workstream must implement the same architecture for every authentication method.

### Existing social user

Existing Google/Facebook identity:

- may sign in directly;
- preserves existing Loadify capabilities/relationship;
- does not choose account type again;
- does not have its role/capability replaced by provider metadata.

### Fresh social registration

Fresh Google/Facebook registration must be:

`Choose Buyer/Seller → establish verified provider identity → bind registration authorization to that verified identity → create account → grant correct capabilities`

No fresh social account may default silently to Buyer.

A fresh social registration without valid server-owned registration authorization must fail closed.

### Buyer via social registration

Result:

- Buyer capability;
- Buyer journey/workspace.

### Seller via social registration

Result:

- Buyer capability;
- Seller capability;
- Seller relationship/profile/store initialisation;
- Seller lifecycle starts safely, normally `draft`;
- route to Seller onboarding.

Admin/Supplier/Fulfilment roles/relationships must never be created through public social signup.

---

## 14. Compatibility `UserRole`

For the current migration period, preserve:

`buyer | seller | admin`

in `UserRole` / `public.users.role` for compatibility and default routing.

Interpretation:

- `admin` remains a real privileged system role;
- `buyer` and `seller` are compatibility/default commerce contexts, not the complete entitlement set;
- actual ordinary Buyer/Seller authorization is moving to server-governed capabilities.

Do not bundle a destructive rewrite/rename of `users.role` into the current Auth workstream.

A later migration may introduce an explicit primary/default workspace context if needed.

---

## 15. Legacy `MarketplaceRole` anomaly

The repository still contains a TypeScript concept similar to:

`MarketplaceRole = 'carrier' | 'broker' | 'seller' | null`

This terminology does not match the current Loadify Market identity architecture and may be legacy/logistics-derived.

Decision:

- do **not** promote `carrier` or `broker` into Loadify `UserRole`;
- audit all remaining consumers;
- classify them as legitimate marketplace metadata, legacy compatibility or dead code;
- deprecate/remove safely only after usage is proven.

This is an audit item, not an automatic deletion instruction.

---

## 16. Final role/capability/relationship matrix

| Concept | Classification | Public signup option? | Can coexist? | Authority |
|---|---|---:|---:|---|
| Buyer | Commerce capability | Yes | Yes, with Seller | Server-governed |
| Marketplace Seller | Capability + business relationship | Yes | Yes, with Buyer | Server-governed |
| Admin | Privileged system role | No | Isolated | Internal/DB-authoritative |
| Seller legal type | Profile/legal attribute | Selected only inside Seller journey | N/A | Validated Seller data |
| Supplier Partner | Supplier organisation relationship | No | Separate | Supplier Commerce controls |
| Fulfilment Provider | Commercial relationship | No | Separate | Supplier/operations controls |
| Loadify Direct | Internal commercial mode | No | N/A | Internal |
| Supplier-Fulfilled | Fulfilment mode | No | N/A | Internal/integration controlled |
| Loadify Intelligence | Platform subsystem | No | N/A | Internal/integration controlled |
| Support / Finance / Compliance / Operations | Future scoped internal permissions | No | Multiple permissions possible | Internal privileged boundary |

---

## 17. Binding implementation rules

1. Keep public `UserRole` values exactly `buyer | seller | admin` during the current migration.
2. Public signup shows only Buyer and Marketplace Seller.
3. Seller gets both Buyer and Seller capabilities.
4. Buyer may later start Seller activation without losing Buyer history/capability.
5. Admin is never self-service.
6. Supplier/Fulfilment are never added to ordinary `UserRole`.
7. Seller legal type remains separate from Seller capability.
8. Seller capability never bypasses Seller lifecycle/readiness.
9. Workspace switching never rewrites authorization.
10. Client-controlled metadata is never an authorization source.
11. Fresh Google/Facebook registration must preserve the Buyer/Seller choice made before authentication and fail closed if that authorization cannot be proven.
12. Existing social users keep their existing Loadify relationship and sign in normally.
13. Do not add Staff/Support/Finance/etc. as global public roles; use scoped internal permissions when required.
14. Audit legacy `MarketplaceRole` carrier/broker usage before deprecation; do not promote it.
15. Supplier Commerce remains separate from Marketplace Seller identity and authorization.

---

## 18. Relationship to existing repository contract

This document does not replace the detailed canonical identity/onboarding contract already present under:

`docs/identity-onboarding-workspaces-2026-08-21/03_IDENTITY_ROLE_RELATIONSHIP_CONTRACT.md`

It records the 26 August 2026 architecture decision in a compact, implementation-oriented form and must be read consistently with that controlling contract and the existing `account_capabilities` migrations.

Where implementation differs from these invariants, treat the difference as an audit finding requiring explicit review rather than silently redefining the model.

---

## 19. Current Auth PR implication

PR #596 must not be considered complete merely because fresh generic OAuth creation is blocked.

Its final social registration objective is:

**Buyer/Seller selection first → verified Google/Facebook identity → server-owned registration authorization → correct capability provisioning → correct workspace.**

Until fresh social registration satisfies that invariant securely, social signup remains incomplete even if containment tests are PASS.

No production Supabase/Auth activation should be inferred from this documentation PR.
