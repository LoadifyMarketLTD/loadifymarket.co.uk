# Loadify Android App Recovery + Current Colour Identity Checkpoint — 2026-08-30

## Owner requirement — canonical

The installed Loadify Market Android application remains the real Capacitor app, not a separate Mobile Web product packaged as a replacement.

However, the app is **not** visually frozen in the May 2026 dark/gold palette. The owner explicitly requires the existing Android application structure and behaviour to be brought up to date with the **current Loadify Market site colour identity**.

Therefore:

- preserve the installed application's package, navigation model, routes, app behaviour and update path;
- update its colour system to the current website identity;
- do not replace the app with the Mobile Web homepage/marketing stack;
- do not keep the historical dark/gold palette as the final appearance;
- final target is an in-place Android update installed over the existing application, preserving app data.

## Canonical runtime and package

- runtime: Capacitor;
- package/application id: `co.uk.loadifymarket.app`;
- app name: `Loadify Market`;
- next candidate version: `versionCode 2`, `versionName 1.0.1`;
- `apps/mobile` Expo/React Native is not the canonical installed product.

## Historical application structure to preserve

The May/July Capacitor lineage remains the structural baseline:

- compact app header/search;
- horizontal category browsing;
- compact seller CTA;
- continuous two-column product feed;
- fixed application bottom navigation: Home / Search / Sell / Inbox / Profile;
- native Auth/session, Inbox/Chat, Orders, Profile, Seller flow, notifications/deep links and checkout handoff;
- no desktop/public-web Footer or long marketing stack replacing native Home.

Historical references include:

- `0bd6d4088038bf81c0f18c0ad8692db770286a3f` — pixel-perfect APK mobile UI;
- `58f8b77c4dda9f9284f7f2f4f4f1ede122ddb85f` — mobile home/profile + two-column grid;
- `e61b8eb379dc6bb079e1554b646fd682f8538124` — successful May Android line;
- public signed release `v0.20260712.272.bda39d1` with `app-release.apk`.

## Current colour identity — required Android target

Approved current marketplace colours observed in PR #618 site surfaces:

- warm ivory background: `#F8F7F4`;
- primary navy: `#0A234F`;
- warm accent: `#8A7351`;
- white surfaces: `#FFFFFF` / `#FCFBF9`;
- primary supporting text: `#334155` / `#5A6578`;
- muted text: `#667085` / `#8A94A3`;
- light structural border: `#DCE3ED` / navy low-opacity borders.

The old native palette (`#0A0E1A` + gold `#D4AF37` / `#F2B84B`) is now historical reference only and must not be treated as the final visual identity.

## Implemented colour-alignment recovery

Current branch: `visual/product-detail-premium-polish-20260829`.

Relevant recovery chain:

- earlier commits separated the Android application surface from Mobile Web so app structure could not be replaced accidentally;
- `a68af7521790c4b4a9c1e6fd5c420856abad5bf0` reserved Android update version `2 / 1.0.1`;
- `7b99794e389e0d151d0e2505a863e44cb6ac5f52` introduced `UpdatedNativeMarketplace.tsx`, preserving app-style Home structure with the current colour identity;
- `bbf78df84ec69cdc3d1738f99babb7521f4f0c54` routed Capacitor Home to `UpdatedNativeHome`;
- `13c5fc6eff6207d19f13d9d78e323fed9a1cad67` aligned the shared app bottom navigation to the current navy/ivory palette while preserving Home/Search/Sell/Inbox/Profile;
- `c0644e8df61b15432c9dbb901f7f581193eeb4a6` moved the mobile app layout to the current brand palette;
- `875a92b7773395cc6820014e8593f3dc3223459e` replaced the forced native dark token boundary with current site colour tokens;
- `e4b87f3ccdcb3ff5d1c63434f9d78fce9bdf1228` aligned native splash/status-bar colour to `#F8F7F4`;
- `f811e3a793ac6259b99054060e922fd243f6861c` restored native category active-state behaviour inside the updated colour shell;
- `dd93f801ad7d218fb353d63105f5f2e14d5594ee` updated layout documentation to the corrected architecture.

## Functional rule

Colour alignment must not change business behaviour.

KEEP / PORT CURRENT FUNCTION:

- Auth/session;
- product/catalog data;
- Product Detail actions;
- basket/cart;
- Stripe checkout handoff;
- Orders;
- Inbox/Chat;
- Seller Sell flow;
- notifications and deep links;
- current backend/server-authoritative rules.

Do not alter Workspace/Admin/Super Admin visuals, Avasam/Supplier Commerce, hosted Supabase schema/data, or checkout/payment contracts as part of this colour update.

## Firebase + Android startup truth

The earlier debug APK startup fatal was:

`Default FirebaseApp is not initialized in this process co.uk.loadifymarket.app`

Known cause path:

- `android/app/google-services.json` was absent locally;
- Push Notifications registered through Capacitor;
- release workflow has a valid secure Firebase injection path via `ANDROID_GOOGLE_SERVICES_JSON_BASE64`;
- do not disable push to conceal this failure;
- do not invent, print or commit Firebase secrets.

Final build must use the real ignored Firebase config and prove the app stays alive without the Firebase fatal.

## Signing/update identity

Known historical signed Android workflow uses:

- `ANDROID_KEYSTORE_BASE64`;
- `ANDROID_KEYSTORE_PASSWORD`;
- `ANDROID_KEY_ALIAS`;
- `ANDROID_KEY_PASSWORD`.

Public Android workflow run #272 on 2026-07-12 completed keystore validation, signed APK/AAB builds and APK signature verification successfully.

Historical GitHub Release `v0.20260712.272.bda39d1` still exposes `app-release.apk`.

Do not claim signing-certificate parity until the new APK certificate is compared with the historical/installed certificate.

## CI / Netlify infrastructure status

Owner confirmed on 2026-08-30 that CI/Netlify are currently unavailable because payment/credits are exhausted.

Therefore:

- do not treat current CI/Netlify failures as code-failure evidence;
- do not waste time rerunning paid infrastructure checks while credits remain unavailable;
- executable validation moves to the owner's local Windows checkout and Android device.

See also `docs/checkpoints/PR618_CI_NETLIFY_BILLING_BLOCKER_2026-08-30.md`.

## Required continuation order

1. synchronize the owner's local checkout to the current PR branch without overwriting uncommitted work;
2. run local `npm ci` / typecheck / lint / tests / production build as available;
3. restore the real ignored Firebase `google-services.json` **after Capacitor sync if sync removes it**, and validate package `co.uk.loadifymarket.app` without exposing contents;
4. build Android candidate with version `2 / 1.0.1`;
5. verify generated Firebase resources and `FirebaseInitProvider`;
6. verify signing certificate against the historical/installed lineage before update approval;
7. install **only with update semantics** (`adb install -r`), never uninstall to force the install;
8. verify PID remains alive and filtered logcat has no Firebase fatal;
9. visually smoke the new colour identity on Home, Search/Categories, Product Detail, Cart/Checkout, Orders, Inbox/Chat, Profile and Seller flow;
10. verify current functional contracts still work;
11. keep PR #618 DRAFT / NOT MERGED until the device update smoke passes.

## Current desired end state

**Same Loadify Market Android application. Same package. Same app-style structure and behaviour. Current website colour identity. Updated in place on the owner's phone.**
