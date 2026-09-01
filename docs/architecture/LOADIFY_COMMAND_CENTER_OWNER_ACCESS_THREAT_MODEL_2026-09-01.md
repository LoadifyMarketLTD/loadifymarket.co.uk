# Loadify Command Center — Owner Access & Threat Model

Date: 2026-09-01
Status: DESIGN TARGET / preparation only

This document defines the security boundary for a future Loadify Command Center at `/admin/control-center` without changing the existing buyer/seller/admin identity contract or trusting client-editable metadata.

## 1. Security objective

The Command Center is intended to expose unusually sensitive operational capabilities:

- supplier/provider kill switches;
- feed quarantine and governance;
- system-health evidence;
- payment/reconciliation exceptions;
- autonomous-operation state;
- potentially destructive or financially sensitive controls in later phases.

Normal Admin access alone must not automatically imply unrestricted owner/control-plane authority if the platform later supports multiple administrators.

## 2. Existing authority model that must be preserved

Current platform truth:

- Supabase Auth proves the authenticated identity.
- `public.users` is authoritative for the platform account role/activity state.
- `RequireAdmin` gates Admin UI routes.
- privileged Netlify functions using service-role access re-read the active platform account server-side.
- user-editable Auth metadata is not an acceptable source of Admin elevation.

Therefore the Command Center must not use:

```ts
user.user_metadata?.role === 'super_admin'
```

as an authorization boundary.

## 3. Recommended owner-control capability model

Do not add `super_admin` directly to ordinary `users.role` merely to expose this page.

Preferred architecture:

- keep the existing account role as `admin`;
- introduce a separate server-governed privileged-control grant for the platform owner/control-plane operator;
- grant is non-self-service;
- grant cannot be created, edited or revoked by ordinary authenticated clients;
- every sensitive server action independently checks the grant;
- UI visibility is convenience only, never the security boundary.

Illustrative conceptual capability name:

`platform_owner_control`

The final storage name/schema must be chosen only after migration/RLS review.

## 4. Required grant properties

A production-grade privileged grant should support at least:

- `user_id` / actor identity;
- capability identifier;
- active/revoked state;
- granted_at;
- granted_by or bootstrap provenance;
- revoked_at;
- optional expiry;
- reason/change ticket;
- immutable audit evidence for changes.

Optional later hardening:

- environment scope (production/staging);
- action family scopes;
- step-up authentication timestamp;
- emergency/break-glass mode;
- dual approval for selected financial actions.

## 5. Authorization tiers

### Tier A — Admin read

Normal active Admin may retain existing Admin Hub access.

### Tier B — Control Center read

Owner/control-plane grant required for `/admin/control-center` read models if the exposed information is considered owner-only.

### Tier C — Internal reversible action

Examples:

- acknowledge exception;
- change internal incident state;
- mark evidence reviewed.

Requirements:

- owner grant;
- current active account check;
- audited actor/reason;
- idempotent server boundary.

### Tier D — External operational mutation

Examples:

- supplier/provider API write;
- carrier case creation;
- external feed activation.

Requirements:

- owner grant;
- verified provider capability;
- autonomous/operation policy permits write;
- idempotency;
- lost-response recovery;
- kill switch inactive;
- evidence current;
- explicit audit entry.

### Tier E — PII disclosure

Requires all external-write conditions plus explicit PII permission and minimization rules.

### Tier F — financial mutation

Examples:

- refund;
- transfer/reversal;
- payout execution;
- payment capture/adjustment.

Initial Command Center status: DISABLED.

Later enabling requires a separate financial safety design and cannot inherit permission merely from `platform_owner_control`.

## 6. Threat: client-side role spoofing

### Attack

A user changes browser state, local storage or Auth user metadata and attempts to appear as Super Admin.

### Control

- never authorize from client state;
- server re-reads active account;
- server checks privileged grant;
- service-role functions enforce authorization before protected reads/writes.

## 7. Threat: stale session after privilege revocation

### Attack

Owner/admin privilege is revoked while a previously issued access token remains valid.

### Control

- privileged functions re-read current grant and current `public.users.isActive` on every sensitive request;
- no trust in stale client profile cache;
- revoked grant takes effect immediately at application authority layer.

## 8. Threat: ordinary Admin escalates to owner

### Attack

An Admin uses normal Admin CRUD or a writable table/API to assign the owner-control capability.

### Control

