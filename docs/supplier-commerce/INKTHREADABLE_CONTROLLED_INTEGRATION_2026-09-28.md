# Inkthreadable controlled integration evidence

Status: **implementation in progress / activation OFF**

This document records only evidence that has been confirmed for the controlled
Loadify Market integration. It is not an activation approval.

## Confirmed provider contract

- Authentication uses an AppID plus a SHA-1 signature derived from the request
  material and the account Secret Key.
- Order creation is available through `POST /api/orders.php`.
- Order retrieval is available through `GET /api/order.php` and
  `GET /api/orders.php`.
- Unpaid test orders can be cancelled/deleted before production.
- Automatic payments can be disabled so an API-created test order remains in a
  non-production state.
- A paid physical order is required later to validate production, dispatch and
  tracking end-to-end.
- The order API does not provide a general catalogue/pricing/stock feed.
  Product selection and commercial catalogue evidence therefore remain a
  separate controlled onboarding concern.

## Loadify safety position

- No live credential is committed to the repository.
- Runtime credentials are server-only.
- Hosted activation remains OFF.
- No buyer-facing product is activated by this work.
- No paid order may be submitted until the unpaid create/read/cancel path has
  passed and the operator explicitly authorises the paid E2E test.
- Webhook activation remains OFF until authentication, payload, retry and
  duplicate-delivery behaviour are documented and verified.

## Provider-specific data still required

Print-on-demand order submission needs provider-specific production data that
is not represented by the generic SupplierOrderRequest alone, including the
selected Inkthreadable part number/variant and the artwork/design URL and print
configuration. This data must be bound to the approved supplier offer/product
configuration server-side; it must not be accepted from arbitrary checkout
input.

## Controlled validation sequence

1. Provision AppID/signing key as server environment secrets.
2. Validate authentication with a read-only request.
3. Submit one controlled unpaid test order.
4. Retrieve the same order and verify acknowledgement/status mapping.
5. Cancel/delete the unpaid order and verify the terminal state.
6. Configure webhooks only after the provider webhook security contract is
   verified; otherwise use controlled polling/reconciliation.
7. Only then submit and pay for one low-value physical test order to a
   company-controlled address.
8. Verify production -> dispatch -> tracking -> delivery.
9. Record evidence and separately decide whether any scoped activation is
   justified.

## Current blockers

- Exact production/artwork payload mapping for the chosen test product.
- Exact webhook authentication/signature, headers, JSON payload shape, retry
  policy and duplicate-delivery semantics.
- Live credentials have intentionally not been provisioned through chat.
