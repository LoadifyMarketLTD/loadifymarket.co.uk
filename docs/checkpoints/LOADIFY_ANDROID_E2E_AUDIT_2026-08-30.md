# Loadify Market Android — E2E Audit Checkpoint — 2026-08-30

## Scope

Full end-to-end audit of the existing Capacitor Android application, not a screenshot-only review. Screenshots from the installed application are evidence, but code, route, state, commerce, notification, seller, Android packaging and runtime contracts are audited independently.

Repository: `LoadifyMarketLTD/loadifymarket.co.uk`

PR: `#618 — Polish marketplace product detail, catalog and premium homepage`

Branch: `visual/product-detail-premium-polish-20260829`

Audit baseline HEAD: `1d7ab74decbee968fc578f56c0ac34f03e567689`

PR state at audit baseline: OPEN / DRAFT / NOT MERGED / MERGEABLE.

## Guardrails

- Preserve Android package `co.uk.loadifymarket.app` and the existing standalone app navigation/behaviour.
- Do not replace the application with Mobile Web.
- Do not uninstall the installed application or clear its private data.
- Do not weaken RLS/security or hosted Supabase controls.
- Do not alter Workspace/Admin/Super Admin visuals.
- Do not alter Avasam/Supplier Commerce or the checkout/payment backend contract as part of visual repairs.
- Do not disable Firebase/push to hide startup errors.
- Current visual identity is ivory/navy/taupe, not the historical dark/gold theme.

## Audit method / truth labels

- `STATIC PASS`: source contract verified from this branch.
- `STATIC FAIL`: source-level defect proven from this branch.
- `RUNTIME REQUIRED`: cannot truthfully pass without local build/runtime evidence.
- `DEVICE REQUIRED`: requires the signed APK running on the physical Android device.
- `HOSTED BLOCKED`: live hosted state could not be verified from the currently exposed connector.

## Android identity / packaging

### STATIC PASS

- Capacitor `appId`: `co.uk.loadifymarket.app`.
- App name: `Loadify Market`.
- Android candidate is `versionCode 2`, `versionName 1.0.1`.
- Splash/system-bar target is light ivory `#F8F7F4`.
- Cleartext traffic is disabled.
- Release signing configuration resolves explicit `LOADIFY_UPLOAD_*` environment variables before Gradle-property fallback.
- Partial release-signing configuration fails closed.
- Android packaging/install fails closed when the required real ignored Firebase `google-services.json` is absent.

### RUNTIME / DEVICE REQUIRED

- Exact-head TypeScript/lint/test/build.
- Firebase generated-resource verification.
- Release APK certificate/package/version verification.
- In-place update install over the existing signed app.
- PID/logcat/startup and push-init verification.
- Status bar/splash/keyboard/safe-area visual verification.

## Visual identity / component system

### STATIC FAIL — conflicting theme stacks

The app currently depends on several competing layers instead of one authoritative Android design system:

- base `index.css` still contains historical dark/gold tokens;
- `.market-light-root` and `.market-public-light` contain an older royal-blue/yellow identity;
- `native.css` attempts to override these with the approved Android identity;
- `mobile-drawer-identity.css` still hardcodes old royal-blue/orange/gold values;
- `light-semantic-compat.css` applies broad `!important` compatibility overrides;
- `seller-listing-editor-light.css` hardcodes gold selected controls and submit CTA.

This explains the installed screenshots showing several visual systems in one application. Current state: **VISUAL E2E FAIL**.

### STATIC FAIL — brand/logo coverage

`MobileAppHeader` contains the current Loadify logo mark/wordmark, but Seller Hub uses a generic `Store` icon and `Seller Hub` identity. The seller top bar/drawer therefore lacks the Loadify Market brand by source, not only by screenshot.

### Target

- background `#F8F7F4`;
- primary `#0A234F`;
- accent `#8A7351` only as a restrained accent;
- surfaces white / `#FCFBF9`;
- text `#334155`, `#5A6578`, `#667085`, `#8A94A3`;
- border `#DCE3ED` / low-opacity navy;
- no large mustard CTAs, no yellow active nav, no dark+gold app header.

