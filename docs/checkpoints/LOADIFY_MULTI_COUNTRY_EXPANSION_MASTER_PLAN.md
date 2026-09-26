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


## 25. GitHub/main reconciliation and anti-duplication checkpoint — 26 September 2026

This section is the current source of truth for deciding what must NOT be rebuilt and what remains outstanding.

### 25.1 Already implemented in `main` / production — do not redo

GitHub was inspected directly before continuing work.

Confirmed merged or present in `main`:
- PR #799 — `feat: complete UK/RO multicountry marketplace foundation` — merged, 59 commits / 119 files;
- PR #800 — `fix: restore public homepage MarketProvider` — merged;
- Romania runtime launch controls with RO remaining PRELAUNCH and GB remaining live;
- market-aware catalogue/cart/product/tracking currency handling;
- Romania legal/prelaunch presentation;
- Romania online withdrawal function and Netlify runtime exposure;
- desktop Product Detail price visibility repair;
- production schema application for the existing UK/RO foundation;
- production route/role-isolation hardening already recorded in sections 22–24;
- PRELAUNCH SEO hotfix now in `main`:
  - `1e4fe9f2` — suppress prelaunch Romania SEO alternates;
  - `eb95b6f1` — host-aware fail-closed `robots.txt`;
  - `4bbb3f93` — isolate the SEO hotfix from branch-only supplier identity work.

Live verification after deployment:
- UK homepage: no `loadifymarket.ro` publication and no `hreflang="ro-RO"` while RO is PRELAUNCH;
- UK sitemap: no Romania alternate publication while RO is PRELAUNCH;
- UK robots: valid UK crawl rules and UK sitemap;
- live sitemap sweep: **45/45 URLs HTTP-successful, 0 Romania-domain leaks, 0 Romania hreflang leaks**.

The following areas are therefore frozen unless a new reproducible regression is found:
- UK/RO base market architecture already merged by PR #799;
- homepage MarketProvider repair from PR #800;
- Romania withdrawal implementation already deployed;
- desktop price repair already deployed;
- PRELAUNCH SEO / sitemap / robots suppression now deployed;
- validated SPF/DKIM/DMARC/MX configuration unless a new mail-authentication failure is reproduced.

### 25.2 Email and seller runtime status — no speculative rework

Public DNS was reverified on 26 September 2026:
- SPF: `v=spf1 include:_spf.mx.cloudflare.net ~all`;
- DMARC: `v=DMARC1; p=none; rua=mailto:contact@loadifymarket.co.uk`;
- DKIM: `resend._domainkey.loadifymarket.co.uk` publishes the Resend key;
- MX remains Cloudflare Email Routing.

No DNS/email change is required from current evidence.

The earlier seller setup `Server misconfiguration` / `Seller setup unavailable` symptom is not treated as an active code/config defect unless reproduced again.
Individual/private sellers must remain valid without forcing company registration or VAT details when those facts do not apply.

### 25.3 Branch-only work — implemented locally but NOT yet production truth

The dedicated `feat/multicountry-uk-ro` worktree still contains work that is not yet integrated into `main`.
Do not describe these items as production-complete until they are separately reconciled, validated against current `main`, and deliberately integrated.

Branch-only areas include:
- European Commerce Network blueprint and ECN-0 capability inventory;
- ECN cross-border domain foundation;
- shadow cross-border route decision;
- GB→GB shadow parity hardening and checkout/return/tax parity guards;
- checkout orchestration boundary tests;
- unified inventory / multi-warehouse foundation;
- inventory-source decision and seller-owned inventory composition into the shadow Route Engine;
- marketplace inventory-ownership correction;
- supplier marketplace intermediary commercial-control gate;
- future supplier-order independent-supplier identity guard;
- supplier-specific Stripe connected-account binding/readiness foundation;
- supplier Stripe payment-model technical-readiness matrix.

These remain non-authoritative / fail-closed:
- supplier marketplace checkout remains blocked;
- supplier PaymentIntent activation remains blocked;
- supplier ECN routing remains non-authoritative / blocked;
- no supplier stock ownership is transferred to Loadify;
- no Romania checkout/payment launch state is changed.

### 25.4 Anti-duplication operating rule

Before implementing any remaining item:
1. inspect `origin/main` and recent merged PRs/commits;
2. compare the target files/contracts with the dedicated multicountry branch;
3. classify the item as:
   - already implemented / superseded;
   - branch-only and still needed;
   - stale / no longer needed;
4. implement or port only the verified missing delta;
5. validate locally on a worktree based on current `origin/main`;
6. only then integrate.

Do not bulk-merge the 28-commit multicountry branch merely because it is ahead of `main`.

### 25.5 Current exact task

The UK/RO base programme and PRELAUNCH SEO closeout are now current in production.

Next work must start with **branch-only reconciliation**, not new implementation from scratch:

1. reconcile the ECN/cross-border branch against current `main` file-by-file;
2. identify which runtime/provider/onboarding patches are already superseded by PR #799/#800/current main and exclude them;
3. validate the ECN shadow domain/route/inventory stack as one coherent non-authoritative slice on current main;
4. keep seller-owned inventory routing shadow-only;
5. keep supplier routing and supplier checkout fail-closed;
6. separately review supplier Stripe account/payment-model readiness before any commercial model is selected;
7. update this master plan after each reconciled slice;
8. keep Romania PRELAUNCH, checkout=false and payment=false.

