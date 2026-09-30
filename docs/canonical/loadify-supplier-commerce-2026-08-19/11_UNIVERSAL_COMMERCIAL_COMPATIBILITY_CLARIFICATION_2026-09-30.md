# LOADIFY MARKET — UNIVERSAL COMMERCIAL COMPATIBILITY CLARIFICATION

**Date fixed:** 30 September 2026  
**Status:** CONTROLLING PRODUCT / COMMERCIAL ARCHITECTURE CLARIFICATION  
**Owner decision:** Loadify Market must be technically capable of supporting the legitimate commercial model required by an approved supplier, seller, customer, fulfilment provider or commercial partner, rather than forcing every partner into one platform-wide role allocation.

## 1. Controlling direction

Loadify Market must not hard-code one universal commercial relationship such as:

- supplier is always seller of record;
- Loadify is always seller of record;
- one party is always invoice issuer;
- one party always receives payment;
- one settlement mechanism is mandatory;
- one fulfilment or returns allocation is mandatory.

The platform must use a **provider-neutral, evidence-backed commercial compatibility model**.

For each approved supplier / seller / partner relationship and market, the reviewed commercial contract may independently define:

- seller of record;
- invoice issuer;
- merchant of record;
- payment recipient / collection model;
- inventory owner;
- fulfilment provider;
- customer-service responsibility;
- returns authority;
- cancellation authority;
- retail-price authority and pricing restrictions;
- processor / Connect / payout fee allocation;
- settlement model, trigger and schedule;
- order-submission method;
- tracking and acknowledgement requirements;
- return, refund, chargeback and recovery allocation.

Supported parties may include, where lawful and contractually evidenced:

- the approved supplier;
- Loadify Market / XDrive Logistics Ltd;
- an independent marketplace seller;
- an approved payment platform for payment-processing roles;
- a specifically identified third party;
- shared responsibility where the role itself can legitimately be shared.

## 2. No supplier-specific commerce forks

Commercial flexibility must be data-driven and versioned.

A new supplier must not require a new supplier-specific commerce core merely because its commercial allocation differs from another supplier.

The architecture is:

**COMMERCIAL CONTRACT ? ROLE MATRIX ? MARKET LEGAL/PAYMENT GATE ? PRICING/SETTLEMENT POLICY ? ORDER SNAPSHOT ? EXECUTION**

Provider adapters may differ for transport/auth/API mechanics, but the canonical commerce truth must remain provider-neutral.

## 3. Compatibility does not mean unrestricted acceptance

This clarification does **not** mean Loadify accepts every requested arrangement automatically.

A commercial model remains fail-closed unless the applicable evidence is sufficient for the relevant market and transaction, including as applicable:

- legal identity and contractual authority;
- consumer-law responsibility;
- tax / VAT / customs treatment;
- Stripe / payment-provider compatibility;
- invoice responsibility;
- product and content rights;
- product compliance and safety;
- fulfilment capability;
- returns / cancellation / refund responsibility;
- settlement and reconciliation;
- privacy / reporting obligations.

If a requested model is illegal, unsupported by the payment provider, commercially rejected by the owner, or lacks required evidence, the platform must block activation. The technical platform itself should not be the avoidable reason a legitimate model cannot be represented.

## 4. Relationship to earlier supplier marketplace assumptions

Earlier checkpoints and migrations that treated the independent supplier as the mandatory seller of record / invoice issuer represent one supported commercial configuration, not the permanent platform-wide architecture.

Likewise, historical Loadify-as-seller assumptions represent another possible configuration, not a universal default.

This clarification supersedes any later implementation or checkpoint statement that treats one of those allocations as the only valid future Supplier Commerce model.

Historical paid orders and immutable commercial snapshots are not rewritten.

## 5. Order truth

Every future supplier-commerce order must snapshot the exact reviewed commercial configuration used for that transaction, including the applicable role identities and commercial-profile version.

Changing a supplier contract later must not reinterpret historical orders.

At minimum, future adaptable orders must preserve:

- supplier commercial counterparty identity;
- seller-of-record party and identity;
- invoice-issuer party and identity;
- merchant-of-record party and identity;
- payment-recipient party and identity;
- inventory-owner party;
- fulfilment party;
- customer-service party;
- returns / cancellation authority;
- settlement model;
- pricing policy;
- commercial profile ID and version;
- market and marketplace operator.

## 6. Phase O safety

This clarification does not activate Supplier Commerce.

Phase O remains a controlled-pilot gate. Global controls remain fail-closed until real supplier evidence, commercial configuration, product readiness, payment readiness and all applicable Phase O requirements pass.

A new commercial configuration must be verified independently before it can be used for publication, checkout, payment, supplier ordering or settlement.

## 7. Acceptance rule for implementation

Implementation is acceptable only when:

1. the commercial role matrix is configurable without supplier-specific core forks;
2. market policy can allow or reject individual role combinations;
3. missing role identity or unsupported combinations fail closed;
4. catalogue surfaces expose the correct seller/fulfilment identity;
5. checkout revalidates the selected supplier's exact commercial profile;
6. order creation snapshots the exact role allocation and profile version;
7. payment validates the same commercial contract before creating a payment intent;
8. legacy historical orders remain unchanged;
9. no migration or code path silently enables Supplier Commerce;
10. PowerShell tests, TypeScript, lint, migration health and production build pass before merge.

## 8. Owner intent

The controlling product intent is:

> Loadify Market should be able to work with any legitimate commercial-service model that the business deliberately approves and can lawfully operate. A partner should not be rejected merely because the platform hard-coded a different commercial allocation.

This is a platform-capability requirement, not an instruction to waive legal, tax, payment, safety or commercial governance.