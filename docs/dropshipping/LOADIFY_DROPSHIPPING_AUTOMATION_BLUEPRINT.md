# LOADIFY MARKET - DROPSHIPPING & SUPPLIER AUTOMATION BLUEPRINT

Status: repository-aligned working blueprint
Last reviewed: 2026-09-11
Scope: Website + shared backend. Android consumes shared operational state but does not expose supplier credential/configuration screens.

## 1. Architectural position

Loadify Market remains a pure digital multi-vendor marketplace with no Loadify-owned physical inventory or warehouse operations. Supplier-fulfilled inventory may be used only when supplier qualification, compliance, fulfilment, stock, pricing and tracking controls pass the platform's existing governance boundaries.

The canonical stack is the repository stack: React + TypeScript + Vite, Supabase, Netlify Functions, Stripe Connect and Capacitor. Existing production-grade marketplace, payout, return, shipment and supplier-governance flows always take precedence over sample code from earlier planning documents.

This blueprint is not a copy-paste implementation guide. It records approved product intent and the integration rules that new code must satisfy.

## 2. Decisions adopted from the original information blueprint

- Support provider-neutral dropshipping/supplier integrations.
- Support generic supplier feeds in CSV, XML and JSON when source integrity can be verified.
- Support direct provider adapters such as AppScenic, Spocket and Syncee only after current provider APIs and commercial permissions are independently verified.
- Require supplier warehouse/origin evidence and UK-delivery capability before a supplier can become commerce-active.
- Keep Royal Mail as the primary carrier and Evri as the approved alternative for current UK marketplace fulfilment unless policy configuration is intentionally expanded.
- Require tracking within the supplier SLA and enforce a maximum acceptable end-to-end delivery window through versioned SLA policy, not ad-hoc product fields.
- Preserve immutable return-address snapshots for active returns.
- Synchronise price and stock automatically, with validation and auditability before public catalogue state changes.

## 3. Existing repository systems that must be reused

Do not create a parallel `public.sellers` model or expose raw provider credentials to browser-accessible tables. The repository already contains a supplier foundation with lifecycle, qualification evidence, SLA versions, compliance profiles, provenance, provider-neutral adapter registrations, security posture, risk assessment, SLA breach evidence, incidents and kill-switch controls.

All new supplier integrations must attach to those canonical entities and pass `server_supplier_foundation_decision_v1` or its future versioned successor before they can affect sellable inventory.

The existing Stripe/payment architecture remains canonical. Supplier or seller refund features must reuse the current PaymentIntent/order/payout reconciliation, transfer reversal, idempotency and webhook boundaries. No new endpoint may trust a client-supplied seller identity for a financial action.

Existing shipment and return flows remain canonical. Supplier fulfilment extends them; it does not replace them.

## 4. Credential and adapter security

Provider API credentials must be accepted only by authenticated server-side endpoints and stored behind a secret/credential boundary. UI may display connection status, provider name, masked identifier, rotation state and last verification time, but never the raw secret after submission.

Supplier security posture must continue to forbid raw API keys, access tokens, refresh tokens, private keys or passwords inside governance evidence or audit JSON.

Every provider adapter must declare capabilities such as catalog, variants, stock, price, shipping, order submission, acknowledgement, tracking, cancellation, returns and reimbursement. Activation requires verification evidence and an approved supplier lifecycle state.

Provider API URLs, authentication formats, webhooks, rate limits and scopes must be validated against current provider documentation before enabling an adapter. Example endpoints from planning documents are non-authoritative.

## 5. Website: Supplier Integration Hub

The seller website may expose a Supplier / Dropshipping Integration Hub. It should show connected providers, feed integrations, health, last successful sync, last error, products affected, SLA state and whether commerce writes are currently allowed.

The hub may support generic CSV/XML/JSON mapping for canonical fields including SKU/external reference, title, price, stock, warehouse/origin, lead time and optionally carrier/service data. Mapping analysis must be performed server-side against a bounded fetch, not simulated with hard-coded headers.

A seller must be able to disable an integration without deleting its audit history. Failed or stale integrations must fail closed for new supplier-driven catalogue writes when required evidence or credentials are invalid.

## 6. Synchronisation engine

