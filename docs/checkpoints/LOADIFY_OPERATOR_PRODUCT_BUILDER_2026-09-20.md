# Loadify Operator Product Builder — Checkpoint — 2026-09-20

## Scope

Isolated implementation worktree:
`D:\LoadifyMarket-OperatorBuilder`

Branch:
`feat/operator-product-builder-20260920`

Base:
`origin/main` at `55bcb89d`

This branch must remain separate from the active Stripe/Auth branch and from the Google Play release work until review.
## Operating model locked

- Loadify has **no physical warehouse**.
- Supplier/fulfilment provider owns or controls stock and fulfils directly to the buyer.
- Loadify keeps the buyer journey, checkout, order, tracking, support, returns/refunds and governance inside Loadify.
- Provider integrations are optional adapters; Avasam/BigBuy/etc. are not blockers for platform completion.
- URL/manual/feed sourcing is candidate intake only and never implies rights, compliance, publication or commercial activation.
## Implemented in this branch

1. Admin route: `/admin/product-sourcing`.
2. Product URL inspection endpoint with SSRF controls and JSON-LD/OpenGraph fact extraction.
3. Direct Supplier governed staging review integration.
4. Phase F canonical import planning integration.
5. Phase G supplier economics decision surface for `loadify_supplier_fulfilled` / GB.
6. AI Product Builder facts-lock contract.
7. Admin AI Product Builder brief endpoint.
8. AI brief UI remains provider-disabled and publication-disabled.
## Safety / governance

The sourcing UI and endpoints are admin-only.

Product source preview returns candidate facts only:
- asset rights: unverified
- supplier identity: required
- compliance review: required
- marketplace listing: forbidden
- commercial activation: forbidden

AI Product Builder:
- requires facts verification
- may improve presentation only
- must not invent unsupported specifications, certification, safety, material, origin, warranty, compatibility, performance, medical, authenticity or delivery claims
- cannot publish from the brief endpoint
## Verification completed

- Targeted Product Sourcing / AI tests: **19/19 PASS**
- TypeScript: **PASS**
- ESLint on changed/new files: **PASS**
- Migration health: **PASS**
- Build security tests: **9/9 PASS**
- Production Vite build: **PASS**

Build warning remains the existing large-chunk warning for `heic2any`; it is not introduced by this feature.
## Next implementation steps

1. Replace manual JSON canonical mapping UI with guided record mapping cards.
2. Bind AI Builder input to canonical verified facts rather than operator-entered/candidate facts.
3. Add provider abstraction for live AI generation behind an explicit server-side feature flag.
4. Require structured output and post-generation evidence validation.
5. Build editable merchandising preview: title, description, benefits, SEO, FAQ and creative brief.
6. Add final governed Review → Publish gate without warehouse assumptions.
7. Run local authenticated E2E against a real supplier candidate before any merge or deployment.

## Continuation — canonical facts + merchandising editor

- Canonical verified facts reader hardened to `SECURITY INVOKER`.
- Function execution remains service-role only; `anon` / `authenticated` / `PUBLIC` are revoked.
- Service role receives only the private schema/table read privileges required for this server-side path.
- AI Builder now reads canonical verified facts server-side; client-supplied candidate facts are not accepted.
- Merchandising editor added for title, description, benefits, SEO title/description, FAQ and creative brief.
- Marketplace and SEO previews added.
- Draft remains non-persistent and non-publishable until later review/publish gates.

Verification after this continuation:
- migration health: PASS
- focused canonical/AI tests: 13/13 PASS
- TypeScript: PASS
- ESLint: PASS
- production build: PASS

## Continuation — AI generation boundary + publication gate

- Added read-only Review & Publication Gate using the existing supplier import and supplier economics decisions.
- Gate covers canonical import approval, verified facts, asset-rights clearance, GB compliance, landed cost, tax, pricing and margin.
- Gate performs no marketplace mutation, no supplier write and no publication.
- Added provider-independent server-side AI generation adapter behind `LOADIFY_AI_PRODUCT_BUILDER_ENABLED=false` by default.
- Provider URL, API key and model are server-only environment variables; no `VITE_` secret is used.
- Generated merchandising output must use the structured evidence contract and reference only verified canonical fact keys.
- Output that cites unverified evidence is rejected before it reaches the editor.
- Added admin Generate AI Draft flow; button remains disabled until a provider is explicitly configured.
- Canonical-facts migration was recreated using `supabase migration new verified_canonical_product_facts_read`, producing `20260920191509_verified_canonical_product_facts_read.sql`.
- Supabase current guidance checked: restricted functions should revoke default EXECUTE access; the canonical-facts reader remains SECURITY INVOKER and service-role-only.

Verification:
- focused Product Sourcing / AI / publication-gate suite: **20/20 PASS**
- migration health: **PASS**
- TypeScript: **PASS**
- ESLint: **PASS**
- production build: **PASS**
