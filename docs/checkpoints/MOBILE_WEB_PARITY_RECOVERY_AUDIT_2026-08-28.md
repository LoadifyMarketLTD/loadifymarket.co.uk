# Loadify Market — Web / Web-Mobile Parity Recovery Audit

Date: 2026-08-28
Branch: `fix/mobile-parity-recovery-20260828`
Base commit: `bb9b5ea2e91fd15b2f219e7a25381b79ef714f2b`

## Purpose

Recover functional parity between the canonical marketplace web surfaces and the standalone mobile-web surfaces before further mobile-only feature work.

The current application contains a second mobile application layer under `/sell`, `/orders`, `/inbox`, `/profile/*`, etc. Several of those pages evolved independently from the canonical Seller/Buyer web surfaces. The recovery rule is therefore:

> One commercial/security contract; responsive/mobile presentation may differ, but business rules, authoritative data sources, publication/payment semantics and capability checks must not diverge.

## Hard boundaries

- Marketplace Seller only. Do not mix with Supplier Commerce.
- Do not weaken checkout/payment/tax fail-closed boundaries.
- Do not reactivate owner pre-approval for ordinary seller listings.
- Do not reintroduce a total listing-count cap.
- Do not make the mobile app depend on `users.role` where canonical capability helpers already exist.
- Do not use `seller_profiles.balance` as seller payout truth when canonical `seller_balance` is used by Seller Dashboard.
- Do not fork image upload/optimisation rules between desktop and mobile.
- Do not force mobile camera capture when the seller wants to choose an existing photo.

## Current architecture

`App.tsx` exposes standalone mobile routes for:

- `/sell` → `MobileSellGate` + `MobileSellWizard`
- `/orders` → `MobileOrdersPage`
- `/inbox` and `/inbox/:conversationId`
- `/categories`
- `/profile`
- `/profile/notifications`
- `/profile/security`
- `/profile/balance`
- `/profile/favourites`
- `/profile/settings`
- `/seller/mobile-payments`

These coexist with canonical Seller/Buyer shells under `/seller/*` and `/buyer/*`.

## Verdict matrix

### 1. MobileSellWizard — CONSOLIDATE (CRITICAL)

Observed divergence:

- separate uploader from desktop `ImageUpload`;
- historically forced camera via `capture="environment"` (base commit already contains the gallery-choice repair);
- `MAX_PHOTOS = 6` while canonical product editor supports 10;
- uploads raw files directly instead of sharing canonical phone-photo optimisation;
- retains legacy `TAX_EVIDENCE_REQUIRED` → inactive draft fallback even after catalogue publication was decoupled from tax readiness;
- success copy can claim buyers can purchase immediately even when checkout readiness may still be false;
- stock is hard-coded to `1`;
- only a reduced subset of canonical product fields is exposed;
- publication analytics are implemented independently.

Recovery:

1. Extract/shared product-image processing contract and use it in both desktop and mobile.
2. Remove tax-as-publication-gate recovery from mobile; catalogue publication and checkout readiness must remain separate.
3. Align image count and upload limits with canonical editor.
4. Make post-publish copy truthful: listing can be live even when purchasing is not yet available.
5. Audit which canonical product fields are required for parity versus intentionally omitted from Quick Sell; omitted optional fields must remain editable through the canonical editor without data loss.

### 2. MobileSellGate / RequireSeller — REPAIR (CRITICAL)

`RequireSeller` grants its narrow onboarding catalogue exception only to `/seller/products/new` and `/seller/products/:id/edit`; `/sell` is not part of that same catalogue exception.

`RequireSellerAny` is not a safe drop-in replacement because it intentionally permits seller onboarding/profile access at any seller status, including states that should not necessarily be able to publish.

Recovery:

- keep full seller suspension/account safety;
- explicitly include `/sell` in the same narrow catalogue-create exception as canonical product create/edit, or replace the duplicated guard with a shared catalogue-authorisation helper.

### 3. MobileProfilePage — REPAIR / CONSOLIDATE

Observed divergence:

- seller detection uses raw `user.role === 'seller' || user.role === 'admin'` instead of canonical capability helpers;
- seller `Orders` link currently points to `/orders`, whose implementation is buyer-order history;
- profile navigation therefore mixes Buyer and Seller workspaces for Marketplace Sellers.

Recovery:

- use `hasSellerAccess` / `hasBuyerAccess` semantics;
- seller order link → canonical `/seller/orders` (or future dedicated seller-mobile orders surface);
- buyer order link → `/orders` or canonical `/buyer/orders` according to final mobile navigation design;
- do not infer capabilities only from legacy role.

### 4. MobileBalancePage — REPAIR (HIGH)

Observed divergence:

- seller detection uses raw role;
- reads `seller_profiles.balance`;
- canonical Seller Dashboard reads `seller_balance.availableAmount` and `seller_balance.totalEarned`.

This creates two financial truths in the UI.

Recovery:

- use capability helper;
- read the canonical `seller_balance` projection;
- if Stripe-connected payout truth supersedes platform balance in a later phase, both desktop and mobile must move together.