- grant table not writable by normal authenticated clients;
- no ordinary Admin RPC to grant owner capability;
- grant management is service-only / tightly governed;
- owner-grant change emits immutable audit evidence;
- migration tests assert no authenticated INSERT/UPDATE/DELETE path.

## 9. Threat: direct browser access to private supplier data

### Attack

Command Center UI queries private staging/quarantine tables directly or exposes raw supplier secrets.

### Control

- browser never receives direct access to `private.*` tables;
- sanitized server projection only;
- no secrets/tokens/credentials in response;
- existing secret-pattern rejection remains preserved on supplier governance inputs;
- minimize raw supplier payload exposure.

## 10. Threat: destructive button bypasses policy engine

### Attack

A Command Center button directly invokes Stripe/provider/carrier mutation without the capability/autonomy/kill-switch boundary.

### Control

UI buttons never encode authorization themselves. Every mutation uses a canonical server action that checks:

1. active account;
2. owner/control capability;
3. action-specific policy;
4. provider capability evidence if external;
5. kill switch;
6. idempotency;
7. audit/evidence requirements.

## 11. Threat: stale health evidence shown as green

### Attack

A previously successful CI/runtime probe remains visible as PASS after the evidence is no longer current.

### Control

Every health signal must carry `checked_at` and freshness/TTL.

Expired evidence becomes `STALE`, `UNKNOWN` or `WARN`, never remains green purely from historical PASS.

## 12. Threat: replay / duplicate mutation

### Attack

Network retries or operator double-clicks cause duplicate external operations or money movement.

### Control

- deterministic idempotency keys for mutation classes;
- stored operation identity;
- recover existing external result after lost response;
- reject conflicting duplicate state;
- financial operations remain disabled initially.

## 13. Threat: kill switch exists visually but is bypassable

### Attack

UI reports provider/feed stopped, but another runtime path continues external writes.

### Control

Kill switch must be evaluated inside the canonical mutation boundary, not only in the Command Center UI.

The UI is a projection of authoritative kill-switch truth.

## 14. Threat: automatic quarantine release becomes publication

### Attack

Admin review/release of a quarantined/staged record accidentally publishes it to marketplace or promotes supplier capability.

### Control

Separate state transitions:

- quarantined/staged;
- reviewed;
- canonical import candidate;
- publication approval;
- marketplace publication.

No single quarantine action may imply all later steps. Existing Direct Supplier constraints keeping commercial activation/capability promotion/listing false must remain intact until an explicit later gate.

## 15. Threat: Command Center duplicates canonical data and diverges

### Attack

New `admin_decision_ledger`, financial summary tables or duplicate supplier-state tables become a second source of truth.

### Control

Prefer server-generated read models over copied business state.

Where a durable decision/evidence ledger is necessary, store decision evidence/events, not duplicate mutable copies of orders/payments/supplier records.

## 16. Audit requirements

Sensitive Command Center actions should eventually record:

- actor ID;
- authoritative role/capability at action time;
- action type;
- target type/ref;
- previous relevant state;
- requested state/action;
- policy decision;
- reason;
- evidence references;
- idempotency key/operation ID;
- timestamp;
- outcome;
- external reference if an external action occurred.

Secrets and unnecessary PII must never be stored in the audit payload.

## 17. Initial safe implementation boundary

Phase CC-0 / preparation:

- documentation only;
- no runtime changes.

Phase CC-1 / read-only control center:

- server-governed owner access;
- read models only;
- health/evidence status;
- feed/quarantine visibility;
- financial exceptions visibility;
- logistics exceptions visibility;
- autonomy/capability state visibility;
- links to existing Admin pages.

Phase CC-2 / bounded internal actions:

- acknowledge/assign/resolve internal exception state;
- audited and idempotent.

Phase CC-3 / existing governed operational controls:

- expose only already-canonical supplier/provider kill switches after exact authorization reuse.

Phase CC-4+ / external and financial actions:

- separate evidence-driven design and explicit owner authorization required before implementation.

## 18. Non-negotiable fail-closed rules

1. Missing owner grant = deny.
2. Grant lookup failure = deny.
3. Inactive account = deny.
4. Unknown provider capability = no external write.
5. Unverified capability = no external write.
6. Active kill switch = no external write.
7. Missing PII grant = no PII disclosure.
8. Financial mutation = disabled until separately approved and validated.
9. Missing/stale health evidence != PASS.
10. Client UI state never constitutes authorization.

This document defines a target security architecture only and makes no database, runtime or production change.