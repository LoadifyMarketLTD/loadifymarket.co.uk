# Loadify Command Center — Dependency & Risk Matrix

Date: 2026-09-01
Status: PREPARATION ONLY / READ-FIRST / NO PRODUCTION MUTATION
Branch: `docs/loadify-command-center-preparation-20260901`

## Classification legend

### Data-source class

- **CLIENT-SAFE EXISTING** — current Admin UI already reads the source under existing RLS.
- **PRIVILEGED EXISTING** — existing Netlify function/RPC is the correct boundary.
- **PR682 CANDIDATE** — current implementation exists in PR #682 and must be reconciled after stabilization.
- **NEW BOUNDED READ MODEL** — do not expose the underlying tables directly; create a narrow server/RPC summary later.
- **UNVERIFIED / EXTERNAL** — provider/runtime evidence is not yet sufficient.

### Action-risk class

- **R0 READ** — read-only observability.
- **R1 INTERNAL AUDITED** — bounded internal state transition; requires actor/reason/audit evidence.
- **R2 EXTERNAL** — writes to supplier/carrier/external provider; disabled until capability verification.
- **R3 PII** — may disclose customer PII externally; separate explicit grant required.
- **R4 FINANCIAL** — payment/refund/transfer/payout financial mutation; separately governed and not implied by generic write permission.

---

## Module 1 — Overview & System Health

| Command Center surface | Current candidate source | Source class | Risk | Preparation decision |
|---|---|---:|---:|---|
| Current app/repo deployment identity | Netlify/GitHub deployment evidence | NEW BOUNDED READ MODEL | R0 | Build an evidence summary model; do not infer green from code presence. |
| Migration health | `npm run verify:migrations` / `scripts/verify-migration-health.mjs` release evidence | NEW BOUNDED READ MODEL | R0 | Persist or expose timestamped run evidence later. |
| RLS / DB lint | Supabase DB lint/advisor/release evidence | NEW BOUNDED READ MODEL | R0 | UI needs PASS/FAIL/UNKNOWN/NOT EXECUTED with timestamp. |
| Google GSI probe | existing Google GSI runtime component/probe workflow | NEW BOUNDED READ MODEL | R0 | Show only measured runtime evidence, never static script existence. |
| Stripe webhook health | `stripe_events` | CLIENT-SAFE EXISTING for current Admin | R0 | Reuse data; create aggregate summary rather than duplicate event viewer. |
| Failed Stripe event count | `src/pages/pixel-perfect/admin/AdminStripeEvents.tsx` → `stripe_events` | CLIENT-SAFE EXISTING | R0 | Directly reusable as a read KPI under existing Admin authorization. |
| Supplier governance health | `admin-supplier-control-centre.ts` status action / control-centre RPC | PRIVILEGED EXISTING | R0 | Prefer server boundary; do not broaden table access. |
| Autonomous policy health | PR #682 foundation/policy | PR682 CANDIDATE | R0 | Reconcile only after PR #682 contracts stabilize. |
| Critical incident count | supplier control-centre / future unified exception model | PRIVILEGED EXISTING + PR682 CANDIDATE | R0 | Create one normalized exception summary later. |

### Module 1 gaps

1. No canonical persisted read model currently aggregates CI/build/runtime evidence for the UI.
2. `NOT EXECUTED` must be first-class; absence of evidence cannot map to PASS.
3. Health cards should carry source, checked-at timestamp, environment and evidence reference.

---

## Module 2 — Vendor Feeds & Quarantine

| Command Center surface | Current candidate source | Source class | Risk | Preparation decision |
|---|---|---:|---:|---|
| Supplier/provider governance status | `netlify/functions/admin-supplier-control-centre.ts` action `status` | PRIVILEGED EXISTING | R0 | Reuse as primary control-plane source. |
| Supplier risk assessment | `server_supplier_risk_assessment_v1` via admin control centre | PRIVILEGED EXISTING | R0 | Read-only display initially. |
| Governance decision | `server_supplier_governance_decision_v1` | PRIVILEGED EXISTING | R0 | Display result/reasons before exposing any action. |
| Supplier/provider kill switch state | supplier control-centre RPC + PR #682 kill-switch model | PRIVILEGED EXISTING + PR682 CANDIDATE | R0 | Reconcile terminology; one visible truth. |
| Activate supplier/provider kill switch | `admin-supplier-control-centre.ts` action `kill_switch` | PRIVILEGED EXISTING | R1 INTERNAL AUDITED | Candidate for Phase B only. |
| Feed price/stock circuit breaker | PR #682 supplier feed circuit breaker | PR682 CANDIDATE | R0/R1 | Read first; mutation only after audit contract is confirmed. |
| Feed batch/sync health | PR #682 supplier feed batch/runtime integration | PR682 CANDIDATE | R0 | Surface batch evidence, counts, timestamps. |
| Quarantined item list | staging/quarantine storage contract to be identified precisely | NEW BOUNDED READ MODEL | R0 | Do not create broad client SELECT merely for UI. |
| Release one quarantined item | validation/publication pipeline TBD | UNVERIFIED / EXTERNAL | R1/R2 | Deferred until exact publication boundary is proven. |
| Bulk publish quarantined feed | none approved | UNVERIFIED / EXTERNAL | R2 | Explicitly prohibited as a bypass action. |
| Avasam write capabilities | provider evidence incomplete | UNVERIFIED / EXTERNAL | R2/R3 | OFF. |
| BigBuy write capabilities | sandbox/runtime evidence required | UNVERIFIED / EXTERNAL | R2/R3 | OFF. |

