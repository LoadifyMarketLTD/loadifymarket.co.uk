# LOADIFY MARKET — IDENTITY / ROLE / RELATIONSHIP CONTRACT

**Date:** 21 August 2026  
**Status:** CONTROLLING STAGE 1 CONTRACT  
**Scope:** Loadify account identity, Buyer capability, Marketplace Seller relationship, Admin authority, Supplier Partner separation, activation/readiness and workspace destination.  
**Baseline audited:** `main@50302455a6c8afcd52da45150f7de6f0ce91d942`

---

## 0. Executive decision

Loadify must stop treating **Buyer vs Seller** as mutually exclusive human identities.

The target model is:

`ONE AUTH IDENTITY → ACTIVE ACCOUNT CONTROL → COMMERCE CAPABILITIES / BUSINESS RELATIONSHIPS → RELATIONSHIP-SPECIFIC READINESS → DEDICATED WORKSPACE`

The architectural decision is **ADDITIVE CAPABILITY MIGRATION REQUIRED**.

The current `public.users.role` field remains temporarily for compatibility and primary/default workspace routing, but it must cease to be the sole source of Buyer/Seller entitlement.

Permanent distinctions:

- **Admin** remains a privileged system role, server-controlled and exclusive from self-service role changes.
- **Buyer** becomes an ordinary commerce capability available to normal active marketplace accounts.
- **Marketplace Seller** becomes an additional governed commerce capability plus a `seller_profiles` business relationship and seller lifecycle/readiness state.
- **Supplier Partner / Fulfilment Provider** is an organisation/commercial relationship in Supplier Commerce, not a Seller role and not a public `users.role` value.
- **Loadify Direct** is an internal commercial mode, never an account role or capability exposed at signup.

This contract deliberately avoids a destructive rewrite of the existing auth/RLS estate. The migration is staged so existing accounts, seller ownership, Stripe and account-suspension invariants remain intact while Buyer+Seller coexistence is introduced safely.

---

# 1. Evidence-backed current model

## 1.1 Authentication identity

Supabase Auth `auth.users.id` is the authentication identity. `public.users.id` mirrors the same account id and is the live application account-control row.

Current auth hydration reads `public.users` first and falls back to server-controlled `auth.users.app_metadata.role` if the application profile cannot be read.

`public.users.isActive` is the database account-suspension source of truth for private/account-scoped access.

### Contract

Keep this identity boundary.

Do not create separate logins for Buyer and Seller.

Do not use client-editable `user_metadata` for authorization.

---

## 1.2 Current role model is singular

The database currently enforces exactly:

`buyer | seller | admin`

through the `users_role_check` constraint.

The TypeScript `UserRole` type matches the same three values.

Current helpers are also singular:

- `hasBuyerAccess()` → `user.role === 'buyer'`;
- `hasSellerAccess()` → `user.role === 'seller'`;
- `hasAdminAccess()` → `user.role === 'admin' && user.isAdmin === true`.

### Consequence

A user cannot currently be represented as both Buyer and Marketplace Seller for workspace authorization even if both `buyer_profiles` and `seller_profiles` rows exist.

---

## 1.3 Current self-service role change is destructive replacement

`/.netlify/functions/set-account-role` accepts `buyer` or `seller` and performs:

`UPDATE public.users SET role = <selected role>`

It also rewrites onboarding state and mirrors the replacement role into Auth `app_metadata`.

For Seller it upserts `seller_profiles` and `seller_stores`; for Buyer it upserts `buyer_profiles`.

It does **not** delete the opposite profile.

Therefore a role change can leave both profile records in the database while authorization exposes only one role.

### Current UX mismatch

`RoleSelection.tsx` tells the user:

> You can update your account type later in Settings.

That language treats Buyer/Seller as a cosmetic switch. It is not compatible with the target commerce architecture.

### Contract

Generic self-service role replacement must be retired from the public onboarding journey.

An existing Buyer who wants to sell must start **Seller Activation**, not replace their Buyer identity.

---

## 1.4 Current workspace guards are mutually exclusive

### Buyer Space

`RequireBuyer` permits only `role === 'buyer'` and redirects Sellers to `/seller`.

### Seller onboarding

`RequireSellerAny` permits Seller role at any lifecycle status (plus Admin inspection), but blocks Buyers.

### Seller Workspace

`RequireSeller` requires:

- Seller role;
- active account;
- canonical `seller_profiles.sellerStatus === 'active'`.

It fails closed:

