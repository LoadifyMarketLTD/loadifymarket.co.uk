# Android Build Guide — Loadify Market

## Overview

The Loadify Market Android app is a Capacitor wrapper around the existing web app.
The web app is the source of truth. The Android project in `android/` wraps the
built `dist/` output using Capacitor's WebView bridge.

**Package ID:** `co.uk.loadifymarket.app`
**App name:** `Loadify Market`
**Strategy:** PWA + Capacitor Android

---

## Prerequisites (local machine)

- Node.js 20+
- Java 17+ (JDK)
- Android Studio **or** Android SDK with:
  - Build tools 34+
  - Platform API 34+
  - `ANDROID_HOME` env var set

---

## Build Commands

### 1. Install dependencies (first time only)
```bash
npm ci
```

### 2. Build web assets
```bash
npm run build
```

### 3. Sync web assets into Android project
```bash
npx cap sync android
```

### 4. Build debug APK
```bash
cd android
./gradlew assembleDebug
```

Debug APK location:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### 5. Install on connected device / emulator
```bash
cd android
./gradlew installDebug
```

---

## One-liner (build + sync + APK)

```bash
npm run build && npx cap sync android && cd android && ./gradlew assembleDebug
```

---

## Open in Android Studio

```bash
npx cap open android
```

---

## Release Build (when ready for Play Store)

### Step 1: Generate a keystore (once only — store it securely)
```bash
keytool -genkey -v \
  -keystore loadify-release.keystore \
  -alias loadify-key \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

### Step 2: Configure signing in `capacitor.config.ts`
Update the `buildOptions` section:
```ts
buildOptions: {
  keystorePath: 'path/to/loadify-release.keystore',
  keystorePassword: 'YOUR_KEYSTORE_PASSWORD',
  keystoreAlias: 'loadify-key',
  keystoreAliasPassword: 'YOUR_KEY_PASSWORD',
},
```

### Step 3: Build release APK
```bash
cd android
./gradlew assembleRelease
```

Release APK location:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Build release AAB (required for Play Store)
```bash
cd android
./gradlew bundleRelease
```

AAB location:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## Configuration Files

| File | Purpose |
|------|---------|
| `capacitor.config.ts` | Capacitor app identity, webDir, plugin config |
| `android/app/build.gradle` | App ID, version code, SDK versions |
| `android/app/src/main/AndroidManifest.xml` | Permissions, deep links, activity config |
| `android/app/src/main/res/values/strings.xml` | App name strings |
| `android/app/src/main/res/values/colors.xml` | Brand colors |
| `android/variables.gradle` | SDK versions (minSdk 24, target 36) |

---

## Deep Link Handling

The app registers two deep link intent filters:
1. `co.uk.loadifymarket.app://` — Capacitor's native scheme
2. `https://loadifymarket.co.uk` — HTTPS app links (requires `assetlinks.json`)

The app registers two deep link intent filters:
1. `co.uk.loadifymarket.app://` — Capacitor's native scheme
2. `https://loadifymarket.co.uk` — HTTPS app links (requires `assetlinks.json`)

### Completing the assetlinks.json fingerprint

The file `public/.well-known/assetlinks.json` is already committed and deployed at:
```
https://loadifymarket.co.uk/.well-known/assetlinks.json
```

The SHA-256 fingerprint placeholder (`REPLACE_WITH_RELEASE_KEYSTORE_SHA256_FINGERPRINT`) must be replaced with the actual release keystore fingerprint **before** the app is distributed:

**Step 1 — Extract the SHA-256 fingerprint from your release keystore:**
```bash
keytool -list -v \
  -keystore loadify-release.keystore \
  -alias loadify-key
# Copy the SHA-256 value from the "Certificate fingerprints" section
```

**Step 2 — Update `public/.well-known/assetlinks.json`:**
Replace `REPLACE_WITH_RELEASE_KEYSTORE_SHA256_FINGERPRINT` with the value from Step 1.
Format: `AB:CD:EF:...` (colon-separated uppercase hex pairs, 32 pairs = 64 hex chars).

**Step 3 — Commit and deploy:**
```bash
git add public/.well-known/assetlinks.json
git commit -m "chore: add release keystore fingerprint to assetlinks.json"
git push
# Netlify will deploy; verify at:
# curl -I https://loadifymarket.co.uk/.well-known/assetlinks.json
# → HTTP/2 200, Content-Type: application/json
```

**Step 4 — Verify App Links on device:**
```bash
adb shell am start -a android.intent.action.VIEW \
  -c android.intent.category.BROWSABLE \
  -d "https://loadifymarket.co.uk/order-success"
# → App should open directly (not Chrome)
```

Once the fingerprint is deployed and the app is installed, the Stripe post-payment
redirect to `https://loadifymarket.co.uk/order-success` will be intercepted by Android
OS and routed back into the app WebView (the `appUrlOpen` listener in `src/App.tsx`
handles the navigation).

---

## External Links (Payment / Auth)

- Stripe checkout opens in the system browser (external intent).
- Supabase email auth links redirect back via the registered deep link scheme.
- No in-app payment WebView is used — all payment flows go through the system browser for security.

---

## Play Store Readiness Checklist

- [ ] Release keystore generated and secured (NOT committed to repo)
- [ ] `android/app/build.gradle` — `versionCode` and `versionName` updated
- [ ] Screenshots captured (phone + tablet)
- [ ] Privacy policy URL live on site (already exists at `/privacy`)
- [ ] Data safety form completed in Play Console
- [ ] `assetlinks.json` SHA-256 fingerprint updated with release keystore value (file already deployed; replace placeholder — see "Completing the assetlinks.json fingerprint" above)
- [ ] App reviewed for Google Play policy compliance
- [ ] Content rating questionnaire completed in Play Console

---

## Known Limitations / TODOs

- **Back button:** Capacitor handles WebView back navigation automatically. If the user reaches the root of the app, the back button exits the app (standard Android behaviour).
- **File upload:** Camera/storage permissions are declared in AndroidManifest. Test seller product image upload on a physical device.
- **Stripe payment redirect:** After payment, Stripe redirects to `https://loadifymarket.co.uk/order-success`. The `appUrlOpen` listener in `src/App.tsx` will route this back into the WebView. This requires the `assetlinks.json` fingerprint to be populated (see checklist above).
- **Push notifications:** Not configured. Add `@capacitor/push-notifications` + Firebase `google-services.json` when needed.
- **App updates:** Users get updates when a new APK/AAB is published to Play Store. For faster web-only updates, consider using `@capacitor/live-updates` (Ionic Appflow) in future.