### Module 2 gaps

1. Exact quarantine/staging table/read model must be reconciled from the current Supplier Commerce schema before UI work.
2. Existing supplier control centre already supports risk/security/incidents/kill switch; Command Center must not create a duplicate governance subsystem.
3. Provider capability state from PR #682 should become the authority for external-write eligibility once validated.

---

## Module 3 — Financial Ledger & Stripe Oversight

| Command Center surface | Current candidate source | Source class | Risk | Preparation decision |
|---|---|---:|---:|---|
| Stripe webhook event list/health | `stripe_events` via `AdminStripeEvents.tsx` | CLIENT-SAFE EXISTING | R0 | Reuse; Command Center should summarize and deep-link to detailed viewer. |
| Failed/skipped events | `stripe_events.status` | CLIENT-SAFE EXISTING | R0 | Strong candidate for Overview alerting. |
| Seller payout requests | `payout_requests` via `AdminPayouts.tsx` | CLIENT-SAFE EXISTING | R0 | Reuse read path. |
| Approve payout request | `approve_payout` SECURITY DEFINER RPC | PRIVILEGED EXISTING | R4 FINANCIAL | Do not duplicate into initial Command Center. Existing page remains operational surface. |
| Reject payout request | `reject_payout` RPC | PRIVILEGED EXISTING | R4 FINANCIAL | Existing page only until financial-control policy is separately reviewed. |
| Mark payout complete | `complete_payout` RPC | PRIVILEGED EXISTING | R4 FINANCIAL | Existing page only until separately reviewed. |
| Stripe Connect transfer linkage | `payouts.stripeTransferId` and order transfer helpers | PRIVILEGED/DB EXISTING | R0 | Build bounded reconciliation summary later. |
| Transfer reversal state | refund/order transfer code | PRIVILEGED EXISTING | R0/R4 | Read reconciliation data first; no new mutation control. |
| Order → payment → transfer → payout reconciliation | orders/payments/payouts/stripe_events | NEW BOUNDED READ MODEL | R0 | High-value read model; should normalize IDs and mismatch reasons. |
| Platform fee/commission snapshot | commercial order/payment truth | NEW BOUNDED READ MODEL | R0 | Must preserve historical commercial snapshots. |
| Automatic refund | explicitly disabled | none approved | R4 FINANCIAL | OFF. |
| Automatic payment mutation | explicitly disabled | none approved | R4 FINANCIAL | OFF. |

### Module 3 key finding

The existing Admin UI already contains live financial mutation controls for payout-request lifecycle. Therefore the Command Center should initially be **oversight/reconciliation**, not a second payout execution page. This reduces risk and prevents conflicting operational surfaces.

---

## Module 4 — Logistics & Exceptions

| Command Center surface | Current candidate source | Source class | Risk | Preparation decision |
|---|---|---:|---:|---|
| Shipment list/status | existing shipment/order schema | CLIENT-SAFE EXISTING or NEW BOUNDED READ MODEL | R0 | Reconcile exact current tables and admin read paths before UI. |
| Latest tracking activity | shipment tracking/event truth | NEW BOUNDED READ MODEL | R0 | Normalize provider event timestamps. |
| 48h stall evaluation | PR #682 `shipmentStallAutomation` | PR682 CANDIDATE | R0 | Strong reusable decision function. |
| Terminal shipment exclusion | PR #682 stall automation terminal-state logic | PR682 CANDIDATE | R0 | Reuse, do not reimplement in UI. |
| Missing tracking timestamp exception | PR #682 stall automation | PR682 CANDIDATE | R0 | Treat as exception/unknown, never healthy. |
| Create carrier support case recommendation | PR #682 emits intended action | PR682 CANDIDATE | R0 | Display recommendation only initially. |
| Automatically create carrier case | carrier adapter contract not verified | UNVERIFIED / EXTERNAL | R2 | OFF. |
| Notify customer automatically | outbound notification policy/capability needs reconciliation | PR682 CANDIDATE / UNVERIFIED | R2 | OFF until policy explicitly approves. |
| Return eligibility | PR #682 customer return automation | PR682 CANDIDATE | R0 | Read decision/reason first. |
| External return/cancellation submission | provider capability dependent | UNVERIFIED / EXTERNAL | R2/R3 | OFF. |

