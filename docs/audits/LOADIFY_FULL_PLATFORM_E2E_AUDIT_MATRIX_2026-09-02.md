# Loadify Market — Full Platform E2E Audit Matrix

Date: 2026-09-02
Branch: `audit/full-platform-e2e-20260902`
Baseline main: `1f512abaf2425dc22a5cb24017fadf03a5b59188`
Status: IN PROGRESS / NO ASSUMED PASS

## Evidence standard

A feature is not PASS because a route/component/function exists. PASS requires the strongest available evidence for the layer under test: source contract, route/guard wiring, server/database boundary, automated execution and/or runtime probe. Where credentials, seeded data, Stripe test mode, provider evidence or hosted database access are required and absent, status stays BLOCKED/NOT EXECUTED rather than being inferred.

## Release / deployment baseline

- Main integration commit: `1f512abaf2425dc22a5cb24017fadf03a5b59188`.
- Presentation PR #724 is closed after squash-equivalent integration into main; its source tree matched the integrated main tree at integration time.
- Production Netlify status for the integrated main commit has not yet appeared in GitHub status API. Therefore Production deploy is NOT YET CONFIRMED PASS.
- Audit work is isolated on `audit/full-platform-e2e-20260902`.

## Domain 1 — Public presentation / corporate shell

Status: SOURCE AUDIT STARTED / RUNTIME E2E NOT YET EXECUTED

Confirmed from current route architecture:
- Corporate root `/` is separated from marketplace entry `/marketplace`.
- Presentation routes are wired for `/platform`, `/buyers`, `/sellers`, `/business`, `/trade`, `/suppliers`, `/technology`, `/integrations`, `/partners`, `/developers`, `/how-it-works`, `/trust`.
- Presentation header exposes Platform, Buyers, Sellers, Business, Technology, Partners, How It Works, Trust.
- Corporate Marketplace CTA targets `/marketplace`.
- Business and Technology use separate contextual section navigation.
- Corporate footer Start Selling targets `/register?type=seller`.
- Contact enquiry topics now include partnership, problem, supplier, integration and technology.

Still required before PASS:
- Runtime click-through of every header, footer, card, CTA and contextual-nav item.
- Verify each destination renders the intended page rather than merely resolving a route.
- Verify browser back/forward and route focus behaviour.
- Verify mobile corporate drawer preserves all eight primary destinations and closes correctly.
- Verify corporate ↔ marketplace shell transition does not leak the wrong header/footer.
- Verify no broken anchors, dead controls or wrong labels remain.

## Domain 2 — Marketplace public surface

Status: NOT YET E2E EXECUTED

Source confirms a dedicated `MarketplaceHomePage` and marketplace header/drawer with catalogue, category, cart, seller registration, help and platform transition routes. Runtime validation is still required for search, category/subcategory navigation, product cards, product detail, cart, deals, seller storefront, tracking and public support/legal routes.

## Domain 3 — Authentication / role isolation

Status: PARTIAL AUTOMATED COVERAGE EXISTS / EXECUTION NOT YET PROVEN FOR THIS AUDIT

Existing Playwright coverage:
- Guest is expected to be redirected from `/buyer`, `/seller`, `/admin` to `/login?next=...`.
- Unauthenticated `admin-orders` is expected to return 401.
- Unauthenticated `seller-order-status` mutation is expected to return 401 before order lookup.
- With configured credentials, Buyer should reach Buyer Orders and Checkout while being rejected by admin API with 403.
- With configured credentials, Seller should reach Seller Orders and Shipments.
- With configured foreign order fixture, Seller cross-tenant mutation should return 403.
- With configured credentials, Admin should reach Admin Orders and Payouts.

Important coverage gaps:
- Existing E2E tests skip credential-dependent tests when secrets are not configured. A green suite can therefore be mostly skips unless test output is inspected.
- No current E2E proof yet for registration, email confirmation, logout, Google/OAuth, password reset, inactive-account handling or seller activation transition.
- No current E2E proof yet for Buyer/Seller/Admin cross-role UI route isolation beyond the limited cases above.

## Domain 4 — Buyer workspace

Status: NOT YET E2E EXECUTED

Routes exist for Buyer dashboard, orders, wishlist, addresses, payments, reviews, profile, settings, notifications, messages and disputes. Each remains unverified until data loading, empty/error states, mutations and authorization boundaries are exercised.

## Domain 5 — Seller onboarding / workspace

Status: NOT YET E2E EXECUTED

Routes exist for onboarding, seller setup bridge, products, product create/edit, orders, shipments, returns, reviews, settings, notifications, messages and profile. Required E2E includes seller-start activation, legal type, verification/readiness, email-verification gate, listing create/edit, order ownership, shipment mutation, return workflow, Stripe Connect setup/return path and payout readiness.

## Domain 6 — Trade account

Status: CONFIRMED DEFECT + FURTHER AUDIT REQUIRED