Outstanding Romania launch blockers remain unchanged:
- reviewed current ro-RO legal policy versions;
- reviewed production RON/Stripe/SCA/refund/reconciliation evidence;
- evidence-backed Romanian/EU Marketplace Seller tax contract;
- loadifymarket.ro DNS + Netlify domain staging;
- final non-customer-charge real-environment rehearsal;
- final full regression/build/migration/security gate immediately before any governed launch-state mutation.


### 25.6 Reconciliation defect: Romania launch-status function was not published

During branch-only reconciliation, a real production routing defect was reproduced:

- `netlify/functions/market-launch-status.ts` exists in `main`;
- `netlify.toml` publishes only `netlify/functions-modern`;
- the corresponding modern wrapper was missing;
- live request to `/.netlify/functions/market-launch-status?market=RO` returned SPA HTML instead of the launch-status JSON contract.

Minimal fix:
- add only `netlify/functions-modern/market-launch-status.ts`;
- add `market-launch-status` to the canonical modern-wrapper deployment guard;
- do not port the rest of the historical seller-onboarding patch because current seller onboarding is already implemented separately in `main`.

Verification before integration:
- modern-wrapper + Romania runtime launch focused suite: **21/21 PASS**;
- targeted ESLint: **PASS**;
- TypeScript: **PASS**;
- `git diff --check`: **PASS**.

This is a reconciliation delta, not a rebuild of PR #799.

### Current exact task after 25.6

1. production-build and deploy the missing launch-status wrapper;
2. verify live endpoint returns JSON for GB/RO and preserves RO PRELAUNCH;
3. continue ECN branch reconciliation against current main;
4. exclude already-superseded runtime/provider/onboarding patches;
5. keep ECN shadow-only and supplier/RO commerce fail-closed.


### 25.7 ECN shadow/domain/inventory stack reconciled onto current main

The first ECN reconciliation slice is now rebased conceptually onto the current production code line without bulk-merging the historical multicountry branch.

Reconciled onto the current-main worktree:
- ECN cross-border domain foundation;
- shadow cross-border route decision;
- GB->GB shadow tax parity;
- GB->GB shadow checkout parity;
- checkout/return parity boundaries;
- checkout orchestration non-authority guard;
- unified inventory / multi-warehouse foundation;
- inventory-source decision;
- marketplace inventory-ownership correction;
- seller-owned inventory composition into the shadow Route Engine.

Deliberately excluded:
- historical runtime/provider/onboarding patches already superseded by current main;
- historical master-plan fragments that would overwrite the current §25 source of truth;
- the stale ECN master blueprint file previously removed from main;
- all supplier checkout/payment activation.

Current authority posture:
- ECN remains shadow / non-authoritative;
- seller-owned inventory routing is decision support only;
- supplier inventory routing remains fail-closed;
- supplier checkout and supplier PaymentIntent activation remain blocked;
- Loadify does not own, pre-purchase or warehouse supplier inventory;
- Romania remains PRELAUNCH with checkout=false and payment=false.

Verification on the current-main reconciliation worktree:
- ECN focused suite: **54/54 PASS across 7 files**;
- canonical migration health: **231/231 unique**;
- TypeScript: **PASS**;
- `git diff --check`: **PASS**;
- production build: **PASS**;
- security build tests: **9/9 PASS**;
- Vite: **2,501 modules transformed**;
- only the existing chunk-size warning remains.

The production `market-launch-status` deployment defect found during reconciliation is also now closed E2E:
- GB returns JSON with status=live, checkoutEnabled=true, paymentEnabled=true;
- RO returns JSON with status=prelaunch, checkoutEnabled=false, paymentEnabled=false.

### Current exact task after 25.7

Continue with the supplier safety slice only after comparing each affected file against current main:

1. reconcile the supplier marketplace intermediary commercial-control gate;
2. reconcile the future supplier-order independent-supplier identity guard;
3. reconcile supplier Stripe connected-account readiness;
4. reconcile the supplier payment-model technical-readiness matrix;
5. preserve all current-main SEO/runtime/legal changes when conflicts exist;
6. keep supplier checkout/payment disabled;
7. keep supplier ECN routing non-authoritative/fail-closed;
8. re-run supplier + ECN + migration + TypeScript + production-build gates before considering integration.


### 25.8 Supplier safety slice reconciled and validated

The remaining supplier commercial-safety work has now been reconciled onto the same current-main worktree, after comparing affected runtime/SEO/legal files against the newer production line.

Reconciled:
- supplier marketplace intermediary commercial-control gate;
- independent-supplier seller-of-record identity propagation;
- future supplier-order identity snapshot guard;
- supplier Stripe connected-account binding/readiness foundation;
- supplier payment-model technical-readiness matrix.

Safety posture is unchanged and explicit:
- supplier marketplace checkout remains blocked until commercial readiness is verified;
- supplier payment creation remains blocked by the commercial-readiness RPC;
- no settlement model is guessed or auto-selected;
- no supplier Stripe account is assumed from supplier identity;
- supplier remains the independent seller of record;
- Loadify remains marketplace/operator/intermediary, not inventory owner or supplier seller;
- supplier ECN routing remains fail-closed/non-authoritative;
- Romania remains PRELAUNCH.

Validation of the combined supplier + ECN slice:
- focused supplier + ECN suite: **105/105 PASS across 16 files**;
- canonical migration health: **235/235 unique**;
- TypeScript: **PASS**;
- `git diff --check`: **PASS**;
- production build: **PASS**;
- security build tests: **9/9 PASS**;
- Vite: **2,501 modules transformed**.

