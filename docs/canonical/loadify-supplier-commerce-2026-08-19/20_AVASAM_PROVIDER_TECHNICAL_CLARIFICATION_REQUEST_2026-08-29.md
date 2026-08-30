# Avasam Provider Technical Clarification Request

Date: 29 Aug 2026
Status: PREPARED — NOT SENT — NO COMMERCIAL ACTIVATION
Related PR: #608

## Purpose

This document captures the exact technical questions that remain after verifying the Avasam Seller API read-only integration for Loadify Market.

It is intentionally limited to gaps that are not resolved by the current Avasam Seller API documentation or by controlled read-only evidence.

Do not include Consumer Key, Secret Key, access tokens, customer PII, order data, Netlify secrets or Supabase secrets in any support request.

## Recommended support channel

Use the support ticket system inside the authenticated Avasam seller account as the preferred channel because it keeps the technical request associated with the correct account without disclosing API credentials.

Avasam also publicly offers seller support by live chat, email and telephone. If the ticket system is unavailable, use the official seller-support contact route from Avasam's current contact page. Do not send API secrets through any support channel.

## Already verified — do not ask Avasam to reconfirm unless needed for a contradiction

- `POST /api/auth/request-token` works with `consumer_key` + `secret_key`.
- The Seller API accepts the resulting access token as the raw value of the `Authorization` header for verified read endpoints.
- `GetSellerProductList` is usable for sourced-product catalogue/price reads.
- `SellerStockList` is usable for sourced-product stock reads.
- Controlled pilot SKU: `S0671779793`.
- Supplier terms reference currently used for that pilot: `GB010107`.
- No order endpoint has been called.

## Technical request to Avasam

### Suggested subject

**Seller API integration — clarification required for order lifecycle, shipping, cancellation, returns and idempotency**

### Suggested message

Hello Avasam Technical Support,

We are integrating the Avasam Seller API into our UK marketplace using a staged, least-privilege approach. We have completed and verified the read-only product, price and stock integration and are now reviewing the documented contract required before enabling any order-related permission or customer-data processing.

We have reviewed the current Seller API documentation, including `CreateSellerOrder`, `AddNewOrder`, `GetProcessOrderList`, `GetSellerProductList`, `GetInventoryListWithFilter` and `SellerStockList`.

Before we enable Orders or any order-related production flow, could you please confirm the following technical points and, where possible, provide the current official documentation or endpoint specification for each one?

1. **Canonical order-creation endpoint**
   - Which endpoint should a new Seller API integration use in 2026: `CreateSellerOrder` or `AddNewOrder`?
   - Are both currently supported for production integrations?
   - Is one deprecated or intended only for legacy integrations?

2. **Order acknowledgement / stable Avasam order identifier**
   - The documented success response for both order-creation endpoints contains `ErrorCode`, `Message` and `id`, with the example `id` documented as always `0`.
   - What stable Avasam order identifier should the caller persist after a successful submission?
   - Is there another field or endpoint that returns the created Avasam order number/order ID immediately after creation?

3. **Idempotency and lost-response recovery**
   - Does Avasam support an idempotency key for Seller API order creation?
   - If a POST times out or the connection is lost after Avasam may have accepted the order, what is the supported method to determine whether the order was created before retrying?
   - Is `ReferenceNumber` / `ReferenceNum` guaranteed unique per seller and safe to use for duplicate prevention or lookup?
   - What retry behaviour is recommended for 429, 5xx and network timeouts?

4. **Order lookup / acknowledgement by seller reference**
   - Is there an endpoint that retrieves a specific order by seller reference, Avasam order number or another stable identifier?
   - `GetProcessOrderList` is documented as a filtered processed-order list. Is this the supported mechanism for order acknowledgement/reconciliation, or is there a dedicated order-detail endpoint?

5. **Shipping service discovery and quote**
   - Order creation requires a shipping service name and, for `AddNewOrder`, shipping service ID/charge fields.
   - Is there a Seller API endpoint to list the shipping services currently valid for a sourced product/supplier/destination?
   - Is there an endpoint to quote the shipping charge before order submission?
   - If no API exists, what is the supported source of truth for the exact shipping service name/ID/charge that should be submitted?

6. **Restricted and remote UK postcodes**
   - Is there a machine-readable API endpoint or maintained downloadable dataset for restricted/remote UK delivery locations?
   - If not, should integrations maintain the published help-centre postcode list locally and how should changes be monitored?

