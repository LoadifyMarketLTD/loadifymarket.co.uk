# LOADIFY MARKET — VISUAL RESTORE / 16×96 CATEGORY IMAGERY CONTINUITY CHECKPOINT

**Checkpoint date:** 2026-08-31  
**Repository:** `LoadifyMarketLTD/loadifymarket.co.uk`  
**Active branch:** `visual-restore/user-source-20260823`  
**Base used for this visual workstream:** `0fe191ffe4a2164e9aaf1e3d8bc963c26b0f136d`  
**Latest known branch state before this checkpoint:** visual branch is ahead of the original base and must remain isolated from `main` until local visual verification passes.  

---

## CONTINUATION COMMAND

**CONTINUE LOADIFY MARKET VISUAL RESTORE EXACTLY FROM THIS CHECKPOINT. DO NOT RESTART THE VISUAL AUDIT FROM ZERO.**

Read this file completely before making changes.

---

## OWNER DECISION / NON-NEGOTIABLE VISUAL CONTRACT

The marketplace must not show a parent-category image repeated across all child subcategories as a final public result.

Permanent guard:

- each main category has its own category image;
- each of the 96 subcategories has its own dedicated image;
- a subcategory image must be clearly different from its parent category image;
- two subcategories inside the same family must never share the same final image;
- final subcategory images must be clearly relevant to the actual subcategory;
- parent fallback may exist only as an internal/work-branch temporary fallback, never as the final public output;
- placeholder-looking banners, text-overlay category graphics, artificial promotional cards, fake product cards, watermarks, visible foreign branding and unrelated imagery are FAIL;
- if an acceptable real image cannot be sourced, leave that subcategory blocked rather than publishing a poor placeholder;
- do not create or show generated category/subcategory images in ChatGPT conversation. Work only in the repository/site and report implementation or blockers.

Legacy assets such as `public/images/featured/toolbox.jpeg` and `public/images/featured/skincare2.jpeg` were explicitly rejected as a visual standard. They are not to be used by the new 16×96 wholesale visual contract.

---

## AUTHORITATIVE TAXONOMY

The wholesale visual taxonomy is 16 categories × 6 subcategories = 96 subcategories:

1. Electronics & Technology
2. Clothing & Apparel
3. Home & Garden
4. Health & Beauty
5. Toys & Games
6. Food & Drink
7. Tools & DIY
8. Sports & Leisure
9. Automotive
10. Office & Stationery
11. Baby & Nursery
12. Jewellery & Watches
13. Mixed Lots
14. Customer Returns
15. Overstock
16. Clearance Deals

The exact 96-entry visual focus/blueprint is encoded in:

- `src/data/wholesaleSubcategoryBlueprint.ts`
- `src/data/wholesaleVisualTaxonomy.ts`
- `src/data/wholesaleSubcategoryVisualManifest.ts`

Do not replace this taxonomy with a different category model without a separate business-contract decision.

---

## IMPLEMENTED VISUAL CONTRACT FILES

Primary files:

- `src/data/wholesaleSubcategoryBlueprint.ts`
- `src/data/wholesaleSubcategoryBlueprint.test.ts`
- `src/data/wholesaleVisualTaxonomy.ts`
- `src/data/wholesaleVisualTaxonomy.test.ts`
- `src/data/wholesaleSubcategoryVisualManifest.ts`
- `src/data/wholesaleSubcategoryVisualManifest.test.ts`
- `src/data/wholesaleDedicatedVisuals.ts`
- `src/data/wholesaleDedicatedVisualsAdditional.ts`
- `src/data/wholesaleLocalAssets.test.ts`

Storefront/UI integration:

- `src/components/catalog/CategoryBrowseSection.tsx`
- `src/components/catalog/CategoryRouteVisualBanner.tsx`
- `src/components/catalog/CategoryVisualCard.tsx`
- `src/components/catalog/WholesaleTrustBand.tsx`
- `src/layouts/PublicPixelPerfectLayout.tsx`
- `src/pages/Home.tsx`
- `src/styles/visual-restore-homepage.css`

Local staging/audit tooling:

- `scripts/wholesale-subcategory-assets.json`
- `scripts/stage-wholesale-subcategory-assets.ps1`
- `scripts/stage-wholesale-root-assets.ps1`
- `scripts/stage-user-visual-assets.ps1`
- `scripts/audit-wholesale-visual-assets.ps1`
- `scripts/verify-visual-restore-local.ps1`

---

## CURRENT LOCAL-ASSET STATE OBSERVED IN THE PREVIOUS SESSION

A local run successfully staged and normalized **96/96 subcategory images** to:

`public/category-visuals/subcategories/<category-slug>/<subcategory-slug>.jpg`

The staging output reported:

- 96 / 96 subcategory images staged;
- JPEG format;
- 1400×1050;
- exact 4:3;
- quality 90;
- no database, migration, Android or production changes.

The original local release gate then failed because the 16 root images were missing at:

`public/category-visuals/wholesale/`

