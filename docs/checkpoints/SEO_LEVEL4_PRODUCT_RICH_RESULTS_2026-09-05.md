# SEO Level 4 — Product Rich Results & Merchant Data

## Baseline
- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Base branch: `main`
- Baseline SHA: `2b93031f729005b2f2f7d678e7902f193afbcef2`
- Level 3 is already merged and LIVE.

## Scope
1. Keep one canonical crawler-visible Product JSON-LD object.
2. Use product category, condition, brand and identifiers only when backed by real listing data.
3. Remove the false hard-coded `Loadify Market` product brand from the Merchant feed.
4. Exclude service listings from product-shopping feed eligibility.
5. Do not guess Google product-category overrides or identifier-existence claims.
6. Keep confirmed non-public/unapproved product routes out of indexable product metadata without deindexing valid products during transient upstream failures.
7. Add contract tests for Merchant feed and Product rich-result behavior.

## Hosted Production audit — READ ONLY
`public.products` has no dedicated top-level brand, GTIN, EAN, MPN or SKU columns. Product-specific attributes live in `specifications` when sellers/providers supply them.

For currently public active listings, observed `specifications` keys are:
- `collectionAvailable`
- `deliveryAvailable`
- `shortDescription`
- `brand` on only a minority of listings
- `condition`
- `model`

No GTIN/EAN/MPN keys are currently present in public active inventory. They must never be invented.

Current hosted `listingContext` data is `product`; Level 4 still makes Merchant eligibility explicit so future service listings cannot leak into Shopping feeds.

## Confirmed defects before implementation
- `netlify/functions/product-feed.ts` hard-coded `Loadify Market` as `<g:brand>` for every marketplace product.
- Product feed permitted `listingContext=service` through its sellability query.
- Product feed forced unmatched categories to `Business & Industrial`.
- Product JSON-LD lacked real category/condition and optional evidence-backed product identifiers.
- Missing/unapproved product routes could inherit generic SPA indexability.
- Hydration could add a second Product JSON-LD object after Edge metadata was injected.
- Seller-oriented `0% commission` promotional copy leaked into product meta descriptions.

## Final implementation contract
### Merchant feed
- Requires `isActive=true`, `isApproved=true`, `listingStatus=active`, `listingContext=product`, positive stock and positive price.
- Requires a usable image before an item is emitted.
- Uses listing `specifications.brand`, validated GTIN/EAN and MPN only when supplied.
- Never substitutes Loadify Market as a product brand.
- Does **not** infer `identifier_exists=no` from missing fields. Missing local data is not proof that a manufacturer identifier does not exist.
- Does **not** guess `google_product_category`. Google can auto-categorise; the feed emits the Loadify category as `product_type` instead.

### Product Edge metadata
- Definitive missing/unapproved product lookup => `noindex, nofollow`.
- Transient Supabase/configuration lookup failure => preserve base response; do not accidentally deindex a valid product.
- One crawler-visible Product JSON-LD object includes only available evidence-backed fields: category, condition, brand, validated GTIN, MPN, aggregate rating, offer availability, price and real public seller name.
- JSON-LD serialization neutralises HTML/script-breaking characters from seller-controlled content.
- Browser hydration suppresses a duplicate Product JSON-LD object; non-product structured data remains unchanged.
- Product meta description strips the seller-oriented `Sell with 0% commission on Loadify Market` suffix while leaving the visible product UI untouched.

## Validation history
A pre-final diagnostic strict Netlify Deploy Preview for HEAD `d29e6576abd3669ffa75cc25fa95bea0e9343be0` completed READY/SUCCESS with:
- strict command: `npm ci && npm run lint && npm test && npm run build`
- 63 Functions
- 4 Edge Functions
- secret scan: 1581 files, 0 matches
- Lighthouse: Performance 83, Accessibility 97, Best Practices 100, SEO 97, PWA 100

This diagnostic is **not** the final release gate because Merchant truthfulness was tightened afterward. Only the exact final cleaned HEAD is eligible for release.

## Safety
- No visual redesign.
- No Stripe/payment mutation.
- No Production Supabase write or migration.
- No invented certification, manufacturer, brand, GTIN, EAN, MPN, rating, shipping promise or product claim.
- PR remains DRAFT / NOT MERGED until exact final HEAD passes `npm ci && npm run lint && npm test && npm run build` on Netlify Deploy Preview.