7. **Tracking**
   - `GetProcessOrderList` includes `Shipping.TrackingNumber`, carrier/provider data and order status, but also returns customer address/contact details and payment-related fields.
   - Is there a dedicated tracking/status endpoint that does not return customer PII?
   - If `GetProcessOrderList` is the only supported method, which API permission(s) are required and can the response be restricted to non-PII fields?

8. **Cancellation**
   - The documented order status model includes cancellation states, but we could not identify a Seller API cancellation endpoint.
   - Is there an API endpoint to request cancellation?
   - If cancellation is supplier-specific or support-mediated, is there a machine-readable flag indicating whether a supplier/order supports API cancellation?

9. **Returns**
   - The documented processed-order model contains return-related states/fields (`RETURN_REQUEST`, `RETURN`, `IsReturnRequest`, `ReturnStatus`, return quantities/reasons), but we could not identify an endpoint that creates a return request.
   - Is there a Seller API endpoint for return creation/authorisation?
   - If returns are handled only in the Avasam UI/support workflow, please confirm the supported integration process.

10. **Refund / repayment / reimbursement status**
    - The order status model includes `REPAYMENT`, and processed-order data can contain refund-related metadata.
    - Is there a documented endpoint or field set that represents supplier reimbursement/credit/refund to the seller?
    - How should an integration determine that a supplier-side financial recovery is final and reconciled?

11. **API rate limits**
    - The documentation states that authentication/API-access calls are not counted against the API rate limit, but we could not find the actual limits for Seller API data/order calls.
    - Please provide the current request limits, window, 429 behaviour and any relevant response headers.

12. **Webhooks beyond stock and price**
    - We found documented stock and price webhook configuration.
    - Are order acknowledgement, dispatch, tracking, cancellation, return or repayment webhooks available for Seller API integrations?
    - If yes, please provide event schemas, verification/signature requirements, retry policy and acknowledgement requirements.

13. **Required API permissions by capability**
    - Please confirm the minimum access-right setting required for each of the following independently:
      - product search/catalogue read;
      - sourced inventory read;
      - stock read/update notification;
      - price read/update notification;
      - shipping service/quote read;
      - order creation;
      - order status/acknowledgement;
      - tracking;
      - cancellation;
      - returns;
      - repayment/refund/reimbursement status.
   - We want to keep permissions disabled unless a capability genuinely requires them.

14. **Current API version/deprecation policy**
    - Is there a version identifier for the current Seller API?
    - What notice period is provided for breaking endpoint/schema changes?
    - Is there a changelog or technical mailing list/webhook for API changes?

We are deliberately not sending any credentials, access tokens or customer/order PII with this request. If you need our Avasam account identifier for support lookup, please tell us the minimum non-secret identifier required and we will provide it through the appropriate secure support channel.

Thank you.

## Acceptance criteria for Avasam's reply

A reply is sufficient to unlock implementation only when it provides authoritative provider evidence for the relevant capability, such as:

- official documentation URL;
- endpoint + HTTP method + request/response contract;
- exact permission requirement;
- explicit statement that no API exists and the supported manual/UI process;
- rate-limit/retry/idempotency rules;
- stable order identifier / reconciliation rule;
- webhook schema and verification contract where applicable.

Do not infer missing behaviour from examples or status enum values alone.

## Loadify action after reply

For every answer, classify the capability as one of:

- `VERIFIED_IMPLEMENTABLE`
- `VERIFIED_MANUAL_ONLY`
- `REQUIRES_PII_PERMISSION`
- `REQUIRES_ORDERS_PERMISSION`
- `PROVIDER_CONTRACT_STILL_MISSING`
- `NOT_SUPPORTED`

Only `VERIFIED_IMPLEMENTABLE` capabilities may proceed to a new code implementation gate, and every transactional capability must still pass Loadify's existing simulator, governance and hosted readiness controls before activation.

## Current safety state remains unchanged

- PR #608 remains DRAFT / NOT MERGED.
- Orders remain OFF.
- PII view remains OFF.
- Invoice remains OFF.
- Our suppliers remains OFF.
- Listing Manager remains OFF.
- Payment Settings remains OFF.
- Hosted Supplier Commerce controls remain OFF.
- No Avasam order call is authorised by this document.