### 25.9 Old multicountry branch remainder classified — do not port blindly

After the functional ECN and supplier slices were reconciled, the remaining old-branch commits were inspected.

Do not port as runtime work:
- `ace84e68` — runtime provider repair is superseded by PR #799/#800/current main;
- `ba8fe4e4` — old seller/function routing patch is superseded except for the missing `market-launch-status` wrapper, which was already extracted, deployed and verified independently;
- old ECN master-blueprint/progress-only commits — stale/historical documentation must not overwrite the current §25 source of truth;
- `0aa30874` — seller onboarding regression closeout is historical documentation, not a new runtime delta;
- old PRELAUNCH SEO commits — already reconciled and deployed to main as the dedicated hotfix.

Therefore the old 28-commit worktree must not be bulk-merged.

### 25.10 Supabase production-history governance reverified

Hosted Supabase migration history was inspected directly before any ECN production DDL.

Confirmed existing project convention:
- canonical migration files in the repository and hosted application timestamps are not always identical;
- the 15 multicountry/RO canonical migrations were already applied to production in dependency order on 25 September and recorded under their hosted application timestamps;
- existing project documentation explicitly distinguishes canonical repository history from verified hosted migration history;
- do not rewrite hosted migration history merely to make local timestamps look identical;
- do not use migration-repair unless actual schema/history state is proven incorrect.

The temporary idea to renumber early ECN migration files solely around the hosted timestamp head was rejected and reverted. The canonical ECN migration filenames remain unchanged.

Supabase project status before ECN DDL:
- project `loadify-market`: ACTIVE_HEALTHY;
- Postgres: 17.6;
- existing hosted migration head includes Romania online withdrawal;
- current Supabase advisors were captured before new DDL;
- no ECN/supplier safety migration has yet been claimed as production-applied by this section.

Current Supabase changelog was also checked before DDL review. The 25 September PostgreSQL 15.19/17.11 notice concerns ltree, legacy pgcrypto ciphers, btree_gist NaN indexes and custom selectivity operators; the reconciled ECN/supplier migrations do not intentionally depend on those mechanisms.

### Current exact task after 25.10

1. preserve this reconciled branch remotely before production DDL;
2. review the nine new ECN/supplier migrations for destructive DDL, privilege exposure and dependency order;
3. inspect hosted schema for conflicting/pre-existing ECN objects;
4. only if those checks pass, apply the ECN/supplier migrations to production in canonical dependency order and verify every created RPC/table/guard;
5. rerun Supabase security/performance advisors after DDL;
6. integrate the reconciled branch into current main only after production schema parity is verified;
7. verify production web/runtime after deploy;
8. keep supplier checkout/payment and RO checkout/payment fail-closed.


### 25.8 Supplier marketplace safety/readiness slice reconciled and validated

The supplier branch-only safety layer has now been reconciled onto the current-main ECN worktree without selecting or activating a supplier commercial/payment model.

Reconciled:
- supplier marketplace intermediary commercial-control gate;
- supplier catalogue publication now carries independent supplier identity and fails checkout closed while commercial readiness is incomplete;
- supplier checkout preparation fails closed before payment-session creation;
- supplier PaymentIntent path fails closed before Stripe intent creation;
- future supplier-order identity contract requires the independent supplier as seller/invoice issuer and explicitly prevents Loadify/XDrive from being snapshotted as the supplier seller identity;
- supplier-specific Stripe connected-account binding/readiness foundation, separate from seller_profiles;
- supplier payment-model technical-readiness matrix for:
  - stripe_connect_direct_charge;
  - stripe_connect_indirect_obo.

No commercial model was selected.

Authority/launch posture remains unchanged:
- supplier checkout disabled unless reviewed commercial readiness becomes eligible;
- supplier payment disabled unless reviewed readiness becomes eligible;
- supplier ECN routing remains non-authoritative/fail-closed;
- Loadify remains marketplace/intermediary and does not own/pre-purchase supplier stock;
- Romania remains PRELAUNCH with checkout=false and payment=false.

Combined verification on current-main reconciliation base:
- Supplier + ECN focused suite: **105/105 PASS across 16 files**;
- canonical migration health: **235/235 unique**;
- TypeScript: **PASS**;
- git diff --check: **PASS**;
- production security build tests: **9/9 PASS**;
- production build: **PASS**;
- Vite: **2,501 modules transformed**;
- only the existing chunk-size warning remains.

### Current exact task after 25.8

Before production integration:
1. inspect the 9 new canonical migrations against the live Supabase schema;
2. verify they are additive/non-authoritative and do not alter existing seller payment truth;
3. apply them in dependency order only if production parity/safety checks pass;
4. re-check RO launch control remains PRELAUNCH and GB remains live after schema application;
5. re-run focused supplier/ECN production-safe verification;
6. only then integrate the reconciled code into main;
7. keep supplier checkout/payment and supplier ECN authority blocked until reviewed commercial evidence explicitly permits activation.


### 25.9 Live Supabase schema application and post-apply safety verification

The nine reconciled ECN/supplier migrations were applied to the production Loadify Supabase project in dependency order after live preflight confirmed that none of the new ECN/supplier objects already existed.

