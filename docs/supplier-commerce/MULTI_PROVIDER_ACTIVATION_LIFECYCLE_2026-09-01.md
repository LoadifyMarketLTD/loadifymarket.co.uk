# Multi-Provider Activation Lifecycle — 2026-09-01

## Purpose

Make the provider-level lifecycle explicit and machine-evaluable:

`unconfigured -> configured -> validated -> production_enabled`

These states are deliberately not interchangeable. Provider code, credentials, a successful sandbox call, a verified read capability and Production activation are separate facts.

## Existing foundation reused

This change does not replace the existing Supplier Commerce architecture. It reuses:

- `SupplierAdapterV1` as the provider-neutral capability contract;
- `supplierProviderRegistry.ts` as canonical provider/code capability truth;
- `supplierProviderReadiness.ts` as the external dependency/readiness matrix;
- `providerExecutionContracts.ts` and the Autonomous Capability Registry for capability execution evidence;
- existing kill-switch, Supplier Foundation, order orchestration, commercial economics, payment firewall and Phase O controls.

## New policy boundary

`netlify/functions/_shared/supplierProviderActivation.ts`

The evaluator accepts evidence facts only. It never accepts raw API keys, passwords, access tokens, customer PII or payment credentials.

### Configuration gate

A provider is `configured` only when credentials/configuration are explicitly recorded as configured.

Configuration is not validation.

### Validation gate

A configured provider reaches `validated` only when all of the following hold:

- credentials have been independently validated;
- provider contract/access has been confirmed;
- security checks have passed;
- non-empty evidence references exist;
- every capability required for the intended provider use is already present in the canonical registry's `verifiedCapabilities`;
- every required capability has an explicit validation-test PASS.

Caller-supplied booleans cannot promote an unverified capability. If `bigbuy.verifiedCapabilities=[]`, a claimed BigBuy catalogue/stock test PASS still leaves validation blocked until evidence review separately promotes those capabilities in the canonical registry.

### Production gate

Production enablement additionally requires:

- provider readiness gate open;
- canonical hosted activation enabled by a separate reviewed code/configuration change;
- owner approval recorded;
- an explicit Production-enable request;
- kill switch clear.

The current provider registry intentionally models `hostedActivation='off'` only. Therefore this implementation cannot silently produce a Production-enabled provider. A future ON state requires an explicit reviewed change to the canonical activation model after provider evidence and controlled-pilot gates pass.

## Current expected classifications

### Avasam

For the already verified read capabilities (`catalog`, `stock`, `price`), trusted evidence can reach `validated`. Production remains blocked by provider readiness and hosted activation. Transactional capabilities remain unverified.

### BigBuy

Remains `configured` at most until authorised sandbox evidence is reviewed and the specific capabilities are promoted into `verifiedCapabilities`. The existence of the sandbox client/probe does not constitute capability verification.

### Direct Supplier

Remains blocked on an authentic supplier and canonical Supplier Foundation evidence. Synthetic fixtures are not acceptable activation evidence.

### Syncee / AppScenic / SaleHoo / Spocket / AliExpress-DSers

Remain governed by their existing external-access, contract, marketplace-resale or compliance blockers. Registry presence is not activation.

## Explicit safety properties

This change performs no:

- provider activation;
- credential mutation or disclosure;
- supplier/order submission;
- cancellation or returns call;
- customer PII disclosure;
- marketplace publication;
- Stripe/payment/refund/payout mutation;
- Supabase migration or hosted database mutation;
- owner approval recording.

All mutation flags in the assessment output remain `false`.

## Next engineering gate

After this provider-level lifecycle policy is validated, continue BigBuy technical preparation without promoting capability truth:

1. keep the existing sandbox-only controlled verification boundary;
2. do not wire BigBuy into generic runtime commerce until authorised sandbox evidence exists;
3. after real sandbox execution, review evidence capability-by-capability;
4. promote only capabilities supported by authoritative/runtime evidence;
5. then integrate the verified BigBuy read adapter into the provider registry;
6. keep order submission, tracking and other write/PII operations independently gated until their contracts and recovery semantics are proven.
