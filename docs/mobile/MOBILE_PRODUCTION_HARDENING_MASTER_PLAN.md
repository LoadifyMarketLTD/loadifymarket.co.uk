# Loadify Market — Mobile Production Hardening Master Plan

**Owner:** Loadify Market engineering  
**Scope:** Android APK + shared web-mobile runtime  
**Baseline commit:** `22e13a6933c7c7a3bc423bffbd0364eb34f35a04`  
**Working branch:** `mobile-production-hardening`  
**Release policy:** no production merge until every changed stage passes Branch Guard validation.

---

## 1. Engineering contract

This programme finishes the existing Capacitor application as a production mobile product. It does **not** replace the React/Capacitor architecture and it does **not** invent new marketplace business rules.

Every change must follow this loop:

1. Re-read the current implementation and affected contracts.
2. Make the smallest coherent change that fixes the identified defect class.
3. Review the exact diff for unintended product/business behaviour changes.
4. Run lint, type-check, unit tests and production build.
5. When native code/config changes, run Capacitor sync and Android release build.
6. Validate the actual runtime flow on a device/emulator where the defect is device-dependent.
7. Record unresolved risks; never convert an unverified assumption into a PASS.

### Non-negotiable guard rails

- Preserve existing marketplace lifecycle, payments, permissions, RLS assumptions and Stripe/Supabase contracts unless a separately audited defect proves a change is required.
- Do not weaken authentication, rate limiting, seller eligibility, checkout integrity or payout protections to make tests pass.
- Do not silently fall back from a non-production build into production services.
- Do not ship placeholder credentials, debug-only UI, temporary build markers or untracked manual fixes.
- Do not call an Android release production-ready from web/unit tests alone.

---

## 2. Release gates

A mobile release is `GO` only when all applicable gates are green.

| Gate | Requirement |
|---|---|
| G0 Source integrity | exact source SHA recorded; branch based on current main; no unexplained files |
| G1 Static quality | ESLint PASS, TypeScript PASS, diff check PASS |
| G2 Behaviour | complete unit suite PASS; critical marketplace smoke tests PASS |
| G3 Web build | production Vite build PASS with validated environment contract |
| G4 Native sync | `npx cap sync android` PASS; generated native config inspected |
| G5 Android build | signed release APK and AAB build PASS |
| G6 Artifact identity | versionName, versionCode, git SHA, build timestamp and SHA-256 recorded |
| G7 Device smoke | install/upgrade, cold start, warm start, background/resume, Back navigation PASS |
| G8 Core marketplace | login, browse, product, cart/checkout, sell/photo/publish, orders, messages PASS |
| G9 Native integration | app links/auth callback, push registration/routing, external browser returns PASS |
| G10 UX/accessibility | system insets, keyboard, touch targets, large text, rotation/resizing policy checked |
| G11 Security/recovery | session persistence/backup policy, startup failure UI, network failure/retry checked |

---

## 3. Priority P0 — release-blocking foundation

### P0.1 Reproducible Android release identity

**Affected files**
- `.github/workflows/build-android.yml`
- `android/app/build.gradle`
- `capacitor.config.ts`
- release documentation under `docs/mobile/`

**Required state**
- one documented signing identity and recovery procedure;
- CI refuses missing signing/environment inputs;
- release artifact identity is deterministic and traceable to a git SHA;
- versionCode is monotonically increasing;
- APK/AAB checksums are produced and retained;
- no release is produced from an ambiguous environment.

**PASS**
- clean workflow run produces signed APK+AAB with recorded SHA/version/checksum and no secret exposure.

### P0.2 Seller media publication path

**Affected files**
- `src/pages/MobileSellWizard.tsx`
- product image upload helpers/storage calls
- relevant tests

**Required state**
- accepted media types validated;
- filename/MIME/ext handling is deterministic;
- size and count limits enforced before upload;
- useful per-step error/retry state;
- failed product creation does not leave an apparently successful UI state;
- real-device camera/gallery files are supported.

**PASS**
- real device: JPEG + PNG/WebP as supported, camera image, large image failure, retry, multi-image and final publish all behave correctly.

### P0.3 Startup recovery instead of blank screen

**Affected files**
- `src/main.tsx`
- `src/lib/supabase.ts`
- startup/error boundary code

**Required state**
- configuration/native bootstrap failures render a recovery screen rather than a blank WebView;
- diagnostics expose safe release/build identifiers, never secrets;
- retry works for recoverable initialisation failures.

**PASS**
- intentionally broken safe test configuration yields visible recovery UX; normal configuration boots unchanged.

---

## 4. Priority P1 — native product correctness

### P1.1 Mobile application shell / edge-to-edge

**Affected files**
- `src/layouts/MobileAppLayout.tsx`
- `src/components/MobileAppHeader.tsx`
- `src/components/MobileBottomNav.tsx`
- `src/index.css`
- mobile standalone pages that currently implement their own inset logic

**Required state**
- one app-shell contract owns viewport height and OS insets;
- content never renders behind status/navigation bars;
- only intended content region scrolls;
- bottom nav and sticky headers remain stable;
- keyboard does not hide active form controls;
- no page-specific magic spacer is required to compensate for nav height.

**PASS**
- 360/375/390/412 px viewports plus Android gesture and 3-button navigation show no overlap, clipped CTA or horizontal scroll.

### P1.2 Android Back and lifecycle

**Affected files**
- `src/App.tsx`
- Capacitor app lifecycle helper/hooks

**Required state**
- modal/sheet closes before route navigation where appropriate;
- route back works consistently;
- root behaviour is intentional;
- background/resume does not duplicate listeners or corrupt auth state;
- predictive-back-compatible behaviour is verified on supported Android.

**PASS**
- defined navigation matrix passes on device/emulator.