Applied:
- 20260925163000_ecn_cross_border_domain_foundation.sql
- 20260925170000_ecn_cross_border_route_decision.sql
- 20260925204500_ecn_unified_inventory_foundation.sql
- 20260925211000_ecn_inventory_source_decision.sql
- 20260925213500_supplier_marketplace_intermediary_control.sql
- 20260925215000_supplier_marketplace_future_order_contract.sql
- 20260926090000_ecn_route_inventory_source_composition.sql
- 20260926094500_supplier_stripe_account_binding.sql
- 20260926100000_supplier_payment_model_readiness.sql

Post-apply live verification:
- all expected private ECN/supplier tables exist;
- all expected server RPCs exist;
- supplier future-order snapshot columns exist;
- supplier commercial readiness RPC is fail-closed:
  - GB: status=blocked, eligible=false, checkoutEnabled=false, settlementModel=unconfigured;
  - RO: status=blocked, eligible=false, checkoutEnabled=false, settlementModel=unconfigured;
- Loadify inventory semantics remain false:
  - loadifyOwnsInventory=false;
  - loadifyPrepurchasesInventory=false;
  - supplierIsSellerOfRecord=true;
- new supplier commercial/payment-model RPCs are not executable by anon or authenticated; service_role only;
- Supabase security advisors introduced no new warning class from these server RPCs; previously known advisor findings remain separate backlog;
- public launch state remains unchanged:
  - GB = live, catalog=true, checkout=true, payment=true;
  - RO = prelaunch, catalog=true, checkout=false, payment=false.

The Supabase CLI linked push route was deliberately not used because remote migration history contains existing generated versions that are not present 1:1 as local filenames. No migration-history repair was performed. The nine reviewed migrations were applied individually through the production Supabase migration interface, preserving the production database without rewriting historical migration records.

### Current exact task after 25.9

The reconciled ECN/supplier branch is now schema-compatible with production and remains fail-closed where required. Before merge:
1. fetch current main and verify no new divergence;
2. confirm the branch worktree is clean;
3. merge only this reconciled branch into main;
4. verify production deploy completes;
5. re-run live launch-state and supplier fail-closed checks after deploy;
6. then continue with the remaining branch-only/master-plan items without reopening closed UK/RO SEO, DMARC, or seller-onboarding work.


### 25.10 Romania Stripe payment-readiness technical evidence checkpoint

A read-only production Stripe audit was completed against the canonical Loadify Market Platform account.

Verified live account facts:
- platform country = GB;
- default currency = GBP;
- charges enabled = true;
- payouts enabled = true;
- details submitted = true;
- card_payments = active;
- transfers = active.

Two currently connected accounts were observed; both are GB accounts with charges/payouts enabled and card_payments/transfers active.

Official Stripe documentation was rechecked for:
- RON/presentment currency support and charge limits;
- SCA / 3D Secure;
- refunds;
- Connect presentment/settlement currency behaviour.

Loadify runtime was rechecked:
- RO transaction currency is RON;
- web Checkout and mobile PaymentIntent preserve the expected market/order currency;
- refunds use the canonical Stripe PaymentIntent;
- webhook/payment-session boundaries validate amount/currency;
- RO checkout/payment remain disabled.

Five evidence rows were recorded in production `private.market_payment_readiness_evidence` as **DRAFT** only:
- ron_charge_support;
- merchant_account_capability;
- sca_3ds_support;
- refund_support;
- settlement_reconciliation.

No reviewer identity was fabricated:
- status = draft;
- reviewed_by = null;
- reviewed_at = null.

Post-insert verification confirms `server_market_payment_readiness_v1('RO')` still returns:
- eligible=false;
- reason=payment_readiness_incomplete;
- all five domains remain in missingEvidence.

Evidence file:
- `docs/checkpoints/evidence/romania-stripe-payment-readiness-2026-09-26.md`

Therefore the payment-readiness blocker is **advanced but not closed**. A legitimate review plus the controlled real-environment rehearsal are still required before these rows may become verified. No live customer charge was created and no RO launch state changed.

### Current exact task after 25.10

Continue with the next implementation-capable hard blocker:
1. inspect the current Marketplace Seller tax resolver and existing tax evidence contracts;
2. research current authoritative Romanian/EU marketplace/VAT requirements relevant to the implemented business model;
3. implement only an evidence-backed, fail-closed Romanian/EU Marketplace Seller tax contract and regression coverage;
4. do not mark legal/tax review as approved where a human/legal reviewer is required;
5. keep RO PRELAUNCH and payment/checkout disabled.


### 25.11 Romania Marketplace Seller tax-contract foundation applied fail-closed

The existing live Marketplace Seller tax resolver was confirmed to be intentionally narrow to the current Great Britain non-VAT physical-product contract. Romania/international Marketplace Seller tax remains unsupported by that GB resolver and must not be inferred from it.

Authoritative-source research was completed against current European Commission / EU / ANAF material before implementing the Romania contract. The implementation deliberately separates commercial ownership from VAT treatment because an electronic interface can become a deemed supplier for VAT in defined cases even when the independent seller owns the goods.

Key evidence-driven design decisions:
- an account being `individual` does not itself prove taxable-person or non-taxable-person VAT status;
- Romania's current VAT rates are represented as reviewable product classifications rather than a blanket hard-coded rate;
- domestic, intra-EU distance-sale and imported-goods scenarios are separate route classes;
- IOSS/OSS/domestic/import VAT treatment is an explicit reviewed rule field rather than inferred from market alone;
- the <= EUR 150 class is retained where relevant to current VAT/IOSS rules, but it is not treated as a customs-duty exemption;
- legal basis and effective dates are versioned so evidence reviewed for the 2026 framework cannot silently remain authoritative after already-enacted 2027 EU changes take effect.