- `draft` → onboarding;
- `submitted` → under-review state;
- `suspended` → blocked;
- unknown/read failure → no automatic access.

### Contract

Preserve the strong Seller readiness guard.

Change the **relationship entitlement source**, not the fail-closed Seller readiness rule.

---

## 1.5 Seller lifecycle is a relationship/readiness state, not an account role

Canonical current `SellerStatus`:

`draft → submitted → active → suspended`

Activation helper requires, as applicable:

1. active live account;
2. seller relationship/profile completeness;
3. Stripe Connect account;
4. Stripe charges+payout readiness represented by `stripeConnectStatus='active'`;
5. not suspended;
6. admin approval if `requiresAdminApproval=true`.

Stripe is explicitly a technical readiness signal and does not replace Loadify verification/compliance responsibility.

### Contract

Keep `sellerStatus` separate from account capabilities.

`Seller capability exists` does **not** mean `Seller Workspace active`.

---

## 1.6 Existing data authorization is already partly capability-friendly

Many Buyer-owned data policies are based on authenticated ownership rather than `users.role='buyer'`, including:

- `buyer_profiles.userId` ownership;
- wishlists;
- carts;
- notifications;
- orders where `buyerId = auth.uid()`;
- returns/disputes/reviews through order ownership helpers.

This means the principal Buyer/Seller coexistence blocker is the current role/guard model rather than every Buyer data table.

Seller creation/ownership is more role-sensitive. Product INSERT currently requires `public.is_seller()`, which resolves against the singular `users.role='seller'` model.

### Contract

Migrate Seller authorization deliberately. Do not merely change frontend guards.

---

## 1.7 Seller profile existence cannot safely become the sole Seller entitlement

Current seller-profile RLS permits an authenticated owner to insert a row for their own `userId`.

Therefore the target implementation must **not** define Seller capability as simply:

`EXISTS seller_profiles WHERE userId = auth.uid()`

Doing so would turn profile creation into an authorization escalation path.

### Contract

Seller capability must be granted by a trusted server boundary and stored in a server-governed entitlement record.

---

## 1.8 Supplier Commerce identity is already separate from public user roles

Phase D Supplier Foundation stores commercial suppliers in:

`private.supplier_foundation_suppliers`

with lifecycle:

`candidate → verification → approved → restricted → suspended → banned`

Supplier records have their own identity, qualification evidence, SLA, compliance, provenance and adapter records.

Authenticated/public users do not receive direct table access; private Supplier Commerce tables are revoked from ordinary authenticated access.

`approved_by` / `created_by` may reference internal Loadify users, but the supplier itself is not represented by `public.users.role='seller'`.

### Contract

Preserve this separation.

Do not add `supplier` to `UserRole`.

Do not reuse Marketplace Seller profile/store authorization for Supplier Partners.

---

# 2. Target identity model

## 2.1 Layer A — Auth Identity

**Object:** Supabase `auth.users`

Purpose:

- credentials;
- OAuth/social identity where enabled;
- email confirmation;
- session/token issuance.

Never represents supplier commercial mode, Seller readiness or Loadify Direct.

---

## 2.2 Layer B — Loadify Account Control

**Object:** `public.users`

Purpose:

- one Loadify account per human login identity;
- account active/suspended state;
- core profile identity;
- compatibility/default workspace context during migration;
- system Admin authority.

### Compatibility rule for `users.role`

During the migration period keep the existing values:

`buyer | seller | admin`

but reinterpret non-admin values as **legacy/default commerce context**, not the complete entitlement set.

`admin` remains an actual privileged system role.

No generic public UI may freely toggle this field.

A future cleanup may replace/rename the buyer/seller meaning with an explicit `primaryContext`, but that is **not required for this workstream** and must not be bundled into the initial migration.

---

## 2.3 Layer C — Server-governed commerce capabilities

Introduce an additive table with the conceptual contract:

`public.account_capabilities`

Minimum fields:

- `user_id uuid NOT NULL REFERENCES public.users(id)`;
- `capability text NOT NULL CHECK (capability IN ('buyer','seller'))`;
- `granted_at timestamptz NOT NULL`;
- `grant_source text NOT NULL`;
- optional `granted_by uuid` for internal/admin grants;
- optional `revoked_at timestamptz`;
- unique `(user_id, capability)`.

Exact SQL naming may be adjusted during implementation for repository conventions, but the semantics are controlling.

### Security

