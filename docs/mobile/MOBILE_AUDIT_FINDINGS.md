# Loadify Market — Mobile Engineering Audit Findings

**Baseline:** `22e13a6933c7c7a3bc423bffbd0364eb34f35a04`  
**Hardening branch:** `mobile-production-hardening`  
**Rule:** findings are not marked resolved until the applicable static, build and device gates pass.

## Status legend

- `OPEN` — verified defect/risk, remediation not yet accepted.
- `IN PROGRESS` — isolated remediation exists but validation is incomplete.
- `BLOCKED` — verification/remediation depends on an external prerequisite.
- `RESOLVED` — all required PASS criteria have been demonstrated.

---

| ID | Severity | Area | Finding | Status |
|---|---:|---|---|---|
| MOB-001 | P1 | App shell | Mobile viewport/safe-area ownership is fragmented. Home used `MobileAppLayout` with document-style `min-h-screen` + fixed nav + hard-coded spacer while Home itself also compensated for nav/safe-area. | IN PROGRESS |
| MOB-002 | P1 | Edge-to-edge | Home header owned top safe-area inside scrollable content, allowing page content to move into the Android status-bar region after header scroll. | IN PROGRESS |
| MOB-003 | P1 | Shell consistency | Standalone mobile routes (`/inbox`, `/orders`, `/profile/*`, etc.) implement their own full-screen/safe-area/nav rules instead of one application-shell contract. | OPEN |
| MOB-004 | P0 | Seller media | Mobile seller upload derives storage extension from the selected filename and collapses upload failures into a generic error; real camera/gallery compatibility and size/type behaviour are not certified. | IN PROGRESS |
| MOB-005 | P0 | Startup | Supabase configuration validation can throw before the React tree is mounted; a bad native build configuration can therefore produce a blank WebView instead of a recovery screen. | OPEN |
| MOB-006 | P1 | Push | Push-token client logic exists, but the official Capacitor Push Notifications dependency is absent from package dependencies. Native push cannot be considered implemented. | OPEN |
| MOB-007 | P1 | App Links | `appUrlOpen` routing exists in React, but AndroidManifest exposes only MAIN/LAUNCHER and no verified HTTPS VIEW/BROWSABLE App Link filters. | OPEN |
| MOB-008 | P1 | Networking | Native networking is split between a global `window.fetch` patch, CapacitorHttp, Supabase custom fetch and higher-level authenticated fetch wrappers. Ownership and environment routing are too implicit. | OPEN |
| MOB-009 | P1 | Environment safety | `capacitorFetchPatch` contains a production URL fallback. A non-production APK with missing `VITE_APP_URL` can silently talk to production rather than fail closed. | OPEN |
| MOB-010 | P1 | Auth storage | Native auth uses Capacitor Preferences with localStorage fallback while Android backup is enabled. Backup/restore treatment of session material is not an explicit documented security decision. | OPEN |
| MOB-011 | P1 | Documentation/security | Supabase storage comments describe native Preferences/SharedPreferences as encrypted at rest. That guarantee is not established by the current implementation and should not be claimed. | OPEN |
| MOB-012 | P1 | PWA/native | `main.tsx` registers the service worker based on browser capability and does not explicitly exclude Capacitor native runtime, adding an unnecessary cache/lifecycle layer to the APK unless deliberately required. | IN PROGRESS |
| MOB-013 | P1 | PWA correctness | `main.tsx` comments describe a cleanup/no-cache service worker while `public/sw.js` implements real cache-first/network-first behaviour. Source documentation and runtime behaviour disagree. | IN PROGRESS |
| MOB-014 | P1 | Lifecycle | Android Back/predictive Back, background/resume and listener restoration do not yet have an accepted device validation matrix. | OPEN |
| MOB-015 | P0 | Release identity | Native Gradle metadata remains `versionCode 1` / `versionName 1.0`; automated release tags exist, but app-version identity is not yet a monotonic production release contract. | OPEN |
| MOB-016 | P1 | Release validation | GitHub CI is currently unable to start because the GitHub account is locked by a billing issue. The hardening branch therefore has no CI test/lint/typecheck evidence yet. | BLOCKED |
| MOB-017 | P2 | UI system | Mobile pages contain duplicated inline spacing/colour/layout values and do not consistently use shared mobile primitives/tokens. | OPEN |
| MOB-018 | P2 | Accessibility | Touch targets/focus work is partially present, but no end-to-end mobile accessibility certification exists for large text, screen reader, keyboard/IME and contrast across critical flows. | OPEN |
| MOB-019 | P2 | Observability/privacy | `MobileInboxPage` and `MobileChatPage` emit detailed session/user/conversation diagnostic logs outside a `DEV` guard; `?debug=1` can expose internal debug state panels in production. | OPEN |
| MOB-020 | P2 | Branding | HTML/PWA theme metadata uses `#0A0A0A` while the current app background token is `#0A0E1A`, creating avoidable system-chrome/brand inconsistency. | OPEN |
| MOB-021 | P1 | Messaging presence | `MobileChatPage` subscribes one Presence channel instance, but draft changes create a new channel instance and call `track()` on it without subscribing. Typing state is therefore not tied to the active subscribed channel and can create redundant channel objects. | OPEN |
| MOB-022 | P1 | Messaging receipts | `lastSentRead` is set true when any matching message UPDATE reports a sent message as read; the callback does not prove that the updated row is the current user's latest sent message, so the UI can show a misleading `Seen` state. | OPEN |
| MOB-023 | P1 | Seller media lifecycle | Mobile photo upload uses `Promise.all`; if one network upload rejects after others succeeded, successful objects may already exist in Storage but are not added to form state. Removing a photo also removes only the URL from UI, not the uploaded object. | IN PROGRESS |
| MOB-024 | P1 | Standalone scrolling | Inbox/categories/orders use `min-h-screen` outer containers together with fixed bottom navigation and intended inner scrolling; because the outer height is not constrained to the dynamic viewport, document and inner-scroll ownership is inconsistent. Inbox's list container also lacks its own vertical overflow rule. | OPEN |

