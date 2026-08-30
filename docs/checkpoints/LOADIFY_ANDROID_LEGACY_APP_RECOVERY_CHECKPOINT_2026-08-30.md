# Loadify Android Legacy App Recovery Checkpoint — 2026-08-30

## Owner requirement — non-negotiable

The installed Loadify Market Android application is **not** the current Mobile Web experience packaged into an APK.

The canonical Android product is the established installed application identity from the May 2026 Capacitor APK family. Future Android work must preserve that application's shell, navigation and interaction identity, then port current functional/backend changes into it deliberately.

Do **not** replace the installed application with Mobile Web styling through `npx cap sync android`.

## Canonical runtime and package

- Android runtime: Capacitor.
- Package/application id: `co.uk.loadifymarket.app`.
- App name: `Loadify Market`.
- `apps/mobile` Expo/React Native was a short-lived prototype and is **not** the canonical installed app. It was introduced on 2026-04-30 and removed on 2026-05-02.
- Mobile Web and Capacitor are now treated as distinct presentation surfaces even though they share current React/domain code where appropriate.

## Historical installed-app baseline

Known May/July 2026 Capacitor lineage:

- `0bd6d4088038bf81c0f18c0ad8692db770286a3f` — pixel-perfect APK mobile UI introduced.
- `58f8b77c4dda9f9284f7f2f4f4f1ede122ddb85f` — mobile home/profile overhaul with continuous two-column grid.
- `e61b8eb379dc6bb079e1554b646fd682f8538124` — known successful May signed-Android source/build line.
- `23e909e393a832b38da6ecda38a10094bee16f71` — later May-family recovery reference.
- public release `v0.20260712.272.bda39d1` contains `app-release.apk`; its source still declares `applicationId co.uk.loadifymarket.app`, `versionCode 1`, `versionName 1.0`.

Established native visual/interaction identity:

- dark shell (`#0A0E1A` family);
- compact dark Loadify header/search;
- white + gold Loadify/Market identity;
- horizontal category pills;
- compact seller CTA rather than public website marketing sections;
- continuous two-column product feed;
- dark fixed bottom navigation with Home / Search / Sell / Inbox / Profile;
- no desktop/public-web footer or premium website marketing stack injected into native Home.

## Why recovery was required

PR #618 (`visual/product-detail-premium-polish-20260829`) originally treated Mobile Web and Capacitor as one visual surface. Its description explicitly stated that both consumed the same React mobile components, and it moved the native splash/status surface from dark to warm light.

That architecture was rejected because it would replace the established installed-app identity with the current Mobile Web presentation.

## Recovery implementation now on PR #618

### Initial hard split

- `20dff8a7a46c1c5077dfbc4d16a2d33d5ad96a4e` — created `src/components/native/LegacyNativeMarketplace.tsx` with native-only header, search overlay, category shortcuts, seller CTA, two-column product grid and bottom navigation.
- `a3591600922d087547fc83e6875fdcd0ac5f4946` — `Home.tsx` now routes Capacitor to `LegacyNativeHome`; mobile browser retains the approved premium Mobile Web Home.
- `fa328f55fd0b39271a3a6a4647d2b8e90a44af9f` — `MobileAppLayout.tsx` separates native dark shell from light mobile web shell.
- `044f8a14d3d438d8fbdce721a1fde7efe36392c9` — restored Capacitor splash/status background to `#0A0E1A`.
- `cf99bf1dc86fe7bf41ff1e8977c1025ab560b9e4` — previous recovery checkpoint.

### Native visual-leakage closure

- `bb2d8015593077b6e105215ae5e2637ea92e9ca5` — `RouteSurfaceClass.tsx` now applies native-only route classes for Product, Catalog and Category when `isCapacitorContext()` is true.
- `5f7d08836b1cbd71aed152e1eebe1040a237e2b4` — `native.css` restores historical dark semantic tokens inside `html.capacitor-native`, neutralises the global `market-light-root` / `market-public-light` website token sets in Capacitor and adapts the shared Product/Catalog/Category mobile surfaces back to the native dark language.
- `1b29214886a50964d8112a5883efad88558718a3` — `/categories` now renders a dedicated historical dark category list in Capacitor while mobile web keeps its current light grid.
- `51e4a118321da101a00f081332bdd7e90edd7ad7` — `MobileBottomNav` itself is now a hard runtime boundary: every standalone mobile screen importing it receives `LegacyNativeBottomNav` in Capacitor, eliminating the possibility that Inbox/Orders/Profile/etc. bypass the native layout and show the light web nav.

