# Loadify Command Center — Existing Truth Ledger

Date: 2026-09-01
Scope: preparation only; no runtime activation; no hosted Supabase mutation; no Stripe mutation; no production change.

## Purpose

This ledger prevents the future `/admin/control-center` implementation from duplicating or contradicting systems already present in Loadify Market. Every future Command Center panel must consume an existing canonical source where one already exists. Missing capabilities must be added behind explicit server-governed contracts rather than inferred in the browser.

## 1. Identity / Admin authority

### Existing truth

- `src/components/auth/RequireAdmin.tsx` guards `/admin/*` routes.
- `src/lib/roleUtils.ts` grants admin UI access only when the hydrated platform user has `role === 'admin'` and `isAdmin === true`.
- `src/App.tsx` hydrates the platform identity from `public.users` after Supabase Auth and derives `isAdmin` from the database role.
- `netlify/functions/_shared/activeAccountAuth.ts` re-validates the JWT, re-reads the current `public.users` row and requires `isActive === true` before privileged service-role operations.
- Current identity contract keeps `users.role` in the existing buyer/seller/admin model; ordinary commerce capabilities are being moved to server-governed capability records while Admin remains isolated.

### Command Center rule

Do not implement Super Admin access by checking `user.user_metadata.role` in the client.

The future owner-level access boundary must be server-governed and additive to the current Admin identity model. Until an explicit owner-grant contract is designed and validated, the Command Center must not introduce a new client-authoritative role.

## 2. Existing Admin UI

### Existing truth

`src/pages/pixel-perfect/admin/AdminShell.tsx` already exposes the Admin Hub with:

- Dashboard
- Users
- Buyers
- Sellers
- Products
- Orders
- Payouts
- Stripe Events
- Flagged / Reports
- Disputes
- Analytics
- Support
- Notifications
- Settings

### Command Center rule

The Command Center is not a second Admin Hub. It is an operational control plane over cross-domain health, exceptions, reconciliation, supplier risk and autonomous-operation state.

Where an existing Admin page already performs business operations, Command Center should deep-link to it or surface read-only oversight rather than duplicate write controls.

## 3. Vendor Feed Staging / Quarantine

### Existing truth

Migration `supabase/migrations/20260830233801_direct_supplier_durable_staging_replay_quarantine.sql` creates a private, fail-closed Direct Supplier ingestion domain:

- `private.direct_supplier_replay_claims`
- `private.direct_supplier_ingestion_batches`
- `private.direct_supplier_staging_records`
- `private.direct_supplier_quarantine_records`

Important constraints already present:

- ingestion batches are restricted to `staging` / `staged`;
- `commercial_activation_performed = false`;
- `capability_promotion_performed = false`;
- `marketplace_listing_performed = false`;
- staged records keep `marketplace_listing_allowed = false`;
- replay claims prevent duplicate event processing;
- batch digest uniqueness prevents duplicate batch persistence;
- staging variant uniqueness prevents duplicate variant persistence within a batch;
- direct private-table access is revoked;
- server functions use SECURITY DEFINER boundaries and service-role-only execution where required.

The quarantine reason domain currently includes validation failures such as:

- duplicate external variant reference;
- undeclared warehouse country;
- invalid image URL;
- too many images;
- too many attributes;
- invalid attribute;
- overlong reference;
- overlong title.

Admin-oriented staging review infrastructure also exists and is intentionally review-only before canonical import/publication.

### Command Center rule

The Vendor Feeds & Quarantine module must read sanitized server-projected staging/quarantine state. It must never query the private tables directly from the browser.

The module may initially expose:

- supplier/feed batch summary;
- accepted vs quarantined counts;
- quarantine reasons;
- duplicate/replay status;
- staging age;
- canonical-review readiness;
- existing supplier/provider kill-switch state.

It must not automatically publish staged records.

## 4. Supplier governance / circuit breakers

### Existing truth

`netlify/functions/admin-supplier-control-centre.ts` already provides an authenticated active-Admin boundary for supplier governance actions, including:

- status;
- risk-policy activation;
- security-posture updates;
- risk assessment;
- governance decision;
- supplier/provider kill switch;
- incident transition;
- SLA-breach transition.

The endpoint rejects raw secret/credential material in request payloads and operates through server RPCs.

### Command Center rule

Do not build a parallel supplier kill-switch implementation.

The future Vendor Feed and Autonomous Operations modules should consume or extend this control surface. Any new owner-only operation should be layered above the existing server governance contract, not bypass it.

## 5. Stripe events

### Existing truth

`src/pages/pixel-perfect/admin/AdminStripeEvents.tsx` already provides an Admin-only operational viewer over `stripe_events` and displays:

- event type;
- event ID;
- processing timestamp;
- processed / failed / skipped status;
- live/test mode;
- error detail/metadata.

The page is useful for webhook delivery, failure diagnosis and idempotency visibility.

### Command Center rule

System Health and Financial Ledger should consume Stripe event aggregates/alerts rather than replace the Stripe Events page.

Potential Command Center summaries:

- failed Stripe events in latest window;
- unprocessed/failed critical payment events;
- webhook error trend;
- latest successful live event;
- link to full `/admin/stripe-events` detail.

## 6. Payout requests

### Existing truth

`src/pages/pixel-perfect/admin/AdminPayouts.tsx` already provides business-operation controls over payout requests and calls existing RPCs for:

