# LOADIFY MARKET — IDENTITY / ONBOARDING / WORKSPACES CURRENT-STATE BASELINE

**Date:** 21 August 2026  
**Baseline main SHA:** `50302455a6c8afcd52da45150f7de6f0ce91d942`  
**Status:** factual baseline for the new execution plan; implementation has not started in this workstream.

---

## 1. Product model that registration/onboarding must serve

The controlling Supplier Commerce contract defines a hybrid platform, not a simple marketplace and not a simple dropshipping site.

Relevant commercial modes:

1. **Marketplace Seller**
   - third-party seller is the legal seller to the buyer;
   - marketplace seller remains the seller/MoR under the approved payment configuration;
   - Loadify facilitates marketplace commerce and receives platform/commission revenue.

2. **Loadify Supplier-Fulfilled**
   - Loadify is the customer-facing seller/MoR;
   - approved supplier/fulfilment provider holds/sources stock and ships directly to the buyer;
   - Loadify does not require its own physical warehouse;
   - supplier procurement/recovery is separate from customer-facing order/payment/refund truth.

3. **Loadify Direct**
   - Loadify-sale mode differentiated by inventory/title ownership/procurement timing;
   - not a public user/account type;
   - does not imply a Loadify warehouse.

Permanent interpretation for this workstream:

`MARKETPLACE SELLER ≠ SUPPLIER PARTNER ≠ FULFILMENT PROVIDER ≠ LOADIFY DIRECT`

A public UI label must never collapse these factual relationships.

---

## 2. Current Supplier Commerce programme state

Canonical Supplier Commerce progress on this baseline:

- Phases C through N recorded complete;
- **Phase O — Controlled Pilot** is the current next canonical phase;
- all global Supplier Commerce controls remain disabled/fail-closed at the Phase N closeout point;
- simulator PASS is not Pilot PASS.

Therefore this onboarding/workspace workstream must not silently turn Supplier Commerce into an open public supplier network or enable supplier integrations.

---

## 3. Current public auth/account model

### Public registration route

Both `/register` and `/signup` currently resolve to:

`src/pages/pixel-perfect/Signup.tsx`

The current component reads:

- `?type=seller` to choose seller registration;
- `?account=private` for a private/company presentation variant.

Current visible registration UI still contains legacy conceptual mixing:

- Buyer / Supplier toggle;
- Company / Private toggle;
- `Trade Supplier Account` language for seller registration;
- a long multi-column form.

This presentation no longer maps cleanly to the current commercial contract.

### Server registration endpoint

`netlify/functions/register.ts` currently accepts only:

- `role: buyer`
- `role: seller`

It does **not** expose a public `supplier` role.

The endpoint currently supports relevant profile fields including:

- first/last name;
- email/password;
- phone;
- seller type (`individual | sole_trader | company`);
- store name;
- VAT number;
- customer type;
- company name;
- business address;
- newsletter/assistance preferences.

It also:

- rate-limits registration;
- checks buyer/seller registration feature flags;
- stores authorisation role in app metadata;
- generates an email confirmation link;
- creates/updates seller profile/store records for seller registrations;
- creates/updates B2B buyer profile data when relevant.

Conclusion:

**The account-creation backend is reusable, but the public registration experience and role semantics require redesign.**

---

## 4. Current route/workspace separation

The app already has separate runtime surfaces.

### Buyer

`/buyer` is protected by buyer-specific routing and has its own shell/pages, including:

- Dashboard;
- Orders;
- Wishlist;
- Addresses;
- Payments;
- Reviews;
- Profile;
- Settings;
- Notifications;
- Messages;
- Disputes.

### Marketplace Seller

`/seller` is protected by seller-specific guards and has its own shell/pages, including:

- Dashboard;
- Products;
- Orders;
- Shipments;
- Returns;
- Messages;
- Reviews;
- Notifications;
- Profile;
- Settings.

The current shell brands itself as `Seller Hub` / `Your seller dashboard`.

### Admin / Operations

`/admin` is separately protected and contains its own operational/admin shell and pages.

Conclusion:

**Loadify does not need to create Buyer and Seller workspaces from zero. They already exist as separate runtime surfaces.**

The required work is to align identity, onboarding, activation, permissions and destination contracts around them, then make only the workspace changes justified by that contract.

---

## 5. Current seller onboarding

Current route:

`/onboarding`

Current implementation:

`src/pages/onboarding/SellerOnboarding.tsx`

Current visible five-step flow:

1. Account type;
2. Profile details;
3. Stripe Connect;
4. Store setup;
5. First listing.

Persisted/currently inspected state includes:

- `accountType`;
- `profileCompleted`;
- `stripeConnectStatus`;
- `stripeChargesEnabled`;
- `stripePayoutsEnabled`;
- `stripeDetailsSubmitted`;
- `storeCreated`;
- `hasServiceCapability`;
- `onboardingCompleted`.

Important legacy seams found:

- the final step still refers to `service listing` / `hasServiceCapability` although current marketplace seller commerce is product/catalogue-led;
- Stripe copy states that Stripe handles all identity verification and that no manual KYC is required, which is too broad for the platform's own seller verification/governance obligations;
- the wizard can offer `Skip for now — go to dashboard`, which must be reconciled with the new activation/readiness contract rather than retained automatically;
- completion and approval/verification semantics need to be re-audited against current seller status and route guards.

Conclusion:

**Seller onboarding exists and must be evolved, not replaced by an unrelated parallel wizard.**

---

## 6. Current post-signup role selection seam

`src/pages/onboarding/RoleSelection.tsx` currently offers:

- `I'm a Buyer`;
- `I'm a Seller`;

and updates the account role server-side.

It also states that the user can update account type later in Settings.

This must be re-evaluated because:

- a visitor who clicks `Start selling` has already declared commercial intent;
- buyer vs seller is not merely a cosmetic preference;
- future multi-context identity should not be implemented by casually overwriting a single role without a migration/permission contract.

No change is authorised by this observation alone. It is a Stage 1 contract decision.

---

## 7. Identity architecture gap

Current application authorisation still relies primarily on a single user role (`buyer | seller | admin`) plus seller profile state.

The platform direction may eventually benefit from:

`ONE LOADIFY IDENTITY → one or more memberships/capabilities → dedicated workspaces`

Example conceptual destinations:

- Buyer Space;
- Marketplace Seller Workspace;
- Supplier Partner relationship/portal if and when authorised;
- internal Operations/Admin.

However, **this is a target modelling principle, not authorisation for an immediate schema rewrite.**

Stage 1 must determine how much can be achieved safely with the current model and what, if anything, requires a later role/membership migration.

---

## 8. Supplier Partner surface — current truth

There is no equivalent public `/supplier` shell/portal in the inspected app routing.

This is not automatically a defect.

The current canonical programme is at Controlled Pilot. A supplier/fulfilment partner belongs to Loadify's procurement/fulfilment relationship in Supplier-Fulfilled mode; it is not the Marketplace Seller role.

Therefore:

- `Start selling` must not create a Supplier Partner;
- public Seller Workspace must not become a Supplier Portal;
- a broad self-service Supplier Portal must not be created merely for symmetry;
- Phase O evidence must determine the minimum external supplier surface actually required.

---

## 9. Physical operations invariant

Loadify is not to be modelled as owning a physical retail premises or Loadify warehouse.

For Supplier-Fulfilled commerce:

- supplier/fulfilment stock may remain at the supplier or other approved custodian;
- ship-from/origin data still matters for delivery, tax/customs, compliance and SLA;
- Loadify retains digital/customer/commercial control according to the relevant commercial mode.

Do not introduce warehouse-management concepts into public onboarding/workspaces unless a future explicit business decision creates that physical operating model.

---

## 10. Homepage dependency

PR #529 is an open draft homepage redesign lane.

It currently includes seller-acquisition CTAs and therefore depends on the correct registration destination.

Invariant:

`Start selling → Marketplace Seller account/onboarding`

not:

`Start selling → Supplier-Fulfilled partner application`.

PR #529 remains unmerged and is not modified by this documentation branch.

---

## 11. Legacy documentation status

`docs/onboarding_flow.md` contains an older seller onboarding concept and unverified marketing examples/claims (including historical social-proof and payout wording).

`docs/ONBOARDING_AUTH_AUDIT.md` is also historical and describes defects that have since changed in current runtime.

These files remain useful evidence, but **neither is controlling current truth for this workstream.**

---

## 12. Baseline conclusion

What already exists:

- account/auth foundation;
- buyer registration capability;
- seller registration backend capability;
- email confirmation path;
- Buyer Space;
- Seller Workspace;
- Seller onboarding foundation;
- Admin/Operations surface;
- advanced Supplier Commerce backend/contract work.

What is missing or misaligned:

- coherent public identity/intent model;
- clean separation of Buyer vs Marketplace Seller registration experience;
- separation of Marketplace Seller from Supplier Partner language;
- seller onboarding aligned to current commerce/governance truth;
- deterministic onboarding → activation → workspace routing contract;
- future-safe multi-context identity strategy;
- explicit controlled-pilot boundary for any Supplier Partner external surface;
- repo-native progress documentation for this workstream.

This baseline is the starting point for Stage 1. Do not rebuild existing systems from scratch without evidence that the current implementation cannot safely evolve.
