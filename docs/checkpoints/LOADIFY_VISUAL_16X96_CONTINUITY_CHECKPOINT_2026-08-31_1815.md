# LOADIFY MARKET — 16×96 VISUAL CATEGORY CONTINUITY CHECKPOINT

**Checkpoint date:** 2026-08-31 18:15 UK

**CONTINUĂ LOADIFY MARKET EXACT DIN ACEST CHECKPOINT. NU RELUA AUDITUL VIZUAL DE LA ZERO.**

Repo:
`LoadifyMarketLTD/loadifymarket.co.uk`

Active visual branch:
`visual-restore/user-source-20260823`

Base used for this visual workstream:
`0fe191ffe4a2164e9aaf1e3d8bc963c26b0f136d`

Pre-checkpoint branch HEAD:
`650a880e8de060a480a517d9cfd42397c507a2f4`

At last compare against the base, the visual branch was:
- ahead: 85 commits
- behind: 0

`main` MUST remain untouched until local visual verification is complete and explicitly accepted.

---

# OWNER DECISION / NON-NEGOTIABLE VISUAL CONTRACT

The owner explicitly rejected repeated parent imagery and low-quality placeholder-style visuals.

Permanent visual rules:

1. Every main category has its own category image.
2. Every one of the 96 subcategories has its own dedicated image.
3. A subcategory final image MUST be different from the parent-category image.
4. Two subcategories in the same category MUST NOT share the same final image.
5. The final visual must clearly describe the exact subcategory.
6. Parent fallback may exist only temporarily inside the work branch; it is NOT acceptable as final public output.
7. No fake listings, fake stock, fake reviews, fake commercial counts or invented marketplace activity may be created just to make the marketplace look full.
8. Editorial/category imagery is allowed even when real listing count is zero.
9. Required visual standard: bright, clean, premium commercial/editorial product photography; consistent 4:3 subcategory crops; no watermark; no visible foreign branding where avoidable; no dark/cinematic treatment; no cheap placeholder appearance.
10. Do NOT create or use category/subcategory graphics consisting mainly of a coloured/artificial background plus large text. The owner specifically rejected legacy-style examples such as `public/images/featured/toolbox.jpeg` and `public/images/featured/skincare2.jpeg` as unacceptable quality references.
11. Do NOT generate/show images inside ChatGPT conversation for this workstream. Work in the site/repository and report only execution/results/blockers.
12. Self-review category-by-category and subcategory-by-subcategory before calling anything complete.

A family is FAIL if:
- any of its six subcategories uses the parent image as final output;
- any two of its six subcategories use the same final image;
- any subcategory image does not clearly describe its subcategory;
- the family is only partially completed;
- imagery has obvious placeholder/demo/text-overlay appearance.

---

# AUTHORITATIVE 16×6 TAXONOMY

The workstream uses exactly 16 categories × 6 subcategories = 96:

1. Electronics & Technology
   - Phones & Tablets
   - Laptops & PCs
   - TV & Audio
   - Gaming Consoles
   - Accessories
   - Smart Home

2. Clothing & Apparel
   - Men's Clothing
   - Women's Clothing
   - Children's Clothing
   - Footwear
   - Accessories & Bags
   - Sportswear

3. Home & Garden
   - Furniture
   - Kitchen & Dining
   - Bedding & Linen
   - Garden & Outdoor
   - Lighting
   - Décor & Accessories

4. Health & Beauty
   - Skincare
   - Haircare
   - Makeup & Cosmetics
   - Fragrances
   - Health & Wellness
   - Personal Care

5. Toys & Games
   - Action Figures
   - Board Games
   - Educational Toys
   - Outdoor Toys
   - Dolls & Playsets
   - Puzzles

6. Food & Drink
   - Snacks & Confectionery
   - Beverages
   - Canned & Dry Goods
   - Health Foods
   - Specialty & Gourmet
   - Seasonal

7. Tools & DIY
   - Power Tools
   - Hand Tools
   - Plumbing
   - Electrical
   - Paint & Decorating
   - Fixings & Hardware

8. Sports & Leisure
   - Fitness Equipment
   - Cycling
   - Camping & Hiking
   - Water Sports
   - Team Sports
   - Leisure & Travel

9. Automotive
   - Car Parts
   - Car Accessories
   - Cleaning & Valeting
   - Tools & Equipment
   - Oils & Fluids
   - Tyres & Wheels

10. Office & Stationery
   - Office Furniture
   - Printers & Ink
   - Paper & Supplies
   - Office Tech
   - Filing & Storage
   - Pens & Writing

11. Baby & Nursery
   - Prams & Pushchairs
   - Baby Clothing
   - Feeding
   - Nursery Furniture
   - Toys (0-3 yrs)
   - Safety & Care

12. Jewellery & Watches
   - Necklaces & Pendants
   - Rings & Earrings
   - Bracelets
   - Watches
   - Fashion Jewellery
   - Accessories

