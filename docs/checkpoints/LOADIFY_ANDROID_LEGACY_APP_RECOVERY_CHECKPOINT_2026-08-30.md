# Loadify Android Legacy App Recovery Checkpoint — 2026-08-30

## Owner requirement — non-negotiable

The installed Loadify Market Android application is **not** the current Mobile Web experience packaged into an APK.

The canonical Android product is the established installed application identity from the May 2026 Capacitor APK family. Future Android work must preserve that application's shell, navigation and interaction identity, then port current functional/backend changes into it deliberately.

Do **not** replace the installed application with Mobile Web styling through `npx cap sync android` without first preserving the native-app boundary described below.

## Canonical runtime and package

- Android runtime: Capacitor.
- Package/application id: `co.uk.loadifymarket.app`.
- App name: `Loadify Market`.
- `apps/mobile` Expo/React Native was a short-lived prototype and is **not** the canonical installed app. It was introduced on 2026-04-30 and removed on 2026-05-02.

## Historical installed-app baseline

Known May 2026 Capacitor lineage:

- `0bd6d4088038bf81c0f18c0ad8692db770286a3f` — pixel-perfect APK mobile UI introduced.
- `58f8b77c4dda9f9284f7f2f4f4f1ede122ddb85f` — mobile home/profile overhaul with continuous two-column grid.
- `e61b8eb379dc6bb079e1554b646fd682f8538124` — successful signed Android workflow on 2026-05-05; historical APK artifact digest `sha256:3c246a12b2f6086d05b177281f2974ac6f835dbb94111d08902f6a93ab1e7ab5` (artifact expired).
- `23e909e393a832b38da6ecda38a10094bee16f71` — later known-good May-family source/build line used as a recovery reference.

Established visual/interaction identity:

- dark native shell (`#0A0E1A` family);
- compact dark Loadify header/search;
- white + gold Loadify/Market identity;
- horizontal category pills;
- compact seller CTA rather than website marketing sections;
- continuous two-column product feed;
- dark fixed bottom navigation with Home / Search / Sell / Inbox / Profile;
- no desktop/public-web footer or public marketing stack injected into the native home.

## Why recovery was required

PR #618 (`visual/product-detail-premium-polish-20260829`) originally treated Mobile Web and Capacitor as one shared visual surface. Its description explicitly stated that the mobile website and Capacitor app consumed the same React mobile components, and it changed the native splash/status surface from dark to warm light.

That architecture was rejected by the owner because it turns the current Mobile Web experience into the installed Android application instead of updating the existing app.

## Recovery boundary now implemented on PR #618

### `20dff8a7a46c1c5077dfbc4d16a2d33d5ad96a4e`
Created `src/components/native/LegacyNativeMarketplace.tsx` with a dedicated native-only shell:

- `LegacyNativeAppHeader`
- `LegacyNativeSearchOverlay`
- `LegacyNativeCategoryShortcuts`
- `LegacyNativeHeroBanner`
- `LegacyNativeGridCard`
- `LegacyNativeHome`
- `LegacyNativeBottomNav`

The visuals reproduce the established installed-app language while using current data/auth/notification contracts where practical.

### `a3591600922d087547fc83e6875fdcd0ac5f4946`
Updated `src/pages/Home.tsx`:

- mobile browser → current premium Mobile Web home;
- Capacitor (`isCapacitorContext()`) → `LegacyNativeHome`;
- desktop → desktop home.

### `fa328f55fd0b39271a3a6a4647d2b8e90a44af9f`
Updated `src/layouts/MobileAppLayout.tsx`:

- Capacitor → dark native base + `LegacyNativeBottomNav`;
- mobile browser → current warm-light web base + current `MobileBottomNav`.

### `044f8a14d3d438d8fbdce721a1fde7efe36392c9`
Restored `capacitor.config.ts` native launch surface:

- splash background → `#0A0E1A`;
- status-bar background → `#0A0E1A`.

## Existing detector to preserve

`src/lib/capacitorUtils.ts` exposes `isCapacitorContext()` and must remain the hard runtime boundary for web-vs-installed-app visual behavior.

