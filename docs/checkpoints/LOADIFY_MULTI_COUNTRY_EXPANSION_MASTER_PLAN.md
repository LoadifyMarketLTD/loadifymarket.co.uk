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

Implemented so far on the multi-country branch:
- `src/lib/marketConfig.ts`
- market types/config for GB and RO
- persisted selected market
- locale/currency/tax/shipping metadata
- `src/components/marketplace/MarketSelector.tsx`
- desktop marketplace market selector
- mobile/drawer market selector
- initial shared storefront price formatter connection
- UK remains default

TypeScript passed after the initial market foundation.

Further lint/verification was in progress when this master plan was created.

Important: the current first-pass price display must obey Section 6. Do not treat market selection alone as permission to reinterpret stored GBP prices as RON.

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

Continue Phase 0/1 from the existing branch.

1. Finish lint/diff verification of the initial foundation.
2. Audit all hard-coded GBP/£/en-GB and UK assumptions.
3. Replace the temporary market access pattern with a reactive MarketProvider/hook where needed.
4. Define the canonical money model before allowing RO to display transactional RON amounts.
5. Add tests for GB default, RO selection, persistence and formatting behaviour.
6. Continue into i18n only after the market kernel is stable.

## 21. Continuity instruction for Daniel

When a ChatGPT conversation reaches its limit, start a new chat and say:

**“Continuă Loadify Multi-Country din master plan: `D:\LoadifyMarket-Multicountry\docs\checkpoints\LOADIFY_MULTI_COUNTRY_EXPANSION_MASTER_PLAN.md`. Citește-l integral și continuă autonom de la Current next exact task.”**

That path is the canonical handoff reference.