Implemented:
- `supabase/migrations/20260926103000_romania_marketplace_seller_tax_contract.sql`;
- private reviewed-rule ledger `private.marketplace_tax_route_rules`;
- service-role-only RPC `public.server_marketplace_ro_tax_rule_v1(...)`;
- runtime contract validator `netlify/functions/_shared/marketplaceRoTax.ts`;
- regression suite `src/__tests__/romania-marketplace-seller-tax-contract.test.ts`;
- evidence record `docs/checkpoints/evidence/romania-marketplace-seller-tax-contract-2026-09-26.md`.

The migration seeds **no tax rule** and activates **no Romanian checkout path**. A route becomes eligible only if a currently valid rule is explicitly `verified` with:
- reviewer identity;
- review timestamp;
- non-empty evidence;
- authoritative source references;
- evidence hash;
- legal effective period.

Validation on the current-main branch:
- focused Romania/GB tax suite: **41/41 PASS across 3 files**;
- canonical migration health: **236/236 unique**;
- TypeScript: **PASS**;
- ESLint on the new runtime/test contract: **PASS**;
- git diff --check: **PASS**;
- production security build tests: **9/9 PASS**;
- production build: **PASS**;
- Vite: **2,501 modules transformed**;
- only the pre-existing HEIC chunk-size warning remains.

Production Supabase:
- preflight confirmed no pre-existing parallel table/RPC;
- migration `romania_marketplace_seller_tax_contract` applied successfully;
- `private.marketplace_tax_route_rules` exists;
- `server_marketplace_ro_tax_rule_v1` exists;
- current verified rule count = **0**;
- sample RO decision = `eligible=false`, `reason=ro_marketplace_tax_evidence_missing`;
- RPC execution: anon=false, authenticated=false, service_role=true;
- no new security-advisor warning was introduced by this contract.

Public launch-state recheck after schema application:
- GB = live, catalog=true, checkout=true, payment=true;
- RO = prelaunch, catalog=true, checkout=false, payment=false.

Therefore the Romanian Marketplace Seller tax blocker is **architecturally implemented and fail-closed, but not legally/tax-review closed**. No seller/product/route rule has been marked verified, no legal reviewer identity was fabricated, and no RO checkout/payment authority was enabled.

### Current exact task after 25.11

1. integrate this reviewed technical foundation and the §25.10 Stripe evidence checkpoint into main through one controlled PR;
2. re-verify production launch state and tax/payment gates after deployment;
3. then inspect `loadifymarket.ro` DNS and Netlify custom-domain state before any domain mutation;
4. stage/verify the Romania domain only if it can be done without enabling live checkout/payment or prematurely publishing RO SEO;
5. preserve reviewed ro-RO legal policy versions and final real-environment transaction rehearsal as hard launch blockers requiring genuine review/evidence.


### 25.12 loadifymarket.ro domain staging preflight — blocked at registration

The Romania custom-domain staging blocker was inspected before any Netlify/DNS mutation.

Verified production Netlify state:
- canonical site = `loadifymarketcouk`;
- project id = `5cf610c7-95b1-482a-b713-01f59fa68e09`;
- production deploy is `ready` on main commit `8f81a8b937303b12aaa095d18cfab3a996228478`;
- current custom domain = `loadifymarket.co.uk`;
- current domain aliases = none;
- current Netlify DNS zone = `loadifymarket.co.uk`;
- no `loadifymarket.ro` DNS zone exists in the Netlify account.

Public DNS preflight:
- `loadifymarket.ro` does not resolve;
- `www.loadifymarket.ro` does not resolve;
- no delegated NS/A/CNAME records were observed.

Authoritative ROTLD WHOIS preflight on 26 September 2026 returned:
- **No entries found for the selected source(s)** for `loadifymarket.ro`.

Therefore the current blocker is not a missing Netlify record: the intended Romania domain is not presently registered in the authoritative .ro registry.

No mutation was performed:
- no speculative Netlify DNS zone was created;
- no custom-domain alias was attached;
- no nameserver records were invented;
- no SEO/publication state changed.

Required external prerequisite:
1. register `loadifymarket.ro` through a .ro registrar/ROTLD-supported registrar;
2. then delegate the domain to the intended DNS provider (Netlify DNS if retaining the current architecture);
3. only after authoritative delegation exists, attach/stage apex + www in Netlify;
4. keep Romania PRELAUNCH/noindex and checkout/payment disabled until the remaining launch gates close.

### Current exact task after 25.12

Because domain staging is externally blocked at registration, continue with the next implementation-capable blocker:
1. inspect the current Romanian legal-policy contract, policy ledger and rendered `RomaniaLegalContent`;
2. determine exactly which required `ro-RO` policy versions are missing/unreviewed;
3. prepare evidence-backed draft policy snapshots/validation where possible;
4. do not mark any policy `reviewed` or launch-approved without a legitimate reviewer;
5. preserve RO PRELAUNCH and current SEO/payment/checkout gates.


### 25.13 Romania legal-policy routing and harmonised guarantee-notice hardening

The Romanian legal-policy launch blocker was audited at both database-gate and rendered-surface level.

Production legal-policy gate before this slice:
- `private.market_legal_policy_versions` contained **0** Romania rows;
- `server_market_legal_policy_snapshot_v1('RO')` returned `eligible=false`;
- all four required current ro-RO policies were correctly reported missing:
  - buyer_terms;
  - privacy;
  - returns_policy;
  - shipping_policy.