- ordinary authenticated clients may read their own capability set if needed;
- ordinary clients may **not INSERT/UPDATE/DELETE capability grants**;
- grants/revocations happen only through trusted server/service-role boundaries or explicitly audited Admin operations;
- capability helpers must also require `public.users.isActive = true`.

### Why a dedicated capability record is required

It avoids all of the following unsafe shortcuts:

- profile existence as authorization;
- user-editable role switching;
- duplicating Supabase Auth accounts;
- granting Seller rights just because a page was visited;
- conflating Seller activation state with identity.

---

## 2.4 Layer D — Marketplace Seller relationship

**Objects:** existing `seller_profiles` + `seller_stores` + seller verification/payment/readiness data.

The Seller capability means:

> this active Loadify account has entered the Marketplace Seller relationship.

It does **not** mean:

- verified;
- approved;
- Stripe ready;
- allowed to publish;
- allowed to receive orders;
- active Seller Workspace.

Those are governed by the canonical Seller lifecycle and specific server/RLS checks.

---

## 2.5 Layer E — Supplier Partner organisation relationship

Current Supplier Foundation remains the supplier commercial truth.

For Phase O, no public Supplier login is required merely because the supplier entity exists.

If a later authorised pilot proves an external supplier login is necessary, use a separate organisation-membership concept, for example:

`supplier_organisation_memberships(user_id, supplier_id, organisation_role, ...)`

linked to the canonical Supplier Foundation supplier id.

That future membership must not grant Marketplace Seller capability automatically.

No such broad Supplier Portal schema is authorised by this Stage 1 contract.

---

# 3. Role / capability / relationship matrix

| Concept | Type | Public self-service? | Server governed? | Workspace effect |
|---|---|---:|---:|---|
| Auth identity | Identity | Yes, via registration/login | Yes | Establishes session only |
| Active Loadify account | Account control | No direct toggle | Yes | Required for private account access |
| Buyer | Commerce capability | Granted by normal account creation | Yes | Buyer Space |
| Marketplace Seller | Commerce capability + business relationship | User may initiate activation | Yes | Onboarding first; Seller Workspace only when active |
| Seller `draft` | Relationship state | Derived/persisted | Yes | Onboarding |
| Seller `submitted` | Relationship state | Derived/persisted | Yes | Review/status surface; no full Seller Workspace |
| Seller `active` | Relationship state | Never client-declared | Yes | Full Seller Workspace subject to action-level controls |
| Seller `suspended` | Relationship state | No | Yes/Admin | Seller Workspace blocked; Buyer capability may remain unless whole account is inactive |
| Admin | Privileged system role | **Never** | Yes/Admin-only | Admin/Operations |
| Supplier Partner | Supplier organisation relationship | Controlled/invite/pilot only | Yes | No Seller Workspace; future dedicated surface only if authorised |
| Fulfilment Provider | Commercial relationship | Controlled | Yes | Supplier/operations context, not Seller role |
| Loadify Supplier-Fulfilled | Commercial mode | No | Internal | No public account type |
| Loadify Direct | Commercial mode | No | Internal | No public account type |
| Loadify Intelligence | Platform subsystem | No role | Internal/integration governed | No user role |

---

# 4. Account transition contract

## 4.1 New Buyer

Create:

- Auth identity;
- `public.users` active ordinary account with compatibility `role='buyer'`;
- Buyer capability;
- Buyer profile as currently required.

Destination after email verification:

`Buyer Space`

No Seller profile/store is required.

---

## 4.2 New Marketplace Seller

A Seller registration is still one human Loadify account.

Create/provision:

- Auth identity;
- `public.users` ordinary account, compatibility/default context may remain `role='seller'` during migration;
- **Buyer capability**;
- **Seller capability**;
- `seller_profiles` in `draft`;
- `seller_stores` inactive/not-live as appropriate;
- email verification requirement.

Destination:

`Seller onboarding`, not Buyer-vs-Seller role selection.

The Buyer capability remains available because being a Marketplace Seller must not destroy the user's ability to buy/manage purchases under the same identity.

---

## 4.3 Existing Buyer starts selling

This is the primary reason the additive migration is required.

Do **not**:

- create a second login;
- replace/delete Buyer profile;
- remove Buyer capability;
- treat Seller as a cosmetic role toggle.

Instead a trusted `start-seller-activation` boundary must:

1. authenticate an active account;
2. reject Admin self-service;
3. idempotently grant Seller capability;
4. idempotently initialize `seller_profiles` / `seller_stores` if absent;
5. preserve Buyer profile/data/capability;
6. set Seller onboarding state without falsely setting readiness;
7. optionally set compatibility/default `users.role='seller'` during migration so legacy paths route to the seller journey;
8. update server-controlled app metadata consistently if compatibility role changes;
9. redirect to Seller onboarding.

