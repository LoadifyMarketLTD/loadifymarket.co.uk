# Loadify Market — Full Platform E2E + Financial Lifecycle Recovery

Date: 2026-09-04
Canonical base: `main@5673410aa3c9aac7189a35089375e131127ce715`
Recovery branch: `recovery/full-platform-e2e-financial-20260904`

## Safety rule

Current `main` is authoritative. No historical branch is to be merged wholesale. Every candidate delta from an audit, recovery, preview, agent, supplier-commerce, Android or checkpoint branch must be compared against current `main`, classified as already-present / superseded / still-valid / stale / unsafe, and only a still-valid minimal delta may be replayed onto a branch created from current `main`.

No branch deletion is authorized merely because it is behind `main`. A branch may be removed only after proving that it contains no unique work that still matters and after preserving any useful evidence/checkpoint.

## Current open PR truth

- #729 — P1-02 credentialed E2E release gate: open; historically prepared but now diverged from current main and blocked by P1-01.
- #700 — Platform Owner / Super Admin: preview-only; do not merge until owner authority is modelled and security-reviewed.
- #618 — Android recovery: historical source branch; do not merge as-is; extract Android-only delta against current main.

## Current P0 finding

`main` still contains the old buyer-confirmation financial behaviour in `netlify/functions/confirm-delivery.ts`: buyer confirmation marks the order completed and escrow released without performing the canonical Stripe Transfer. `netlify/functions/escrow-release.ts` is the actual scheduled payout boundary and requires delivered + held state and the protection window. Therefore the old confirm-delivery behaviour is still a real P0 inconsistency on current main, not merely stale branch history.

The audit branch `audit/full-platform-e2e-20260903` contains a targeted server repair and matching Buyer Orders UI repair. These two deltas are candidates for selective replay only; the audit branch itself must not be merged wholesale because it is diverged from current main and overlaps newer shipping work.

## Branch reconciliation lanes

1. P0 financial lifecycle: confirm-delivery / Buyer Orders / escrow-release / order-state truth.
2. P1-01 Auth fresh post-cutover Buyer + Seller Google certification.
3. P1-02 credentialed E2E gate rebuilt/reconciled on current main.
4. Full platform E2E: public marketplace, catalog, product, cart, checkout/payment, orders, returns/disputes, messaging, notifications, Buyer, Seller, Admin, shipping/tracking, mobile, legal/SEO/accessibility, hosted RLS/migration parity.
5. Admin Settings: light-theme contrast and canonical commission default drift.
6. Supplier Commerce: publication binding, postcode contract, Phase O shadow persistence/readiness, Direct Supplier, BigBuy, Avasam capability truth.
7. Super Admin: preview-only until authority/security model is complete.
8. Android: extract/rebuild against current main and pass in-place update/device gate.
9. Repo hygiene: classify branches before any deletion.

## Branch classification policy

- `ACTIVE`: current work that must be continued/rebuilt.
- `RECOVERY`: contains unique useful deltas but cannot be merged wholesale.
- `SUPERSEDED`: useful idea already present in current main or replaced by newer implementation.
- `ARCHIVE/ROLLBACK`: preserve as recovery pointer; not a feature source.
- `STALE`: no unique relevant delta after proof.
- `DELETE-CANDIDATE`: only after stale/superseded proof and preservation of any evidence.

This checkpoint is deliberately conservative: it records the recovery method before any destructive branch cleanup.