Confirmed defect:
- `src/pages/pixel-perfect/TradeAccount.tsx` still contains placeholder telephone `+44 (0) 20 0000 0000` and generic social destinations, while canonical Loadify contact/social facts already exist elsewhere in the repository.

Canonical repository-backed facts found:
- Facebook: `https://www.facebook.com/profile.php?id=61583570176707`
- X: `https://x.com/loadifymarket`
- Instagram: `https://www.instagram.com/loadifymarket`
- TikTok: `https://www.tiktok.com/@loadifymarket`
- LinkedIn: `https://www.linkedin.com/company/loadify-market`
- Email: `contact@loadifymarket.co.uk`
- Telephone: `+44 7423 272138`
- Company: XDrive Logistics Ltd, Company No. 13171804, VAT GB375949535.

Required next:
- Replace placeholders from canonical repo-backed source, not invented values.
- Test Trade registration validation, intent creation, Supabase signup, email confirmation and Buyer Space destination.

## Domain 7 — Payments / order lifecycle

Status: NOT YET E2E EXECUTED

No payment mutation will be run against live funds. Audit must identify checkout/session creation, Stripe webhook handling, order creation/idempotency, allocation, success/error routes, refunds/disputes/returns boundaries, seller payout eligibility and reconciliation. Mutation tests must use explicit Stripe test-mode + seeded fixtures or remain BLOCKED.

## Domain 8 — Admin

Status: NOT YET E2E EXECUTED

Current router exposes Admin dashboard, users, buyers, approvals, products, orders, flagged, reports, support, settings, notifications, payouts, Stripe events and disputes. Access-control and each server-backed operation remain unverified.

## Domain 9 — Messaging / notifications

Status: NOT YET E2E EXECUTED

Buyer/Seller messages and notifications plus mobile inbox/chat and push registration exist in source. Need role visibility, read state, thread ownership, push token registration and deep-link validation.

## Domain 10 — Mobile / Capacitor

Status: COVERAGE GAP CONFIRMED

Current Playwright config defines only Desktop Chrome. Therefore current E2E infrastructure does not provide a mobile browser project. Mobile layouts/navigation, mobile sell wizard, orders/profile/inbox, Android deep links and push handling require explicit mobile/Capacitor validation rather than inheriting desktop PASS.

## Domain 11 — Netlify functions

Status: INVENTORY STARTED / NOT YET FUNCTION-BY-FUNCTION AUDITED

Repository contains extensive server functions including admin order/seller/provider/supplier-commerce functions. Required audit per endpoint: authentication, authorization, tenant/owner boundary, input validation, abuse/rate controls where applicable, idempotency, error semantics and database/Stripe side effects.

## Domain 12 — Supabase / migrations / RLS

Status: NOT YET EXECUTED

Required: migration inventory, clean replay/health, schema-to-code contract, RLS policies, role isolation, triggers/functions and hosted-state read-only comparison. No production mutation is authorized as part of audit.

## Domain 13 — Supplier Commerce

Status: FAIL-CLOSED POLICY PRESERVED / E2E ACTIVATION NOT ALLOWED WITHOUT EVIDENCE

Provider-specific writes, PII disclosure, order creation, tracking, cancellation or refund activation must remain off unless exact provider capability and authorization evidence is verified. Audit will test fail-closed behaviour rather than simulate readiness.

## Domain 14 — Company / trust / legal / SEO / accessibility

Status: PARTIAL SOURCE AUDIT / RUNTIME NOT YET EXECUTED

Canonical company/contact/social data exists in repository. Placeholder/conflict scan is required across all public/auth/workspace pages. Legal-route existence, metadata/canonicals, sitemap/robots/structured data, keyboard focus, drawer focus trap and 404/error handling remain to be checked end-to-end.

## Domain 15 — Test / release gates

Status: INFRASTRUCTURE IDENTIFIED / EXECUTION NOT YET PROVEN

`package.json` defines:
- `typecheck`
- `lint`
- `test`
- `verify:migrations`
- `e2e:setup`
- `e2e:typecheck`
- `e2e`
- `build`
- aggregate `verify:local`

Playwright requires `E2E_BASE_URL` or `DEPLOY_PRIME_URL`; it uses Desktop Chrome only. Credential-dependent role tests are designed to skip when their environment variables are absent. Therefore final audit must record PASS/FAIL/SKIP counts and must never report E2E PASS from process exit code alone.

## Next execution order

1. Repair Trade Account canonical contact/social defect on audit branch.
2. Build exhaustive route/action inventory from `App.tsx`, presentation pages, marketplace shell, Buyer/Seller/Admin shells and Netlify functions.
3. Expand Playwright coverage for public presentation/marketplace link integrity and explicit mobile viewport navigation.
4. Audit auth/onboarding source-to-server-to-database contracts.
5. Audit Stripe/order lifecycle without live-fund mutation.
6. Audit migrations/RLS/hosted DB read-only state.
7. Execute available test gates and record exact pass/fail/skip evidence.
8. Repair defects on isolated audit branch, re-run targeted tests, then release-gate each repair separately.