## Navigation / route consistency

### STATIC PASS

- Android Home remains a dedicated native-layout experience.
- Bottom navigation remains Home / Search / Sell / Inbox / Profile.
- `MainLayout` avoids the desktop website Header/Footer for Capacitor mobile.
- `MobileAppLayout` reserves safe bottom-navigation space.

### STATIC FAIL — stale Home category slugs

`UpdatedNativeMarketplace` hardcodes legacy shortcuts such as `electrical`, `homeware`, `toys`, `sports-fitness`, `wholesale-clothing`, `kids`, `vehicles`.

Canonical taxonomy top-level slugs are:

- `electronics-and-technology`
- `home-and-garden`
- `clothing-and-apparel`
- `health-and-beauty`
- `sports-and-leisure`
- `toys-and-games`
- `baby-and-nursery`
- `automotive`

This can route Android users into legacy/empty category pages. The installed `Homeware` zero-result screenshot is consistent with this source-level drift, although hosted data causality is not claimed without live DB proof.

## Public marketplace visibility contract

### STATIC PASS — Catalog

Catalog applies the strongest public sellability filters:

- `isActive=true`
- `isApproved=true`
- `listingStatus='active'`
- `productType!='logistics'`
- `stockQuantity>0`

### STATIC FAIL — inconsistent public filters

Other public surfaces do not consistently apply the Catalog contract:

- CategoryPage lacks some listing-status/product-type/stock guards.
- ProductDetail public direct fetch only requires `isActive=true`.
- ProductDetail recommendations do not fully match Catalog sellability.
- Favourites can load `isActive/isApproved` products without the complete Catalog visibility contract.

This creates E2E inconsistency: a listing hidden from Catalog can potentially remain visible through another public path.

## Seller listing lifecycle

### STATIC FAIL — destructive Pause / Resume

`SellerSettings` Pause sets all active products inactive. Resume then sets **all inactive products active**.

This is incompatible with `ProductFormPage`, where drafts intentionally use `isActive=false` and `listingStatus='draft'`. Resume can therefore reactivate drafts or intentionally inactive listings. This is a high-severity state-integrity defect.

Do not implement a guessed fix until the desired persistence model for pre-pause active state is made explicit in code/schema.

### STATIC FAIL — product status derivation

Seller Products derives `draft` from `!isActive` before considering the stock state. `Mark Sold` sets stock to zero and `isActive=false`, so a sold/out-of-stock listing can later appear as Draft.

### STATIC RISK

- share-count increment is read-then-write and non-atomic;
- stale `pending_review` presentation remains despite direct-publish work.

## Inbox / Chat

### STATIC FAIL — Buyers/Sellers tabs

Inbox categorises conversations as Buyers/Sellers according to **who sent the latest message**, not the stable participant role. A conversation can therefore switch tab merely because the other person replied.

### STATIC FAIL — last-message preview query

The global recent-message query is bounded by a multiple of conversation count and can be dominated by a high-volume conversation, leaving other conversations without a reliable preview.

### STATIC FAIL — production diagnostics

Inbox/Chat expose internal debug UI via `?debug=1`; production should not expose this diagnostic surface. Inbox also logs session/user details and counts to the production console.

### STATIC FAIL — typing presence

Chat creates a new `typing:<conversationId>` channel on input changes and calls `track()` without a subscribed, lifecycle-managed presence channel. This is both functionally unreliable and a channel-lifecycle leak.

## Orders

### STATIC FAIL

Mobile Orders does not provide an explicit query-error state; Supabase/RLS/network failures can collapse into a normal empty-state presentation.

### STATIC RISK

Opening a mobile order navigates into `/buyer/orders?orderId=...`, crossing from standalone Android mobile flow into the web buyer-shell detail route. Runtime product-flow verification is required.

## Notifications / push / deep links

### STATIC PASS

Push token registration is tied to the authenticated user and native notification actions are routed into app paths.

