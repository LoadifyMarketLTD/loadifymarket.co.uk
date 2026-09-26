# Romania Stripe payment-readiness technical evidence — 26 September 2026

Status: **DRAFT TECHNICAL EVIDENCE — NOT REVIEWED / NOT LAUNCH-APPROVED**

Purpose: preserve verified technical observations for the five domains required by `public.server_market_payment_readiness_v1('RO')`. This file does not activate Romania checkout/payment and does not convert the database evidence rows to `verified`.

## 1. RON charge support

Observed from official Stripe currency documentation on 26 September 2026:
- Stripe supports charges in more than 135 currencies.
- RON is explicitly represented in Stripe's charge limits with a minimum charge of **2.00 RON**.
- Stripe distinguishes presentment currency from settlement currency and can convert a non-default presentment currency into the account's default settlement currency.

Current Loadify production Stripe platform account:
- country: GB;
- default currency: GBP;
- `card_payments`: active;
- charges enabled: true;
- payouts enabled: true.

Loadify runtime:
- Romania market currency is RON;
- checkout/payment remain disabled while RO is PRELAUNCH;
- runtime payment functions preserve the order/market currency rather than hard-coding GBP.

Source:
- https://docs.stripe.com/currencies

Limitation:
- no live Romanian customer charge was created;
- this evidence remains draft until reviewed and the controlled real-environment rehearsal is completed without a live customer charge.

## 2. Merchant account capability

Production Stripe account read on 26 September 2026:
- platform: GB;
- charges enabled: true;
- payouts enabled: true;
- details submitted: true;
- card payments: active;
- transfers: active.

Two currently connected accounts were observed:
- both GB;
- both charges enabled;
- both payouts enabled;
- both card payments active;
- both transfers active.

Limitation:
- this proves the current platform/observed Connect capability only;
- it does not claim that every future Romanian seller account is ready or eligible.

## 3. SCA / 3DS support

Official Stripe documentation confirms that 3D Secure is used to satisfy authentication requirements and that EEA customer-initiated card payments can require Strong Customer Authentication.

Loadify integration review:
- web path uses Stripe Checkout;
- mobile path uses Stripe PaymentIntent;
- Romania payment remains behind the explicit PRELAUNCH/payment-readiness gate.

Source:
- https://docs.stripe.com/payments/3d-secure

Limitation:
- no real-environment Romanian 3DS challenge was exercised in this checkpoint.

## 4. Refund support

Official Stripe documentation confirms:
- full and partial PaymentIntent refunds are supported;
- refunds return to the original payment method;
- Connect refund liability/recovery depends on charge type.

Loadify runtime review:
- `create-refund.ts` creates the refund against the canonical PaymentIntent;
- refund requests use an order-scoped idempotency key;
- pending/failed refund states do not prematurely alter settlement truth;
- seller-transfer recovery/reversal handling exists for Marketplace Seller orders.

Source:
- https://docs.stripe.com/refunds

Limitation:
- no RON refund was executed because no live customer charge is permitted for this rehearsal.

## 5. Settlement / reconciliation

Official Stripe documentation distinguishes presentment and settlement currency and documents currency conversion for Connect/platform payments.

Production observations:
- Loadify platform default settlement currency is GBP;
- currently observed connected accounts also use GBP;
- Loadify records payment-session currency and canonical PaymentIntent linkage;
- webhook handling validates expected PaymentIntent amount and currency before completing payment state.

Sources:
- https://docs.stripe.com/connect/currencies
- https://docs.stripe.com/currencies

Limitation:
- final acceptance still requires the controlled RO rehearsal and review of the intended Marketplace Seller settlement model.

## Database evidence state

Five RO rows were created in `private.market_payment_readiness_evidence`, one per required domain:
- `ron_charge_support`;
- `merchant_account_capability`;
- `sca_3ds_support`;
- `refund_support`;
- `settlement_reconciliation`.

All five rows are intentionally:
- `status='draft'`;
- `reviewed_by IS NULL`;
- `reviewed_at IS NULL`.

Post-insert verification:
- `public.server_market_payment_readiness_v1('RO')` remains `eligible=false`;
- all five domains remain listed in `missingEvidence`, because only genuinely reviewed `verified` rows satisfy the launch gate.

## Decision

Technical evidence collection is materially advanced, but the payment-readiness blocker is **not closed**.

Do not:
- set these rows to `verified` without a legitimate reviewer;
- enable RO checkout/payment;
- create a live customer charge merely to satisfy the rehearsal;
- infer Romanian seller/payment eligibility from the current GB connected accounts.
