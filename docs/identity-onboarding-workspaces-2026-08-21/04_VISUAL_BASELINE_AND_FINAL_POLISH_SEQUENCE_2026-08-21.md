# LOADIFY MARKET — VISUAL BASELINE & FINAL POLISH SEQUENCING DECISION

**Decision date:** 21 August 2026  
**Applies to:** PR #529 and the wider Loadify Market platform completion programme  
**Status:** CONTROLLING EXECUTION DECISION

---

## 1. Decision

PR #529 is preserved as the current visual-direction baseline for the public Loadify Market experience.

The platform will **not** receive its final visual polish while major functional architecture is still being completed.

The execution order is:

`SAVE CURRENT #529 VISUAL BASELINE → SYNCHRONISE/STABILISE AGAINST CURRENT MAIN → COMPLETE FUNCTIONAL PLATFORM WORK → COMPLETE IDENTITY/REGISTRATION/ONBOARDING/WORKSPACE ALIGNMENT → COMPLETE INTEGRATION/SECURITY/COMMERCE TESTING → STABILISE RELEASE CANDIDATE → FINAL CROSS-PLATFORM VISUAL POLISH → FINAL VALIDATION → RELEASE DECISION`

---

## 2. Current #529 visual baseline

The current approved-direction checkpoint is preserved separately at:

`checkpoint/pr529-visual-baseline-20260821-1608`

The baseline exists so that technical synchronisation or later implementation work cannot silently destroy the visual direction that has been accepted as promising.

PR #529 remains:

- a draft visual/public-homepage workstream;
- not authorised for merge merely because it looks good;
- subject to later reconciliation with current `main`;
- protected from becoming a catch-all branch for unrelated backend, Workspace, Admin or Supplier Commerce implementation.

---

## 3. What is allowed before final polish

Before the platform is functionally complete, visual work is limited to changes necessary for:

- preventing broken layouts;
- preserving responsive usability;
- maintaining accessibility;
- preserving functional navigation and CTAs;
- keeping truthful commercial copy when underlying contracts change;
- resolving merge/reconciliation conflicts without degrading the accepted visual baseline;
- fixing severe visual regressions introduced by functional work;
- keeping the platform testable.

These are **stabilisation changes**, not final polish.

---

## 4. What is intentionally deferred

The following are deferred until the platform is close to release-candidate stability:

- final spacing/rhythm pass;
- final typography tuning;
- final card proportions and product presentation treatment;
- final micro-interactions and animation tuning;
- final shadows, borders, radii and depth treatment;
- final responsive pixel-level refinement;
- final global consistency pass across public pages and authorised workspaces;
- final performance tuning that depends on settled visual/component structure;
- final copy tightening where wording is not needed for functional correctness;
- final brand-consistency pass across the complete user journey.

Do not repeatedly polish surfaces that are still structurally changing.

---

## 5. Functional priority before polish

The following work takes priority over final visual polish:

1. repository/current-main reconciliation;
2. identity and commercial-relationship contract;
3. registration architecture;
4. Marketplace Seller onboarding/activation;
5. Buyer onboarding alignment;
6. workspace routing/readiness alignment;
7. Supplier Partner controlled-pilot boundary;
8. auth/security/RLS validation;
9. Stripe/payment readiness validation;
10. marketplace commerce flow validation;
11. web/mobile parity and routing validation;
12. CI/build/test stabilisation;
13. release-candidate functional freeze.

Only after these are sufficiently stable should the final visual-polish programme begin.

---

## 6. Visual invariants to preserve during functional work

Functional implementation may evolve page structure where genuinely required, but should preserve the accepted Loadify visual direction unless evidence requires change:

- bright premium public commerce presentation rather than dark/cinematic generic marketplace styling;
- Loadify navy / royal blue / orange-gold / white brand relationship;
- strong use of real marketplace products instead of fabricated catalogue imagery;
- clear buyer and seller commercial pathways;
- modern, spacious hierarchy without excessive empty desktop width;
- non-generic marketplace identity;
- no fake traction, fake stock, fake reviews, fake sellers or fake partner claims;
- Loadify Intelligence claims remain explicitly truthful about live/non-live integration state;
- no visual import from unrelated historical Workspace redesigns merely for consistency.

---

## 7. Synchronisation rule for #529

Because #529 and `main` have evolved in parallel, synchronisation must be performed deliberately.

Do **not** treat commit-count divergence as a reason to discard #529.

Do **not** perform a blind reconciliation that prioritises current `main` presentation over the saved visual baseline.

For each conflict or overlapping change:

1. preserve the newest functional/security/business truth;
2. preserve the accepted #529 visual direction where compatible;
3. reject obsolete copy or semantics even if they exist on current `main`;
4. verify desktop and mobile behaviour;
5. record any intentional visual deviation from the checkpoint.

---

## 8. Final visual-polish gate

The final visual-polish stage may begin only when the active execution ledger shows that the platform is sufficiently functionally stable for polish not to be repeatedly invalidated by structural work.

At that point, create a dedicated final-polish plan/branch rather than silently mixing polish into unrelated feature PRs.

Final polish must cover the complete authorised user journey, not just the homepage:

`PUBLIC ENTRY → REGISTRATION → VERIFICATION → ONBOARDING → CORRECT WORKSPACE → CORE COMMERCE ACTIONS → SUPPORT/LEGAL/ACCOUNT STATES`

The exact surfaces included will be determined by the completed functional architecture and authorised workspace scope at that time.

---

## 9. Merge guard

This decision does not authorise merge of PR #529.

PR #529 remains subject to explicit owner review and approval after synchronisation, functional validation and the appropriate release sequence.
