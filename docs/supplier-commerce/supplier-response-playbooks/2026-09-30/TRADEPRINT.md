# Tradeprint Connect — Supplier Playbook

Last reviewed: 2026-09-30
Gmail threads: `1a0d266fbf57df80`, `1a0edc6e245cab3c`
Key supplier messages: `1a0ecc9798fdafb7`, `1a0edc6e245cab3c`, `1a0f210048391498`
Current classification: **OWNER-PAUSED / DO NOT CONTINUE**

## What Tradeprint confirmed

1. Tradeprint Connect can support a supplier-fulfilled marketplace model through API integration.
2. They support sandbox testing, white-label fulfilment and direct delivery to end customers.
3. They explicitly permitted Loadify Market to list Tradeprint products in a multi-vendor marketplace and submit fulfilled orders for buyers.
4. They stated there are no restrictions from their side on using Tradeprint product specifications, descriptions or imagery in marketplace listings.
5. If Loadify builds its own interface, they stated there is no setup fee or monthly subscription; production orders incur product cost and reduced production rates may apply.
6. Sandbox is intentionally limited and not correctly priced; it is for testing only.
7. Not every Tradeprint product can be mapped to the API because of their SKU-based system.
8. Production credentials can be issued when required.
9. A credit account is required to process production API orders.
10. White-label direct-to-customer fulfilment is available for API-enabled products.
11. Production tracking/status can use webhooks.

## Loadify technical history

- Sandbox authentication and product attributes were successfully tested.
- A Flyers product family / configuration was identified and pinned as sandbox-only evidence.
- Sandbox price-list/quantity generation returned provider-side internal-server errors even when authentication/product discovery succeeded.
- Tradeprint sandbox work was later explicitly cancelled by Daniel because the immediate business priority is sellable products rather than continuing print-integration work.

## Owner instruction

**Do not continue Tradeprint work unless Daniel explicitly reactivates it.**

That means no further Postman testing, no production credentials request, no credit-account process, no product publication, no order tests and no follow-up email solely to progress Tradeprint.

## Security

Tradeprint previously sent sandbox credentials by email. Never store or reproduce those credentials in repo/docs/chats. Treat them as secrets and rotate/re-request before any future reactivation if exposure is suspected.

## If reactivated later

1. Reconfirm current commercial terms and credit-account requirements.
2. Request fresh/production credentials through secure storage.
3. Use production pricing, never sandbox pricing, for economics/publication.
4. Select only API-enabled product families.
5. Validate product configuration -> price -> artwork -> order -> webhook/tracking -> fulfilment end to end.
6. Keep publication fail-closed until real production pricing and product configuration truth are verified.