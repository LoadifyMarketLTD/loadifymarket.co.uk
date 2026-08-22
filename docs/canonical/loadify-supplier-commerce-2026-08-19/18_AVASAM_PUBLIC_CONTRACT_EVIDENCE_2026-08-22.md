# Avasam public contract evidence — 22 August 2026

Status: **EVIDENCE DISCOVERY — NOT ACTIVATION EVIDENCE**

## Verified from Avasam public sources

Avasam publicly states that its platform supports automated order processing, payments, shipping instructions, dispatch notifications and inventory synchronisation. It also states that inventory synchronisation runs automatically at intervals and that custom website integration is available for inventory/order management.

Avasam's privacy documentation explicitly identifies the **Order API**, **Product Details API** and **Inventory API** as APIs used in its sales-channel integrations.

Avasam's supplier programme states that supplier inventory can be synchronised through FTP and API.

## What public sources do NOT establish sufficiently for Loadify activation

The currently accessible public material does not provide enough verified endpoint-level detail for Loadify to safely hard-code:

- API base URL;
- authentication/token endpoint and exact credential grant;
- endpoint paths and HTTP methods;
- request/response schemas;
- pagination and rate-limit contract;
- order submission idempotency contract;
- acknowledgement semantics;
- tracking event schema;
- cancellation/returns/reimbursement endpoint contract;
- webhook endpoint/event/signature contract.

Therefore none of those values may be guessed or promoted into a live adapter configuration.

## Capability evidence matrix

| Loadify capability | Public evidence | Activation status |
|---|---|---|
| supplier_identity | Avasam account/supplier onboarding exists | UNVERIFIED FOR ADAPTER |
| catalog | Product Details API is publicly referenced | UNVERIFIED FOR ADAPTER |
| variants | Product Details API is publicly referenced, but variant schema is not verified | UNVERIFIED |
| stock | Inventory API and inventory synchronisation are publicly referenced | UNVERIFIED FOR ADAPTER |
| price | Avasam documents pricing automation, but provider API payload is not verified | UNVERIFIED |
| shipping | Shipping instructions/dispatch confirmations are publicly referenced | UNVERIFIED FOR ADAPTER |
| order_submission | Order API and automated order processing are publicly referenced | UNVERIFIED FOR ADAPTER |
| acknowledgement | Automated dispatch/order lifecycle is referenced, but acknowledgement schema is not verified | UNVERIFIED |
| tracking | Order tracking is publicly advertised, but API event schema is not verified | UNVERIFIED |
| cancellation | Cancellation is referenced in Avasam support/terms, but API contract is not verified | UNVERIFIED |
| returns | Returns/refunds are supported by the platform, but adapter API contract is not verified | UNVERIFIED |
| reimbursement | Commercial recovery semantics are not sufficiently documented publicly | UNVERIFIED |

## Security decision

This evidence is sufficient to justify continuing contract discovery and adapter-boundary work. It is **not** sufficient to register an active Avasam adapter or enable Supplier Commerce.

No credentials, endpoint guesses, provider-specific payloads, or fake provider evidence may be committed.

## Source references

- Avasam Integrations: https://www.avasam.com/integrations/
- Avasam Privacy Policy: https://www.avasam.com/privacy-policy/
- Avasam Verified Supplier Programme: https://www.avasam.com/verified-supplier-programme/
- Avasam Knowledge Base: https://help.avasam.com/
