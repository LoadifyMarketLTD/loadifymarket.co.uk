# Multi-Provider Supplier Foundation — 2026-08-30

## Purpose

Loadify Market must not depend on a single supplier network. Avasam remains a controlled read-only provider, but the platform is now prepared to represent additional supplier sources and seller-connectivity channels without activating any commercial workflow.

The account owner reports that Avasam has not replied to the commercial email sent to them. That does not change the verified read-only code evidence; it does change execution priority: new provider preparation must proceed independently.

## Non-activation rule

This foundation does **not** activate:

- BigBuy;
- direct suppliers;
- Syncee;
- AppScenic;
- SaleHoo;
- Spocket;
- AliExpress / DSers;
- ChannelEngine;
- Linnworks;
- Sellbrite;
- Supplier Commerce hosted controls;
- marketplace listing from supplier feeds;
- order submission;
- PII disclosure;
- supplier payments;
- returns/reimbursements.

Every newly represented supplier provider is hosted-OFF. Only the existing Avasam adapter retains its already-verified code-level `catalog + stock + price` capabilities; hosted Supplier Commerce activation remains independent and OFF.

## New code boundaries

### Supplier provider registry

`netlify/functions/_shared/supplierProviderRegistry.ts`

Known supplier-side providers now have explicit code/readiness states. A known provider can be instantiated safely before integration exists: unverified providers receive a zero-capability `InactiveSupplierAdapterV1` and every operation fails closed with `CAPABILITY_UNAVAILABLE` before network access.

### Direct supplier contract

`netlify/functions/_shared/directSupplierContract.ts`

Loadify Direct Supplier Contract V1 establishes a provider-neutral ingestion envelope for UK/EU manufacturers and wholesalers using:

- JSON API;
- JSON feed;
- CSV;
- XML;
- SFTP.

The initial shared contract carries product/variant identity, SKU/GTIN, title, currency, minor-unit price, stock, warehouse country, images and attributes. PII is deliberately excluded.

### Marketplace channel connector boundary

`netlify/functions/_shared/marketplaceChannelConnector.ts`

Seller-connectivity systems are separated from supplier sourcing. ChannelEngine/Linnworks/Sellbrite are not SupplierAdapter implementations. They belong behind a marketplace-channel connector boundary for product content, offers, order export, shipments, cancellations and returns.

## Provider execution matrix

| Provider | Role | Code state | Hosted state | Immediate action |
|---|---|---|---|---|
| Avasam | supplier network | verified read-only | OFF | keep intact; no commercial dependency |
| BigBuy | supplier network | scaffolded / unverified | OFF | first technical provider audit after foundation |
| Loadify Direct Supplier | direct manufacturer/wholesaler | scaffolded / unverified | OFF | build onboarding/feed validation next |
| Syncee | supplier network | partner access required | OFF | clarify retailer/custom-platform contract before implementation |
| AppScenic | supplier network | partner access required | OFF | wait for explicit retailer-side API/partner access |
| SaleHoo | supplier directory | API approval required | OFF | use for discovery/due-diligence; API only after approval |
| Spocket | marketplace retail source | contract blocked | OFF | no implementation without explicit marketplace permission |
| AliExpress / DSers | global retail source | future compliance gate | OFF | defer until import VAT/customs/product-safety/returns gates exist |

## Seller-connectivity matrix

| Connector | Role | State | Hosted state |
|---|---|---|---|
| ChannelEngine | marketplace channel connector | scaffolded / unverified | OFF |
| Linnworks | marketplace channel connector candidate | partner access required | OFF |
| Sellbrite | marketplace channel connector candidate | research required | OFF |

## External evidence reviewed on 2026-08-30

- BigBuy official API pages/documentation describe catalogue/real-time stock and price, Orders API, shipping-cost/carrier APIs, tracking, API keys and sandbox access.
- ChannelEngine's current Channel API documentation describes a marketplace/channel integration surface for product content, offers, orders, shipments, cancellations and returns.
- Syncee documents custom-platform supplier-side order webhooks that require support enablement; those supplier webhooks must not be misread as proof of unrestricted retailer catalogue/order API access.
- SaleHoo publishes a Developer Centre but API access requires approval.
- Spocket's help centre states retailers are not permitted to sell Spocket products on third-party marketplaces; Loadify therefore treats this as contract-blocked absent explicit written permission.

## Safety properties

1. A provider being present in the registry is not activation.
2. `potentialCapabilities` are research targets only and are never treated as enabled.
3. `verifiedCapabilities` are empty for every newly added provider.
4. All newly added provider adapters advertise zero capabilities.
5. All newly added provider operations fail closed before network access.
6. No credentials are invented or stored.
7. No hosted Supabase Supplier Commerce state is changed.
8. No Auth, checkout, Seller Workspace, Super Admin, Avasam live pilot logic, Android or Web Mobile code is changed.

## Next execution order

1. BigBuy credential/contract eligibility audit and sandbox access path.
2. BigBuy read-only contract implementation: auth -> catalogue -> stock -> price -> shipping quote.
3. Only after live/sandbox verification, evaluate a controlled order gate.
4. Build Direct Supplier onboarding validator + signed feed/webhook ingestion, still hosted-OFF.
5. Obtain ChannelEngine partner/channel test environment before implementing the connector.
6. Keep Syncee/AppScenic/SaleHoo as access/discovery tracks until their Loadify-specific integration rights are proven.
7. Keep Spocket and Asia sourcing blocked until their respective contract/compliance gates are satisfied.