Rendered-surface audit:
- Buyer Terms web already routed RO to `RomaniaBuyerTerms`;
- Returns Policy web already routed RO to `RomaniaReturnsPolicy`;
- Shipping Policy web already routed RO to `RomaniaShippingPolicy`;
- Privacy Policy web already routed RO to `RomaniaPrivacyPolicy`;
- a real native/APK defect was reproduced: `PrivacyPolicy.tsx` selects `PrivacyPolicyMobile` in native mode, but `PrivacyPolicyMobile` was UK-only and ignored the active market.

Native privacy fix:
- `PrivacyPolicyMobile.tsx` now reads `useMarket()`;
- RO renders `RomaniaPrivacyPolicy` with Romanian SEO metadata;
- GB retains the existing UK native privacy policy;
- regression test `src/__tests__/romania-legal-policy-routing.test.ts` covers all five rendered policy surfaces, including native privacy.

A second real pre-launch compliance gap was confirmed for the legal framework effective **27 September 2026**:
- the existing RO checkout already contains the payment-obligation wording and links to Buyer Terms, Returns, Shipping and Privacy;
- however it did not display the harmonised legal-guarantee notice required for the relevant Romanian online consumer flow.

Official asset implementation:
- downloaded from the European Commission's official all-language PNG/JPG package;
- Romanian colour PNG copied byte-for-byte into:
  - `public/legal/eu-legal-guarantee-notice-ro.png`;
- official asset dimensions: **1654 × 2339**;
- official asset size: **88,604 bytes**;
- SHA-256:
  - `51d641e25d29a9cd4d087a6540d474ade46fd52b2e38f1ac65befb1108caa032`;
- the notice is not redrawn, translated, recompressed or editorially modified;
- only responsive CSS sizing is applied.

RO checkout placement:
- inside the existing RO-only `Informații înainte de comandă` block;
- before the `Comandă cu obligație de plată` button;
- labelled `Garanția legală de conformitate`;
- rendered from the official static asset path.

Regression protection:
- `src/__tests__/romania-harmonised-legal-guarantee-notice.test.ts` freezes the official SHA-256;
- verifies the asset is present on the RO checkout surface;
- verifies the notice occurs before the payment-obligation order button.

Review package:
- `docs/checkpoints/evidence/romania-legal-policy-review-package-2026-09-26.md`.

Current exact policy fingerprints:
- buyer_terms:
  - `91dd1e65f6b63e1ce1ab1b70bc7a2e39b565e839539bed937699e5a9c8abfef9`;
- returns_policy:
  - `5d1081f7629a1e63f309c3cae2a1aab743900c1232fe8492da8eb1b8d826d009`;
- shipping_policy:
  - `aed95d61ed61e4ba76994080f2e73450d3fc488943e1c35bbd790601f8aed110`;
- privacy:
  - `2d91098ac2181ad906b6d23967d62b65706fae5304ec0c38ecb4dda80caa2e80`.

Validation:
- focused legal/checkout suite: **17/17 PASS across 4 files**;
- ESLint on changed legal/checkout/test files: **PASS**;
- TypeScript: **PASS**;
- git diff --check: **PASS**;
- canonical migration health: **236/236 unique**;
- production security build tests: **9/9 PASS**;
- production build: **PASS**;
- Vite: **2,501 modules transformed**;
- only the pre-existing HEIC chunk-size warning remains.

This slice still does **not** constitute legal review or launch approval.

### Current exact task after 25.13

1. commit and push this deterministic legal-review package and rendered-surface fixes;
2. register the four exact ro-RO policy fingerprints in production as `draft` only, tied to that source commit;
3. leave `reviewed_by` and `reviewed_at` NULL;
4. verify the legal-policy launch RPC remains `eligible=false` and still requires reviewed versions;
5. integrate through a controlled PR only after the draft-ledger and post-insert gate checks pass;
6. do not register/attach `loadifymarket.ro` until the domain is actually registered;
7. do not enable RO checkout/payment or SEO publication.


### 25.14 Romania legal-policy draft ledger registered without launch authority

After commit `ceb8947fe6a808a345613a9f72d312df81041c7e` fixed the rendered legal surfaces and froze the official Romanian harmonised legal-guarantee asset, the four exact Romanian policy fingerprints were registered in the production legal-policy ledger as **draft review candidates only**.

Production rows created in `private.market_legal_policy_versions`:
- buyer_terms:
  - version = `2026-09-26-draft-buyer_terms`;
  - evidence hash = `91dd1e65f6b63e1ce1ab1b70bc7a2e39b565e839539bed937699e5a9c8abfef9`;
- privacy:
  - version = `2026-09-26-draft-privacy`;
  - evidence hash = `2d91098ac2181ad906b6d23967d62b65706fae5304ec0c38ecb4dda80caa2e80`;
- returns_policy:
  - version = `2026-09-26-draft-returns_policy`;
  - evidence hash = `5d1081f7629a1e63f309c3cae2a1aab743900c1232fe8492da8eb1b8d826d009`;
- shipping_policy:
  - version = `2026-09-26-draft-shipping_policy`;
  - evidence hash = `aed95d61ed61e4ba76994080f2e73450d3fc488943e1c35bbd790601f8aed110`.

Every row is tied to the exact GitHub source commit and component export.

All four rows intentionally remain:
- `status='draft'`;
- `reviewed_by IS NULL`;
- `reviewed_at IS NULL`.

The intended review-effective timestamp is recorded as 27 September 2026, but this has no launch effect while status remains draft.

