# Loadify Market Romania — Legal Compliance Matrix
Date: 2026-09-28
Status: PRE-LAUNCH / legal engineering audit in progress
Canonical implementation: `src/components/legal/RomaniaLegalContent.tsx`

## Scope
This matrix maps the four Romania consumer-facing documents to the principal official legal sources currently verified:
- Buyer Terms
- Returns Policy
- Shipping Policy
- Privacy / GDPR Policy

The platform model used throughout is marketplace/intermediary: XDrive Logistics Ltd operates Loadify Market, while the identified third-party seller remains the contractual seller of the goods. Loadify does not own or pre-purchase inventory.

## Official sources verified
1. OUG 34/2014 privind drepturile consumatorilor, consolidated text:
   https://legislatie.just.ro/Public/DetaliiDocument/158913
2. OUG 18/2026 amending OUG 34/2014:
   https://legislatie.just.ro/Public/DetaliiDocumentAfis/308474
3. OUG 140/2021 privind anumite aspecte referitoare la contractele de vanzare de bunuri:
   https://legislatie.just.ro/Public/DetaliiDocumentAfis/268151
4. Regulation (EU) 2016/679 (GDPR):
   https://eur-lex.europa.eu/eli/reg/2016/679/oj
5. Regulation (EU) 2022/2065 (Digital Services Act):
   https://eur-lex.europa.eu/eli/reg/2022/2065/oj

## Matrix

| Area | Source / article | Requirement | Current implementation | Status / action |
| --- | --- | --- | --- | --- |
| Pre-contract consumer information | OUG 34/2014 art. 6 | Essential characteristics, trader identity, total price, delivery, payment, withdrawal, complaint route and other required information must be available before contract | Buyer Terms section 1 now lists the required information categories and requires seller status + allocation of responsibilities | PARTIAL — UI/checkout evidence must still prove every field is shown at the required moment |
| Online marketplace seller status | OUG 34/2014 marketplace information rules | Consumer must be told whether third party is a professional and the consequences if not | Added explicit `traderStatus` (`trader` / `non_trader`) independent of `sellerType`; onboarding collects the declaration; public seller projection carries it; product detail displays it; Romania checkout fails closed if the declaration is missing; durable order email includes it and warns for non-trader sales | IMPLEMENTED IN SOURCE — migration deployment and production/E2E evidence still required |
| Ranking transparency | OUG 34/2014 marketplace rules / Omnibus implementation | Principal ranking parameters and relative importance must be disclosed | Buyer Terms section 2 documents ranking; Catalog now exposes an accessible `How results are ranked` disclosure aligned to actual source behavior: default newest-first and user-selected price/popularity/rating ordering after eligibility/filtering | IMPLEMENTED IN SOURCE — production/E2E evidence still required |
| Order creates payment obligation | OUG 34/2014 art. 8 | Immediately before order, required information must be prominent and action must make payment obligation unambiguous | Buyer Terms section 3 plus `src/pages/pixel-perfect/Checkout.tsx`: Romania review step shows pre-order notice and the final button reads `Comandă cu obligație de plată` together with the total | IMPLEMENTED IN SOURCE — production/E2E evidence still required |
| Contract confirmation | OUG 34/2014 art. 8(9) and durable-medium rules | Acceptance/contract information must be confirmed on durable medium | Checkout snapshot now persists market/currency; Stripe webhook passes buyer name, seller name, total, currency, order date, shipping address and market into the order-confirmation email; `send-email.ts` now renders a Romania-specific durable order confirmation with legal-policy links | IMPLEMENTED IN SOURCE — production delivery/content evidence still required |
| 14-day withdrawal | OUG 34/2014 art. 9 | Consumer has 14 days in eligible distance contracts, with delivery-specific start rules | Buyer Terms section 4 and Returns sections 1-4 | TEXT CLOSED |
| Online withdrawal function | OUG 34/2014 art. 11^1 inserted by OUG 18/2026; applicable from 19 June 2026 | Visible, continuously accessible withdrawal function; identify consumer/contract; confirmation action; durable-medium acknowledgement with content/date/time | `/buyer/withdrawal`, labels “Retrageți-vă din contract aici” and “Confirmați retragerea”; policy text updated accordingly | IMPLEMENTED; E2E evidence exists, but final production re-test required |
| Withdrawal refund deadline | OUG 34/2014 art. 13 | Refund without undue delay and max 14 days; standard delivery cost included; lawful withholding for goods | Returns section 4; governed return/refund runtime keeps payment mutation separate from the request and automatic Stripe refund occurs only after the configured receipt path completes | IMPLEMENTED IN SOURCE — production/E2E refund evidence still required |
| Return of goods | OUG 34/2014 art. 14 | Return within max 14 days after withdrawal; direct cost only where properly disclosed; diminished-value rule | Returns sections 3 and 5 | TEXT CLOSED |
| Withdrawal exceptions | OUG 34/2014 art. 16 | Statutory exceptions only; cannot be invented or broadened contractually | Returns section 6 | TEXT CLOSED; product-level exception flags must be verified |
| Legal conformity guarantee | OUG 140/2021 | Seller liability for non-conformity and statutory remedies | Buyer Terms section 5 and Returns section 7; return automation now separates 14-day changed-mind withdrawal from damaged/wrong/not-as-described conformity claims so those claims are not rejected merely because 14 days elapsed | IMPLEMENTED IN SOURCE — production/E2E conformity evidence still required |
| New 2026 consumer-information changes | OUG 18/2026, measures applicable from 27 Sep 2026 | New sustainability/durability/repair/update-related information duties apply where conditions are met | Seller product editor now captures reviewed producer durability guarantee, digital-elements/update period, reparability, spare-parts, repair and repair-restriction information without inventing missing claims; Romania Product Detail displays reviewed values; Romania checkout fails closed unless the product consumer-information applicability review is marked complete and snapshots the available fields | IMPLEMENTED IN SOURCE — production migration/data population and E2E evidence still required |
| Delivery deadline | OUG 34/2014 delivery rules | Unless otherwise agreed, delivery without undue delay and generally within 30 days | Shipping section 2 | TEXT CLOSED |
| Non-delivery remedies | OUG 34/2014 | Additional appropriate deadline in ordinary cases; termination may follow; exceptions where deadline is essential/refusal | Shipping section 3 | TEXT CLOSED |
| Passing of risk | OUG 34/2014 | Risk normally passes on physical possession, subject to consumer-chosen-carrier exception | Shipping section 4 | TEXT CLOSED |
| Operator identification | Romanian e-commerce/consumer information rules | Operator identity and effective contact details must be accessible | Shared Contact block now includes company number, VAT, postal address, email and telephone | TEXT CLOSED |
| GDPR transparency | GDPR arts. 12-14 | Clear controller identity, categories, purposes, legal bases, recipients, retention, transfers, rights, indirect data | Privacy sections 1-9 | PARTIAL — exact retention schedule and processor inventory must be reconciled with production systems |
| GDPR territorial scope | GDPR art. 3(2) | Non-EU controller targeting people in EU falls within GDPR scope where conditions met | Privacy intro | TEXT CLOSED |
| EU representative | GDPR art. 27 | Where art. 3(2) applies and exception does not, non-EU controller must designate representative in Union | Privacy section 2 explicitly leaves Romania PRE-LAUNCH until requirement is evaluated/closed | BLOCKER |
| International transfers | GDPR arts. 44-49 | Lawful transfer mechanism required where personal data leaves EEA | Privacy section 8 | PARTIAL — vendor-by-vendor transfer mechanism evidence required |
| Automated decisions | GDPR arts. 13-15, 22 | Additional disclosures/rights if solely automated decision with legal/similarly significant effect | Privacy section 10 | TEXT CLOSED subject to confirmation no such production decision exists |
| Trader traceability | DSA art. 30 | Where DSA Section 4 applies, obtain trader identity/contact/payment/register/self-certification data and make reasonable verification efforts | Buyer Terms section 7 is conditional; current source has business identity/contact/registration fields, Stripe payment onboarding and trader-status declaration. Identity-document and Article 30 self-certification completeness are not yet claimed | CONDITIONAL — Article 29 status must be closed first; retain conservative controls regardless |
| DSA SME scope | DSA art. 29 + Recommendation 2003/361/EC | Section 4 excludes qualifying micro/small providers unless VLOP; EU size calculation also considers staff, financial thresholds and partner/linked enterprises | Companies House shows one current officer and Micro company accounts for 2022–2025, strongly supporting very small-company status, but UK micro-account filing is not alone a complete EU Recommendation 2003/361/EC calculation | PROVISIONALLY SUPPORTED — retain final blocker until staff/financial/linked-enterprise evidence is recorded |

