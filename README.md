# Loadify Market

> ## ⚠️ MANDATORY AGENT ENTRYPOINT
> Every coding agent, reviewer, designer, auditor or implementation worker must read [`AGENTS.md`](./AGENTS.md) **before making changes**.
>
> For Supplier Commerce / product-model work, also read [`docs/canonical/loadify-supplier-commerce-2026-08-19/README.md`](./docs/canonical/loadify-supplier-commerce-2026-08-19/README.md) and follow its exact controlling read order.
>
> **Historical README text, old PR descriptions, legacy design documents and stale branches do not override the canonical contract, current repository state or current production evidence.**

Loadify Market is a UK-operated commerce platform under XDrive Logistics Ltd (Co. No. 13171804, VAT GB375949535).

The controlling product direction is not a simple seller-only marketplace and not a generic dropshipping site:

**LOADIFY MARKET = MARKETPLACE + LOADIFY-OPERATED PRODUCT SOURCING / IMPORT + SUPPLIER-FULFILLED COMMERCE + PRODUCT DISCOVERY / OPPORTUNITY INTELLIGENCE + AI PRODUCT BUILDER + CANONICAL COMMERCE CONTROL.**

The intended customer-facing experience remains Loadify-centric:

**discover → product → cart → checkout → payment → order → tracking → support → returns/refunds**

while marketplace sellers, approved suppliers, fulfilment providers and carriers may perform distinct underlying roles according to the controlling business contract.

Loadify does not require its own warehouse for Supplier-Fulfilled Commerce. No warehouse does not mean no governance or no responsibility.

---

## Current controlling execution boundary

The canonical sequence remains:

**CRITICAL FOUNDATION → CHECKPOINT A → ATOMIC CHECKPOINT A PASS → FOUNDATION BASELINE FREEZE → HARD STOP OLD EXTENSIVE HARDENING → GATE B BUSINESS CONTRACT → GATE B PASS → PHASE C → Q.**

Current canonical status on `main`:

- Checkpoint A and Foundation Baseline Freeze are historical completed gates;
- Gate B Business Contract and Gate B PASS are completed;
- Phases C through N are completed according to the canonical evidence ledger;
- **current canonical execution phase: PHASE O — CONTROLLED PILOT**;
- remaining sequence: **O → P → Q**.

Do not use the obsolete statement that Gate B is the next business gate. Before any Phase O/P/Q write, read the controlling canonical README and `10_CANONICAL_CONTINUATION_PLAN_PHASE_O_TO_Q_2026-08-21.md`, then verify current GitHub, Supabase and provider evidence.

A Phase O label does not itself mean a provider, pilot, sales channel or production mutation is approved. Activation remains capability-, evidence- and gate-dependent.

---

## Core architecture invariants

- one canonical product may have multiple governed supplier offers;
- canonical product ≠ supplier offer;
- supplier raw stock ≠ Loadify sellable stock;
- payment success ≠ supplier order success;
- customer refund ≠ supplier recovery;
- order completed ≠ financially reconciled;
- one customer order truth;
- one canonical financial truth;
- no provider-specific commerce core;
- no direct operator publish bypass;
- no AI-invented product facts;
- no fake/laundered reviews;
- no unverified assumption of commercial rights to third-party media/UGC;
- no drip-price architecture;
- no silent supplier substitution that changes the customer promise.

External roles are distinct:

**Discovery Source ≠ Catalog Source ≠ Supplier ≠ Fulfilment Provider ≠ Carrier ≠ Sales/Channel Connector.**

---

## Current platform surfaces

### Public platform and marketplace

Current routes include the public Loadify platform, marketplace, buyers, sellers, business/trade, suppliers, technology, integrations, partners, developers, trust and how-it-works surfaces, plus catalogue, product, cart, checkout and legal/support pages.

### Buyers

Current repository capabilities include product browsing/search, checkout/payment flows, buyer accounts, order history/tracking, addresses, payment/account surfaces, messaging, reviews, favourites/wishlist, notifications and return/dispute flows.

### Sellers

Current repository capabilities include seller onboarding/account lifecycle, product listing and stock management, marketplace orders, shipments/tracking, returns, messages, reviews and Stripe Connect/balance/payout-related surfaces.

### Admin

Current repository capabilities include seller/product/user/order governance, moderation, disputes, support, platform settings, notifications, payouts and Stripe-event visibility. **Do not redesign Workspace or Super Admin merely as collateral to another implementation.**

### Supplier Commerce / operator commerce

The repository also contains the governed Supplier Commerce architecture for Loadify-operated sourcing/import, canonical products, supplier offers, supplier-fulfilled commerce, provider capability evidence, product discovery/opportunity intelligence and AI merchandising under AI Facts Lock. Treat current activation/readiness per provider and per capability as evidence-dependent, not implied by architecture existence.

### Native Android scope

The Capacitor Android app is intentionally marketplace-first. Its native navigation and mobile routes focus on Home, Search, Sell, Inbox, Profile, orders, notifications, security, favourites, seller balance/payments and marketplace safety/account flows. Professional public platform sections and web/admin workspaces are not automatically exposed as native-app screens.