### Update version reservation

- `a68af7521790c4b4a9c1e6fd5c420856abad5bf0` — Android recovery candidate reserved as `versionCode 2`, `versionName 1.0.1`.
- This is not a release or publish action. It only establishes an Android version greater than the known public/historical `versionCode 1` builds so a correctly signed candidate can be treated as an update.

## Runtime boundary — preserve

`src/lib/capacitorUtils.ts` exposes `isCapacitorContext()` and remains the hard runtime boundary.

`src/main.tsx`:

1. calls `isCapacitorContext()` before React render;
2. adds `capacitor-native` to `<html>`;
3. mounts `RouteSurfaceClass` before `App`;
4. applies the Capacitor fetch patch;
5. disables/removes the PWA service-worker cache layer inside Capacitor.

This ordering ensures native route/token guards exist before marketplace pages render.

## Native visual leakage ledger — current verdict

### Home — REPAIRED / structural gate complete

- Capacitor renders `LegacyNativeHome`.
- Mobile browser renders the approved premium Mobile Web Home.
- Website `HeroSection`, Trust/marketing stack and light Home treatment are not the native Home baseline.

### Global native tokens — REPAIRED

- `App.tsx` still applies `market-light-root` globally for platform compatibility.
- `native.css` now overrides that class only under `html.capacitor-native`, restoring the original dark semantic variables.
- `market-public-light` is also neutralised only in Capacitor.
- Website rendering remains unchanged by these native-only rules.

### Bottom navigation — REPAIRED / centralised

- `MobileAppLayout` uses the legacy native bottom navigation in Capacitor.
- `MobileBottomNav` independently delegates to the legacy native bar when imported by standalone screens.
- This covers Home-layout screens and standalone Inbox, Orders, Profile, Notifications, Settings, Favourites, Balance, Security and Seller Payments routes.

### Product Detail — REPAIRED structurally, device validation pending

Historical May mobile Product Detail used:

- dark glass top bar;
- dark product information card;
- white/muted text;
- dark fixed action shell;
- gold primary purchase action.

The PR #618 shared Product Detail contains light website literals. Native-only route CSS now remaps those mobile surfaces to the historical dark presentation without changing product, basket, message, quantity, report or purchase logic.

The mobile action bar already offsets itself by `var(--mob-nav-h)` so it is designed to sit above the bottom nav rather than overlap it.

`ProductInfo`, `SellerCard` and `ProductReviews` are desktop-only at the relevant Product Detail breakpoints (`hidden md:block`) and therefore their PR #618 visual polish is not a direct native-phone leak.

### Catalog / Category / Similar listings — REPAIRED structurally

- current shared Catalog/Category pages contain light web surfaces and `theme="light"` ProductCards;
- Capacitor route classes + native CSS restore dark background/card/border/text semantics only on native Product/Catalog/Category routes;
- current catalog/product data and filtering logic remain shared;
- mobile web retains PR #618 presentation.

### Search / Categories — REPAIRED

- native Home uses the dedicated legacy dark search overlay;
- `/categories` explicitly branches to the legacy dark list in Capacitor;
- Catalog remains available with native route styling.

### Standalone application screens — KEEP

Audited current mobile screens:

- Inbox;
- Chat;
- Orders;
- Profile;
- Activity/Notifications;
- Settings;
- Favourites;
- Balance;
- Security;
- Seller Payments;
- Sell Wizard.

These screens already use the historical semantic dark palette (`bg-background`, `text-foreground`, `bg-white/[...]`, primary gold) rather than PR #618's premium light website literals. The native token restoration and central bottom-nav boundary preserve them. No per-screen visual rewrite is justified.

### Login/Auth visual surface — KEEP

- current Login remains a dark semantic form on mobile;
- native Google/Facebook OAuth already branches through Capacitor and the `loadifymarket://app/auth/callback` deep link;
- existing native-only Login layout corrections in `native.css` remain scoped to Capacitor;
- no Auth authorization-model change is part of this recovery.

### Cart / Checkout — KEEP function + native dark semantics