This replaces the destructive semantic purpose of `set-account-role`.

---

## 4.4 Existing Seller buys on Loadify

An active normal Seller account has Buyer capability.

It may use Buyer Space and Buyer-owned commerce records under the same identity.

Seller ownership and Buyer ownership remain distinguished at transaction level (`sellerId` vs `buyerId`).

### Self-purchase rule

The migration must audit/prevent a seller buying its own listing wherever commerce rules require that prohibition. Do not assume role separation continues to prevent self-purchase after Buyer+Seller coexistence.

This is a mandatory Stage 7 validation item.

---

## 4.5 Seller becomes suspended

Seller suspension blocks Seller relationship actions/workspace.

It does **not automatically suspend the whole Loadify account**.

If `public.users.isActive` remains true, Buyer capability may continue unless a separate risk/policy decision requires whole-account suspension.

If `public.users.isActive=false`, all private account capabilities fail closed.

This separation prevents a commercial Seller sanction from accidentally erasing unrelated Buyer history while preserving the stronger whole-account suspension mechanism when necessary.

---

## 4.6 Seller stops selling voluntarily

Do not implement destructive role rollback.

Until a formal seller-closure lifecycle is defined, preserve Seller relationship history and allow the account to use Buyer Space. A future explicit closure state/process may disable selling while preserving evidence, orders, tax/reporting and dispute history.

Do not delete Seller records to make the UI look like a Buyer account.

---

## 4.7 Admin

Admin is not a Buyer/Seller option in public registration.

Admin cannot self-promote or self-demote through Seller/Buyer onboarding.

Admin authority continues to require live DB `role='admin'`, active account and DB-hydrated `isAdmin` checks.

No capability migration may weaken this boundary.

---

# 5. Workspace destination contract

## 5.1 No generic mega-workspace

Keep dedicated shells.

Do not combine Buyer, Seller, Supplier and Admin navigation into one giant sidebar.

---

## 5.2 Buyer Space

Eligibility target:

- active Loadify account;
- Buyer capability;
- email verified where the route/action requires it;
- not Admin unless an explicit internal/test pathway is authorised.

Buyer Space remains responsible for:

- orders/purchases;
- tracking;
- returns/refunds;
- wishlist;
- addresses;
- payment methods;
- reviews;
- messages;
- account/security.

---

## 5.3 Seller onboarding

Eligibility target:

- active account;
- Seller capability;
- seller profile relationship exists;
- email verified;
- Seller status may be `draft`, `submitted`, `active`, or `suspended` according to the exact page/action.

A Buyer who has just initiated Seller activation is allowed here without losing Buyer capability.

---

## 5.4 Full Seller Workspace

Eligibility target remains fail-closed:

- active account;
- Seller capability;
- canonical `sellerStatus='active'`;
- email verified;
- action-level Stripe/compliance/product/order gates where relevant.

Do not weaken this to `seller capability = true`.

---

## 5.5 Multi-workspace account

When an account has both Buyer and Seller capabilities:

- one login/session;
- both dedicated workspaces remain available;
- default landing may continue using compatibility `users.role` during migration;
- a future/Stage-5 workspace switcher can expose `Buyer Space` / `Seller Workspace` without changing authorization grants;
- switching workspace must never rewrite the user's capabilities or Seller lifecycle.

---

## 5.6 Supplier Partner

No Supplier workspace is created by this contract.

Phase O remains controlled.

If an external surface becomes necessary, it receives its own Supplier organisation membership/guard and must not reuse Buyer/Seller role switching.

---

# 6. Authorization and RLS contract

## 6.1 New helper semantics

Implement a server/database helper conceptually equivalent to:

`has_account_capability('buyer' | 'seller')`

It must require:

- `auth.uid()` matches the capability owner;
- capability grant is not revoked;
- `public.users.isActive=true`.

No JWT/user_metadata-only path may unlock capabilities.

---

## 6.2 Seller helper migration

`public.is_seller()` currently checks `public.users.role='seller'`.

During the capability migration it must transition to the server-governed Seller capability while preserving active-account enforcement.

The migration must inventory all policies/functions relying on `is_seller()` before changing semantics.

Do not make profile existence an equivalent shortcut.

---

## 6.3 Buyer data policies

Ownership-based Buyer RLS should remain ownership-based where safe.