Post-insert production verification:
- all four draft rows exist with the expected hashes;
- no verified RO legal-policy row exists;
- `server_market_legal_policy_snapshot_v1('RO')` remains:
  - `eligible=false`;
  - `reason=legal_policy_versions_incomplete`;
  - missingPolicies = buyer_terms, privacy, returns_policy, shipping_policy.

Therefore the engineering review package is deterministic and ready for a legitimate human/legal review, while the launch gate remains fail-closed.

### Current exact task after 25.14

1. commit and push this ledger checkpoint;
2. open one controlled PR from `audit/ro-domain-legal-20260926` to current main;
3. compare the final diff and merge only with the verified head SHA;
4. verify the production deploy contains:
   - native RO privacy routing;
   - official harmonised legal-guarantee notice asset;
   - RO pre-order notice before the payment-obligation button;
5. re-check after deploy:
   - GB remains live;
   - RO remains PRELAUNCH;
   - RO payment readiness remains false;
   - RO tax readiness remains false;
   - RO legal-policy readiness remains false;
6. do not convert draft legal policies to verified without a legitimate reviewer;
7. do not stage `loadifymarket.ro` until authoritative registration exists.


### 25.15 GitHub reconciliation after PR #801/#802 and PR #803 deploy-preview repair

A fresh GitHub reconciliation was performed before continuing.

Already merged into `main` and therefore not to be reimplemented:
- PR #801 — ECN shadow routing + supplier marketplace safety/readiness reconciliation;
- PR #802 — fail-closed Romania payment evidence + Marketplace Seller tax contract.

The earlier §25 integration tasks for those slices are therefore superseded by this section.

PR #803 (`audit/ro-domain-legal-20260926`) remained the only active Romania legal-surface slice. Its first Netlify Deploy Preview failed even though its focused legal tests and normal production build had passed.

The exact Netlify pipeline was reproduced locally with:
- `npm ci`;
- `npm run lint`;
- full `npm test`;
- `npm run build`;
- Netlify Functions bundling;
- Netlify Edge Functions bundling.

Root cause:
- `netlify/functions/__tests__/seo-foundation-contract.test.ts` still encoded an older SEO assumption that Loadify itself must be the Product structured-data seller/legal operator for `loadify_supplier_fulfilled` products;
- current production architecture from PR #801 correctly keeps the independent supplier as seller of record and exposes `supplierName` / `supplierLegalName`;
- changing runtime code back to Loadify seller identity would violate the approved marketplace/intermediary model.

Repair:
- update only the stale SEO contract test;
- require supplier identity fields for supplier-fulfilled Product structured data;
- explicitly reject `legalName: LEGAL_OPERATOR_NAME` for that supplier-fulfilled branch;
- no production seller-identity runtime behavior is weakened or reverted.

Verification after repair:
- focused SEO foundation contract: **13/13 PASS**;
- exact Netlify full test suite: **283/283 files PASS, 1,653/1,653 tests PASS**;
- canonical migration health: **236/236 unique**;
- security build tests: **9/9 PASS**;
- TypeScript: **PASS**;
- Vite production build: **2,501 modules transformed**;
- Netlify Functions bundling: **PASS**;
- Netlify Edge Functions bundling: **PASS**;
- complete `netlify build --offline --context deploy-preview`: **PASS, exit code 0**.

Supabase concurrency note:
- hosted migration history shows the ECN/supplier migration set had already been applied by the concurrent PR #801 flow before a second idempotent application was attempted during reconciliation;
- no security-advisor finding was introduced for the new ECN/supplier objects;
- no cosmetic migration-history repair will be performed;
- existing project governance remains: preserve verified hosted history unless an actual schema/history defect is demonstrated.

### Current exact task after 25.15

1. commit and push the stale SEO-contract repair plus this authoritative checkpoint to PR #803;
2. wait for the new Netlify Deploy Preview/checks for the exact new head SHA;
3. re-fetch `main` immediately before merge to avoid duplicate/concurrent work;
4. merge PR #803 only if the updated head is mergeable and preview checks pass;
5. after production deploy, verify:
   - GB remains live with checkout/payment enabled;
   - RO remains PRELAUNCH with checkout/payment disabled;
   - RO payment readiness remains false;
   - RO Marketplace Seller tax readiness remains false;
   - RO legal-policy readiness remains false;
   - UK sitemap/home/robots still publish no premature Romania SEO alternates;
   - Romanian legal surfaces and the official harmonised guarantee asset are deployed;
6. keep all four Romanian legal-policy ledger rows in `draft` until a legitimate reviewer explicitly approves them;
7. do not stage or publish `loadifymarket.ro` until authoritative registration exists;
8. after PR #803 closeout, address any ECN performance-advisor index findings separately from legal/launch work.


### 25.16 PR #803 production closeout — verified live and fail-closed

PR #803 was merged into `main` at:
- merge SHA: `54ef104563f63c9271d6500fbb25739fb16af417`.

The production deployment was verified from the public site and hosted database after merge.

Live market launch status:
- GB:
  - status = `live`;
  - catalogEnabled = true;
  - checkoutEnabled = true;
  - paymentEnabled = true.
- RO:
  - status = `prelaunch`;
  - catalogEnabled = true;
  - checkoutEnabled = false;
  - paymentEnabled = false.

Production crawler/publication checks:
- `/robots.txt`: HTTP 200, no `loadifymarket.ro` or `ro-RO` publication;
- `/sitemap.xml`: HTTP 200, no Romania-domain/hreflang leak;
- homepage: HTTP 200, no Romania-domain/hreflang leak.