## Confirmed corrections already made in code
- Removed the incorrect old statement tying the online withdrawal function to 27 September 2026.
- Rewrote the withdrawal workflow description to match art. 11^1 mechanics.
- Added VAT and telephone to operator contact details.
- Added marketplace/seller-status and responsibility allocation language.
- Added ranking explanation reflecting `src/lib/search.ts`.
- Expanded withdrawal refund, return-cost, diminished-value and exception rules.
- Expanded delivery delay and risk-transfer rules.
- Expanded GDPR purposes/legal bases, indirect collection, transfers, rights and automated-decision sections.
- Added an explicit Article 27 GDPR pre-launch blocker.

## Remaining hard blockers before Romania launch
1. Resolve GDPR Article 27 EU representative applicability and, if required, designate/publish the representative.
2. Populate and verify real product-level sustainability/durability/repair/update evidence. Source now captures and displays the fields and Romania checkout fails closed when review is incomplete; no producer information may be invented.
3. Re-test the Romania checkout in production/E2E: source now contains the immediate pre-order notice and `Comandă cu obligație de plată`, but runtime evidence is still required.
4. Re-test the durable-medium order confirmation in production: source now carries Romania market/currency, seller identity, total, shipping address, order items and links to the transaction policies.
5. Deploy/re-test seller trader-status and ranking disclosures in production; source implementation is now present, but DB migration/application and runtime evidence remain required.
6. Re-test return/refund/non-conformity E2E in production. Source now centralises buyer return creation server-side and separates withdrawal expiry from statutory non-conformity claims.
7. Complete the Article 29 size file using exact employee/AWU, turnover or balance-sheet total, and partner/linked-enterprise evidence. Public Companies House evidence already strongly supports micro-company status but is not treated as conclusive EU-size proof.
8. Reconcile Privacy Policy with the live processor/subprocessor inventory, retention schedule and international-transfer mechanisms.

## Rule for closeout
No item above is treated as legally closed merely because policy text exists. A requirement is closed only when:
- the legal source is identified;
- the policy language is correct;
- the product/UI/backend behavior matches it;
- evidence is captured;
- no contradictory policy or workflow remains.
