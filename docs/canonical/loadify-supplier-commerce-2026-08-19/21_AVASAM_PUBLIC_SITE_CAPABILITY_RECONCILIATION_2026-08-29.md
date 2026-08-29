# Avasam public-site capability reconciliation

Date: 29 Aug 2026
Status: READ-ONLY EVIDENCE RECONCILIATION — NO COMMERCIAL ACTIVATION
Related PR: #608

## Purpose

This checkpoint reconciles public Avasam website/FAQ/Terms evidence with the Seller API documentation and the controlled read-only evidence already captured in PR #608.

It does not enable Orders, PII, listing, hosted Supplier Commerce controls or any transactional provider capability.

## Public Avasam evidence now verified

### Cancellation business process

Avasam's UK Terms state that a Seller may request cancellation until the order is marked dispatched, cancellation remains subject to supplier discretion, some items may be non-cancellable, and the normal platform process is the Cancel Order feature in the Orders screen with a cancellation reason.

For supplier GB010107, the supplier-specific accepted terms remain stricter and take precedence for this pilot: standard cancellation functionality is disabled and Avasam Support is required, with only a short indicative request window and no guarantee of cancellation.

Verdict: BUSINESS PROCESS VERIFIED; SELLER API CANCELLATION ENDPOINT STILL NOT DOCUMENTED.

### Returns business process

Avasam's UK Terms state that a Return Item request can be submitted within the Avasam Platform, the supplier should respond within two business days, and an accepted return-for-inspection does not itself guarantee a refund until inspection is complete. Faulty Item and Lost Item request flows also exist in the platform.

For GB010107, non-faulty returns are explicitly excluded by the supplier-specific terms, so generic Avasam return policy must not be used to override that supplier-specific commercial rule.

Verdict: PLATFORM RETURN PROCESS VERIFIED; SELLER API RETURN-CREATION CONTRACT STILL NOT DOCUMENTED.

### Refund / reimbursement business semantics

Avasam's UK Terms state that qualifying refunds are processed by Avasam and credited to the Seller Account. Refund/credit balances then accrue in the account and can be withdrawn according to the Seller disbursement rules.

This gives Loadify a business-level finality concept: supplier/Avasam refund approval -> credit to the Seller Account. It does not provide a documented Seller API field or endpoint that Loadify can safely use to observe that finality programmatically.

Verdict: BUSINESS REFUND FINALITY VERIFIED; SELLER API REIMBURSEMENT/REFUND OBSERVABILITY STILL MISSING.

### Shipping business source of truth

Avasam's UK FAQ states that suppliers are expected to offer tracked shipping, tracking details are uploaded from suppliers to Avasam and onward to the end customer, shipping prices are defined by suppliers, and the shipping costs for an item are visible on the product listing page. Avasam also states that shipping pricing bands are enforced.

This establishes a UI/product-listing source of truth for shipping cost/service at the business level, but the Seller API documentation still does not expose a documented endpoint for shipping-service discovery or pre-order quote.

Verdict: BUSINESS/UI SHIPPING SOURCE VERIFIED; SELLER API SHIPPING DISCOVERY/QUOTE CONTRACT STILL MISSING.

### Restricted / remote UK postcodes

Avasam's UK Terms provide a published restricted/remote postcode resource but explicitly state that it is not guaranteed to be complete or conclusive and recommend additional seller research.

Verdict: HUMAN-READABLE POLICY SOURCE VERIFIED; MACHINE-READABLE/API CHANGE-CONTRACT STILL MISSING.

### Tracking business semantics

Avasam's UK FAQ states that tracking details are uploaded from suppliers to Avasam and to the end customer. The Seller API `GetProcessOrderList` response is documented to include shipping provider and TrackingNumber.

However, that same Seller API response also contains customer names, addresses, email/phone fields and payment/order information. Therefore it is not accepted as a least-privilege tracking integration while PII view/order access remains disabled unless Avasam confirms the required permission and whether a non-PII tracking/status contract exists.

Verdict: TRACKING SEMANTICS VERIFIED; LEAST-PRIVILEGE SELLER API TRACKING CONTRACT STILL MISSING.

## API gaps that remain genuinely unresolved

The broader public-site review did not close these technical contracts:

1. canonical order-creation endpoint for new integrations (`CreateSellerOrder` vs `AddNewOrder`);
2. stable Avasam order identifier returned or recoverable after successful creation;
3. idempotency key / duplicate-prevention semantics;
4. lost-response recovery after timeout or connection loss;
5. safe order lookup / acknowledgement by seller reference or Avasam reference;
6. Seller API shipping-service discovery / pre-order quote;
7. non-PII tracking/status endpoint or field minimisation contract;
8. Seller API cancellation endpoint;
9. Seller API return-creation/authorisation endpoint;
10. Seller API reimbursement/refund observability contract;
11. actual Seller API rate limits, 429 headers/behaviour and retry policy;
12. order-lifecycle webhooks beyond documented stock/price webhooks;
13. exact minimum API permission matrix by capability;
14. current API version, changelog and breaking-change/deprecation policy.

## Safety conclusion

The support ticket remains necessary, but it is now narrowed correctly: Avasam does not need to explain basic cancellation/return/refund business policy to us; it needs to confirm the missing programmatic Seller API contracts.

No additional Avasam permissions should be enabled merely to investigate these gaps.

No live order call is authorised.

Hosted Supplier Commerce remains fail-closed.