---

## Documentation

| Doc | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Mandatory agent operating contract and current phase pointer |
| [`docs/canonical/loadify-supplier-commerce-2026-08-19/README.md`](./docs/canonical/loadify-supplier-commerce-2026-08-19/README.md) | Controlling Supplier Commerce contract read order and execution status |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Current architecture map and current-vs-legacy boundaries |
| [`docs/openapi.yaml`](./docs/openapi.yaml) | API reference; verify against current implementation before relying on volatile details |
| [`docs/SHIPPING.md`](./docs/SHIPPING.md) | Shipping/tracking documentation; verify runtime and current functions for volatile details |
| [`docs/audit/MASTER_FRAMEWORK.md`](./docs/audit/MASTER_FRAMEWORK.md) | Audit operating model and evidence standards |
| [`docs/audit/COVERAGE_MATRIX.md`](./docs/audit/COVERAGE_MATRIX.md) | Critical-flow coverage and control gaps |

Historical documents remain evidence only unless explicitly marked controlling. A date in a filename does not by itself make a document safe to use as current truth.

---

## Commerce / tax warning

Do not rely on legacy README statements, old architecture notes or historical design plans as a tax, VAT, commission, Merchant-of-Record, invoice or fulfilment contract.

Those matters must follow the controlling canonical business contract, current code and current verified production evidence. In particular, do not assume universal 20% VAT, automatic reverse charge, universal seller-only fulfilment, immediate transfer timing, fixed payout schedules or historical promotional claims without current evidence.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| API | Supabase PostgREST + Netlify Functions |
| Payments | Stripe Checkout + Stripe Connect |
| Email | SendGrid plus Supabase Auth email where applicable |
| Hosting | Netlify |
| Mobile | Capacitor Android |
| Testing | Vitest + Playwright |

---

## Quick start

```bash
git clone https://github.com/LoadifyMarketLTD/loadifymarket.co.uk.git
cd loadifymarket.co.uk
npm install
cp .env.example .env
npm run dev
```

Set the required development environment variables in `.env`.

For database changes, `supabase/migrations/` is the authoritative ordered migration source. Do not treat legacy numbered SQL copies or historical schema/audit files as a substitute for current migration truth.

---

## Development commands

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm test
npm run verify:migrations
npm run e2e
npm run verify:local
```

Local Netlify Functions can be run through the Netlify CLI when the required development environment is configured.

---

## Key project structure

```text
├── AGENTS.md
├── android/                         # Capacitor Android project
├── src/
│   ├── pages/
│   │   ├── pixel-perfect/
│   │   │   ├── seller/
│   │   │   ├── buyer/
│   │   │   └── admin/
│   │   ├── public/                 # Public platform/business/technology surfaces
│   │   └── Mobile*.tsx             # Native/mobile marketplace surfaces
│   ├── components/
│   ├── hooks/
│   └── lib/
├── netlify/functions/              # Function implementations
├── netlify/functions-modern/       # Netlify runtime wrappers
├── supabase/migrations/            # Authoritative ordered DB migrations
├── docs/
│   ├── canonical/
│   ├── architecture/
│   ├── audit/
│   ├── checkpoints/
│   └── supplier-commerce/
└── public/
```

---

## Branch / release discipline

Before writes, inspect current `main`, relevant branch HEAD, open PRs, relevant concurrent branches and migration head when applicable.

Before merge, inspect exact diff, branch staleness, unrelated changes, integration risk and real evidence.

No Fake PASS. A documented claim is not a test. A preview is not visual approval. Build success is not full business-flow success. A historical PASS does not prove current runtime state.

The default loop is:

**READ REAL STATE → UNDERSTAND PRODUCT INTENT → IDENTIFY ROOT CAUSE → DESIGN CORRECT SOLUTION → IMPLEMENT → VERIFY TECHNICALLY → VERIFY VISUALLY IF UI → VERIFY INTEGRATION → BRANCH GUARD → FIX REGRESSIONS → DOCUMENT REAL EVIDENCE → ONLY THEN DECLARE COMPLETE.**

---

## Deployment

The project deploys to Netlify according to `netlify.toml`. Production environment variables include Supabase, Stripe and other server-side credentials. Never expose server secrets to client code.

Deploy Preview is a validation surface, not proof by itself that production, database state or external provider capability is correct.

---

## Security

Security work must verify, as applicable:

- RLS and multi-tenant isolation;
- auth/session boundaries;
- inactive/suspended accounts;
- service-role access;
- storage permissions;
- webhook verification;
- idempotency/replay protection;
- account capability and privileged Admin boundaries;
- fail-closed behaviour for security, tax and money-related paths.

Repository claims are not a substitute for current runtime evidence.

---

## Company

**XDrive Logistics Ltd**  
Company No. 13171804  
VAT GB375949535  
101 Cornelian Street, Blackburn, BB1 9QL, United Kingdom

---

## License

Copyright © XDrive Logistics Ltd. All rights reserved.