- approve;
- reject;
- complete.

### Command Center rule

Do not duplicate these payout mutation buttons in Financial Ledger.

Financial Ledger should focus on platform-wide reconciliation and exceptions. Human payout operations remain on the existing payout page unless a later explicit consolidation decision is made.

## 7. Order → Stripe Transfer → payout reconciliation

### Existing truth

`netlify/functions/_shared/orderTransfer.ts` contains important financial-integrity logic:

### `findOrderTransfer`

- prefers the DB-known Stripe Transfer ID;
- can recover by `transfer_group` after a crash/lost DB write;
- requires a single order-matching transfer;
- fails if multiple matching transfers exist;
- validates expected GBP currency;
- validates expected transfer amount when provided;
- validates expected destination when provided.

### `reverseOrderTransfer`

- uses deterministic caller-provided idempotency keys;
- detects fully reversed transfers;
- avoids racing multiple compensation paths into duplicate reversals.

### `reconcilePaidOrderPayout`

- reconciles a paid Stripe transfer with the `payouts` table;
- updates an existing exact order/transfer pair;
- otherwise inserts a paid payout record;
- detects unique-key races;
- verifies a raced record references the same transfer ID;
- fails on conflicting transfer records.

### Command Center rule

The Financial Ledger should expose the exceptions this code already understands rather than invent a separate accounting truth.

Candidate exception classes:

- paid order with no recoverable transfer;
- more than one Stripe transfer for one order;
- transfer amount mismatch;
- transfer destination mismatch;
- DB payout missing for an existing transfer;
- conflicting Stripe transfer recorded for one order;
- fully/partially reversed transfer state inconsistent with refund/dispute state;
- webhook failure preventing reconciliation.

Any future reconciliation action that moves money remains a financial mutation and must not be automatically enabled by the initial Command Center implementation.

## 8. Shipment stall detection

### Existing truth in PR #682

The active Autonomous Operations branch contains `netlify/functions/_shared/shipmentStallAutomation.ts`.

The current decision contract:

- uses a default no-activity threshold of 48 hours;
- excludes terminal shipment states;
- considers latest tracking event, update time or creation time;
- marks missing tracking timestamps as an exception;
- emits whether a carrier case/customer notification should be created;
- explicitly records `externalMutationPerformed: false`.

### Command Center rule

Logistics & Exceptions may display stalled shipment decisions before any carrier-write automation is enabled.

The initial surface should be read-only/decision-support:

- shipment/order reference;
- carrier/provider;
- latest observed activity;
- stall age;
- reason;
- recommended action;
- autonomy level / capability gate;
- owner/admin action link.

## 9. Autonomous Operations / Intelligence — PR #682

### Existing truth in active draft branch

PR #682 introduces or consolidates:

- Provider Capability Registry;
- Autonomy Ladder foundation;
- Evidence/Decision model;
- unified exception model;
- autonomous kill-switch model;
- supplier feed circuit breakers;
- shipment stall automation;
- customer order support;
- return eligibility automation;
- signed Direct Supplier feed ingress.

The capability registry is fail-closed:

- missing capability → unavailable;
- unverified capability → unavailable;
- kill-switched capability → manual-only / external write denied;
- PII disclosure requires an explicit compatible grant;
- generic external mutation requires verified write-capable evidence and policy gates.

PR #682 remains a DRAFT workstream and must not be treated as merged production truth until merged and validated.

### Command Center rule

The fifth Command Center module is the visual/operational projection of this control-plane state, not a separate intelligence engine.

## 10. System Health sources

### Existing truth

Repository tooling already includes:

- migration-health verification (`npm run verify:migrations`);
- local/CI lint and build gates;
- release-hardening DB-lint guidance;
- Google GSI integration through `https://accounts.google.com/gsi/client`;
- release checkpoints that record runtime evidence and distinguish PASS from NOT EXECUTED.

### Command Center rule

Never synthesize a green health state from static code presence.

Every System Health item must carry evidence metadata such as:

- source;
- environment;
- checked_at;
- status: pass / warn / fail / unknown / not_executed;
- evidence/ref;
- freshness/TTL;
- last known good time;
- current blocker.

Stale or missing evidence must degrade to UNKNOWN/WARN, never PASS.

## 11. Initial non-mutation architecture

Safe initial Command Center phase:

1. Owner/Admin access contract design only.
2. Server-projected read models.
3. Read-only dashboards.
4. Deep links to existing mutation pages.
5. Existing supplier kill switches may be surfaced only after authorization semantics are preserved exactly.
6. No automatic refund.
7. No automatic payment mutation.
8. No supplier live-order submission.
9. No automatic marketplace publication from feed staging.
10. No PII disclosure without explicit verified capability.

## 12. Truth labels for implementation planning

Use these labels in future design documents and code reviews:

- `EXISTING_MAIN_TRUTH` — merged on current `main`.
- `DRAFT_BRANCH_TRUTH` — implemented on an active unmerged branch; must not be assumed in production.
- `DESIGN_TARGET` — desired behavior not yet implemented.
- `EXTERNAL_EVIDENCE_BLOCKED` — requires provider/runtime evidence.
- `NOT_EXECUTED` — validation has not run; never reinterpret as PASS.

This ledger is documentation-only and intentionally introduces no runtime behavior.