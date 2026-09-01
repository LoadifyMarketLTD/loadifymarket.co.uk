# Multi-Provider External Evidence — 2026-09-01

## Purpose

This ledger records the current external evidence used to classify provider readiness in Loadify Supplier Commerce. It is evidence for gating only. It does **not** activate providers, promote capabilities, authorise supplier/order writes, permit customer PII disclosure, or authorise payment/refund mutations.

All provider activation remains hosted OFF unless separate runtime evidence, contractual authority, platform controls, and existing Supplier Commerce gates are satisfied.

## AppScenic

**Status used by Loadify:** partner retailer-side API access required.

Official evidence checked on 2026-09-01:

- AppScenic documents a Supplier Public API with token access for supplier product/stock/price operations.
  - https://helpdesk.appscenic.com/support/solutions/articles/80001127464-how-can-i-get-access-to-appscenic-public-api-
- AppScenic's current integrations page states that its supplier Public API is available while a Public API tailored for retailers is still upcoming.
  - https://appscenic.com/integrations
- AppScenic separately invites developers/third-party tools to contact it for integration partnerships.
  - https://appscenic.com/partners

**Loadify conclusion:** Supplier Public API availability is not evidence of a retailer API contract for Loadify Market. Keep the provider inactive until retailer-side access and compatible commercial terms are explicitly available and verified.

## SaleHoo

**Status used by Loadify:** Developer API approval required; directory access is not commerce execution authority.

Official evidence checked on 2026-09-01:

- SaleHoo's Developer Centre exposes an API registration flow and states that API access requires approval.
  - https://www.salehoo.com/api

**Loadify conclusion:** use SaleHoo primarily for supplier discovery/due-diligence unless API approval is granted. Even approved API access must not be interpreted as verified order/payment execution capability without separate evidence.

## Spocket

**Status used by Loadify:** marketplace resale contract blocked.

Official evidence checked on 2026-09-01:

- Spocket describes supported retailer sales channels and separately states that retailers are not permitted to sell Spocket products on specified third-party marketplaces.
  - https://help.spocket.co/en/articles/3018488-where-can-i-sell-spocket-products
- Spocket's marketplace terms describe the retailer/supplier marketplace relationship and supplier-specific terms.
  - https://www.spocket.co/terms

**Loadify conclusion:** because Loadify Market is a marketplace model rather than merely a supported standalone store connector, do not integrate Spocket products until written permission and commercial terms explicitly cover the intended Loadify use case.

## AliExpress / DSers

**Status used by Loadify:** developer approval **and** UK import/compliance controls required.

Official evidence checked on 2026-09-01:

- DSers now documents partner account registration for suppliers, platforms, sales channels, and other developers building third-party integrations through Open API.
  - https://help.dsers.com/partner-account-registration-for-third-party-app-integrations-2/
- DSers maintains a developer guide with Channel App API and Supplier App API paths.
  - https://www.dsers.com/developers/
- DSers documents the Channel App workflow as an integration where orders and tracking data flow between a merchant channel and DSers after app approval.
  - https://www.dsers.com/developers/channel-app/

**Loadify conclusion:** DSers is no longer modelled as lacking a developer integration path. However, no DSers capability is verified for Loadify yet. Provider activation remains blocked by developer approval/runtime evidence and by Loadify's separate UK import VAT, customs, product-safety, landed-cost, and returns governance.

## BigBuy

The BigBuy sandbox verification runner is already implemented separately. Loadify still requires authorised sandbox credentials and controlled taxonomy/product/variation identifiers before the sandbox evidence gate can run. No capability is promoted from code presence alone.

## Direct Supplier

The Direct Supplier Phase E/Phase F code path is implemented separately. Hosted Phase F execution remains OFF and must not be enabled until an authentic UK/EU supplier is onboarded and approved in Supplier Foundation. Synthetic suppliers must never be promoted as real evidence.

## Avasam

Avasam remains fail-closed and evidence-blocked for transactional capability promotion. It is not the critical path for unrelated Supplier Commerce engineering.

## Global non-negotiable gates

- Hosted provider activation remains OFF by default.
- No provider capability is verified solely from documentation or scaffold code.
- No supplier order write occurs without provider-specific write evidence and existing execution gates.
- No customer PII is disclosed without validated provider contract, purpose, and runtime boundary.
- No automatic refund/payment mutation is authorised by this ledger.
- No RLS relaxation, hosted destructive reset, migration repair, or synthetic-provider promotion is authorised by this ledger.