Scheduled sync belongs in the existing `netlify/functions-modern` deployment model. New schedules must be merged into the current `netlify.toml`; do not replace its build command, functions directory, redirects, security headers, edge functions or existing scheduled jobs.

Each sync cycle should follow this sequence:
1. Resolve active adapter/feed configuration through the server-side integration boundary.
2. Re-evaluate supplier eligibility, compliance, security posture and required adapter capability.
3. Fetch provider/feed data with strict timeout, response-size, content-type and rate-limit controls.
4. Normalise external records into a provider-neutral internal representation.
5. Validate external reference/SKU, price, stock, origin/warehouse evidence, fulfilment lead time and permitted carrier/service.
6. Apply updates only to products linked to that supplier/provider identity; never match globally on SKU alone.
7. Persist sync result, counts, rejected records, errors and source/provenance evidence without storing secrets.
8. Emit operational alerts for stale stock/price, repeated sync failures or SLA/security breaches.

A third-party response must never directly overwrite public catalogue price or stock without validation. Material changes should remain attributable to provider, supplier, sync execution and source record.

## 7. SLA and fulfilment policy

Tracking and dispatch limits must be represented through the existing versioned supplier SLA model. A 48-hour tracking deadline and target 2-5 day delivery window may be adopted as policy values where commercially approved, but must not be implemented as a universal trigger that rewrites every product row.

The original planning statement allowing UK/EU warehouses requires a precise policy definition before EU suppliers are enabled. Warehouse country, cross-border transit, customs/tax handling and delivery-to-UK SLA must all satisfy the active supplier policy. A sync adapter must not interpret an undocumented or missing origin as UK.

Current carrier enforcement remains Royal Mail / Evri for the marketplace flows already restricted to those carriers. Any expansion requires a deliberate policy/configuration migration and end-to-end testing.

## 8. Returns and refunds

Supplier-fulfilled returns must use an immutable return-address snapshot captured when the return flow becomes actionable. Later supplier warehouse/profile changes must not silently alter an already-issued return instruction.

Android and website should both display the same canonical return destination and return status. Configuration of supplier credentials and feeds remains website-only; buyer/seller operational status remains available wherever order/return management is supported.

Refund execution must stay inside the repository's existing Stripe-aware refund boundary. Any supplier reimbursement or transfer reversal must be idempotent, auditable and reconciled with seller balances/payouts.

## 9. Android parity rules

Android does not need provider API-key or feed-mapping screens. It must consume the consequences of supplier automation consistently: current price/stock, availability, supplier-fulfilled status where relevant, dispatch/tracking deadlines, shipment state, cancellation eligibility and return instructions.

A supplier suspension, risk kill-switch, stale/invalid stock condition or marketplace pause must prevent purchase in both web and Android through shared backend enforcement, not UI-only checks.

## 10. Commission and commercial rules

Commission policy is financial configuration and must be validated against the live commission engine before any promotional 0% or future 7% rule is changed. Planning-document dates/rates are not self-executing requirements. Stripe amounts, seller balances and payouts must derive from one canonical commission decision.

## 11. Implementation status / roadmap

- Existing: supplier foundation, qualification, SLA versions, compliance, provenance, adapter registry, security posture, risk/SLA governance and kill-switch foundations.
- Existing: marketplace checkout, Stripe Connect, payout reconciliation, shipment/tracking and return/refund foundations.
- Adopt: supplier integration hub for website.
- Adopt: secure provider credential boundary and verified provider adapters.
- Adopt: generic feed ingestion/mapping with server-side analysis.
- Adopt: scheduled stock/price sync with provenance, validation and stale-data controls.
- Adopt: immutable supplier return-address snapshot where not already guaranteed by the canonical return flow.
- Extend: Android operational parity for supplier-fulfilled orders; no provider configuration UI.
- Verify before implementation: provider APIs/contracts, EU warehouse policy, exact SLA values and commission promotion dates/rates.

## 12. Release gate

Supplier automation is not release-ready until migrations, typecheck, unit/integration tests, production build, Netlify configuration validation and Android shared-flow tests are green. Provider adapters require sandbox/staging verification before production activation. Pixel/Google Play testing remains a later gate for Android-facing changes.
