# LOADIFY SUPPLIER COMMERCE — NEXT CHAT CHECKPOINT

**Checkpoint date/time:** 2026-08-30 23:59 Europe/London  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Checkpoint branch:** `docs/supplier-commerce-next-chat-checkpoint-20260830-2359`  
**Checkpoint baseline main:** `3093a415b19144794347e1674baa944115bc3693`

This checkpoint supersedes the execution position in:

- `docs/checkpoints/LOADIFY_SUPPLIER_COMMERCE_NEXT_CHAT_CHECKPOINT_2026-08-30_2337.md`
- `docs/checkpoints/LOADIFY_SUPPLIER_COMMERCE_CONTINUITY_CHECKPOINT_2026-08-30.md`

Do **not** repeat the historical Supplier Commerce / Avasam audit. Start from the GitHub truth recorded below, then verify that `main` has not moved unexpectedly.

---

## 1. WHAT WE ARE BUILDING

Loadify Market is being evolved into a **Multi-Provider Supplier Commerce Engine** with one canonical Loadify commerce path:

`Supplier/provider`
→ `SupplierAdapterV1`
→ normalized catalogue/offers
→ controlled Loadify import/listing
→ stock/price synchronization
→ canonical Loadify checkout/order
→ supplier order submission
→ acknowledgement
→ shipping/tracking
→ cancellation/returns/reimbursement
→ Loadify reconciliation.

Target providers:

- Avasam;
- BigBuy;
- Direct Suppliers / manufacturers / wholesalers;
- later Syncee, AppScenic, SaleHoo and other providers only after provider/API/compliance gates.

There must be **no parallel checkout/order/payment/escrow architecture**. Supplier Commerce must attach to the existing canonical Loadify order and Stripe/idempotency/reconciliation model.

---

## 2. CURRENT VERIFIED GITHUB TRUTH

At this checkpoint, `main` is exactly:

`3093a415b19144794347e1674baa944115bc3693`

This commit is the merge of PR #651 and has parents:

- previous `main`: `c8f315b7ea26acb1ac76d7b52f1782376eb573c1`;
- Direct Supplier admission HEAD: `5fbce859b54f91572220dee65d2e4633be68b627`.

### PR state

| PR | Purpose | State | Important SHA / truth |
|---|---|---|---|
| #647 | Encode Avasam Gate B commercial capability policy | **CLOSED / NOT MERGED** | original validated HEAD `af3d7f841541f3ece1d929927591119cfe18666c`; blocked only by connector Draft→Ready defect |
| #650 | Administrative replacement for #647 using exact same Avasam HEAD/code | **MERGED** | merge commit `1930ea2024e5bc893cea73a5b51b4ec2f81f1297` |
| #649 | Prepare explicit BigBuy sandbox read-only probe | **MERGED** | probe HEAD `370416b1ffdcc630dc5033ae22551339a7e60958`; merge commit `c8f315b7ea26acb1ac76d7b52f1782376eb573c1` |
| #651 | Add fail-closed Direct Supplier feed admission gate | **MERGED** | HEAD `5fbce859b54f91572220dee65d2e4633be68b627`; merge commit/current main `3093a415b19144794347e1674baa944115bc3693` |

### Paused unrelated branch

`test/e2e-role-fixtures-20260830` remains **PAUSED** and is not the current Supplier Commerce objective.

---

## 3. AVASAM — CURRENT FINAL STATE

Avasam read-only provider evidence already exists for:

- authentication;
- `catalog`;
- `stock`;
- `price`;
- supplier `GB010107`;
- SKU `S0671779793`;
- GB territory.

Avasam Gate B is now encoded in `main` through PR #650.

### Advertisable / verified implementable capabilities

Only:

- `catalog`;
- `stock`;
- `price`.

### Still blocked / not provider-authoritatively verified

- shipping;
- order submission;
- acknowledgement;
- tracking;
- cancellation;
- returns;
- reimbursement.

Those capabilities must remain blocked or manual-only until there is a provider-authoritative contract/evidence for them.

### Avasam safety state

- Orders = **OFF**;
- PII = **OFF**;
- hosted Supplier Commerce activation = **OFF**;
- no live supplier order testing;
- no listing activation caused by Gate B;
- no checkout/Stripe/Auth/Super Admin/Seller Workspace/Web Mobile changes.