Official Romanian harmonised guarantee asset:
- live path: `/legal/eu-legal-guarantee-notice-ro.png`;
- live size: **88,604 bytes**;
- live SHA-256:
  - `51d641e25d29a9cd4d087a6540d474ade46fd52b2e38f1ac65befb1108caa032`;
- live hash exactly matches the frozen official Commission asset.

Hosted Romania launch blockers remain fail-closed:
- payment readiness:
  - `eligible=false`;
  - reason = `payment_readiness_incomplete`;
  - missing evidence still includes RON charge support, merchant-account capability, SCA/3DS, refund support and settlement reconciliation;
- legal-policy readiness:
  - `eligible=false`;
  - reason = `legal_policy_versions_incomplete`;
  - buyer_terms, privacy, returns_policy and shipping_policy remain required;
- Marketplace Seller tax contract:
  - sample reviewed-route lookup returns `eligible=false`;
  - reason = `ro_marketplace_tax_evidence_missing`.

Romania legal-policy ledger remains unchanged:
- exactly the four review candidates remain `status='draft'`;
- `reviewed_by IS NULL`;
- `reviewed_at IS NULL`;
- evidence hashes remain the four fingerprints recorded in §25.14.

Therefore PR #803 is closed in production without activating Romania commerce, tax authority, legal approval or premature SEO publication.

### 25.17 ECN performance-advisor follow-up — isolated from launch/legal work

After the legal closeout, the Supabase performance advisor was rechecked for the ECN/supplier objects introduced by PR #801.

Security:
- no new ECN/supplier security-advisor finding was introduced by the reconciled schema.

Performance:
- 12 ECN/supplier foreign keys remain without covering indexes:
  - `private.actor_route_capabilities.dispatch_location_id`;
  - `private.actor_route_capabilities.reviewed_by`;
  - `private.actor_route_capabilities.seller_id`;
  - `private.actor_route_capabilities.supplier_id`;
  - `private.dispatch_locations.reviewed_by`;
  - `private.market_routes.changed_by`;
  - `private.route_decision_snapshots.dispatch_location_id`;
  - `private.route_decision_snapshots.seller_id`;
  - `private.route_decision_snapshots.supplier_id`;
  - `private.supplier_marketplace_commercial_controls.reviewed_by`;
  - `private.supplier_stripe_account_bindings.verified_by`;
  - `private.supplier_warehouse_bindings.reviewed_by`.

These are INFO-level performance findings, not correctness or security defects.

A fresh GitHub/main/PR reconciliation found no concurrent ECN FK-index patch.

### Current exact task after 25.17

1. add one isolated, idempotent migration containing only the 12 covering indexes above;
2. add regression coverage that freezes the expected table/column index contract;
3. run migration health, focused tests, TypeScript, diff-check and production build;
4. review the migration for zero business/launch-state mutation;
5. apply it to hosted Supabase only after local validation;
6. rerun the Supabase performance advisor and verify those 12 specific unindexed-FK findings are cleared;
7. rerun the security advisor to confirm no regression;
8. integrate through a separate controlled PR;
9. do not modify RO PRELAUNCH, supplier payment activation, legal-policy review state, tax rules or SEO publication.


### 25.18 ECN foreign-key index hardening — hosted verification complete

The isolated ECN/supplier performance migration was implemented without changing any marketplace, launch, payment, tax, legal or SEO state.

Migration:
- `supabase/migrations/20260926110000_ecn_fk_index_hardening.sql`.

Scope:
- exactly 12 `CREATE INDEX IF NOT EXISTS` statements;
- no `INSERT`, `UPDATE`, `DELETE`, `ALTER` or `DROP`;
- no launch-control, payment-readiness, legal-policy, Marketplace Seller tax or supplier-activation mutation.

Regression coverage:
- `src/__tests__/ecn-fk-index-hardening.test.ts`;
- freezes the 12 expected table/column covering indexes;
- asserts the migration contains no business-state/schema-destructive mutation.

Local verification before hosted DDL:
- focused index contract: **2/2 PASS**;
- canonical migration health: **237/237 unique**;
- TypeScript: **PASS**;
- `git diff --check`: **PASS**;
- production security build tests: **9/9 PASS**;
- production build: **PASS**;
- Vite: **2,501 modules transformed**;
- only the existing chunk-size/dynamic-import warnings remain.

Hosted Supabase:
- migration application succeeded;
- hosted migration entry: `ecn_fk_index_hardening`;
- the 12 specific `unindexed_foreign_keys` advisor findings are now **0/12 remaining**;
- security advisor reports **0 findings on the target ECN/supplier objects**.

Post-DDL fail-closed re-verification:
- RO payment readiness remains `eligible=false`;
- RO legal-policy readiness remains `eligible=false`;
- RO Marketplace Seller tax lookup remains `eligible=false`;
- no Romania launch authority was changed.

### Current exact task after 25.18

1. commit and push the isolated migration, regression test and this checkpoint;
2. open one dedicated PR from `perf/ecn-fk-index-20260926` to current `main`;
3. verify the exact PR head against current main and Netlify/check results;
4. merge only when clean and green;
5. after merge, confirm production main contains the migration and no launch/SEO regression;
6. then re-inspect GitHub/main/master plan before choosing the next remaining multicountry blocker;
7. do not reopen closed UK/RO/ECN work unless a new reproducible defect appears.