- Cart and Checkout use semantic `bg-card`, `bg-background`, `text-foreground`, `border-border`, primary-gold controls rather than PR #618 hardcoded website light surfaces;
- both run under `MainLayout`, so Capacitor receives the native shell/navigation;
- Cart's mobile checkout CTA is explicitly positioned above the mobile nav;
- Checkout continues to hand external Stripe URLs through `openExternalUrl()` for Capacitor;
- no checkout/payment behavior was changed by this recovery.

## Functional port ledger

| Domain | Verdict | Native rule |
|---|---|---|
| Auth/session | PORT CURRENT FUNCTION / KEEP NATIVE PRESENTATION | Keep current authoritative Auth/profile/session logic; preserve native OAuth/deep-link behavior. |
| Product/catalog data | PORT CURRENT FUNCTION | Native UI consumes current approved product/category data and current inventory rules. |
| Product detail | PORT CURRENT FUNCTION / NATIVE PRESENTATION | Keep current product/basket/message/report logic; native presentation remains dark. |
| Basket/cart | PORT CURRENT FUNCTION | Keep current cart refresh, seller guards, quantity and price checks. |
| Checkout/Stripe | PORT CURRENT FUNCTION | Keep current backend safety and Stripe handoff; do not add custom native payment storage. |
| Orders | KEEP CURRENT FUNCTION + NATIVE SCREEN | Existing standalone dark mobile Orders remains canonical for app route `/orders`. |
| Inbox/chat | KEEP CURRENT FUNCTION + NATIVE SCREEN | Existing dark realtime messaging surfaces retained. |
| Seller sell flow | KEEP CURRENT FUNCTION + NATIVE SCREEN | Existing `MobileSellWizard` dark native language retained; server remains authority. |
| Notifications | KEEP CURRENT FUNCTION + NATIVE SCREEN | Existing notifications + push/deep-link route behavior retained; push runtime still gated by Firebase validation. |
| Home marketing/editorial web sections | WEB ONLY | Must not become native Home. |
| Premium light mobile-web header/hero/bottom nav | WEB ONLY | Must not propagate into Capacitor. |
| Native shell/search/categories/nav | NATIVE ONLY | Preserve as installed-app identity. |
| Workspace/Admin/Super Admin visual surfaces | HOLD / OUT OF SCOPE | Do not alter under this recovery. |

## Android signing / update identity truth

### Package — PASS by source

Current Android source remains:

`applicationId "co.uk.loadifymarket.app"`

No alternate package id was introduced.

### Version — REPAIRED by source

Known public/historical signed release source uses `versionCode 1` / `versionName 1.0`.

Current recovery candidate uses:

- `versionCode 2`;
- `versionName 1.0.1`.

This is suitable as the next-version candidate provided signing identity also matches.

### Signing continuity — CONFIGURATION MATCH / CERTIFICATE NOT YET PROVEN

Historical signed workflow introduced/used repository secrets:

- `ANDROID_KEYSTORE_BASE64`;
- `ANDROID_KEYSTORE_PASSWORD`;
- `ANDROID_KEY_ALIAS`;
- `ANDROID_KEY_PASSWORD`.

The July public-release workflow and the current workflow use the same secret names, decode the keystore and sign release APK/AAB builds with the injected signing properties. Current workflow also validates keystore password/alias and verifies the final APK signature.

This strongly preserves signing configuration continuity, but the secret contents are intentionally unreadable. Therefore:

- do **not** claim certificate/signature parity yet;
- final gate requires certificate fingerprint comparison between the newly signed APK and a known installed/historical signed APK/certificate.

### Firebase — CONFIGURATION PATH PASS / RUNTIME NOT YET PASS

Current release workflow:

- requires `ANDROID_GOOGLE_SERVICES_JSON_BASE64`;
- decodes it to ignored `android/app/google-services.json`;
- validates JSON structure;
- validates package `co.uk.loadifymarket.app`;
- fails release builds closed if Firebase config is missing.

The previous local debug startup crash occurred because `google-services.json` was absent while Push Notifications registered. No push code was disabled to hide the problem.

Final runtime gate still requires a real valid local/CI Firebase config and a startup smoke where the process remains alive and no `Default FirebaseApp is not initialized` fatal is present.

## Validation truth at this checkpoint

Do not overclaim validation.

### GitHub CI

PR run `33284003850` on head `51e4a118...` created Type Check, Lint, Unit Tests and Migration Health jobs, but every job terminated immediately with:

- no executed step list;
- `runner_id: 0` / no assigned runner details;
- downstream Critical Smoke Tests and Production Build skipped.