### P1.3 App Links, OAuth and password recovery

**Affected files**
- `android/app/src/main/AndroidManifest.xml`
- `src/App.tsx`
- auth callback/reset flows
- domain association file/configuration outside repo where required

**Required state**
- verified HTTPS App Links for owned Loadify domain;
- allow-list only intended paths/hosts;
- OAuth callback, password reset and product/order links land on correct in-app routes;
- malformed/untrusted URLs fail safely.

**PASS**
- cold-start and warm-start deep links pass from external browser/email.

### P1.4 Native push notifications

**Affected files**
- `package.json` / lockfile
- Capacitor Android generated/plugin configuration
- `src/hooks/usePushTokenRegistration.ts`
- push-token backend and notification routing

**Required state**
- official Capacitor push plugin installed and synced;
- Firebase configuration managed as a protected release input;
- Android runtime notification permission handled for supported API levels;
- token register/update/logout lifecycle handled;
- notification tap routes to intended resource;
- backend has no duplicate/stale-token amplification.

**PASS**
- foreground/background/killed-state notification tests pass on real Android release build.

### P1.5 Networking contract consolidation

**Affected files**
- `src/lib/authorizedFetch.ts`
- `src/lib/capacitorFetchPatch.ts`
- `src/lib/supabase.ts`
- `capacitor.config.ts`

**Required state**
- clear ownership for Netlify API, Supabase and external-browser requests;
- no accidental production fallback for test/staging builds;
- timeout/retry/offline errors are classified consistently;
- request bodies/headers survive native transport unchanged;
- global fetch patching is reduced or formally constrained with tests.

**PASS**
- API/auth/storage/payment-return smoke matrix passes on Wi-Fi, offline transition and poor network.

### P1.6 Session storage, backup and logout hygiene

**Affected files**
- `src/lib/supabase.ts`
- `android/app/src/main/AndroidManifest.xml`
- Android backup rules if enabled

**Required state**
- comments/documentation accurately describe storage guarantees;
- backup/restore treatment of auth material is explicit;
- logout removes local session and push association as intended;
- app reinstall/upgrade behaviour documented and tested.

**PASS**
- session persistence and removal scenarios pass without relying on undocumented platform behaviour.

### P1.7 PWA/native runtime separation

**Affected files**
- `src/main.tsx`
- `public/sw.js`

**Required state**
- PWA service worker lifecycle is web-only unless a deliberate native caching requirement is documented;
- source comments match actual caching behaviour;
- API responses are never cached by the service worker.

**PASS**
- web PWA retains intended offline/static caching; native APK has no unintended service-worker cache layer.

---

## 5. Priority P2 — premium product quality

### P2.1 Mobile design-system contract

Create/reuse shared primitives for AppShell, AppHeader, Page, ScrollRegion, StickyCTA, FormField, Sheet and safe areas. Reduce raw colours and page-specific magic spacing without performing a cosmetic rewrite.

**PASS:** mobile core screens use common primitives and retain existing brand identity.

### P2.2 Accessibility

Audit touch targets, accessible names, focus management, contrast, reduced motion, screen-reader order and 200%/large-font behaviour.

**PASS:** no critical accessibility blocker in login, browse, product, sell, checkout, orders and messaging.

### P2.3 Performance and memory

Measure cold/warm startup, JS bundle cost, long tasks, image memory, list rendering and repeated navigation leaks. Optimise based on measurements rather than arbitrary rewrites.

**PASS:** agreed device baseline has stable startup/navigation and no reproducible memory-growth defect in core flows.

### P2.4 Media UX

Add native-grade capture/gallery affordances only where they materially improve reliability: preview, reorder, compression/orientation handling, progress and retry.

### P2.5 Mobile automated QA

Add automated coverage for route/back/deep-link/bootstrap and critical mobile component behaviour, plus a repeatable device smoke checklist for items not realistically covered by unit tests.

---

## 6. Current confirmed technical findings at programme start

- Android package/application ID: `co.uk.loadifymarket.app`.
- Android target/compile SDK: 36; min SDK: 24.
- Current Gradle metadata: `versionCode 1`, `versionName "1.0"`.
- Current release build uses CI-injected signing properties and builds APK + AAB.
- `MobileAppLayout` currently uses document scrolling plus a fixed bottom nav and a hard-coded spacer.
- Home and several standalone mobile pages also contain their own safe-area/bottom-nav compensation, so inset ownership is duplicated.
- App-level `appUrlOpen` handling exists, but the current Android manifest does not expose verified HTTPS VIEW/BROWSABLE App Links.
- Push registration client code exists, but the official Capacitor push-notifications dependency is not present in current package dependencies.
- `patchCapacitorFetch()` globally wraps fetch for Netlify function URLs in native context; Supabase also supplies a custom fetch path.
- Native Supabase auth storage uses Capacitor Preferences with localStorage fallback; backup policy remains explicit hardening work.
- `main.tsx` registers the service worker for any browser exposing `serviceWorker`; it is not currently gated out for Capacitor native runtime.

---

## 7. Execution order

1. Baseline + plan committed on isolated hardening branch.
2. P1.1 application shell/insets because it affects every mobile screen and is a visible runtime defect.
3. P0.2 seller media path because listing publication is marketplace-critical.
4. P0.3 startup recovery.
5. P0.1 release identity/version/checksum hardening.
6. P1.2 lifecycle/Back.
7. P1.3 App Links/auth return.
8. P1.4 push.
9. P1.5 networking consolidation.
10. P1.6 session/backup hygiene.
11. P1.7 PWA/native separation.
12. P2 design system, accessibility, performance and automated mobile QA.

The order may change only when a newly verified blocker has higher production risk. Every reorder must be recorded in this document or the PR history.
