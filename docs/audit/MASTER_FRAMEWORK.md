# Loadify Market — Audit Master Framework

**Purpose:** replace one-off audits with a repeatable audit system for this repository.  
**Scope:** React SPA, Netlify functions, Supabase schema/RLS, mobile APK, payments, SEO, and production telemetry.

---

## 1. Operating principle

This repository should no longer treat "audit" as a vague request. Every audit must be mapped to:

1. a fixed **surface area**
2. a fixed **defect taxonomy**
3. a fixed **audit level**
4. a fixed **evidence set**
5. a fixed **owner lane**

If a flow is not represented in the coverage matrix, it is considered **uncontrolled**.

---

## 2. Current control baseline already present in the repo

| Layer | Current controls already implemented | Evidence |
|---|---|---|
| L0 — Build integrity | Lint, typecheck, unit tests, production build, migration inventory check | `.github/workflows/ci.yml` |
| L1 — Unit/integration guardrails | Vitest test suite for shared libs and critical Netlify functions | `src/lib/__tests__/`, `src/components/product/ProductInfo.test.tsx`, `netlify/functions/__tests__/` |
| L2 — Critical smoke coverage | CI smoke set for register, checkout, payment safety, webhook commission flow | `.github/workflows/ci.yml` |
| L3 — Security / permissions / schema | RLS migrations, schema audit, CSP, auth and rate-limit controls | `supabase/FULL_SCHEMA_AUDIT.sql`, `supabase/VERIFY_migration_health.sql`, `netlify/functions/csp-report.ts`, `netlify.toml` |
| L4 — Production telemetry | Health checks, client error reporting, CSP reporting, Stripe event persistence | `netlify/functions/health.ts`, `netlify/functions/error-report.ts`, `netlify/functions/csp-report.ts`, `docs/ERROR-HANDLING.md` |

**Current blind spot:** coverage is concentrated in CI/build and a small number of backend flows; many UI and cross-role journeys still have limited direct automated evidence.

---

## 3. Audit surfaces and owner lanes

| Surface | What belongs here | Default owner lane |
|---|---|---|
| Public frontend | Home, catalog, product, auth, legal, contact, FAQ | Frontend Public |
| Buyer journeys | Cart, checkout, orders, messages, RFQ, disputes, profile | Frontend Buyer |
| Seller journeys | Onboarding, product CRUD, orders, shipments, returns, settings | Frontend Seller |
| Admin journeys | Approvals, moderation, support, disputes, settings | Frontend Admin |
| Netlify functions | Registration, checkout, webhooks, chat, support, feeds, health | Platform API |
| Supabase schema / RLS / RPC | Tables, policies, storage, migrations, security-definer functions | Data / Security |
| Mobile APK / Capacitor | Deep links, native routing, function calls, APK-specific fetch behavior | Mobile Platform |
| Payments / Stripe | Checkout, payment intents, webhooks, refunds, payouts, connect | Payments |
| Email / notifications | SendGrid templates, notification rows, push/email delivery | Platform Messaging |
| SEO / discovery | Sitemap, product feed, page metadata, rendering for crawlers | SEO / Growth |
| Security / telemetry | CSP, error capture, health probes, rate limits, headers | Security / Observability |

Owner lanes do not need to name a person in the document; they must at least name a domain responsible for triage and follow-up.

---

## 4. Defect taxonomy

Every finding must be tagged with one primary defect class:

| Code | Defect class | Typical examples |
|---|---|---|
| F | Functional | broken route, failed action, bad redirect, missing state transition |
| S | Security | auth bypass, weak headers, unsafe upload, exposed secret, injection risk |
| P | Permissions / RLS | wrong access scope, missing policy, seller/admin escalation |
| D | Data / migrations | missing table, broken trigger, drift between code and schema |
| U | UX / edge case | unusable mobile state, blank screen, stuck loading, missing empty state |
| R | Reliability / performance | flaky build, failing async flow, slow page, race condition |
| X | SEO / indexability | missing sitemap coverage, broken metadata, crawler rendering issue |
| O | Observability | missing logs, no error capture, no alertable signal, no health evidence |

Every audit report should also include a severity:

- **P0** — money, auth, order integrity, security, irreversible data loss
- **P1** — critical business flow blocked or trust materially degraded
- **P2** — important but non-blocking gap
- **P3** — hygiene or optimization

---

## 5. Audit levels

Every finding must say where it was discovered:

| Level | Description | Evidence source |
|---|---|---|
| L0 | Build, lint, typecheck, import, config integrity | CI jobs, local validation |
| L1 | Unit/integration tests for functions, utilities, isolated components | Vitest |
| L2 | Smoke coverage for critical end-to-end journeys | CI smoke suite, scripted scenario checks |
| L3 | Security / permissions / schema review | RLS audit, SQL audit, header/CSP review, auth review |
| L4 | Live production behavior | `health`, `error-report`, `csp-report`, Stripe/admin event logs |

If an audit report does not name the audit level, it is incomplete.

---

## 6. Frozen critical-flow inventory

The following flows are mandatory and must remain listed in the coverage matrix:

1. signup / login / reset password
2. create product / edit product
3. catalog / product detail
4. wishlist / chat / offer
5. checkout / payment / webhook
6. buyer orders / seller orders
7. seller onboarding
8. support tickets
9. admin approvals / disputes / settings
10. product feed / sitemap / SEO page rendering

No future audit should replace this list with an ad-hoc one; new flows may be added, but these flows stay frozen.

---

## 7. Required evidence for each critical flow

Each critical flow must carry five evidence columns:

1. **Build evidence** — does the repo compile with this flow present?
2. **Test evidence** — what automated tests directly cover the flow?
3. **Permissions evidence** — what protects access or data scope?
4. **Error-handling evidence** — how does failure surface safely?
5. **Production evidence** — what signal exists when the flow breaks live?

If any evidence column is empty, the flow remains only partially controlled.

---

## 8. Fixed audit batches

Do not request "general audit" without scope. Use one or more fixed batches:

| Batch | Mandatory focus |
|---|---|
| Functional audit | Core route behavior, state transitions, user-visible correctness |
| Security audit | Auth, uploads, secrets, CSP, headers, injection, abuse/rate limits |
| RLS / database audit | Policies, schema drift, migration gaps, RPC safety, storage rules |
| Payments audit | Checkout, payment intents, webhooks, refunds, payout state |
| Mobile APK audit | Capacitor routing, native deep links, authorized function calls |
| SEO / crawlability audit | Sitemap, product feed, metadata, HTML rendering for bots |
| Production telemetry audit | Health, error-report, CSP, Stripe/admin event visibility |

Each audit request should name the batch explicitly and update the same matrix instead of creating a disconnected report.

---

## 9. Definition of done for any fix

A finding is **not closed** until all conditions below are true:

- the code or configuration is fixed
- a test or guardrail was added when feasible
- the related row in `docs/audit/COVERAGE_MATRIX.md` was updated
- the relevant audit level is named
- the relevant owner lane is assigned
- a production signal exists if the issue could recur live

If the change is documentation-only because no safe code change is possible yet, the row must explicitly say **documented gap, not fixed**.

---

## 10. Production signals are mandatory inputs

Production must be treated as a first-class audit source:

| Signal | Use in audits |
|---|---|
| `/.netlify/functions/health` | environment and database readiness snapshot |
| `/.netlify/functions/error-report` | client-side runtime failures and broken user journeys |
| `/.netlify/functions/csp-report` | live browser security-policy violations |
| `stripe_events` and related admin views | payment/webhook failure history |

An audit that ignores production signals can only prove code quality, not runtime quality.

---

## 11. Operating workflow

1. Choose a fixed audit batch.
2. Review the affected rows in the coverage matrix.
3. Collect evidence by audit level (L0-L4).
4. Record findings with defect class and severity.
5. Fix the issue.
6. Add or strengthen a guardrail.
7. Update the same matrix row.
8. Re-check production signals after deploy when applicable.

---

## 12. Success criteria

This framework is working when:

- new audits mostly confirm existing matrix rows instead of discovering undocumented surfaces
- regressions are caught at L0-L2 before production
- security and RLS issues are tagged consistently at L3
- production issues arrive through L4 signals rather than user surprise
- the team stops finding the same class of issue repeatedly without adding new controls