It detects native Capacitor either through the bridge or the Capacitor-local origins (`https://localhost` / `capacitor://localhost`).

## PR #618 state at this checkpoint

- PR: #618
- Branch: `visual/product-detail-premium-polish-20260829`
- Base: `main`
- Base SHA at recovery: `f830c5bb2f31b10338ade8d0524bb3cf15ab53df`
- Recovery code HEAD before this checkpoint commit: `044f8a14d3d438d8fbdce721a1fde7efe36392c9`
- State: OPEN / DRAFT / NOT MERGED.

PR description has been corrected to state that desktop/mobile-web visual polish is separate from the canonical Android identity.

## Validation truth

Do not overclaim validation.

After recovery head `044f8a14...`:

- GitHub CI jobs `Type Check`, `Unit Tests`, `Lint`, and `Migration Health` ended as failures before normal downstream build gates; their connector job records exposed no executable step detail, so the cause is not yet proven from CI logs.
- `Production Build` and `Critical Smoke Tests` were skipped in that run.
- Netlify checks reported deploy failure for that recovery head.
- No post-recovery Android APK has been built.
- No post-recovery APK has been installed on the owner's phone.
- Historical APK artifacts found in GitHub are expired, so recovery proceeds from source lineage rather than pretending the old binary can still be downloaded.

## Remaining work — required order

1. **CI failure diagnosis**
   - obtain actionable TypeScript/lint/build failure output;
   - fix only verified failures;
   - do not weaken tests or gates.

2. **Native visual leakage audit beyond Home**
   Audit every PR #618 shared component that can still render inside Capacitor, especially:
   - catalog/product cards;
   - product detail info/action hierarchy;
   - seller card;
   - reviews;
   - search/catalog/category routes;
   - auth surfaces where shared website CSS could replace the installed-app language.

   Web-only visual polish may remain on the website. Native must either preserve its previous presentation or receive a deliberate native-specific adaptation.

3. **Functional port ledger**
   Compare the May native baseline with current platform contracts and classify changes as:
   - PORT TO NATIVE — current functional/security/backend behavior required by the app;
   - WEB ONLY — public website presentation/marketing;
   - NATIVE ONLY — installed-app navigation/runtime behavior;
   - HOLD — requires owner/product decision.

   Priority domains: Auth, product/catalog data, basket/checkout, orders, messaging/inbox, seller flow, notifications, deep links, external Stripe handoff, session persistence, image loading, error handling.

4. **Android release plumbing**
   - verify existing release keystore/signing path and preserve the same signing identity;
   - verify Firebase `google-services.json` injection without exposing secrets;
   - verify current package remains `co.uk.loadifymarket.app`;
   - assign a real update `versionCode` greater than the installed build before release candidate delivery;
   - do not uninstall the existing application as an installation strategy.

5. **Build gates**
   - TypeScript PASS;
   - lint PASS;
   - unit tests PASS;
   - production web build PASS;
   - Capacitor sync/build PASS;
   - signed APK identity/signature/package inspection PASS.

6. **Device update smoke test — only after prior gates**
   - install as an update, preserving app identity/data where Android signing/version rules allow;
   - confirm the first screen is the preserved old app shell, not Mobile Web;
   - verify login/session, home feed, search, product detail, basket/checkout handoff, orders, inbox, profile/seller path and back/deep-link behavior;
   - only then consider PR merge/release.

## Hard prohibitions

- Do not use PR #618 Mobile Web design as the Android visual baseline.
- Do not claim `adb install -r` proves the correct application product was installed; it proves only package replacement/update mechanics.
- Do not uninstall the owner's app merely to make a mismatched build install.
- Do not merge PR #618 while native leakage/build/device gates remain unresolved.
- Do not claim Firebase/signing/device validation without evidence.
- Do not silently resurrect the removed Expo prototype as the application baseline.

## Resume instruction

Resume from this checkpoint. First verify the current PR #618 HEAD and CI state, then continue **CI diagnosis → native shared-route leakage audit → functional port ledger → signing/Firebase/versioning → Android build → device update smoke → merge decision**.
