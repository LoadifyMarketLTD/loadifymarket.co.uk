# Loadify Market — Coverage Matrix

**Purpose:** single source of truth for critical-flow audit coverage.  
**Status key:** ✅ covered · 🟡 partial · ❌ missing

---

## 1. Critical-flow matrix

| Critical flow | Primary surface | Build evidence | Test evidence | Permissions evidence | Error-handling evidence | Production evidence | Owner lane | Current status | Priority | Current gap summary |
|---|---|---|---|---|---|---|---|---|---|---|
| Signup / login / reset password | Public frontend + auth | ✅ CI lint/typecheck/build in `.github/workflows/ci.yml` | 🟡 `netlify/functions/__tests__/register.test.ts`; no direct login/reset UI tests | 🟡 route guards in `src/App.tsx`, auth wrappers in `src/components/auth/` | 🟡 global `ErrorBoundary` and `error-report`, but no flow-specific auth telemetry | 🟡 `error-report` can capture client failures; no dedicated auth health probe | Frontend Public + Platform API | 🟡 | P0 | Registration is tested, but login/reset-password journeys do not have direct smoke coverage |
| Create product / edit product | Seller journeys | ✅ CI build validates seller product pages compile | ❌ no direct ProductForm automated tests found | ✅ seller-only guards in `src/App.tsx` via `RequireSeller` + `RequireEmailVerified` | 🟡 generic error boundary only; no product-CRUD failure assertions | 🟡 generic client error reporting only | Frontend Seller | 🟡 | P0 | Product CRUD is business-critical but currently lacks direct automated tests and explicit telemetry |
| Catalog / product detail | Public frontend | ✅ CI build validates routes | 🟡 `src/components/product/ProductInfo.test.tsx`; no catalog/page-level smoke test | ✅ public read path with route wiring in `src/App.tsx` | 🟡 generic error boundary only | 🟡 client error reporting; no route-specific search/detail telemetry | Frontend Public | 🟡 | P1 | Product CTA component is tested, but browse/search/detail journey coverage is still thin |
| Wishlist / chat / offer | Buyer + seller messaging | ✅ CI build validates message/offer UI and functions compile | ❌ no direct tests found for wishlist, chat creation, or offer flow | 🟡 auth gating exists and conversation creation is routed through functions | 🟡 generic error capture only | 🟡 notifications and error reports exist, but no explicit journey-level monitoring | Frontend Buyer / Seller + Platform Messaging | ❌ | P0 | Messaging and offer flows are high-risk and currently under-tested |
| Checkout / payment / webhook | Buyer + payments | ✅ CI lint/typecheck/build + `smoke-critical` | ✅ `create-checkout.test.ts`, `create-payment-intent.test.ts`, `checkout-safety.test.ts`, `stripe-webhook-commission.test.ts` | ✅ auth-protected checkout route, Stripe webhook verification, rate limits | ✅ documented consistent function errors and Stripe failure handling in `docs/ERROR-HANDLING.md` | ✅ Stripe event persistence, Netlify logs, client error reporting | Payments | ✅ | P0 | Strongest-controlled critical flow in the repo today |
| Buyer orders / seller orders | Buyer + seller dashboards | ✅ CI build validates pages compile | ❌ no direct automated tests found | ✅ role-based route protection in `src/App.tsx` | 🟡 generic UI boundary only | 🟡 generic client error reporting; no explicit order-flow telemetry document | Frontend Buyer / Seller | 🟡 | P1 | Order dashboards exist but lack direct evidence beyond build success |
| Seller onboarding | Seller journeys + Stripe Connect | ✅ CI build validates onboarding pages compile | 🟡 registration and checkout safety tests touch adjacent onboarding/payment states; no direct onboarding page test | ✅ `RequireSellerAny`, `RequireEmailVerified`, seller lifecycle migrations | 🟡 generic error boundary only | 🟡 health can reveal env/db issues; no onboarding-specific telemetry | Frontend Seller + Payments | 🟡 | P0 | Seller onboarding is central to supply growth but lacks direct scenario coverage |
| Support tickets | Support / Netlify function | ✅ CI build validates contact/support code compiles | ❌ no direct support-ticket tests found | ✅ support flow routed through `/.netlify/functions/support-ticket-create` with RLS restriction and rate-limits | 🟡 function-level validation exists, but no automated assertions present | 🟡 generic error reporting only | Platform API + Frontend Public | 🟡 | P1 | Control design exists, but coverage proof is missing because the flow is not directly tested |
| Admin approvals / disputes / settings | Admin journeys | ✅ CI build validates admin pages compile | ❌ no direct admin-flow tests found | ✅ admin access enforced with `RequireAdmin` / `hasAdminAccess` | 🟡 generic error boundary only | 🟡 production evidence depends on logs and user reports; no explicit admin telemetry matrix | Frontend Admin + Security | 🟡 | P0 | Admin flows are privileged and sensitive but have little direct automated evidence |
| Product feed / sitemap / SEO rendering | SEO / Netlify functions / edge | ✅ CI build validates routes and functions compile | ❌ no direct tests found for `product-feed`, `sitemap`, or page metadata rendering | 🟡 public endpoints; protection is mostly correctness rather than auth | 🟡 failures would surface through generic function logs | 🟡 function logs exist; no SEO health or crawlability assertions in CI | SEO / Growth + Platform API | ❌ | P1 | Discovery surfaces are implemented but not yet controlled by dedicated automated checks |

---

## 2. Cross-cutting control matrix

| Control area | Current state | Evidence | Gap |
|---|---|---|---|
| L0 build integrity | ✅ | `.github/workflows/ci.yml` | none |
| L1 unit/integration | 🟡 | Vitest covers selected libs/functions only | expand direct flow coverage |
| L2 smoke coverage | 🟡 | `smoke-critical` focuses on payments/auth backend | add UI and role-based journey smokes |
| L3 security / RLS / schema | 🟡 | `FULL_SCHEMA_AUDIT.sql`, migration health, CSP, rate limits | keep mapping findings back to flows |
| L4 production telemetry | 🟡 | `health`, `error-report`, `csp-report`, Stripe events | add flow-oriented interpretation and review cadence |

---

## 3. Rules for updating this matrix

When a new issue is found or fixed:

1. update the affected critical-flow row
2. tag the issue with defect class and level in the audit report
3. change the status only when new evidence exists
4. prefer upgrading evidence over adding new disconnected audit files
5. keep unresolved gaps visible until a real guardrail exists
