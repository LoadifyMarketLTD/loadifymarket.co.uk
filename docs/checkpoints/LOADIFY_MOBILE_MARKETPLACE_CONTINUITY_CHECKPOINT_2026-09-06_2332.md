# LOADIFY MOBILE MARKETPLACE CONTINUITY CHECKPOINT — 2026-09-06 23:32 BST

CONTINUE LOADIFY MARKET EXACTLY FROM THIS CHECKPOINT. DO NOT RESTART THE AUDIT FROM ZERO.

## Canonical targets / safety
- GitHub repo: `LoadifyMarketLTD/loadifymarket.co.uk`
- Netlify project: `loadifymarketcouk`
- Netlify site ID: `5cf610c7-95b1-482a-b713-01f59fa68e09`
- Supabase project: `fwdfpmfvgygvqciecesx`
- Production: `https://loadifymarket.co.uk`
- Active branch: `fix/native-marketplace-only-scope-20260906`
- PR: #773 — DRAFT / NOT MERGED
- NEVER write directly to main.
- Before any write verify repo/branch/Netlify/Supabase target.
- No Stripe payout/refund/transfer test. No new live payment unless explicitly requested.
- Preserve Loadify Market visual identity. Do NOT redesign logo/colors/brand language.

## Current exact repo state
- Current HEAD verified locally: `891627ce071045fd4c1d5894070f81064a6861d7`
- Commit message: `Fix anonymous marketplace product visibility`
- Previous important HEAD: `126f0ccc5cd7fe2ded97f28b1ecf0b29c84c27a4`
- Local working tree intentionally has uncommitted WIP changes in:
  - `src/components/product/ProductGallery.tsx`
  - `src/components/MobileGridCard.tsx`
  - `src/components/WebMobileGridCard.tsx`
  - `src/pages/MarketplaceHomePage.tsx`
- Android generated files also modified locally by Capacitor sync:
  - `android/app/capacitor.build.gradle`
  - `android/capacitor.settings.gradle`
- Do not blindly discard the four source WIP files above.

## Anonymous website product visibility — FIX APPLIED
User discovered that signed-out visitors saw `0 live marketplace listings` / `No listings found` on the public website catalog while authenticated users could see products.
Root cause was Supabase RLS on `public.products`: one public SELECT policy included an `is_admin()` branch, which anonymous role could not safely evaluate.
Migration committed at HEAD `891627ce...`:
- `supabase/migrations/20260906223000_split_products_public_select_policy.sql`
Hosted Supabase was verified after migration and now has:
- `products_select_anon` for role `anon`: public active + approved + in-stock/service listings + checkout-ready seller only; no `is_admin()` branch.
- `products_select_authenticated` for role `authenticated`: same public listings + own seller products + admin access.
This is a production DB policy change already applied. Do NOT reapply blindly.
NEXT CHAT: first runtime-test the public website in a truly signed-out/private window and confirm `/catalog` and marketplace home show live products. If stale, use Ctrl+F5 and inspect network/RLS before changing code.

## Product detail / native mobile status already PASS
- Native product cards now open the product detail route instead of redirecting owner listings to desktop seller edit.
- Product detail shows full product information, not only image + description.
- `Cart` and `Buy Now` are separate actions.
- Buy Now goes to checkout; own listing hides purchase/message actions but still shows full product data.
- Latest physical Android runtime before this checkpoint: build/install succeeded on Samsung device `57311FDCQ00BGS`.
- Exact-head Deploy Preview for `126f0ccc...` was SUCCESS before the later anonymous visibility commit.

## User-approved marketplace behavior
Treat Vinted only as a FUNCTIONAL benchmark. Never copy proprietary code/assets/trade dress and never replace Loadify Market visual identity.
Required navigation contract:
- Marketplace/list card tap -> full Product Detail page.
- Inside Product Detail, tap main photo -> fullscreen image viewer.
- Fullscreen viewer -> full uncropped image (`object-contain`), close X, left/right controls, image counter.
- Thumbnail tap -> that exact image becomes the active main image.