13. Mixed Lots
   - General Mixed
   - Department Store Returns
   - Amazon Returns (generic e-commerce returns; no visible Amazon logo requirement)
   - Seasonal Mixed
   - High Value Mixed
   - Liquidation Lots

14. Customer Returns
   - Electronics Returns
   - Clothing Returns
   - Home Returns
   - Appliance Returns
   - Graded Returns
   - Unchecked Returns

15. Overstock
   - Brand Overstock
   - Seasonal Overstock
   - End of Line
   - Excess Inventory
   - Wholesale Lots
   - Bulk Deals

16. Clearance Deals
   - Flash Sales
   - Closing Down Stock
   - Damaged Packaging
   - Short Dated
   - Sample Stock
   - One-Off Deals

The detailed `focus` brief for every one of the 96 entries is encoded in:
`src/data/wholesaleSubcategoryBlueprint.ts`

---

# IMPLEMENTED CONTRACT / FILES

Key implementation files now exist on the visual branch:

- `src/data/wholesaleSubcategoryBlueprint.ts`
- `src/data/wholesaleSubcategoryBlueprint.test.ts`
- `src/data/wholesaleDedicatedVisuals.ts`
- `src/data/wholesaleDedicatedVisualsAdditional.ts`
- `src/data/wholesaleVisualTaxonomy.ts`
- `src/data/wholesaleVisualTaxonomy.test.ts`
- `src/data/wholesaleSubcategoryVisualManifest.ts`
- `src/data/wholesaleSubcategoryVisualManifest.test.ts`
- `src/data/wholesaleLocalAssets.test.ts`
- `src/data/categoryVisualContract.ts`
- `src/data/categoryVisualContract.test.ts`
- `src/components/catalog/CategoryBrowseSection.tsx`
- `src/components/catalog/CategoryRouteVisualBanner.tsx`
- `src/components/catalog/CategoryVisualCard.tsx`
- `src/components/catalog/WholesaleTrustBand.tsx`
- `src/hooks/useCategoryVisualTree.ts`
- `src/layouts/PublicPixelPerfectLayout.tsx`
- `src/styles/visual-restore-homepage.css`
- `scripts/wholesale-subcategory-assets.json`
- `scripts/stage-wholesale-subcategory-assets.ps1`
- `scripts/stage-wholesale-root-assets.ps1`
- `scripts/audit-wholesale-visual-assets.ps1`
- `scripts/verify-visual-restore-local.ps1`

Important path contract:

Root category visuals:
`/category-visuals/wholesale/<category-slug>.jpg`

Subcategory visuals:
`/category-visuals/subcategories/<category-slug>/<subcategory-slug>.jpg`

This namespacing fixed collisions such as duplicated `Accessories` labels across different parent categories.

The manifest/test contract requires:
- 96 entries total;
- 96 unique namespaced asset paths;
- 16 complete families of six;
- no parent-category path used as dedicated subcategory image;
- no source reuse across the 96 selected sources;
- no legacy `/images/featured/*` asset allowed inside the new wholesale visual contract.

Latest guard added before this checkpoint explicitly forbids legacy featured placeholder/text-overlay assets such as:
- `/images/featured/toolbox.jpeg`
- `/images/featured/skincare2.jpeg`
- `/images/featured/chair.jpeg`
- `/images/featured/earbuds.jpeg`

These are old assets already present in `main`; they were NOT created by the new 96-subcategory implementation. Do not delete/change them in `main` as part of this checkpoint without a separate verified usage audit and owner approval. The new wholesale visual contract must not reference them.

---

# LOCAL VALIDATION HISTORY

Canonical local repo used by owner:
`C:\Users\Danny\Desktop\LoadifyMarket-GitHub-20260820-0950`

Unrelated owner-local Android modifications were repeatedly visible and MUST be preserved:
- `M android/app/capacitor.build.gradle`
- `M android/capacitor.settings.gradle`

Never reset/stash/include/touch them in visual commits without explicit authorization.

Earlier validation on the separate E2E branch `audit-fixes/e2e-20260823` succeeded:
- targeted checkout/register/rate-limiter tests: 28/28 PASS
- release hardening contract: 10/10 PASS
- typecheck PASS
- build PASS
- full test suite: 71 test files / 589 tests PASS

Those results are for the E2E branch and MUST NOT be incorrectly claimed as validation of this visual branch.

For the visual branch, local staging reached:
- 96/96 subcategory JPGs STAGED
- normalized to JPEG 1400×1050
- exact 4:3
- quality 90

Then the local release gate originally failed because the 16 root category assets were missing.

A fallback script was added:
`scripts/stage-wholesale-root-assets.ps1`

The first fallback attempt used raw GitHub URLs and failed with 404 despite the source files existing.

The script was then repaired to use a temporary authenticated sparse Git clone of:
`LoadifyMarketLTD/focused-image-craft`

This uses the owner's working local Git authentication, copies only `src/assets/categories`, validates the 16 JPGs, then removes the temporary clone.

