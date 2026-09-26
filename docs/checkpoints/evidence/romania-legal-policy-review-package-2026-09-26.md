# Romania legal-policy review package — 26 September 2026

Status: **ENGINEERING / LEGAL-SOURCE REVIEW PACKAGE — NOT LEGAL APPROVAL**

This checkpoint binds the current Romanian legal-policy implementation to deterministic source material and records the remaining human/legal review boundary. It does not mark any policy version as `verified` and does not authorise Romania launch.

## Current policy surfaces

Canonical Romanian policy content:
- `src/components/legal/RomaniaLegalContent.tsx`
- `RomaniaBuyerTerms`
- `RomaniaReturnsPolicy`
- `RomaniaShippingPolicy`
- `RomaniaPrivacyPolicy`

Transaction-facing routes:
- `/buyer-terms`
- `/returns-policy`
- `/shipping-policy`
- `/privacy`

All four web routes select the Romanian component when market = RO.

A native-only defect was found during this review:
- `PrivacyPolicy.tsx` selects `PrivacyPolicyMobile` in APK/native mode;
- `PrivacyPolicyMobile.tsx` had no market branch and always rendered the UK policy;
- therefore an RO native user could be shown UK privacy text.

Fix:
- `PrivacyPolicyMobile.tsx` is now market-aware;
- market RO renders `RomaniaPrivacyPolicy`;
- GB/native retains the existing UK mobile policy;
- regression coverage is in `src/__tests__/romania-legal-policy-routing.test.ts`.

## Harmonised legal guarantee notice — effective 27 September 2026

Romanian consumer-law implementation was rechecked against the amended distance-contract requirements and Commission Implementing Regulation (EU) 2025/1960.

Engineering consequence:
- for applicable online Romanian consumer checkout, the harmonised legal guarantee notice must be shown before the consumer becomes bound by the order;
- the Commission-provided notice must not be editorially rewritten;
- the online version uses the official colour asset.

Official Commission asset source:
- European Commission legal-guarantee notice download package (PNG/JPG, all EU languages)
- https://commission.europa.eu/document/download/dbd46ba2-77d2-4a74-ad52-120bc7bf02ea_en?filename=PNG+and+JPG.zip

Official Romanian colour PNG copied byte-for-byte into the repository:
- `public/legal/eu-legal-guarantee-notice-ro.png`
- dimensions: 1654 × 2339
- bytes: 88,604
- SHA-256: `51d641e25d29a9cd4d087a6540d474ade46fd52b2e38f1ac65befb1108caa032`

The image is not redrawn, translated, recompressed or edited. Only responsive CSS sizing is applied.

Checkout placement:
- RO-only `Informații înainte de comandă` block;
- before the `Comandă cu obligație de plată` button;
- label: `Garanția legală de conformitate`;
- source path: `/legal/eu-legal-guarantee-notice-ro.png`.

Regression coverage:
- `src/__tests__/romania-harmonised-legal-guarantee-notice.test.ts`;
- checks the official SHA-256;
- checks the RO checkout source path;
- checks that the notice occurs before the payment-obligation button.

## Authoritative review inputs

Consumer distance-contract / withdrawal:
- Romanian OUG 34/2014, as amended;
- OUG 18/2026 for the 27 September 2026 online-withdrawal / legal-guarantee changes.

Legal guarantee / harmonised notice:
- Commission Implementing Regulation (EU) 2025/1960;
- official European Commission notice assets.

Conformity guarantee:
- OUG 140/2021.

EU consumer baseline:
- European Commission / Your Europe consumer-contract guidance.

Data protection:
- Regulation (EU) 2016/679 (GDPR);
- Romanian supervisory authority ANSPDCP.

## Exact current policy fingerprints

The following hashes bind the current source text in `RomaniaLegalContent.tsx` after LF normalisation and inclusion of the shared Romanian legal shell/contact block:

- buyer_terms:
  `91dd1e65f6b63e1ce1ab1b70bc7a2e39b565e839539bed937699e5a9c8abfef9`
- returns_policy:
  `5d1081f7629a1e63f309c3cae2a1aab743900c1232fe8492da8eb1b8d826d009`
- shipping_policy:
  `aed95d61ed61e4ba76994080f2e73450d3fc488943e1c35bbd790601f8aed110`
- privacy:
  `2d91098ac2181ad906b6d23967d62b65706fae5304ec0c38ecb4dda80caa2e80`

These fingerprints identify the draft texts submitted for review. They are not evidence of legal approval.

## Database review boundary

Production table:
- `private.market_legal_policy_versions`

Production gate:
- `public.server_market_legal_policy_snapshot_v1('RO')`

Current launch rule requires current `verified` ro-RO versions for:
- buyer_terms;
- privacy;
- returns_policy;
- shipping_policy.

The engineering workflow may create `draft` rows for the exact policy fingerprints above, but:
- `reviewed_by` must remain NULL until a legitimate reviewer performs the review;
- `reviewed_at` must remain NULL;
- status must remain `draft`;
- draft rows do not satisfy the launch gate.

## Review still required

A qualified/legal reviewer must still confirm, at minimum:
- the seller-status disclosures and consumer-rights consequences;
- withdrawal exceptions and return-cost language;
- conformity/legal-guarantee wording;
- delivery wording;
- privacy-controller / processor / international-transfer disclosures;
- Romanian authority/contact references;
- interaction between marketplace seller identity, supplier identity and consumer remedies;
- final wording against the legal framework effective on launch date.

Until that review is complete:
- RO legal readiness remains `eligible=false`;
- RO checkout/payment remain disabled;
- RO remains PRELAUNCH;
- no policy row may be converted from `draft` to `verified`.