### 5. MobileSellerPaymentsPage — CONSOLIDATE (HIGH)

Current surface is a simple Stripe information bridge and does not expose the richer current Seller readiness state.

Recovery:

- keep Stripe-only payment boundary;
- surface the same Connect/payment-readiness state as canonical Seller setup/profile;
- do not invent a separate mobile payout state machine.

### 6. MobileSettingsPage — REPAIR (MEDIUM)

Good: uses `hasSellerAccess`.

Needs review:

- seller links often jump into desktop Seller shell pages;
- this is functionally acceptable only if those surfaces are fully responsive and preserve mobile navigation context.

Recovery:

- keep shared destinations where responsive;
- only retain standalone mobile pages when they provide real mobile UX value without duplicating commercial logic.

### 7. MobileOrdersPage — KEEP + REPAIR ROUTING (MEDIUM)

Good/current behaviour:

- buyer order history uses authoritative commercial/product snapshots when present;
- handles push deep-link highlighting;
- order status grouping is reasonably current.

Problem:

- the generic `/orders` route is buyer-oriented but is linked from seller mobile profile too.

Recovery:

- keep buyer implementation;
- stop routing seller users here as their Seller Orders surface.

### 8. MobileFavouritesPage — KEEP + CONTRACT CHECK (LOW/MEDIUM)

Uses wishlist product IDs and live products.

Recovery:

- retain unless product availability semantics require shared adapter logic;
- verify visible-but-not-purchasable listings are presented consistently with canonical catalog/product detail.

### 9. MobileNotificationsPage — KEEP (LOW)

Positive findings:

- uses shared notification normalisation/query types;
- scoped reads/writes to current user;
- realtime refresh, archive and delete are present.

Recovery:

- visual parity only unless notification taxonomy changes.

### 10. MobileInboxPage / MobileChatPage — KEEP + CONSOLIDATE DATA HELPERS (MEDIUM)

Positive findings:

- RLS-backed queries;
- session verification;
- conversation-participant verification;
- realtime messaging/read state;
- current product/message handling.

Recovery:

- reduce duplicated data-enrichment logic where canonical Seller/Buyer messages already expose shared helpers;
- remove excessive production debug logging after recovery validation;
- preserve participant and RLS checks.

### 11. MobileSecurityPage — REPAIR / CONSOLIDATE (MEDIUM)

Current mobile page directly performs Supabase Auth email/password updates.

Recovery:

- compare against current canonical account-security contract before keeping direct calls;
- do not advertise placeholder/unsupported 2FA behaviour;
- shared password/email policy must be identical on web and mobile.

### 12. MobileCategoriesPage — KEEP

Recent implementation uses canonical taxonomy/category hooks and editorial navigation imagery. This is a good standalone mobile presentation that does not duplicate a commercial state machine.

## Test coverage finding

Current dedicated mobile seller test coverage is materially stale:

`src/__tests__/mobile-sell-tax-draft-fallback.test.ts` explicitly asserts the old tax-publication fallback and old tax-setup success copy. This test now protects behaviour that the canonical backend contract intentionally retired.

Recovery tests must instead lock:

- mobile publication does not fall back to Draft solely for missing tax evidence;
- checkout/payment tax boundaries remain present server-side;
- mobile and desktop share the same image optimisation limits;
- gallery selection is not camera-forced;
- seller mobile navigation routes Seller Orders correctly;
- seller balance reads canonical `seller_balance`;
- `/sell` has the same catalogue-authorisation exception as canonical create/edit.

## Implementation order

### Gate A — Sell contract recovery

- shared image processing/upload helper;
- mobile gallery + camera-choice behaviour;
- remove legacy tax-publication fallback/copy;
- align image count;
- truthful live vs purchase-ready messaging;
- `/sell` catalogue access parity;
- replace obsolete mobile tax fallback test with parity tests.

### Gate B — Seller mobile identity/navigation recovery

- MobileProfile capability semantics;
- Seller Orders routing;
- MobileBalance canonical data source;
- Seller Payments readiness parity.

### Gate C — Buyer/mobile shared surfaces

- Orders/Favourites consistency;
- notifications;
- messaging/shared helpers;
- security parity.

### Gate D — E2E

For one Marketplace Seller account and one Buyer-capable context, validate the same product and account on desktop + mobile:

1. choose existing phone photo from gallery;
2. optional take-photo path;
3. large photo optimised automatically;
4. create live listing without owner approval or tax-publication gate;
5. listing visible in catalogue;
6. checkout remains unavailable until payment/tax readiness is satisfied;
7. edit listing from mobile and desktop without data loss;
8. Seller Orders opens seller orders, not buyer orders;
9. balances/payment state match desktop;
10. inbox/notifications deep links remain valid.

## Current status

- Audit: PASS / fragmentation confirmed.
- Main branch: intentionally not modified by this audit checkpoint.
- Recovery branch: created from `bb9b5ea2e91fd15b2f219e7a25381b79ef714f2b`.
- Next action: Gate A implementation on this branch; no merge until parity tests and real mobile E2E pass.