The verifier was also repaired to avoid noisily throwing through `stage-user-visual-assets.ps1` when the local restore ZIP is absent. If no archive is found, it should now use the authenticated `focused-image-craft` fallback for the 16 root visuals.

Latest relevant script commits before checkpoint:
- `14bb6754f5bfff08383c42c9b8cd3e101428e9b7` — root staging via authenticated temporary Git checkout
- `250d51a7fb9b16fdf30c731c3138fdf16b934a89` — avoid noisy archive failure in local visual gate
- `650a880e8de060a480a517d9cfd42397c507a2f4` — forbid legacy featured placeholder/text-overlay assets in wholesale visual contract

---

# ACTIVE VISUAL BLOCKER — URGENT

The owner supplied screenshots showing the live public Loadify page with the new category-grid structure but BROKEN images:

Observed on `loadifymarket.co.uk`:
- root category image areas appear blank/broken;
- all subcategory image cells show broken-image placeholders/alt text;
- this is visible across Electronics, Clothing, Home & Garden, Health & Beauty, Toys & Games, Food & Drink, Tools & DIY, Sports & Leisure, Automotive, Office & Stationery, Baby & Nursery, Jewellery & Watches, Mixed Lots, Customer Returns, Overstock and Clearance Deals.

This is NOT visually acceptable.

Likely deployment/runtime cause to verify, not assume:
- the 96 JPGs were created only in the owner's local working tree by the staging script and were not committed/pushed into the branch/deployed;
- the 16 root JPGs also need to be physically present under `public/category-visuals/wholesale` in the deployed artifact;
- code paths now point to local `/category-visuals/...` assets, so a deploy without those binary files produces exactly the broken-image symptom.

DO NOT solve this by reverting to parent fallback or legacy placeholder images.

Correct resolution path:
1. Synchronize owner local visual branch to latest remote.
2. Complete authenticated root staging so 16/16 root JPGs exist.
3. Confirm 96/96 local subcategory JPGs still exist.
4. Run `scripts/audit-wholesale-visual-assets.ps1` and inspect generated contact sheet/report.
5. Visually reject any poor/irrelevant image category-by-category and replace source selection before release.
6. Run visual contract tests, typecheck and production build locally.
7. Inspect homepage/category grid/catalog at desktop, tablet and mobile widths.
8. Only after owner visual acceptance, stage **only** `public/category-visuals/wholesale/**` and `public/category-visuals/subcategories/**` plus any necessary visual contract code.
9. Preserve the unrelated Android modifications.
10. Commit/push dedicated binary assets on the visual branch.
11. Create/inspect a preview deployment first. Do NOT merge directly to `main`.
12. Verify preview has zero broken category/subcategory images.
13. Only then discuss PR/merge with owner.

The owner explicitly said this screenshot issue must be repaired urgently.

---

# DO NOT DO

- Do not merge anything into `main` automatically.
- Do not deploy production automatically.
- Do not touch Supabase migrations, hosted DB, Auth or Supplier Commerce as part of this visual repair.
- Do not touch the two unrelated Android files.
- Do not reintroduce parent-image propagation as a final visual.
- Do not use fake/demo/text-overlay assets to hide broken images.
- Do not claim the visual release gate is PASS until local asset audit + tests + build + manual browser inspection pass.
- Do not confuse test results from `audit-fixes/e2e-20260823` with validation of the visual branch.
- Do not ask the owner to resend the visual taxonomy or prior screenshots; they are already captured by this checkpoint.

---

# NEXT CHAT — EXACT STARTING ORDER

When continuing in the next chat:

1. Read this checkpoint completely.
2. Verify real branch HEAD and compare state for `visual-restore/user-source-20260823`.
3. Verify `scripts/stage-wholesale-root-assets.ps1` is the authenticated sparse-clone version.
4. Do NOT restart the 16×96 taxonomy design.
5. Continue from the active broken-image/deployed-asset blocker.
6. Get the local gate to produce 16/16 root + 96/96 subcategory physical JPGs.
7. Audit actual images visually for relevance/quality; do not accept low-quality placeholders.
8. Commit/push only after the local visual gate is real PASS.
9. Build a preview for owner inspection before any `main` merge.

---

# CONTINUATION PROMPT

Use this in the next chat:

**CONTINUĂ LOADIFY MARKET EXACT DIN CHECKPOINT:**
`docs/checkpoints/LOADIFY_VISUAL_16X96_CONTINUITY_CHECKPOINT_2026-08-31_1815.md`

Repo: `LoadifyMarketLTD/loadifymarket.co.uk`

Branch: `visual-restore/user-source-20260823`

Pre-checkpoint HEAD: `650a880e8de060a480a517d9cfd42397c507a2f4`

Active blocker: **the public category/subcategory grid displays broken images because the physical 16 root + 96 subcategory JPG assets must be completed, audited, committed and verified in preview. Do not revert to parent fallbacks or legacy placeholder/text-overlay imagery. Preserve unrelated Android local changes. Do not touch main until owner accepts preview.**