### STATIC FAIL — notification fallback path

Push action fallback routes to `/notifications`, while the actual app route is `/profile/notifications`. Fallback notification actions can therefore navigate to the wrong route.

### STATIC FAIL — notification mutations

- local notification delete removes UI state without checking the Supabase returned `error` object;
- mark-all-read performs sequential non-atomic updates and can partially succeed.

## Profile / settings

### STATIC FAIL / UX

Buyer/non-seller profile copy says `View my listings` while routing to the public Catalog. The label is semantically wrong for a buyer profile.

### STATIC RISK

`Clear cache` unregisters all service workers and deletes every CacheStorage key, while startup cleanup is intentionally restricted to Loadify/workbox/vite-related caches.

## Cart / Checkout / tax presentation

### STATIC FAIL — commercial display contract

Cart and Checkout display a hardcoded `VAT (20%)` row and calculate included VAT as `subtotal / 6`.

The backend tax contract is different:

- tax is resolved from verified seller tax evidence;
- the currently supported non-VAT-registered path resolves a zero tax rate;
- VAT-registered seller handling fails closed as unsupported in the current marketplace-tax implementation.

Therefore the client-side hardcoded 20% VAT presentation is contract-inconsistent and must be removed/replaced with server-authoritative tax presentation. The backend tax/payment engine must not be weakened to fit the old UI.

## Firebase / notifications startup

Earlier physical/local startup evidence showed `Default FirebaseApp is not initialized...` when the real ignored Firebase config was absent. Current Gradle configuration fails closed instead of silently building a broken candidate. Push remains part of the required application contract and must not be disabled.

Final release gate requires the real ignored Firebase config, generated resources and physical startup proof.

## Hosted Supabase

A read-only live verification attempt was made through the available Supabase connector during this audit. The connector currently returned no exposed projects. Therefore hosted DB truth is **HOSTED BLOCKED** in this session; no schema/data mutation was attempted and no live-database PASS is claimed.

## Current priority ledger

### P0 — release blockers

1. Visual identity is not coherent across the Android app; logo/brand coverage is incomplete.
2. Seller Pause/Resume can destroy listing active/draft state semantics.
3. Cart/Checkout hardcoded `VAT (20%)` contradicts authoritative backend tax logic.
4. Firebase/runtime/release candidate still requires exact-head local and physical proof.

### P1 — high priority

1. Stale Home category shortcuts.
2. Inbox Buyers/Sellers role classification.
3. Chat typing presence channel lifecycle.
4. Push fallback route mismatch.
5. Public product visibility filters are inconsistent across Catalog/Category/ProductDetail/Favourites.
6. Seller sold/out-of-stock status derivation.
7. Orders error state.
8. Notification mutation error handling.

### P2 — quality / consistency

1. Production debug/query-parameter diagnostics.
2. Production console logs in Inbox.
3. Buyer profile copy.
4. Cache clearing scope.
5. Unread-count realtime freshness.
6. Broad CSS compatibility layers / positional CSS hacks.

## Fix order

1. Small deterministic route/data-contract fixes that cannot alter hosted data.
2. Android theme/brand convergence in common app chrome and Capacitor-scoped CSS.
3. Seller state-machine repair only after a non-destructive pause/resume model is established.
4. Public sellability query convergence.
5. Inbox/chat state repair.
6. Cart/Checkout server-authoritative tax presentation.
7. Exact-head local typecheck/lint/tests/build + Capacitor sync.
8. Release APK only, real Firebase, exact signing certificate verification.
9. In-place update only; never uninstall.
10. Physical E2E smoke across Auth, Home, Categories/Search, Product Detail, Favourites, Cart/Checkout, Orders, Inbox/Chat, Profile/Settings, Seller Dashboard/Products/Edit/Sell/Orders/Settings, notifications/deep-links, splash/status bar/keyboard/safe areas.

## Release verdict

**NOT READY / E2E FAIL.**

PR #618 must remain DRAFT / NOT MERGED until source blockers are repaired and the exact release candidate passes local + physical-device E2E verification.