### Exact validation evidence retained from the original Avasam HEAD

For exact HEAD `af3d7f841541f3ece1d929927591119cfe18666c`:

- `npm ci` PASS / 0 vulnerabilities;
- targeted Avasam tests: 3/3 files PASS, 16/16 tests PASS;
- `npm run typecheck` PASS;
- `npm run lint` PASS;
- `npm run build` PASS;
- 2377 modules transformed;
- clean worktree;
- Netlify Deploy Preview SUCCESS.

Do not rerun these merely to reproduce history unless the Avasam code changes.

---

## 4. BIGBUY — CURRENT STATE

### What is now merged

PR #649 added a **manual explicit sandbox-only read-only probe**:

`scripts/audit/bigbuy-sandbox-readonly-probe.mjs`

Regression file:

`scripts/audit/bigbuy-sandbox-readonly-probe.test.mjs`

Canonical preparation checkpoint:

`docs/canonical/loadify-supplier-commerce-2026-08-19/22_BIGBUY_SANDBOX_READONLY_PROBE_PREPARATION_2026-08-30.md`

### Probe hard safety contract

The probe is:

- hard-bound to `https://api.sandbox.bigbuy.eu`;
- sandbox first / production request fails closed;
- Bearer auth only;
- includes an unauthenticated negative control that must return 401/403;
- GET-only;
- does not call Orders;
- does not process PII;
- does not promote capabilities;
- does not log the API key;
- does not log complete commercial payloads;
- evidence output avoids actual SKU strings, price values and stock quantities.

Read-only endpoint allowlist encoded in the probe:

- `/rest/catalog/products.json`;
- `/rest/catalog/productsvariations.json`;
- `/rest/catalog/productsstockbyhandlingdays.json`;
- `/rest/catalog/productsvariationsstockbyhandlingdays.json`.

### Required secure environment values — exact names

The real probe requires all of:

- `BIGBUY_API_KEY`;
- `BIGBUY_PROBE_PARENT_TAXONOMY`;
- `BIGBUY_PROBE_PRODUCT_ID`;
- `BIGBUY_PROBE_PRODUCT_SKU`;
- `BIGBUY_PROBE_VARIATION_ID`;
- `BIGBUY_PROBE_VARIATION_SKU`.

Optional/guard variable:

- `BIGBUY_API_ENVIRONMENT=sandbox`.

**Never place the API key in chat, git, checkpoint files, PR comments or logs.** Inject it from an authorized local/secret environment.

### Real BigBuy evidence status

**NOT EXECUTED.**

At this checkpoint there is no authorized BigBuy sandbox credential + controlled provider IDs available in the active workstream.

Therefore BigBuy remains:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- runtime adapter capabilities = `[]`;
- hosted activation = `OFF`.

### What the real BigBuy probe must prove before any promotion

1. negative control rejects unauthenticated request with 401/403;
2. authenticated Bearer request succeeds;
3. controlled product exists exactly once by ID + SKU;
4. product exposes valid `wholesalePrice` and active flag;
5. controlled variation exists exactly once by ID + SKU;
6. variation is bound to the controlled product;
7. product stock response shape is real and valid;
8. variation stock response shape is real and valid;
9. no Orders/PII/write endpoint was touched.

Only after the **actual response evidence** exists may exact BigBuy read capabilities be promoted. Provider documentation alone is not live Loadify evidence.

---

## 5. DIRECT SUPPLIER — CURRENT STATE

Existing foundation before PR #651 already included:

- `netlify/functions/_shared/directSupplierContract.ts`;
- `netlify/functions/_shared/directSupplierOnboarding.ts`;
- `netlify/functions/_shared/directSupplierSecurity.ts`;
- `netlify/functions/__tests__/direct-supplier-secure-ingestion.test.ts`.

That foundation provides:

- provider-neutral feed contract;
- onboarding manifest;
- PII-free webhook envelope;
- HMAC-SHA256 verification over exact raw body;
- timestamp tolerance;
- atomic replay-store interface;
- explicit requirement that production replay protection use durable shared storage;
- commercial approval false / hosted activation off enforcement.

### PR #651 now merged

New module:

`netlify/functions/_shared/directSupplierFeedAdmission.ts`