Do not add unnecessary `role='buyer'` checks to Buyer-owned records merely because Buyer now has an explicit capability.

Use capability checks where an action truly requires Buyer entitlement, but preserve transaction ownership as the primary data boundary.

---

## 6.4 Seller profile/store write boundary

Because a profile row must not mint Seller entitlement, capability grant is authoritative.

During implementation, review whether direct authenticated INSERT/management of `seller_profiles` / `seller_stores` should remain available after server-governed Seller activation exists.

At minimum:

- creating a seller profile cannot itself grant Seller capability;
- Seller-only server mutations must verify capability/live account;
- active Seller Workspace still verifies `sellerStatus`.

---

## 6.5 Account suspension

Preserve `public.users.isActive` as the global fail-closed account control.

Capability helpers and workspace guards must not bypass it.

Stale JWT claims must not restore access after account suspension.

---

## 6.6 App metadata

Keep `app_metadata.role` as a compatibility fallback while `users.role` remains.

Do not put client-authoritative capabilities in `user_metadata`.

If capabilities are mirrored into JWT/app metadata for UX efficiency later, the live database remains authorization truth and sensitive actions must re-check server-side.

---

# 7. Compatibility / migration plan

## 7.1 Migration type

**Decision: ADDITIVE DB + GUARD MIGRATION REQUIRED.**

A no-migration solution is rejected because the current singular role model cannot represent Buyer+Seller coexistence without either:

- duplicate identities;
- destructive role replacement;
- or insecure profile-existence authorization.

---

## 7.2 Backfill rules

For existing active/non-admin accounts:

- current `role='buyer'` → grant Buyer capability;
- current `role='seller'` → grant Buyer + Seller capabilities;
- current `role='admin'` → no automatic commerce capability in this migration.

For inactive accounts:

- historical capability rows may be recorded as needed for deterministic migration, but account inactivity must make them unusable.

Do not infer Seller capability solely from a stale `seller_profiles` row when current role is Buyer. Historical role switching may have left such rows behind.

---

## 7.3 Compatibility role

Do not immediately drop or widen `users_role_check`.

Keep `buyer|seller|admin` while route/server/RLS consumers migrate.

For non-admin accounts, `users.role` becomes a temporary primary/default-context hint.

After every consumer has moved to capabilities, a future dedicated migration may replace this overloaded field. That is explicitly deferred.

---

## 7.4 Endpoint migration

Retire public semantic use of:

`set-account-role`

Replace with intent-specific boundaries such as:

- ordinary buyer account creation;
- seller account creation;
- `start-seller-activation` for an existing account;
- future `set-primary-workspace` only if a persisted default is required.

A workspace switcher must never call `set-account-role`.

---

## 7.5 Frontend guard migration

Target:

- Buyer guard → Buyer capability, not `role==='buyer'`;
- Seller onboarding guard → Seller capability;
- Active Seller guard → Seller capability **AND** sellerStatus active;
- Admin guard remains Admin role + DB-hydrated admin state.

Migration must be atomic enough that old guards and new grants cannot create an authorization gap.

---

## 7.6 Existing URLs / users

Preserve current URLs where possible:

- `/buyer`;
- `/seller`;
- `/onboarding`.

Legacy `/onboarding/role-selection` may remain temporarily as a redirect/compatibility route, but it must stop presenting Buyer/Seller as a freely replaceable account type once Stage 2 ships.

Existing users must not be forced to create new accounts.

Existing orders, seller products, payouts, reviews, disputes, messages and profile ids remain attached to the same user UUID.

---

# 8. State diagram

```text
                           ┌─────────────────────┐
                           │   AUTH IDENTITY     │
                           └─────────┬───────────┘
                                     │
                                     v
                           ┌─────────────────────┐
                           │ LOADIFY ACCOUNT     │
                           │ isActive=true/false │
                           └─────────┬───────────┘
                                     │
                         active only │
                 ┌───────────────────┴────────────────────┐
                 │                                        │
                 v                                        v
        ┌─────────────────┐                    ┌──────────────────┐
        │ BUYER CAPABILITY│                    │ SELLER CAPABILITY│
        └────────┬────────┘                    └─────────┬────────┘
                 │                                       │
                 v                                       v
        ┌─────────────────┐                     seller_profiles
        │   BUYER SPACE   │                              │
        └─────────────────┘                              v
                                               draft → submitted
                                                       │
                                           readiness / approval
                                                       │
                                                       v
                                                     active
                                                       │
                                                       v
                                             ┌─────────────────┐
                                             │ SELLER WORKSPACE│
                                             └─────────────────┘

Seller suspended ──> Seller Workspace blocked; Buyer capability remains unless whole account inactive.
Account inactive ──> all private account capabilities fail closed.
Admin ─────────────> separate privileged system role / Admin Operations.
Supplier Partner ──> separate private Supplier Commerce organisation lifecycle; not on this role tree.
Loadify Direct ────> internal commercial mode; not on this identity tree.
```

