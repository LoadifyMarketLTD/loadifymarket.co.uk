# Loadify Market

> ## ⚠️ MANDATORY AGENT ENTRYPOINT
> Every coding agent, reviewer, designer, auditor or implementation worker must read [`AGENTS.md`](./AGENTS.md) **before making changes**.
>
> For Supplier Commerce / product-model work, also read [`docs/canonical/loadify-supplier-commerce-2026-08-19/README.md`](./docs/canonical/loadify-supplier-commerce-2026-08-19/README.md) and follow its exact controlling read order.
>
> **Historical README text, old PR descriptions and stale branches do not override the canonical contract or current repository truth.**

Loadify Market is a UK-operated commerce platform under XDrive Logistics Ltd (Co. No. 13171804, VAT GB375949535).

The controlling product direction is not a simple seller-only marketplace and not a generic dropshipping site:

**LOADIFY MARKET = MARKETPLACE + LOADIFY-OPERATED PRODUCT SOURCING / IMPORT + SUPPLIER-FULFILLED COMMERCE + PRODUCT DISCOVERY / OPPORTUNITY INTELLIGENCE + AI PRODUCT BUILDER + CANONICAL COMMERCE CONTROL.**

The intended customer-facing experience remains Loadify-centric:

**discover → product → cart → checkout → payment → order → tracking → support → returns/refunds**

while marketplace sellers, approved suppliers, fulfilment providers and carriers may perform distinct underlying roles according to the controlling business contract.

Loadify does not require its own warehouse for Supplier-Fulfilled Commerce. No warehouse does not mean no governance or no responsibility.

---

## Current controlling execution boundary

The canonical sequence is:

**CRITICAL FOUNDATION → CHECKPOINT A → ATOMIC CHECKPOINT A PASS → FOUNDATION BASELINE FREEZE → HARD STOP OLD EXTENSIVE HARDENING → GATE B BUSINESS CONTRACT → GATE B PASS → PHASE C → Q.**

Checkpoint A and Foundation Baseline Freeze are recorded historical gates. The next controlling business gate is **Gate B**, unless a newer canonical clarification explicitly supersedes this.

**No Supplier Commerce migration/runtime implementation is authorised before Gate B PASS.**

Prepared implementation planning exists on branch `parallel/supplier-commerce-preparation` under `docs/parallel/supplier-commerce-preparation/`. Read that branch's `README.md` and then `33_PRODUCT_DIRECTION_RECONCILIATION_2026-08-20.md`. Canonical always wins over preparation artifacts.

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

## Documentation

| Doc | Purpose |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | Mandatory agent operating contract, responsibilities, product direction and Branch Guard rules |
| [`docs/canonical/loadify-supplier-commerce-2026-08-19/README.md`](./docs/canonical/loadify-supplier-commerce-2026-08-19/README.md) | Controlling Supplier Commerce contract read order and execution boundary |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Existing system architecture and domain model |
| [`docs/openapi.yaml`](./docs/openapi.yaml) | API reference |
| [`docs/SHIPPING.md`](./docs/SHIPPING.md) | Shipment and tracking system |
| [`docs/audit/MASTER_FRAMEWORK.md`](./docs/audit/MASTER_FRAMEWORK.md) | Audit operating model and evidence standards |
| [`docs/audit/COVERAGE_MATRIX.md`](./docs/audit/COVERAGE_MATRIX.md) | Critical-flow coverage and control gaps |

---

## Existing platform surfaces

### Buyers

Current repository capabilities include product browsing/search, checkout/payment flows, buyer accounts, order history/tracking, messaging/RFQ-related functionality, reviews, wishlist/saved-search style features, and return/dispute surfaces. Treat current implementation as repository state to verify, not as permission to invent unsupported future claims.

### Sellers

Current repository capabilities include seller onboarding/account lifecycle, product listing/stock management, order handling, shipment/tracking flows, Stripe Connect payout integration, marketplace communication and return/dispute-related functionality.

### Admin

Current repository capabilities include seller and product governance, platform order/user management, dispute/support surfaces and platform analytics. **Do not redesign Workspace or Super Admin merely as collateral to another implementation.**

---

## Commerce / tax warning

Do not rely on legacy README statements as a tax, VAT, commission, Merchant-of-Record, invoice or fulfilment contract.

Those matters must follow the controlling Gate B/canonical evidence and current verified implementation. In particular, do not assume universal 20% VAT, automatic reverse charge, a universal seller-only fulfilment model, or any other historical shortcut without current evidence.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| API | Supabase PostgREST + Netlify Functions |
| Payments | Stripe Checkout + Stripe Connect Express |
| Email | SendGrid |
| Hosting | Netlify |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

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

For database changes, `supabase/migrations/` is the authoritative ordered migration source. Do not run `supabase/00_consolidated_schema.sql`; it is a deprecated non-executable tombstone.

---

## Development commands

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:watch
```

Local Netlify Functions:

```bash
npm install -g netlify-cli
netlify dev
```

---

## Key project structure

```text
├── AGENTS.md                       # Mandatory agent entrypoint
├── src/
│   ├── pages/pixel-perfect/        # Strong existing UI benchmark surfaces
│   │   ├── seller/
│   │   ├── buyer/
│   │   └── admin/
│   ├── components/
│   └── lib/
├── netlify/functions/              # Serverless API handlers
├── supabase/migrations/            # Authoritative ordered DB migrations
├── docs/
│   ├── canonical/                  # Controlling product/execution contracts
│   ├── audit/
│   ├── ARCHITECTURE.md
│   └── openapi.yaml
└── public/
```

---

## Branch / release discipline

Before writes, inspect current `main`, relevant branch HEAD, open PRs, relevant concurrent branches and migration head when applicable.

Before merge, inspect exact diff, branch staleness, unrelated changes, integration risk and real evidence.

No Fake PASS. A documented claim is not a test. A preview is not visual approval. CI that did not execute steps is not evidence of a software failure or PASS.

The default loop is:

**READ REAL STATE → UNDERSTAND PRODUCT INTENT → IDENTIFY ROOT CAUSE → DESIGN CORRECT SOLUTION → IMPLEMENT → VERIFY TECHNICALLY → VERIFY VISUALLY IF UI → VERIFY INTEGRATION → BRANCH GUARD → FIX REGRESSIONS → DOCUMENT REAL EVIDENCE → ONLY THEN DECLARE COMPLETE.**

---

## Deployment

The project deploys to Netlify according to `netlify.toml`. Production environment variables include Supabase, Stripe and other server-side credentials. Never expose server secrets to client code.

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
- fail-closed behaviour for security and money-related paths.

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