The first fallback attempted direct `raw.githubusercontent.com` downloads and received 404. The root staging script was then changed to use a temporary authenticated Git clone of:

`LoadifyMarketLTD/focused-image-craft`

and copy `src/assets/categories/*.jpg` into the required 16 root paths.

The verification script was also hardened so that a missing local restore archive is not treated as the only path forward.

**Important:** a final successful local release-gate output after these latest script changes has NOT yet been captured in this checkpoint. Therefore do not claim the visual workstream PASS yet.

---

## PUBLIC SCREENSHOT PROBLEM OBSERVED

Screenshots of the live/public category section showed broken image placeholders across main category and subcategory cards. This means the visual contract/code may exist while the binary assets are not present in the deployed public build or the deployed version is not the intended branch/state.

This is an ACTIVE release blocker.

Do not merge to `main` until local and preview verification proves:

- 16/16 root category images render;
- 96/96 subcategory images render;
- no broken `<img>` placeholders;
- no parent-image reuse as final output;
- no duplicate final image within a category;
- imagery is semantically relevant to each subcategory;
- desktop, tablet and mobile layouts remain coherent.

---

## LOCAL WORKTREE SAFETY

Two unrelated local Android changes existed and must be preserved:

- `android/app/capacitor.build.gradle`
- `android/capacitor.settings.gradle`

Do not reset, stash, overwrite, stage or include these changes in the visual workstream unless explicitly authorized.

The visual helper scripts are designed not to reset or stash the working tree.

---

## VALIDATION ALREADY PROVEN ON THE SEPARATE E2E BRANCH

A separate branch `audit-fixes/e2e-20260823` previously produced:

- targeted checkout/register/rate-limiter tests: PASS;
- release-hardening contract: PASS;
- typecheck: PASS;
- build: PASS;
- full test suite: 71 files / 589 tests PASS.

That validation belongs to the E2E branch and must not be misrepresented as proof that the visual branch itself has completed its local asset release gate.

Keep E2E/security work separate from visual restoration.

---

## ZIP / ORIGINAL SOURCE PACKAGE POLICY

The original visual ZIP is useful as immutable source evidence, but **do not place a large ZIP directly in `main` Git history** by default.

Preferred structure on the visual branch:

`artifacts/visual-restore/source-package/`

Create inside it:

- `README.md` — describes package provenance, original filename, date received, expected contents and SHA-256 checksum;
- `SHA256SUMS.txt` — records checksum(s) of the original ZIP/source package;
- optionally the ZIP itself only if its size is reasonable and the owner explicitly decides repository-history growth is acceptable or Git LFS is configured.

Preferred production/source layout for actual site assets remains extracted files, not ZIP runtime dependency:

- main-category assets → `public/category-visuals/wholesale/`
- subcategory assets → `public/category-visuals/subcategories/<category-slug>/`

The application must never require the ZIP at runtime.

If the original ZIP is uploaded for continuity, upload it only on this visual branch or via a dedicated artifact/LFS strategy; do not add it directly to `main` before the visual branch passes release gates.

---

## NEXT EXECUTION ORDER

1. Fetch/pull `visual-restore/user-source-20260823`.
2. Preserve unrelated Android modifications.
3. Ensure the 16 wholesale root assets exist locally.
4. Ensure all 96 subcategory assets exist locally.
5. Run `scripts/audit-wholesale-visual-assets.ps1` and inspect its report.
6. Run the visual contract tests.
7. Run TypeScript typecheck.
8. Run production build.
9. Start the local Vite server.
10. Manually inspect the homepage/category browser and all 16 category families.
11. Verify all 96 subcategory images semantically against `wholesaleSubcategoryBlueprint.ts`.
12. Repair any poor, misleading, repetitive or placeholder-looking image.
13. Re-run all guards after any replacement.
14. Only after local PASS, create a controlled preview/PR for owner inspection.
15. Do not merge to `main` until owner explicitly approves the visual result.

---

## LOCAL VERIFICATION COMMAND

From the canonical local repository:

```powershell
Set-Location "C:\Users\Danny\Desktop\LoadifyMarket-GitHub-20260820-0950"

git fetch origin
git switch visual-restore/user-source-20260823
git pull --ff-only origin visual-restore/user-source-20260823

powershell -ExecutionPolicy Bypass -File ".\scripts\verify-visual-restore-local.ps1" `
  -OpenAuditReport `
  -StartDevServer
```

If the script fails, stop on the first real blocker and repair it. Do not bypass the guard simply to obtain a PASS label.

---

## BRANCH GUARD

Before considering this checkpoint resolved:

- compare branch to its intended base/main;
- inspect the diff for accidental functional/security/DB changes;
- confirm no Android files were included;
- verify no database migration or production Supabase change was made;
- verify no fake inventory/listings/counts/reviews were added;
- verify the visual contract uses actual editorial/navigation imagery only;
- verify the final public build contains the binary image assets, not only TypeScript references.

**NO PASS WITHOUT REAL LOCAL RENDERING + ASSET PRESENCE + TEST/BUILD EVIDENCE.**
