# Loadify Market — Multi-Country Expansion Master Plan

**Status:** CANONICAL / ACTIVE
**Created:** 24 September 2026
**Owner:** Loadify Market / XDrive Logistics Ltd
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`
**Canonical implementation worktree:** `D:\LoadifyMarket-Multicountry`
**Canonical implementation branch:** `feat/multicountry-uk-ro`
**Base:** `origin/main` at `eb005e5a` when the worktree was created.

> This document is the mandatory continuity source for every agent working on Loadify Market international expansion. Read it before modifying the project. Update it whenever an implementation phase is completed, materially changed, blocked, or superseded.

## 1. Mission

Transform Loadify Market from a UK-only marketplace into one multi-country marketplace platform that can operate in the United Kingdom, Romania, the European Union, and later additional countries without cloning the application into separate codebases.

Romania is the first expansion market and validation case. It must not be implemented as a Romania-specific architectural exception.

The target is:

`ONE APPLICATION + ONE CORE PLATFORM + MARKET-SPECIFIC CONFIGURATION`

Do not create a second Romanian application or duplicate the UK website.

## 2. Non-negotiable business model

Loadify Market is a marketplace/intermediary and technology-commerce platform.

- Loadify does not own supplier inventory.
- Loadify does not buy supplier stock in advance.
- Loadify does not operate a warehouse.
- Independent sellers/suppliers retain stock.
- Sellers/suppliers fulfil orders directly to buyers under the applicable marketplace arrangement.
- Loadify must not silently become retailer/reseller of record merely to make an integration work.
- Supplier integrations must preserve marketplace rights, product-data rights, stock/price availability, fulfilment responsibility and applicable compliance evidence.
- Existing UK operation must continue to work while new markets are introduced.
- Payment, tax and legal behaviour must be explicitly validated per market before real transactions are enabled.

## 3. Architecture rule

Country behaviour must be data/config driven. Do not scatter hard-coded `if Romania` logic through pages.

Each market requires a market configuration containing at minimum:

- country / market code
- locale
- language
- currency
- tax region
- shipping region
- legal/compliance region
- enabled/disabled state
- checkout-enabled state
- seller onboarding availability
- supplier availability
- catalogue/product availability
- payment capabilities
- domain/host aliases where applicable

Initial markets:

### United Kingdom
- code: GB
- locale: en-GB
- language: en
- currency: GBP
- tax region: UK
- shipping region: UK
- existing production behaviour must remain the safe default

### Romania
- code: RO
- locale: ro-RO
- language: ro
- currency: RON
- tax region: EU_RO
- shipping region: RO
- first international expansion market

The architecture must allow future configuration of other EU/EEA and non-EU markets without redesigning the core.

## 4. Country selection

The platform may detect a likely country and suggest it, but it must not permanently hard-lock the customer by IP/geolocation.

The user must have a visible manual market/language control.

Selection must persist.

Changing country must eventually affect:
- locale/language
- display currency
- catalogue availability
- seller/supplier availability
- shipping methods
- checkout eligibility
- tax treatment
- legal documents/disclosures
- search/SEO/canonical metadata where applicable

## 5. Domains and routing

Do not create independent application codebases.

Possible local domains (for example a future `loadifymarket.ro`) should point to the same platform and resolve market configuration from the host/routing layer.

The final domain strategy must preserve:
- one canonical application
- SEO/canonical/hreflang correctness
- market-aware deep links
- auth callback compatibility
- payment callback compatibility
- native-app deep-link compatibility
- no duplicate-content regressions

Do not change production domains until the routing/SEO/deployment plan is explicitly verified.

## 6. Currency rule — critical

Never relabel a GBP numerical amount as RON.

Displaying `100 RON` for a stored `100 GBP` is incorrect.

Before Romanian transactional launch, establish a canonical money model:
- source/listing currency
- settlement currency
- buyer display currency
- conversion rate source and timestamp where conversion applies
- rounding rules
- refunds/returns using the original transaction currency/rate rules
- Stripe/payment support for the selected market
- auditability

Until real conversion/market-native prices are implemented and tested, market-aware currency presentation must not create financially false values.

## 7. Catalogue and product availability

Products cannot automatically be assumed available in every country.

The final model must support market eligibility for:
- product/listing
- seller
- supplier
- stock
- delivery area
- prohibited/restricted category
- product compliance
- price/currency
- returns capability

A UK listing must not automatically become purchasable in Romania simply because the UI language changes.

## 8. Sellers and suppliers

Seller/supplier onboarding must become market-aware.

Store at least:
- operating country/countries
- dispatch country/countries
- delivery markets
- supported currencies
- tax/VAT identifiers as applicable
- trader/business identity evidence
- fulfilment capability
- returns address/region
- compliance/economic-operator information where required
- catalogue rights
- product safety/compliance evidence where applicable

Supplier Foundation remains shared. Country support is capability/configuration, not a duplicated supplier system.

## 9. Checkout and payments

Checkout is a high-risk boundary.

Before enabling a market for live checkout, verify:
- currency
- payment provider support
- seller/supplier settlement model
- VAT/tax handling
- delivery calculation
- address validation
- cancellation/refund lifecycle
- return lifecycle
- order records
- invoices/receipts
- disputes
- platform fees/commission
- Stripe webhook/event handling
- financial reconciliation

No market is considered transaction-ready merely because translated checkout screens render.

## 10. EU/Romania compliance workstream

Before live Romanian/EU commerce, perform a current legal/compliance implementation review using authoritative sources.

At minimum investigate and implement where applicable:
- Romanian/EU VAT
- VAT OSS/IOSS where applicable
- Digital Services Act marketplace/trader obligations
- General Product Safety Regulation
- product-specific EU compliance/CE obligations
- responsible/economic operator information where required
- consumer information requirements
- distance-selling withdrawal/returns rules
- seller/trader traceability
- prohibited/restricted products
- privacy/cookies/GDPR
- pricing/promotional-price rules
- Romanian-language mandatory consumer information
- cross-border shipping/customs implications where relevant

Do not copy UK legal pages and simply translate them.

Legal/compliance conclusions must be based on current authoritative sources and recorded in implementation evidence.

## 11. Internationalisation

Use a real internationalisation layer. Do not maintain separate Romanian page copies.

Required:
- translation keys
- EN and RO dictionaries initially
- locale-aware dates/numbers/currency
- language fallback
- no raw user-facing English strings in newly internationalised surfaces where practical
- market-specific legal copy separate from generic UI translation

Eventually internationalise:
- marketplace navigation
- catalogue
- product detail
- cart
- checkout
- buyer flows
- seller flows
- supplier flows
- auth/onboarding
- transactional notifications/emails
- help/support
- legal/compliance surfaces

## 12. SEO

International rollout must include:
- market/language metadata
- hreflang strategy
- canonical URL strategy
- sitemap strategy
- translated titles/descriptions
- local structured data
- no accidental indexing of incomplete market pages
- no duplicate UK/RO content without correct signals

## 13. Native Android/iOS considerations

The website and native app share substantial platform behaviour. Internationalisation must not break the current Android release.

Do not mix the international-expansion branch with the existing Android release work.

Native app eventually needs:
- market selector
- locale
- currency/money correctness
- market-aware catalogue
- market-aware checkout
- translated native-visible strings
- deep links
- store listing/localisation where launched

## 14. Current implementation state — 24 Sep 2026

A clean isolated worktree was created from current `origin/main`:

`D:\LoadifyMarket-Multicountry`

Branch:

`feat/multicountry-uk-ro`

The pre-existing Android release workspace `D:\LoadifyMarket-Release-v4` was intentionally left untouched because it contains active local Android/release artifacts.

Implemented and verified so far on the multi-country branch:
- `src/lib/marketConfig.ts` with GB/RO market metadata and live/prelaunch readiness gates
- persisted selected market with UK safe fallback
- `src/contexts/MarketContext.tsx` reactive provider/hook
- `src/lib/marketResolver.ts` saved-choice + domain resolver for loadifymarket.co.uk / loadifymarket.ro
- `src/components/marketplace/MarketSelector.tsx` in desktop header and mobile drawer
- `src/lib/money.ts` canonical money formatter that never relabels one currency as another
- legacy listing prices remain GBP until explicit currency/market pricing exists
- market/currency tests for GB default, RO persistence, hostname resolution and money safety
- hard-coded UK/GBP audit evidence saved at `docs/checkpoints/evidence/multicountry-hardcoded-uk-audit.txt`
- canonical commerce migration `20260924112000_multicountry_money_market_foundation.sql`
- product currency + market eligibility fields
- order/order-item/payment-session/payout market/currency fields
- checkout backend market gate and listing currency/market validation
- Romania checkout is intentionally disabled while the market is prelaunch
- UK remains the live/default market

Verification evidence:
- TypeScript: PASS
- ESLint: PASS
- migration health: PASS (211 canonical migrations)
- multi-country unit tests: PASS (10/10)
- production build: PASS
- existing build security tests: PASS (9/9)

Important: selecting Romania must never reinterpret a stored GBP amount as RON. Romania remains prelaunch until market-native pricing, tax, shipping and payment flows are explicitly validated.

## 15. Implementation phases

### Phase 0 — Foundation and continuity
- canonical master plan
- isolated worktree/branch
- baseline tests
- architecture inventory
- identify all UK/GBP hard-coding
- identify all legal/payment/shipping boundaries

### Phase 1 — Market kernel
- robust market configuration
- MarketProvider/context/store
- persistence
- market resolver
- manual selector
- host/domain resolver
- safe UK fallback
- tests

### Phase 2 — i18n
- internationalisation framework
- EN/RO dictionaries
- shared navigation/common components
- marketplace/catalogue/product UI
- account/auth surfaces
- fallback tests

### Phase 3 — Money and tax foundation
- canonical money representation
- source/display/settlement currency
- FX strategy if used
- market-native pricing where applicable
- tax/VAT data model
- price formatting
- financial tests

### Phase 4 — Catalogue market eligibility
- product market availability
- seller/supplier market capability
- market-aware search/catalogue/category/product detail
- shipping eligibility
- compliance gates

### Phase 5 — Seller/Supplier multi-country
- country-aware onboarding
- tax/business/trader data
- delivery markets
- returns region
- supplier feeds per market
- compliance evidence

### Phase 6 — Romania/EU legal/compliance
- authoritative legal audit
- RO/EU policies and disclosures
- DSA/GPSR/VAT/consumer requirements
- product/category restrictions
- evidence and tests

### Phase 7 — Checkout/order lifecycle
- Romanian address/shipping
- RON/approved currency flow
- Stripe/payment validation
- taxes
- order creation
- fulfilment
- cancellation
- returns/refunds
- notifications
- reconciliation
- E2E tests

### Phase 8 — SEO/domains
- domain strategy
- hreflang
- canonical
- sitemaps
- metadata
- indexing controls
- analytics market dimensions

### Phase 9 — Native
- Android market/i18n integration
- regression against current UK native app
- store localisation as needed

### Phase 10 — Romania launch gate
No public transaction launch until all P0 gates pass.

### Phase 11 — EU country factory
Once Romania proves the architecture, add countries through configuration + country compliance modules, not duplicated apps.

## 16. Launch gates

For every new country require evidence for:
- build/typecheck/lint/tests
- visual QA desktop/mobile
- real-data catalogue
- correct currency
- correct taxes
- correct shipping
- payment lifecycle
- refund/return lifecycle
- seller/supplier eligibility
- legal pages
- product safety/compliance
- notifications
- analytics
- SEO
- accessibility
- security/RLS/API boundaries
- production rollback plan

## 17. Regression rule

UK is the existing live market. Every international change must be tested for UK regression.

Do not sacrifice UK behaviour to add Romania.

Do not modify unrelated Android release artifacts while working on this branch.

Do not use mock/fake commerce data as proof that a transactional flow works.

## 18. Agent operating procedure

Every new agent/session must:

1. Read this entire file first.
2. Inspect the latest git status/log in `D:\LoadifyMarket-Multicountry`.
3. Read the latest checkpoint/status section in this file.
4. Do not restart the architecture from scratch.
5. Do not create a second Loadify application.
6. Do not switch back to historical prototypes.
7. Continue from the first unfinished phase/task.
8. Test its work.
9. Update this file with completed work, test evidence, blockers and next exact task before ending a major session.
10. Commit coherent verified changes to the dedicated branch.
11. Never merge/deploy to production solely because implementation exists; pass the relevant launch gate.

## 19. Session handoff template

At the end of each significant work session append/update:

**Date/time:**
**Branch/commit:**
**Completed:**
**Files changed:**
**Tests/evidence:**
**Known issues:**
**Blocked by:**
**Next exact task:**
**Do not touch:**

## 20. Current next exact task

Phase 0/1 foundation and the first Phase 2/5 market-capability boundary are now stable.

Completed since the previous checkpoint:
- EN/RO i18n runtime with market-driven language sync and fallback tests.
- market-aware catalogue, product detail, category, deals, wishlist and cart.
- canonical product currency and market eligibility are preserved end-to-end on public commerce surfaces.
- seller profiles now carry selling markets, delivery markets and returns country.
- seller Settings exposes governed GB/RO market capability controls; Romania capability does not bypass launch gates.
- Supplier Foundation now carries supplier market/delivery/returns capability and fails closed when the requested market is unsupported or not enabled.
- existing seller/supplier records default to GB-only.
- Romania checkout remains disabled.
- focused seller/supplier market tests: PASS.
- TypeScript: PASS.
- ESLint: PASS.
- migration health: PASS (213 canonical migrations).
- production build: PASS (2,497 modules transformed).

Completed after the previous checkpoint:
- market-native product pricing evidence/versioning for GB/GBP and RO/RON; no GBP-to-RON relabelling.
- explicit transaction/display/settlement currency semantics.
- Supplier Commerce economics extended to RO only with RON pricing, current RO landed-cost evidence and verified RO tax evidence.
- supplier PaymentIntent remains explicitly fail-closed outside live GB/GBP.
- market-aware shipping methods/rates and a service-role shipping readiness decision; legacy shipping remains GB-only.
- versioned private Romania/EU market-compliance evidence ledger and fail-closed readiness RPC.
- Romania buyer returns are market-aware and remain blocked until the RO compliance gate is verified; GB keeps the existing delivery-based 14-day boundary.
- product-level Romania compliance gate requires reviewed safety, labelling, documentation, marketability, manufacturer identity, EU responsible-person applicability/evidence, traceability and safety-information evidence.
- Romania supplier-offer selection now rejects offers whose product-level RO compliance is incomplete.
- focused Romania/multi-country tests: PASS.
- TypeScript: PASS.
- ESLint: PASS.
- migration health: PASS (218 canonical migrations).
- branch rebased on production hotfix main; UK production hotfix preserved.
- Romania checkout remains disabled.

Completed after the previous checkpoint:
- Romania checkout readiness composition now combines market compliance, product compliance, market-native RON price, shipping readiness and evidence-backed payment readiness.
- readiness can become evidence-complete without activating checkout: checkoutEnabled/paymentEnabled remain false until an explicit launch cutover.
- dedicated RO payment evidence ledger requires RON charge support, merchant account capability, SCA/3DS, refund support and settlement/reconciliation evidence.
- web supplier checkout, supplier PaymentIntent and mobile PaymentIntent all fail closed outside the current live GB/GBP boundary.
- order market/currency coherence is enforced across orders, order items, refunds, supplier recovery and reconciliation.
- transaction-time legal disclosure snapshots are required and immutable for RO orders.
- SEO canonical/hreflang now supports loadifymarket.co.uk / loadifymarket.ro.
- dynamic sitemap is host/market aware, filters product inventory by market and publishes reciprocal hreflang links.
- RO seller storefront sitemap exposure remains intentionally disabled until the public seller projection is market-aware.
- TypeScript: PASS.
- ESLint: PASS.
- focused checkout/payment/SEO tests: PASS.
- migration health: PASS (222 canonical migrations).
- latest production build before the payment/sitemap commits: PASS; a new full build is the next verification step.
- Romania remains PRELAUNCH and no RO payment endpoint is enabled.

Completed in the current launch-hardening pass:
- full production build after payment/sitemap/address/launch-control work: PASS (2,498 modules transformed; security boundary tests 9/9 PASS; 225 canonical migrations unique).
- public seller projection is market-aware and RO seller SEO only includes sellers explicitly enabled for RO.
- checkout address contract is market-aware: GB postcodes and RO six-digit postal codes are validated consistently across web, mobile and supplier checkout boundaries.
- explicit private RO launch control defaults to prelaunch with checkout/payment disabled and requires active-admin action plus compliance/payment readiness before a live cutover.
- reviewed legal-policy version registry added for buyer terms, privacy, returns and shipping; RO checkout readiness now fails closed if current ro-RO policy versions are missing.
- Romanian storefront i18n mojibake repaired and prelaunch messaging now explicitly includes compliance.
- TypeScript: PASS.
- ESLint: PASS.
- focused launch/legal/i18n tests: PASS.
- production build: PASS.
- Romania remains PRELAUNCH; no RO payment endpoint or production-domain cutover has been enabled.

Latest verified hardening evidence:
- Romania distance-contract pre-order disclosure is now present in checkout, with explicit “Comandă cu obligație de plată” wording and links to buyer terms, returns, shipping and privacy.
- targeted multi-country/RO regression: 18 test files, 74/74 tests PASS.
- TypeScript and ESLint PASS after the checkout disclosure changes.
- migration health PASS: 225 canonical migrations / 225 unique versions.
- production security boundary suite: 9/9 PASS.
- final production build after the disclosure changes: PASS; 2,499 modules transformed, exit code 0.
- only known build warning remains the existing heic2any >600 kB chunk.
- branch is synchronized with current origin/main and remains isolated from UK production.
- loadifymarket.ro DNS currently does not resolve; no production-domain attachment has been attempted.
- Romania remains PRELAUNCH with checkout/payment disabled.
- crawler-visible edge metadata is now market-aware: product/category/public canonical URLs resolve to the request market domain and product/category discovery is filtered by marketCodes.
- focused crawler SEO tests: 11/11 PASS; TypeScript and ESLint PASS.
- production build after crawler SEO hardening: PASS; 2,499 modules transformed, 225/225 canonical migration versions and security boundary 9/9 PASS.
- branch remains synchronized with origin/main (0 behind) and clean after the crawler SEO commit.
- final hard-coded market review also corrected client commerce analytics, cart totals, product SEO/share currency, supplier catalog territory propagation, featured/home inventory filtering, mobile hero pricing and catalogue filter currency/location presentation.
- dedicated multi-country regression now covers 22 test files / 104 tests: PASS.
- final TypeScript: PASS.
- final ESLint: PASS.
- final migration health: 225 canonical migrations / 225 unique versions: PASS.
- final production build: PASS; 2,499 modules transformed; security boundary 9/9 PASS; only the existing heic2any chunk warning remains.
- final origin/main comparison after fetch: 0 behind / 49 ahead; git diff --check PASS; worktree clean.
- Romania remains PRELAUNCH; checkout/payment remain disabled and no loadifymarket.ro production attachment or launch cutover was performed.

Next exact work:
1. Complete the final human/legal review of the Romanian policy content, including the OUG 18/2026 online-withdrawal requirements now implemented technically, then register reviewed current ro-RO policy versions for buyer_terms, privacy, returns_policy and shipping_policy. Do not auto-verify policy versions merely because translated text exists.
2. Create and review the production RO payment-readiness evidence for RON charge support, merchant account capability, SCA/3DS, refunds and settlement/reconciliation.
3. Implement and verify the evidence-backed Romanian/EU Marketplace Seller tax contract; keep independent Marketplace Seller RO checkout fail-closed until this is complete.
4. Configure and verify loadifymarket.ro DNS and Netlify custom-domain attachment without enabling live RO checkout/payment.
5. Run the final real-environment RO transaction rehearsal after domain staging, without using a live customer charge.
6. Re-run full multicountry regression, production E2E, build, migration health and Supabase security advisors immediately before any launch state change.
7. Keep Romania PRELAUNCH with checkout=false and payment=false until the remaining launch blockers are closed and explicit launch approval is given.

## 21. Continuity instruction for Daniel

When a ChatGPT conversation reaches its limit, start a new chat and say:

**“Continuă Loadify Multi-Country din master plan: `D:\LoadifyMarket-Multicountry\docs\checkpoints\LOADIFY_MULTI_COUNTRY_EXPANSION_MASTER_PLAN.md`. Citește-l integral și continuă autonom de la Current next exact task.”**

That path is the canonical handoff reference.


## 22. Romania launch-readiness closeout — 25 September 2026

Verified technical evidence:
- Runtime launch control is now wired end-to-end instead of being a database-only switch. The RO client remains fail-closed until the server reports status=live with both checkout and payment enabled.
- Marketplace web checkout, mobile PaymentIntent, supplier checkout and supplier PaymentIntent now consult the explicit launch control. GB remains the default live GBP boundary.
- When RO is explicitly live, payment creation preserves RON as transaction currency; payment-session currency is no longer hard-coded to GBP on these paths.
- Dedicated launch-boundary regression plus the full multicountry set: 24 test files / 112 tests PASS.
- Romania synthetic browser E2E: 2/2 PASS (RO catalogue/cart currency and prelaunch checkout fail-closed; tracked-order RON rendering).
- TypeScript PASS.
- ESLint PASS. Generated Netlify runtime output is now explicitly excluded from lint so a local .netlify directory cannot stall or contaminate repository lint.
- Migration health PASS: 225 canonical migrations / 225 unique versions.
- Production build PASS: Vite 7.3.6, 2,499 modules transformed; security boundary 9/9 PASS. Existing Capacitor import and heic2any chunk warnings remain warnings only.
- Stripe live account Loadify Market Platform was read directly on 25 September 2026: charges enabled, payouts enabled, card_payments active and transfers active; no outstanding account requirements were reported by the connected Stripe account read.
- Official EU consumer guidance rechecked on 25 September 2026: distance-sale withdrawal is generally 14 days, pre-contract information must include trader/price/delivery/withdrawal information, and EU goods carry the applicable minimum legal guarantee framework. GDPR transparency/data-subject rights and Romanian ANSPDCP complaint routes were also rechecked from official EU/ANSPDCP sources.
- Supabase production schema parity was completed on 25 September 2026. All 15 canonical multicountry/RO migrations from 24 September were applied to production in dependency order. Post-apply verification confirmed the market/currency columns and the RO payment-readiness, launch-control and legal-policy RPCs exist live.
- The production RO launch control was verified after schema cutover and remains PRELAUNCH with catalogEnabled=true, checkoutEnabled=false and paymentEnabled=false. GB remains live with checkout/payment enabled.
- Production payment-readiness remains correctly fail-closed for RO until reviewed evidence exists for RON charge support, merchant account capability, SCA/3DS, refunds and settlement/reconciliation.
- Production legal readiness remains correctly fail-closed for RO until reviewed current ro-RO buyer_terms, privacy, returns_policy and shipping_policy versions exist.
- loadifymarket.ro DNS still does not resolve. No Netlify production-domain attachment or DNS cutover has been attempted.

Current hard blockers before RO can be switched live:
1. Reviewed Romanian legal policy versions are still absent. The database gate correctly requires reviewed current ro-RO buyer_terms, privacy, returns_policy and shipping_policy versions. Do not fabricate or auto-verify these.
2. Production RO payment evidence rows must be created from verified Stripe evidence and reviewed, including RON charge support, account capability, SCA/3DS, refunds and settlement/reconciliation.
3. loadifymarket.ro DNS and Netlify custom-domain attachment are pending.
4. A final real-environment RO transaction rehearsal is required after schema/domain staging and before enabling live checkout/payment. Do not use a live customer charge as a test.
5. Marketplace Seller RO tax treatment remains fail-closed under the existing narrow GB marketplace-tax resolver. Supplier-Fulfilled economics already have RO/RON evidence gates, but independent Marketplace Seller checkout must not be declared RO-ready until an evidence-backed Romanian/EU seller tax contract is implemented and tested.
6. Final full regression/build/migration/advisor verification must be repeated immediately before the governed launch-control mutation.

Closed production blocker:
- The 15 canonical multicountry/RO migrations are no longer pending. They were applied to production on 25 September 2026 and verified with RO remaining PRELAUNCH.

Cutover rule:
- Keep RO prelaunch, checkout=false, payment=false until all blockers above are closed.
- The final state change must use the governed Romania launch-control RPC with an active admin identity and an explicit reason.
- Re-run full multicountry regression, E2E, build, migration health and Supabase security advisors immediately before the final state change.


## 23. Production parity and E2E audit update — 25 September 2026

This section supersedes any earlier statement in this document that the 15 multicountry/RO migrations are still pending production application.

Completed and verified during the production audit:
- PR #799 (UK/RO multicountry) was repaired, fully validated and merged to main.
- Production homepage MarketProvider regression was fixed in main at commit `bcd2e9dd19022b8f49750afaee0cede43856aabf`; dedicated regression, TypeScript, ESLint and live E2E passed, with no new `useMarket must be used within MarketProvider` error reports in the post-fix verification window.
- All 15 canonical multicountry/RO schema migrations from 24 September were applied to the live Supabase production project in dependency order.
- Post-cutover schema verification confirmed live presence of product/order market and currency columns plus the payment-readiness, launch-control and legal-policy RPCs.
- Romania launch control live result: status=prelaunch, catalogEnabled=true, checkoutEnabled=false, paymentEnabled=false.
- United Kingdom launch control live result: status=live, catalogEnabled=true, checkoutEnabled=true, paymentEnabled=true.
- Romania payment-readiness remains intentionally fail-closed because reviewed production evidence is still missing for RON charge support, merchant account capability, SCA/3DS, refund support and settlement/reconciliation.
- Romania legal-policy readiness remains intentionally fail-closed because reviewed current ro-RO buyer_terms, privacy, returns_policy and shipping_policy versions are still absent.
- Focused multicountry verification after schema cutover: 19/19 tests PASS.
- Romania production prelaunch browser E2E: 3/3 PASS, covering RON catalogue/cart plus blocked checkout, tracked-order currency rendering and Romanian legal-page presentation while launch remains gated.
- Production role-isolation E2E: 5/5 PASS.
- Production route sweep: 117/117 static application routes returned HTTP 200 after redirect repair.
- The earlier `/orders` and `/orders/success` redirect loop was repaired and retested in production.
- Stale lazy-module/CSS recovery was hardened for dynamic-import, `default` export and CSS-preload deployment failures; affected public pages were retested without new fatal client errors.
- Production dependency audit was reduced to zero production vulnerabilities after pinning safe transitive versions for `qs` and `fflate`.
- Paid GitHub Actions Android build workflow was changed to manual-only so repository pushes no longer automatically consume paid Actions minutes.

Updated remaining hard blockers before Romania live cutover:
1. Reviewed and current ro-RO legal policy versions for buyer terms, privacy, returns and shipping.
2. Reviewed production payment-readiness evidence for RON/Stripe/SCA/refunds/reconciliation.
3. Evidence-backed Romanian/EU Marketplace Seller tax contract and regression coverage.
4. loadifymarket.ro DNS plus Netlify custom-domain attachment and verification.
5. Final real-environment RO transaction rehearsal after domain staging, without a live customer charge.
6. Final full regression/build/migration/advisor gate immediately before launch-control mutation.

Launch state remains unchanged: Romania is PRELAUNCH and no RO live checkout/payment cutover has been authorised.


## 24. Romania online withdrawal readiness and desktop price repair — 25 September 2026

Authoritative legal review identified an additional Romania launch requirement with a near-term effective date:
- OUG nr. 18/2026 amends the Romanian distance-contract framework with an online withdrawal-function requirement applicable from 27 September 2026.
- The implementation evidence and authoritative source references are recorded in `docs/checkpoints/evidence/romania-online-withdrawal-2026-09-25.md`.
- This technical implementation does not mark any legal-policy version as reviewed or verified; the policy-version gate remains fail-closed until explicit review is complete.

Implemented and verified:
- dedicated buyer route `/buyer/withdrawal` with the Romanian presentation `Retrageți-vă din contract aici`;
- explicit consumer confirmation action `Confirmați retragerea`;
- Romania-order ownership, market and 14-day post-delivery window checks;
- dedicated server-only declaration record `public.order_withdrawal_requests`;
- buyer/admin read RLS, with client INSERT/UPDATE/DELETE revoked;
- durable-medium confirmation by Resend to the authenticated buyer account email, including declaration content and submission date/time;
- the declaration does not automatically mutate payment truth, issue a refund or bypass governed return/refund workflows;
- Romanian Buyer Terms and Returns Policy link to the online withdrawal function;
- canonical Netlify Functions runtime wrapper added after the first deployment exposed that `netlify.toml` publishes `netlify/functions-modern`, not the legacy source directory directly;
- unauthenticated production call to the withdrawal endpoint correctly returns 401 after runtime deployment;
- Supabase production migration `romania_online_withdrawal_function` applied and verified; table/policy present, anonymous/authenticated direct INSERT privileges remain false;
- production RO launch state rechecked after migration: PRELAUNCH, catalog=true, checkout=false, payment=false; GB remains live;
- focused withdrawal/legal tests: PASS;
- TypeScript: PASS;
- ESLint: PASS;
- complete unit/contract suite after implementation: 267 files / 1546 tests PASS;
- production build: PASS; migration health 226/226 unique canonical versions; security boundary 9/9 PASS;
- post-deploy Romania prelaunch browser E2E: 4/4 PASS;
- no new client error reports were observed during the post-deploy validation window.

A separate E2E regression exposed a real desktop commerce defect:
- Product Detail rendered the market-formatted price only inside the mobile-only `md:hidden` card; desktop `ProductInfo` omitted price entirely.
- Desktop `ProductInfo` now receives and renders the canonical market-formatted price.
- dedicated ProductInfo price regression: PASS;
- full unit/contract suite after the repair: 267 files / 1546 tests PASS;
- local Romania prelaunch E2E: 4/4 PASS;
- final production Romania prelaunch E2E after deploy: 4/4 PASS.

Launch posture is unchanged:
- Romania remains PRELAUNCH;
- checkout=false;
- payment=false;
- reviewed ro-RO legal policy versions are still required before launch;
- payment-readiness evidence, Marketplace Seller RO tax contract, loadifymarket.ro domain cutover and final real-environment transaction rehearsal remain outstanding.
