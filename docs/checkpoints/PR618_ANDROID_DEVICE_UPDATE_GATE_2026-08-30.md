# PR #618 — Android Device Update Gate — 2026-08-30

## Current branch / head before local device execution

- PR: `#618`
- branch: `visual/product-detail-premium-polish-20260829`
- checkpoint source head: `eb934c352ecd82819adceee88fc427e8217a9c46`
- PR state at checkpoint: OPEN / DRAFT / NOT MERGED / MERGEABLE
- package: `co.uk.loadifymarket.app`
- candidate: `versionCode 2`, `versionName 1.0.1`

## Product requirement

Preserve the existing Loadify Market Android application structure and behaviour, but update its colour identity to the current site palette:

- `#F8F7F4` warm ivory;
- `#0A234F` navy;
- `#8A7351` warm accent;
- white / `#FCFBF9` surfaces;
- current slate/grey support colours.

Do not replace the app with the Mobile Web marketing stack.

## Guarded local update script

Canonical script:

`scripts/android-update-existing-app.ps1`

Default device serial:

`57311FDCQ00BGS`

Run from the local checkout:

```powershell
cd "C:\Users\Danny\Desktop\LoadifyMarket-PR600"
powershell -ExecutionPolicy Bypass -File .\scripts\android-update-existing-app.ps1
```

If the secure Firebase file is not found in an already-known safe local source, rerun with an explicit secure path:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\android-update-existing-app.ps1 -FirebaseSource "C:\secure\google-services.json"
```

Never paste or commit the Firebase file contents.

## Script safety properties

The script:

1. requires the exact PR branch;
2. preserves unexpected local tracked work and aborts instead of resetting it;
3. only restores the two known generated Capacitor Gradle files when they are the only tracked dirt;
4. preserves untracked diagnostic files;
5. fast-forwards from the remote branch only;
6. confirms package `co.uk.loadifymarket.app` and candidate `2 / 1.0.1`;
7. confirms the updated native colour shell exists;
8. runs `npm ci`, typecheck, lint, unit tests and production build locally because paid CI/Netlify are unavailable;
9. runs Capacitor Android sync;
10. requires a real ignored `google-services.json` and validates the package without printing secrets;
11. requires `processDebugGoogleServices` and generated `google_app_id`;
12. requires the package to already be installed on the phone;
13. pulls the installed `base.apk` and reads its signing certificate SHA-256 using `apksigner`;
14. builds the candidate APK;
15. requires `FirebaseInitProvider` in the merged manifest;
16. compares candidate signing certificate to the currently installed application certificate;
17. refuses installation on signing mismatch;
18. installs only with `adb install -r`;
19. never calls `adb uninstall`;
20. clears logcat only after installation, force-stops and relaunches the app, waits 12 seconds, requires a live PID and rejects Firebase/Android fatal lines.

## Hard STOP conditions

Do not bypass any of these:

- unexpected local tracked modifications;
- missing/wrong Firebase config;
- package mismatch;
- JS validation/build failure;
- missing `google_app_id`;
- phone not available/authorized;
- target package not already installed;
- missing `apksigner`;
- signing certificate mismatch;
- Android build failure;
- missing `FirebaseInitProvider`;
- `adb install -r` failure;
- process dead after 12 seconds;
- Firebase/Android fatal logcat.

## After automated PASS

Manual/device smoke remains required for:

- Home colour identity and app structure;
- Search / Categories;
- Product Detail;
- Cart / Checkout external handoff;
- Orders;
- Inbox / Chat;
- Profile;
- Seller flow;
- notifications/deep links.

PR #618 remains DRAFT / NOT MERGED until this device gate and manual smoke are complete.