---

# 9. Explicit NOT-A-ROLE list

The following must **not** become `public.users.role` options:

- Supplier;
- Supplier Partner;
- Fulfilment Provider;
- Catalog Source;
- Discovery Source;
- Carrier integration/provider;
- Sales/Channel Connector;
- Loadify Supplier-Fulfilled;
- Loadify Direct;
- Loadify Intelligence;
- Stripe-connected;
- Verified seller;
- Approved seller;
- Suspended seller;
- Company / Sole Trader / Individual.

Company/Sole Trader/Individual are Seller business/legal types, not platform roles.

Seller verification/approval/suspension are relationship states, not identity roles.

---

# 10. Required implementation gates before Stage 1 assumptions may become runtime

The capability migration implementation must prove:

1. no user can self-grant Admin;
2. no Buyer can self-grant Seller by direct DB/profile insertion;
3. existing Sellers remain able to manage their existing products/orders after backfill;
4. existing Buyers retain all Buyer data;
5. existing Sellers can access Buyer Space without losing Seller Workspace eligibility;
6. Buyer→Seller activation is idempotent and preserves Buyer data;
7. Seller `draft/submitted/suspended` cannot reach active Seller Workspace;
8. account `isActive=false` blocks both Buyer and Seller private access;
9. app metadata cannot override live DB entitlement;
10. Supplier private data remains inaccessible to ordinary Buyer/Seller accounts;
11. no Supplier capability/role is introduced;
12. checkout prevents prohibited self-purchase after dual capability is enabled;
13. current Stripe/Seller activation logic remains fail-closed;
14. role/capability migration has rollback/backfill verification and fresh-rebuild migration coverage.

---

# 11. Stage 2 implications

Stage 2 registration architecture must consume this contract.

### Generic `/register`

Buyer-first ordinary account creation or a concise intent gateway; no Supplier role.

### `/register?type=seller` / seller CTA

Direct Marketplace Seller account creation journey.

Do not ask a user who arrived from `Start selling` to choose Buyer vs Seller again.

### Existing signed-in Buyer selecting `Start selling`

Do not send them through a second registration or generic role-selection page.

Start Seller Activation on the existing identity.

### Supplier Partner

`Partner with Loadify` remains a controlled commercial/application path during Phase O; no public supplier account type.

---

# 12. Stage 5 implications

A workspace switcher is allowed only after capability semantics exist.

It is a **navigation preference**, not an authorization control.

Example for a dual-capability account:

`Buyer Space ↔ Seller Workspace`

If Seller is not active:

`Buyer Space ↔ Seller Setup/Status`

Do not expose Supplier or Admin choices unless the identity has separately authorised relationships/authority.

---

# 13. Deferred items

Not authorised by Stage 1 alone:

- full Supplier Partner Portal;
- public Supplier self-service registration;
- `users.role` destructive removal/rename;
- new Seller closure lifecycle beyond existing canonical status;
- Admin/Super Admin visual redesign;
- final workspace visual polish;
- Loadify Intelligence live integration;
- Supplier Commerce control activation.

---

# 14. Stage 1 acceptance verdict

**STAGE 1 CONTRACT: PASS**

The repository evidence resolves the architectural question without an unresolved owner decision:

- the present single-role model is demonstrably incompatible with safe Buyer+Seller coexistence;
- duplicate accounts are unnecessary and undesirable;
- profile existence is not a safe authorization substitute;
- an additive, server-governed Buyer/Seller capability layer is the minimum safe future-compatible change;
- Admin remains a distinct privileged role;
- Seller readiness remains governed by the existing seller lifecycle;
- Supplier Partner remains separate in private Supplier Commerce;
- current account suspension and server/RLS fail-closed principles remain controlling.

**Exact next stage:** STAGE 2 — PUBLIC ENTRYPOINT & REGISTRATION ARCHITECTURE.

Before Stage 2 runtime implementation, create the additive capability migration and its security/backfill tests as the identity foundation consumed by registration/onboarding. Keep that migration isolated from homepage polish and Supplier Commerce activation.