## WIP source changes NOT YET COMMITTED — preserve and finish
`src/components/product/ProductGallery.tsx` currently has WIP fullscreen viewer logic:
- adds `viewerOpen` state and X icon;
- tapping main image opens fullscreen overlay;
- fullscreen image uses original image + `object-contain`;
- left/right buttons and `N / total` counter exist.
This WIP was created after user reported that tapping the product image did nothing. It has NOT yet been rebuilt/installed/runtime-confirmed after these edits. Do not call it PASS yet.

Seller-name WIP:
- `MobileGridCard.tsx` adds optional `seller` prop and renders `Sold by {seller}`.
- `WebMobileGridCard.tsx` adds same.
- `MarketplaceHomePage.tsx` passes `p.seller` to both card variants.
User explicitly reported seller name is missing from all products. Continue this across ALL relevant marketplace product cards/detail surfaces, not only home grid. Prefer canonical seller public profile/businessName already adapted into `product.seller`; do not invent names.

## Activity screen finding
User showed Profile -> Activity page. Current Activity UI looks placeholder/incomplete: large empty gaps, rows named `Test`, `Test back`, `Test`, archive/delete icons with no context, no timestamp/type/product/order/conversation linkage.
Target functional Activity Center should use Loadify styling and compact contextual events such as item sold, order delivered, new message, favourite, return request, payment available, with timestamp and deep-link to relevant order/conversation/listing.
Do NOT start with a visual redesign; first identify the actual Activity page/data source and remove placeholder/test-only behavior safely.

## Sell flow / visual fixes already implemented earlier on #773
- Sell header navy consistent with Inbox.
- Form fields and More Details light, not dark.
- Separate `Take photo` and `Gallery` actions.
- Camera opens for live capture; gallery chooses existing images.
- Product gallery arrows and `1 / 4` indicator made visible on mobile.
- Profile header replaced generic ACCOUNT with Loadify Market branding.

## Next actions — exact order
1. Re-verify repo/branch/HEAD and confirm #773 is still DRAFT / NOT MERGED.
2. Public website signed-out runtime gate: verify `/catalog` and marketplace pages show products after `891627ce...`; do not alter RLS again unless runtime evidence still fails.
3. Finish current WIP fullscreen ProductGallery and seller-name propagation. Run lint, typecheck, build.
4. Commit only source changes after tests; do not include generated Capacitor files unless intentionally required.
5. Require exact-head Netlify Deploy Preview SUCCESS.
6. `npx cap sync android` -> `assembleDebug` -> install APK on Samsung `57311FDCQ00BGS`.
7. Physical runtime test: marketplace card -> product detail -> tap main photo -> fullscreen complete uncropped photo; arrows/counter/close; thumbnails exact.
8. Physical/runtime test seller name on home grid, similar listings, catalog/category cards, product detail seller block. Fix any missing surface.
9. Audit/fix Activity page functional data and deep links, preserving brand.
10. Continue marketplace completeness audit: seller profile, favourites, shipping info, report/block/moderation, messages tied to product/order, cart/checkout, purchases/sales, returns/disputes, notifications, balance/security.
11. Resume Play Store readiness audit only after mobile functional P1s are stable.
12. DO NOT merge #773 until exact-head preview + physical Android validation + owner confirmation.

## Play Store gate notes already known
- package/appId: `co.uk.loadifymarket.app`
- compileSdk/targetSdk 36, minSdk 24.
- New Play release needs AAB, release signing, Firebase `google-services.json`, versionCode increment discipline.
- Privacy policy, Data Safety, in-app + external account deletion, UGC/reporting/moderation, notification permission, manifest/deep-link/network security, accessibility/back/offline/error states remain in audit scope.
- Physical-goods marketplace checkout can continue using Stripe; do not introduce Play Billing unless digital goods/services are added.

## Important truth rules
- Never claim PASS without exact evidence.
- Do not re-run audits already closed unless evidence changed.
- Do not mix XDrive Logistics work into this workstream.
- No visual redesign. Only targeted fixes and marketplace functionality consistent with current Loadify identity.
