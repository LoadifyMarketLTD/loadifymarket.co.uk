# DSers Sales Channel Application — Under Review — 2026-09-02

## Current status

**APPLICATION SUBMITTED / UNDER REVIEW — NO API APPROVAL YET — PROVIDER REMAINS OFF**

Loadify Market submitted a DSers **Sales Channel Application** through the DSers developer portal.

The DSers portal now displays:

- `Under Review`;
- stated review window: **7–15 business days**;
- contact route through the DSers page support control.

The submission used the Loadify Market service identity and existing service URL. The owner also confirmed that a submission/confirmation message was received at `contact@loadifymarket.co.uk`.

## Canonical commercial direction

Loadify Market is **not a product supplier to DSers** and does not currently operate its own supplier catalogue for this integration.

Loadify is the **Sales Channel / marketplace**. The intended integration direction is:

`approved supplier/product source -> DSers -> Loadify catalogue -> customer sale on Loadify -> DSers/supplier fulfilment -> order status/tracking back to Loadify`

In practical terms, the objective is to:

1. source/import approved supplier products into Loadify Market;
2. publish those products for sale on Loadify;
3. transmit resulting customer orders through the authorised DSers integration for supplier fulfilment;
4. receive fulfilment, order-status and tracking updates back into Loadify.

The integration must therefore be treated as a **Sales Channel integration**, not a Supplier Application. Wording that implies Loadify already owns a product catalogue or supplies products into DSers is incorrect for this workstream.

Canonical external wording:

> Loadify Market is a UK-based marketplace and sales channel. We do not operate as a product supplier to DSers. Our objective is to source and import approved supplier products into Loadify Market, make those products available for sale to customers on our marketplace, transmit resulting customer orders through the authorised DSers integration for supplier fulfilment, and receive fulfilment, order-status and tracking updates back into Loadify Market. We are therefore seeking integration as a Sales Channel, not as a Supplier application.

## Separate welcome email

A separate DSers email titled **Welcome to DSers** was received. It describes the standard DSers onboarding workflow:

- connect a store and supply account;
- configure DSers settings;
- find products and suppliers;
- map products to suppliers;
- fulfil orders;
- receive tracking updates.

This message confirms account/onboarding availability only. It is **not** evidence that the Loadify custom Sales Channel Application has been approved and it is **not** evidence that any Open API capability has been granted.

## Provenance

At the time this record was created, the Gmail connector was unavailable in the active ChatGPT session. Therefore raw Gmail message IDs/headers were not captured into the repository.

Evidence available to this workstream is:

1. DSers developer portal status supplied by the owner: `Under Review`, 7–15 business days;
2. owner confirmation that the submission confirmation was received at `contact@loadifymarket.co.uk`;
3. owner-supplied text of the separate DSers welcome/onboarding email.

These items must not be overstated as approval evidence.

## Machine-readable provider effect

The canonical provider key remains:

`aliexpress_dsers`

Provider role becomes:

`sales_channel_fulfillment_bridge`

Readiness becomes:

`developer_review_underway`

Blocking dependencies become:

- `developer_review_result`;
- `uk_import_compliance_controls`.

The previous `developer_api_approval` blocker is replaced by `developer_review_result` because the application is no longer merely pending submission: it has actually been submitted and is being reviewed.

## Safety state

No capability is promoted by this evidence.

DSers remains:

- `verifiedCapabilities = []`;
- `hostedActivation = off`;
- represented by the inactive zero-capability provider adapter;
- provider writes OFF;
- customer PII disclosure OFF;
- automated orders OFF;
- tracking automation OFF;
- cancellation/returns/refunds OFF unless later independently verified;
- Production activation OFF.

## Next action

Wait for the explicit DSers Sales Channel Application review result.

If DSers approves the application, the next stage is **not Production activation**. The approval must first be reviewed for:

- exact API documentation and scopes;
- authorised development/sandbox environment;
- authentication contract;
- catalogue/variant/stock/price contract;
- order submit and acknowledgement semantics;
- idempotency and lost-response recovery;
- tracking contract and minimum PII requirements;
- rate limits and retry rules;
- cancellation/returns/refund capabilities where offered;
- UK import VAT/customs controls;
- product safety and restricted-product controls;
- landed-cost and margin protection;
- returns/reimbursement governance.

Only verified evidence may later change capability or activation state.