A single rerun of the failed jobs was requested. It failed in the identical pre-step condition. This is therefore an Actions execution/runner blocker from the evidence available; it does **not** prove TypeScript/lint/test failure in the repository.

The connector exposes no usable job log for those pre-run failures.

### Independent local CI attempt

A clean clone was attempted in the available container to run `npm ci`, typecheck, lint and build independently. That runtime cannot resolve `github.com` DNS, so the repository cannot be cloned there. No false local PASS is claimed.

### Netlify

Netlify checks on the recovery pushes report deploy failure. The available check result only points to Netlify logs; no actionable build log is available through the current connector. Do not infer a code cause without evidence.

### Android

- no post-recovery Android APK has been built;
- no post-recovery signed APK certificate has been inspected;
- no APK has been installed on the owner's phone;
- no app data has been removed;
- Firebase startup gate remains open.

## Current gate matrix

- PR state: **OPEN / DRAFT / NOT MERGED**.
- Native Home identity separation: **PASS BY SOURCE / DEVICE PENDING**.
- Native bottom navigation boundary: **PASS BY SOURCE / DEVICE PENDING**.
- Native Product/Catalog/Category leakage closure: **PASS BY SOURCE / DEVICE PENDING**.
- Standalone native mobile screens: **KEEP / SOURCE AUDIT PASS**.
- Login/Auth native presentation: **KEEP / SOURCE AUDIT PASS**.
- Cart/Checkout native presentation and offset: **KEEP / SOURCE AUDIT PASS**.
- Package id: **PASS BY SOURCE**.
- Update version: **PASS BY SOURCE (`2` / `1.0.1`)**.
- Signing secret-path continuity: **PASS BY CONFIGURATION**.
- Signing certificate parity: **NOT YET PASS**.
- Firebase release injection path: **PASS BY CONFIGURATION**.
- Firebase native runtime startup: **NOT YET PASS**.
- TypeScript/lint/unit/build: **UNVERIFIED — CI runner failed before steps**.
- Netlify preview: **FAILED / CAUSE UNVERIFIED**.
- Android build/sync: **NOT YET RUN after recovery**.
- Device update smoke: **NOT YET RUN**.

## Required continuation order

1. **Recover an executable validation environment**
   - obtain an actual CI runner or the owner's local checkout;
   - run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`;
   - fix only verified failures.

2. **Firebase + signing material validation without disclosure**
   - restore/use the real ignored `android/app/google-services.json` or CI Firebase secret;
   - confirm package match;
   - use the canonical release keystore path;
   - record only certificate fingerprint/verification result, never secrets.

3. **Capacitor / Android release-candidate build**
   - `npm run build`;
   - `npx cap sync android`;
   - build signed release candidate using existing signing identity;
   - inspect package id, versionCode/versionName and signing certificate;
   - verify APK contents include the native boundary code/assets;
   - do not publish.

4. **Device update smoke — no uninstall**
   - update the existing package, preserving data;
   - verify process remains alive after launch;
   - verify no Firebase fatal;
   - confirm first screen is preserved dark app shell, not Mobile Web;
   - smoke Login/session, Home, Search/Categories, Product Detail, Cart/Checkout handoff, Orders, Inbox/Chat, Profile, Seller flow, notifications/deep links.

5. **Final PR gate**
   - only after executable build + signed-update + device smoke + web preview recovery;
   - keep PR draft/not merged until all gates are evidenced.

## Hard prohibitions

- Do not use PR #618 Mobile Web design as the Android visual baseline.
- Do not remove or disable push simply to hide Firebase startup failure.
- Do not invent or commit `google-services.json`.
- Do not expose Firebase or keystore secrets.
- Do not use `adb uninstall` as a recovery strategy.
- Do not claim `adb install -r` proves visual/product parity; it proves only package update mechanics.
- Do not merge PR #618 while validation/signature/Firebase/device gates remain unresolved.
- Do not silently resurrect the removed Expo prototype.
- Do not alter Workspace/Admin/Super Admin visual surfaces in this recovery.

## Resume instruction

Resume from this checkpoint. Verify PR #618 current HEAD first. Continue **executable validation environment → signing/Firebase evidence → signed Capacitor release-candidate build → no-uninstall device update smoke → final PR gates**. Do not reopen the completed native visual-leakage audit unless new runtime evidence shows a concrete leak.
