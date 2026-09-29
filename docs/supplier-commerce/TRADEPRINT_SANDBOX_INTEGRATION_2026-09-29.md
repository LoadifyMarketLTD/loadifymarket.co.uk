# Tradeprint Connect sandbox integration evidence

Status: **sandbox discovery active / production activation OFF**

## Confirmed evidence

- Tradeprint received Loadify Market's marketplace operating model before issuing sandbox access.
- Dedicated sandbox credentials were issued to Loadify Market on 29 September 2026.
- Credentials are treated as server-side secrets and are not stored in this repository.
- Tradeprint's official SDK uses REST API v2 with a separate Sandbox environment.
- Sandbox base URL: `https://sandbox.orders.tradeprint.io/v2`.
- Authentication is `POST /login` with username/password, returning a bearer token.
- Product discovery is available through the Products service.
- Orders and Products use the same authenticated API boundary.
## Live validation performed

A controlled read-only probe was executed against Tradeprint Sandbox:

1. `POST /v2/login` using the issued sandbox credentials.
2. Authentication returned a valid token.
3. `GET /v2/products-v2/attributes-v2` was called with that bearer token.
4. Product discovery returned `success=true`.

No order was created, validated, paid, cancelled or otherwise mutated during this probe.

## Loadify safety position

- Production credentials are not present.
- No production endpoint is represented by the initial Loadify adapter.
- No buyer-facing listing is published by this work.
- No Supplier Commerce control is enabled by this work.
- Order submission remains out of scope until read-only discovery is mapped and reviewed.
- Sandbox credentials must only be provisioned through protected server environment variables.
## Canonical first-phase contract

Loadify currently supports the sandbox discovery boundary only:

- sandbox authentication;
- read-only product attribute discovery;
- single-product price-list discovery;
- product quantity discovery;
- expected-delivery discovery;
- fail-closed response parsing;
- server-only credential loading.

Price-list, quantity and expected-delivery calls are implemented only as sandbox discovery
operations and require a selected product/configuration before live probing. The Tradeprint
SDK also documents validate-order, submit-order, artwork, status and cancellation flows.
Those order mutation paths remain intentionally disabled until a test product is selected
and the discovery evidence is reviewed.

## Commercial items still requiring explicit confirmation

- marketplace-use permission in direct written terms;
- commercial settlement/credit-account model;
- product/content/image usage rights for third-party marketplace display;
- production credential onboarding and support route.

Sandbox integration may continue while these items remain pending. Production activation
must remain OFF until the commercial evidence is complete.

## Verified sandbox catalogue snapshot — 29 September 2026

The authenticated Tradeprint Sandbox currently exposes 17 product families through the product-attribute discovery boundary. Price-list exports were successfully generated and downloaded for all 17 families.

Observed product families:

- Comp slips
- Custom Roll - Top Backpack
- Deskpads
- Envelopes
- Feather Flags
- Flyers
- Folded & Laminated Leaflets
- Folded Leaflets
- Letterheads
- Long Run Posters
- Mesh Banners
- Perfect Bound Booklets
- PVC Banners
- Roller Banners
- Standard BC
- Teardrop Flags
- Triplex BC

Across the 17 exported price-list files, 206,602 raw configuration/price rows were observed. These rows are configuration/service combinations, not 206,602 distinct marketplace products. Loadify therefore records the 17 families as technical catalogue candidates and keeps the raw rows as variant/configuration evidence.

All catalogue candidates remain fail-closed with `publicationAllowed=false`. No public listing, checkout, supplier order or production activation is created by this snapshot.

A Tradeprint Head of New Business subsequently confirmed in writing that Loadify's supplier-fulfilled marketplace model is a good fit for Tradeprint Connect, including REST integration, sandbox testing, white-label fulfilment and direct delivery. Detailed commercial terms, rate/catalogue limits, production credential requirements and content/image usage rights remain pending written confirmation.

One additional unresolved mapping issue remains: sandbox price-list values are preserved as raw supplier evidence until Tradeprint confirms the price-unit/settlement semantics. They must not be converted into customer-facing prices by assumption.