---

## Branch Guard notes

### Phase P1.1 — MOB-001/MOB-002

Current branch changes make `MobileAppLayout` own `100dvh`, reserve the top safe-area outside the scrolling region, create one inner vertical scroll container, and remove duplicate Home-level bottom-nav compensation. `MobileAppHeader` no longer adds a second top safe-area inset.

**Validation state**

- exact diff reviewed and formatting churn self-corrected;
- Netlify deploy preview built successfully;
- GitHub Actions lint/typecheck/tests did **not** execute because of the account billing lock;
- Android APK/device validation remains pending.

Therefore MOB-001/MOB-002 remain `IN PROGRESS`, not `RESOLVED`.

### Phase P1.7 — MOB-012/MOB-013

A separate draft PR (`#483`) now keeps PWA service-worker registration on regular web, while native Capacitor runtime performs best-effort unregister/Loadify-cache cleanup instead of registering the PWA worker. The misleading `main.tsx` service-worker comment was corrected.

**Validation state**

- exact diff reviewed: one source file, no business/auth/payment/schema/dependency changes;
- Netlify deploy preview built successfully;
- GitHub Actions remains blocked by the account billing issue;
- native WebView cleanup and web PWA behaviour still require runtime verification.

Therefore MOB-012/MOB-013 remain `IN PROGRESS`, not `RESOLVED`.

### Phase P0.2 — MOB-004/MOB-023

A separate draft PR (`#484`) isolates the mobile seller media remediation from shell and PWA work. The mobile path now validates the existing JPG/PNG/WebP + 5 MB contract before upload, derives the Storage extension deterministically from supported MIME, uses a controlled filename-extension fallback only when the browser supplies no MIME, rolls back successful objects after a partial batch failure, and deletes the actual Storage object before removing a photo from the form. The existing `create-product` business payload remains an array of public image URLs.

**Branch Guard self-correction**

- the first remediation draft attempted to delete every staged photo when `MobileSellWizard` unmounted;
- that behaviour was removed before PR creation because Android Back/lifecycle can race an in-flight publish and deleting staged files at unmount could break a listing whose server request succeeds after the screen disappears;
- cleanup is now limited to certain events: failed-batch rollback and explicit `Remove photo`.

**Validation state**

- final branch diff is isolated to three files: the product-image helper, its focused tests, and `MobileSellWizard`;
- no payment, auth, RLS, schema, shipping, product lifecycle or `create-product` contract changes are present;
- GitHub Actions jobs did **not** execute. GitHub's check annotation states: `The job was not started because your account is locked due to a billing issue.`;
- Netlify checks are independent and may provide build evidence, but they do not replace the blocked unit/lint/typecheck gates unless their executed command proves the same coverage;
- Android camera/gallery, large-file rejection, multi-photo, forced partial failure/retry, Storage cleanup and final publish still require real-device validation.

Therefore MOB-004/MOB-023 remain `IN PROGRESS`, not `RESOLVED`.

---

## Release rule

No finding may be closed merely because code was written. A finding is closed only when its defined PASS evidence is available and the Branch Guard has checked the final diff for business/security regressions.