New regression coverage:

`netlify/functions/__tests__/direct-supplier-feed-admission.test.ts`

Canonical gate document:

`docs/canonical/loadify-supplier-commerce-2026-08-19/23_DIRECT_SUPPLIER_FEED_ADMISSION_GATE_2026-08-30.md`

### Admission pipeline behavior

`prepareDirectSupplierFeedForStaging()` accepts only existing Loadify-owned contracts:

- `DirectSupplierOnboardingManifestV1`;
- `DirectSupplierFeedBatchV1`.

It requires:

- supplier key match;
- feed transport match;
- onboarding intent for catalogue/variants/price;
- stock intent when stock quantities are present.

It normalizes valid records into **non-commercial staging candidates** and:

- trims/normalizes references and metadata;
- normalizes currency/country;
- accepts HTTPS-only image URLs;
- bounds attributes and metadata;
- produces SHA-256 source-record digest;
- sets `ingestionState = staged_candidate`;
- sets `marketplaceListingAllowed = false`.

It quarantines ambiguous/unsafe records including:

- duplicate external variant reference;
- undeclared warehouse country;
- invalid/non-HTTPS images;
- excessive image count;
- invalid/excessive attributes;
- oversized references/title.

For duplicate external variant references, **every occurrence is quarantined**. The system does not select an arbitrary winner.

### Direct Supplier activation truth

Still:

- `codeState = scaffolded_unverified`;
- `verifiedCapabilities = []`;
- runtime adapter capabilities = `[]`;
- hosted activation = `OFF`.

No real supplier has been activated by this work.

### PR #651 validation truth

- GitHub mergeable = true before merge;
- Netlify Deploy Preview #651 = **SUCCESS** on exact HEAD `5fbce859b54f91572220dee65d2e4633be68b627`;
- PR #651 = MERGED;
- `main` = `3093a415b19144794347e1674baa944115bc3693`.

Do **not** claim local targeted Vitest/typecheck/lint results for #651 unless they are run later; only the remote Netlify gate is recorded here for that HEAD.

---

## 6. SUPABASE / MIGRATION GOVERNANCE — IMPORTANT BLOCKER

During this continuation the connected Supabase MCP returned:

`projects: []`

So the correct hosted Loadify Supabase project could **not** be discovered/re-queried through the connected MCP surface in this session.

The local runtime also did not provide Supabase CLI.

Consequences:

- no hosted schema mutation was attempted;
- no hosted migration was applied;
- no timestamped migration file was invented;
- no public Direct Supplier ingestion endpoint was published;
- no durable replay/staging persistence was falsely claimed.

Current Supabase guidance used in this work requires migration creation/governance through the supported CLI/workflow rather than fabricating migration history.

### Repo-side schema evidence already exists

The repository already references Supplier Commerce private tables such as:

- `private.supplier_import_items`;
- `private.supplier_offers`;
- `private.supplier_stock_observations`;
- `private.supplier_price_observations`;
- `private.supplier_pricing_snapshots`;
- Supplier fulfilment/order/tracking/returns/recovery tables.

For example, `20260825160000_supplier_commerce_hot_path_indexes.sql` indexes those surfaces.

**Important:** repo migration presence does not prove that the same migration set is applied to hosted Supabase. Hosted truth must be reconciled before activation.

---

## 7. EXACT ORDER FOR THE NEXT CHAT

### STEP 0 — recover truth, do not restart audit

Immediately verify:

1. `main` current SHA;
2. PR #650 is MERGED;
3. PR #649 is MERGED;
4. PR #651 is MERGED;
5. this checkpoint file and its PR/commit;
6. no unexpected Supplier Commerce commits landed after `3093a415...`.

If `main` moved, inspect only the delta after this checkpoint; do not repeat the historical audit.

### STEP 1 — BigBuy real sandbox read-only probe

This is still the first provider gate because code preparation exists but live provider evidence does not.

Use only an authorized sandbox credential and controlled IDs/SKUs.

Run the already-merged script manually, not from prebuild/build/GitHub Actions.

Expected command once the environment is securely populated:

`node scripts/audit/bigbuy-sandbox-readonly-probe.mjs`

Required conditions:

- `BIGBUY_API_ENVIRONMENT=sandbox`;
- negative auth control first;
- no Orders;
- no PII;
- no provider writes;
- no full commercial payload logging.

If any response shape does not match reality, **change the probe/adapter to the real provider contract**. Do not bend or mock the provider response.

If credentials are still unavailable, BigBuy remains `verifiedCapabilities=[]`; move only to work that does not depend on falsely claiming BigBuy verification.

### STEP 2 — reconnect/discover real Supabase project and reconcile migrations

Before any new Supplier Commerce persistence:

1. make the correct Supabase project visible through the authorized connector/CLI;
2. identify project ref explicitly;
3. inspect migration history in repo vs hosted DB;
4. inspect relevant private Supplier Commerce tables/functions/policies/grants;
5. run security/performance advisors where available;
6. establish which Supplier Commerce migrations are actually applied and which are not.

Do not infer hosted state from repository files.

### STEP 3 — durable Direct Supplier replay + staging/quarantine persistence

Only after Step 2.

Create migration through normal Supabase migration tooling.

The persistence design must provide at minimum:

- durable atomic event/replay claim;
- expiry/retention handling;
- server-only staging persistence;
- quarantine/rejection persistence with reason codes;
- batch/source correlation and idempotency;
- no customer PII at this boundary;
- no browser/public role access;
- explicit least-privilege grants;
- RLS/privilege posture consistent with private/server-only schema;
- no `SECURITY DEFINER` shortcut that accidentally exposes a callable public surface.

Do not finalize table/function names until existing hosted schema is reconciled; avoid duplicate architecture.

### STEP 4 — server-only Direct Supplier ingestion route

Only after durable storage exists.

Required sequence:

`exact raw body`
→ verify HMAC/timestamp
→ parse/validate envelope/feed
→ atomically claim replay/idempotency event
→ run Direct Supplier admission pipeline
→ persist staging candidates + quarantine records
→ return sanitized acknowledgement.

No marketplace listing side effect at this gate.

No supplier order side effect at this gate.

### STEP 5 — controlled real Direct Supplier feed

Use one approved real manufacturer/wholesaler onboarding manifest and controlled feed.

Verify only actual read/ingestion capabilities proven by the supplier contract/feed.

A requested capability in onboarding is **not** a verified capability.

Only after real evidence may exact Direct Supplier read capabilities be promoted.

### STEP 6 — canonical supplier product import

After accepted staging data exists.

First inspect/reuse existing canonical Supplier Commerce import surfaces; do not create a second importer if `supplier_import_items` / catalogue/offer mapping already cover the need.

Required outcomes:

- deterministic supplier product/variant identity mapping;
- canonical Loadify product linkage;
- offer mapping;
- provenance/provider/source references;
- idempotent re-import/update behavior;
- quarantine/manual-review path;
- no automatic listing merely because import succeeded.

### STEP 7 — stock/price synchronization engine

Build on verified provider read contracts and canonical imported offers.

Requirements:

- idempotent observations;
- source timestamps/correlation;
- stale-data handling;
- controlled retry/backoff;
- no silent fallback from malformed provider data;
- stock/price updates must never activate unapproved listings;
- reconciliation/audit trail.

### STEP 8 — controlled marketplace listing

Listing remains a distinct approval gate after canonical import and policy validation.

Preserve:

- existing marketplace product/listing rules;
- seller/supplier ownership mapping;
- single-seller checkout;
- existing checkout/payment contract;
- existing Seller Workspace/Super Admin visual behavior.

No automatic mass publishing from raw provider feeds.

### STEP 9 — supplier order lifecycle only after authoritative provider contracts

Do not connect write/order lifecycle for Avasam, BigBuy or Direct Supplier until the exact provider contract is verified for each capability.

Required provider-gated capabilities include:

- shipping;
- order submission;
- acknowledgement;
- tracking;
- cancellation;
- returns;
- reimbursement.

When enabled later, the supplier lifecycle must attach to the **canonical Loadify order**, not create another order system.

Unknown submit outcomes must not trigger blind duplicate submissions. Preserve idempotency/lost-response recovery rules.

### STEP 10 — migration governance + hosted activation gate

Hosted Supplier Commerce activation remains OFF until:

- provider capabilities are evidence-backed;
- migrations are reconciled/applied safely;
- RLS/privilege/advisors are clean enough for the intended surface;
- ingestion/import/sync/listing flows have controlled E2E evidence;
- canonical checkout/order/Stripe/reconciliation remains intact;
- no hidden parallel architecture exists.

---

## 8. PROVIDER CAPABILITY LEDGER AT THIS CHECKPOINT

| Provider | Code state | Verified capabilities | Hosted activation | Next evidence |
|---|---|---|---|---|
| Avasam | `verified_read_only` | `catalog`, `stock`, `price` | OFF | authoritative commercial/write capability contracts before any promotion |
| BigBuy | `scaffolded_unverified` | `[]` | OFF | real authenticated sandbox product/variation/stock probe |
| Direct Supplier | `scaffolded_unverified` | `[]` | OFF | durable persistence + controlled real approved supplier feed |
| Syncee | partner access required | `[]` | OFF | provider coordination/API contract |
| AppScenic | partner access required | `[]` | OFF | retailer-side provider/API contract |
| SaleHoo | directory/API approval required | `[]` | OFF | approved API/use case |
| Spocket | contract blocked | `[]` | OFF | explicit written permission compatible with marketplace resale |
| AliExpress/DSers | future compliance gate | `[]` | OFF | UK import VAT/customs/product-safety/returns controls + provider contract |

---

## 9. NON-NEGOTIABLE GUARDRAILS

- **NO GitHub Actions.**
- Local CLI + Netlify Deploy Preview only for ordinary repository validation.
- **NO Web Mobile.**
- **NO PR #359 Workspace visuals.**
- **NO Seller Workspace redesign.**
- **NO Super Admin redesign.**
- **NO Auth modifications** as part of Supplier Commerce.
- **NO checkout/payment contract changes.**
- **NO Stripe architecture changes.**
- **NO RLS/security relaxation.**
- **NO invented provider credentials.**
- **NO invented provider endpoints/capabilities.**
- **NO Orders/PII activation for probing.**
- **NO parallel checkout/order/payment/escrow architecture.**
- preserve single-seller checkout;
- preserve canonical Loadify order;
- preserve canonical Stripe webhook/idempotency;
- preserve escrow/reconciliation behavior;
- never use a real supplier order as a probe;
- never use a real Stripe transfer/refund/capture as a test.

---

## 10. IMPORTANT TRUTH / LANGUAGE RULES FOR CONTINUATION

Always distinguish:

- **implemented in code**;
- **locally tested**;
- **Netlify preview validated**;
- **provider-documentation supported**;
- **live provider verified**;
- **repo migration exists**;
- **hosted migration applied**;
- **capability requested**;
- **capability verified**;
- **hosted activation enabled**.

These are not interchangeable.

Never report a provider capability as verified merely because:

- a provider documentation page says the endpoint exists;
- a scaffold contains a method;
- a synthetic test passes;
- a potential capability is listed in `supplierProviderRegistry.ts`.

Never report a migration as hosted merely because the SQL file exists in `supabase/migrations`.

---

## 11. FIRST PROMPT FOR THE NEXT CHAT

Use this exact intent:

> Continue Loadify Supplier Commerce from `docs/checkpoints/LOADIFY_SUPPLIER_COMMERCE_NEXT_CHAT_CHECKPOINT_2026-08-30_2359.md`. Verify current `main` and the checkpoint PR/commit first. Do not repeat the historical audit. Continue evidence-first in this order: BigBuy real sandbox read-only probe → Supabase hosted migration reconciliation → durable Direct Supplier replay/staging persistence → server-only ingestion → controlled real Direct Supplier feed → canonical supplier import → stock/price sync → controlled listing → provider-gated supplier order lifecycle → final hosted activation governance. Preserve every guardrail in the checkpoint.

---

## 12. STOP CONDITIONS

Stop capability promotion immediately when:

- live provider authentication is unavailable;
- controlled provider identity/SKU/variant binding is unavailable;
- response shape is ambiguous/malformed;
- provider order contract is not authoritative;
- hosted migration state cannot be proven;
- security/RLS/privilege requirements would need relaxation;
- implementation would create a second checkout/order/payment architecture;
- a test would require real customer PII, supplier order or real Stripe movement.

Fail closed and record the blocker instead of filling gaps with assumptions.
