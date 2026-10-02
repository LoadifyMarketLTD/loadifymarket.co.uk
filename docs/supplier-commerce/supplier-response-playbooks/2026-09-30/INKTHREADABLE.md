# Inkthreadable — Supplier Playbook

Last reviewed: 2026-10-02
Gmail thread: `1a0d068bf8ad80c5`
Key supplier messages: `1a0d068bf8ad80c5`, `1a0e469f24e3163c`, `1a0e75e9a770d667`, `1a0e7f0e77b49a24`
Current classification: **OWNER-RETIRED / PERMANENTLY REMOVED**

> Controlling owner decision (2026-10-01): Inkthreadable is permanently removed from the active Loadify Market supplier strategy. Do not contact, reactivate, publish, order, run provider writes, or create a new pilot unless Daniel Preda explicitly reverses this decision in a new instruction. Historical technical evidence below is retained for audit only.

## What Inkthreadable confirmed

1. Their API accepts structured JSON or XML for automated order submission/fulfilment.
2. Loadify may provide a built API integration for marketplace users or operate the API connection as the marketplace account.
3. Marketplace-specific terms are not required according to their direct reply.
4. Product references use Inkthreadable part numbers; designs can be supplied by URL in API calls.
5. Supported production methods include DTG, DTF, dye sublimation, embroidery and wide-format printing.
6. White-label options include custom neck labels and packaging inserts where supported.
7. The API itself is free; product cost is charged when an order is received/processed.
8. Orders can be submitted through `POST /api/orders.php`.
9. Order/despatch/tracking state can be obtained through the order endpoints. No webhooks are currently offered; sensible polling is required.
10. There is no sandbox. Testing uses a live account with automatic payments disabled for unpaid/non-production tests.
11. An unpaid order can be cancelled/deleted before production. To validate actual dispatch/tracking, at least one small paid order to our own address is required.
12. The API does not provide catalogue, pricing or stock endpoints.
13. Inkthreadable-generated mockups may be used for products they fulfil. Blank garment-brand product photos must not be used. If Loadify stops using Inkthreadable fulfilment, Inkthreadable mockups must be removed.
14. Inkthreadable recommended starting with a few core products (for example tee/hoodie), validating artwork and using sensible polling intervals.

## Product opportunity

This supplier is suitable for made-to-order personalised/print products, not a conventional stocked catalogue import. Products can be introduced when Loadify has a controlled product-definition layer that combines:

- permitted base product/part number;
- supported variants/options;
- Loadify artwork/design reference;
- permitted Inkthreadable-generated mockup;
- current manually verified base cost/pricing source;
- fulfilment and shipping economics.

## Historical next actions - SUPERSEDED; DO NOT EXECUTE

1. Re-read the current Inkthreadable account/API configuration before any test; credentials must remain in secrets storage only.
2. Select a very small first set (2-4 core products) rather than a broad catalogue.
3. Obtain/verify current part numbers, variant options, production method and current cost from Inkthreadable product pages/account.
4. Generate only permitted Inkthreadable mockups for listings; never copy garment-brand blank photography.
5. Create/stage the products in Loadify with publication OFF.
6. Validate API order creation with automatic payments disabled; cancel unpaid test orders after validation.
7. When technically ready and explicitly approved, place one small paid test order to a company-controlled address to validate production -> dispatch -> tracking. This creates a real charge, so do not do it without explicit approval at that time.
8. Record polling logic, status mapping, cancellation behaviour and failure recovery before activation.
9. Verify current product cost, shipping, returns and margin before each publication decision because the API is not a catalogue/price/stock source.

## Do not do

- Do not store AppID/Secret Key in repo or documentation.
- Do not treat API availability as catalogue rights for every asset.
- Do not use garment-brand blank images.
- Do not claim webhook support.
- Do not publish a large catalogue before the controlled lifecycle works end to end.
## Outstanding product-specific follow-up

On 2026-09-29 Loadify sent two follow-ups in the same thread: one proposing the 11oz Mug (`MUG-CER-WHI`) as the first controlled listing and one consolidating SKU-level verification for the proposed pilot. No substantive Inkthreadable reply to those product-specific questions has arrived yet. Therefore those SKUs are **not publication-approved** merely because the API/model is approved.