### Module 4 gaps

1. Need one normalized shipment-exception read model across carrier/provider implementations.
2. Detection and action must remain separate.
3. Carrier case creation must not be assumed from `shouldCreateCarrierCase=true`; that flag is recommendation intent only.

---

## Module 5 — Autonomous Operations & Intelligence

| Command Center surface | Current candidate source | Source class | Risk | Preparation decision |
|---|---|---:|---:|---|
| Provider Capability Registry | PR #682 `autonomousCapabilityRegistry.ts` | PR682 CANDIDATE | R0 | Canonical candidate; no parallel registry. |
| Capability verification state | PR #682 provider capability records | PR682 CANDIDATE | R0 | Display verified/unverified and evidence expiry. |
| Autonomy level | PR #682 operations foundation | PR682 CANDIDATE | R0 | Display effective level after kill-switch resolution. |
| External mutation allowed | PR #682 capability resolution | PR682 CANDIDATE | R0 | Display as derived decision; not a manual UI toggle. |
| PII disclosure allowed | PR #682 capability resolution | PR682 CANDIDATE | R0 | Display separately from write permission. |
| Kill-switch reasons | PR #682 kill-switch model + existing supplier control centre | PR682 CANDIDATE + PRIVILEGED EXISTING | R0 | Reconcile into a single hierarchy. |
| Activate internal kill switch | existing supplier control centre and future unified model | PRIVILEGED EXISTING / PR682 CANDIDATE | R1 INTERNAL AUDITED | Phase B candidate after terminology/data model convergence. |
| Evidence/decision ledger | PR #682 `autonomousDecisionEvidence` | PR682 CANDIDATE | R0 | Read-only first. |
| Unified exceptions | PR #682 `autonomousExceptionModel` | PR682 CANDIDATE | R0/R1 | Queue read first; transitions later. |
| Human approval | autonomy/evidence model | PR682 CANDIDATE | R1 INTERNAL AUDITED | Requires explicit actor, reason and evidence. |
| Generic financial mutation | PR #682 foundation keeps separately disabled | PR682 CANDIDATE | R4 FINANCIAL | Must remain hard-separated from generic external mutation. |

---

## Authorization dependency matrix

| Boundary | Current truth | Command Center requirement |
|---|---|---|
| Browser authenticated identity | Supabase Auth session | Necessary, never sufficient. |
| Current platform account | `public.users` active row | Must be re-established for privileged server actions. |
| Admin role | current `users.role='admin'` + repo admin helpers | Required baseline. |
| Owner/Super Admin privilege | not approved as a new public role | Design a server-governed grant without weakening the three-role contract. |
| User metadata | explicitly not authoritative for Admin access | Never use `user_metadata.role` as privilege truth. |
| Service-role operations | server functions must authenticate active account first | Preserve this boundary for all new privileged APIs. |

---

## Initial UI composition using existing safe surfaces

A first preview-only, read-only Command Center can eventually be built without production mutation by composing:

1. **Health summary** — evidence-backed status cards; unknown where no read model exists.
2. **Vendor governance summary** — supplier control-centre `status` output.
3. **Stripe health summary** — failed/skipped/live event counts derived from existing `stripe_events` data.
4. **Payout oversight summary** — counts/amounts from `payout_requests`, with deep-link to existing `/admin/payouts`; no duplicate Approve/Reject/Complete controls.
5. **Logistics exception summary** — shipment stall decisions from PR #682 after stabilization; no carrier mutation.
6. **Autonomy summary** — capability registry/evidence/kill-switch state from PR #682 after stabilization; no direct permission toggles.

This composition keeps the first implementation predominantly **R0 READ**.

---

## Safe parallel backlog

These tasks are safe to continue before any UI/runtime implementation:

- [x] Canonical preparation specification.
- [x] Initial dependency/risk matrix.
- [ ] Identify exact staging/quarantine schema and existing Supplier Commerce read paths.
- [ ] Identify exact shipment/tracking tables and admin read paths.
- [ ] Map order/payment/payout/transfer/refund identifiers into a reconciliation contract.
- [ ] Draft owner/control-plane privilege decision record.
- [ ] Draft Command Center server read API response schema.
- [ ] Draft threat model for role escalation, stale session authority and service-role misuse.
- [ ] Draft E2E role-isolation matrix for `/admin/control-center`.
- [ ] Reconcile PR #682 final interfaces once its branch stabilizes.
- [ ] Create preview-only UI scaffold only after the above contracts are stable.

---

## Current safety conclusion

There is meaningful work available now that reduces risk and future rework while preserving production exactly as-is. The correct strategy is to finish evidence/dependency/authorization contracts first, then implement the Command Center as a read-only preview, and only after that consider tightly audited mutation controls.