# LOADIFY MARKET — MANDATORY AGENT ENTRYPOINT

**STOP: every agent, coding assistant, reviewer, designer, auditor or implementation worker entering this repository must read this file before making changes.**

This file defines the minimum operating contract for work on Loadify Market. It does not replace the canonical Supplier Commerce contract. Where anything conflicts, the canonical contract wins.

## 1. What Loadify Market is becoming

Loadify Market is not a simple seller-only marketplace and must not be reduced to a generic dropshipping site.

The controlling product direction is:

**LOADIFY MARKET = MARKETPLACE + LOADIFY-OPERATED PRODUCT SOURCING / IMPORT + SUPPLIER-FULFILLED COMMERCE + PRODUCT DISCOVERY / OPPORTUNITY INTELLIGENCE + AI PRODUCT BUILDER + CANONICAL COMMERCE CONTROL.**

The intended customer-facing model remains Loadify-centric:

**discover → product → cart → checkout → payment → order → tracking → support → returns/refunds**

while approved sellers, suppliers, fulfilment providers and carriers may perform distinct underlying roles according to the controlling business contract.

Loadify does not require its own warehouse for Supplier-Fulfilled Commerce, but **no warehouse does not mean no responsibility or no governance**.

Core invariants:

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
- no fake or laundered reviews;
- no assumption of commercial rights to third-party media/UGC;
- no drip-price architecture;
- no silent supplier substitution that changes the customer promise.

## 2. Mandatory canonical read order and current phase

Before Supplier Commerce, product-model, tax, fulfilment, supplier, marketplace-control or related implementation work, read:

`docs/canonical/loadify-supplier-commerce-2026-08-19/README.md`

**Follow the exact read order maintained in that canonical README. Do not copy a shorter list from this file or from an older handoff.** The canonical README is the maintained pointer and wins if this summary ever drifts.

The canonical execution sequence remains:

**CRITICAL FOUNDATION → CHECKPOINT A → ATOMIC CHECKPOINT A PASS → FOUNDATION BASELINE FREEZE → HARD STOP OLD EXTENSIVE HARDENING → GATE B BUSINESS CONTRACT → GATE B PASS → PHASE C → Q.**

Current status recorded by the controlling canonical README on `main`:

- Checkpoint A and Foundation Baseline Freeze are historical completed gates;
- Gate B Business Contract and Gate B PASS are completed;
- Phases C through N are completed according to the canonical ledger evidence;
- **current canonical execution phase: PHASE O — CONTROLLED PILOT**;
- remaining sequence: **O → P → Q**.

The former statement that “Gate B is the controlling next business gate” is obsolete and must not be used for current decisions.

Before any Phase O/P/Q write, also read:

`docs/canonical/loadify-supplier-commerce-2026-08-19/10_CANONICAL_CONTINUATION_PLAN_PHASE_O_TO_Q_2026-08-21.md`

Then verify live GitHub, Supabase and provider evidence required by the relevant gate. A Phase O label does not itself authorise provider activation, production mutation or a controlled-pilot PASS.

The `parallel/supplier-commerce-preparation` branch and its preparation documents may provide historical implementation context, but they are not independently authoritative over the canonical contract or current repository/runtime evidence.

## 3. Permanent roles expected from an implementation agent

An agent working on Loadify is expected to operate, as relevant to the task, as all of the following:

- Web Developer
- Front-End Developer
- Back-End Developer
- Full-Stack Developer
- Web Designer
- UI/UX Designer
- Software Architect
- Database Engineer
- Security Engineer
- Commerce / Payments Engineer
- QA / Test Engineer
- Release / Integration Engineer
- Product Designer
- Product Engineer
- Technical Decision-Maker
- Loadify Creator / Engineer
- Loadify Branch Guard / Guardian

These roles are cumulative. Do not behave like an isolated ticket worker when the change affects the wider platform.

## 4. Full-stack execution rule

For meaningful features, reason and verify vertically:

**BUSINESS CONTRACT → DATA MODEL → AUTH → API → DATABASE → SIDE EFFECTS → FRONT-END → ADMIN GOVERNANCE → MOBILE IF RELEVANT → ERROR PATHS → E2E → BRANCH GUARD.**

A feature is not complete merely because one layer works.

## 5. Front-end and UI/UX responsibility

Everything the user sees must be treated as a product-quality surface, including homepage, catalogue, product pages, cart, checkout, buyer flows, seller flows, dashboards, forms, responsive behaviour, mobile web, loading states, empty states and errors.

Every UI change must actively control:

- visual hierarchy;
- typography;
- font sizing and line height;
- content width;
- spacing and rhythm;
- padding and margins;
- grid geometry;
- card dimensions;
- radius and borders;
- icon sizing/alignment;
- density and whitespace;
- contrast;
- responsive composition;
- accessibility.

Do not create pages that look like unrelated template blocks placed one after another.

Do not turn an entire page into **card inside card inside card**. Use visual variety intentionally: merchandising grids, product rails, category tiles, split layouts, editorial bands, banners, trust rows and cards only where cards make sense.

## 6. Visual quality benchmark

Loadify's strongest existing dashboard and `pixel-perfect` surfaces are internal quality benchmarks.

A new public-facing surface must not be visibly inferior to the platform's best existing dashboard/UI work.

Verify:

- consistent geometry;
- deliberate typography scale;
- equal padding where intended;
- consistent icon containers;
- controlled content width;
- strong first viewport;
- coherent section rhythm;
- no accidental oversized empty areas;
- no narrow text columns caused by bad grids;
- no uneven card heights where visual equality is intended;
- no generic/template feel.

**Do not modify Workspace or Super Admin visuals merely to borrow their design. Use them as quality references, not as a source of unrelated visual changes.**

## 7. Homepage standard

The homepage is a highest-priority commercial surface of Loadify.

It must answer within seconds:

- What is Loadify?
- What can I buy here?
- Why should I buy here?
- Can I sell here?
- Why should I trust the platform?
- What should I do next?

Evaluate the homepage simultaneously as:

- product;
- commerce;
- visual design;
- UI/UX;
- branding;
- conversion funnel;
- SEO entry point;
- responsive/mobile experience.

A homepage is not acceptable just because it renders or gets a good Lighthouse score. Visual owner review and real UX quality matter.

## 8. Back-end, database and security responsibility

Do not repair front-end symptoms while leaving the root backend cause unresolved.

Protect:

- Supabase schema and migrations;
- authentication and authorization;
- RLS and multi-tenancy;
- suspended/inactive-account boundaries;
- service-role access;
- storage permissions;
- canonical IDs and ownership;
- transactional integrity;
- historical immutability where required;
- production drift;
- webhook verification;
- idempotency and replay protection;
- fail-closed behaviour where security or money is involved.

Never assume live database state when it is relevant. Verify it.

## 9. Commerce and financial truth

Protect one canonical commerce and financial truth.

Do not create parallel ledgers or duplicated payment/order interpretations.

Verify, where relevant:

- checkout;
- Stripe state;
- seller payouts;
- commission/margin;
- invoices;
- VAT/tax/customs decisions;
- refunds;
- supplier recovery;
- reconciliation;
- landed cost;
- customer price;
- supplier cost;
- immutable commercial history.

Tax/VAT/customs logic must be evidence-driven and fail closed where required. Do not assume a universal 20% VAT rule or reverse charge without the controlling evidence and contract.

## 10. Product sourcing, suppliers and AI

External roles are distinct:

**Discovery Source ≠ Catalog Source ≠ Supplier ≠ Fulfilment Provider ≠ Carrier ≠ Sales/Channel Connector.**

Operator sourcing/import must follow governed flow, not direct writes to live products.

The intended governed pipeline is:

**source → extract → identify product/source → normalize → canonical match/create candidate → variant map → supplier offer → provenance → rights → compliance → landed cost → margin → AI merchandising → review → publish.**

AI Product Builder operates under **AI Facts Lock**:

**VERIFIED FACTS → AI PRESENTATION. NEVER AI INVENTION → PRODUCT FACT.**

## 11. Product Discovery

Product Discovery is recommendation/opportunity intelligence only.

It must not:

- auto-publish products;
- bypass compliance/rights review;
- bypass canonical product matching;
- create a parallel commerce truth;
- block core Supplier Commerce infrastructure.

It starts only after canonical supplier data exists according to the canonical execution contract.

## 12. Branch Guard / Guardian

After every meaningful change:

**CREATOR → IMPLEMENT → BRANCH GUARD → VERIFY → FIX IF NECESSARY → ONLY THEN CONTINUE.**

Branch Guard must check whether the change:

- broke another section or dashboard;
- changed visual direction unintentionally;
- changed business logic outside scope;
- created duplicated truth;
- introduced security risk;
- weakened RLS;
- altered payment behaviour;
- changed migrations unexpectedly;
- conflicts with canonical contracts;
- conflicts with concurrent PRs;
- changes Workspace/Super Admin visuals without explicit need;
- introduces unsupported customer-facing claims;
- creates provider-specific core logic;
- creates a bypass.

If a real P0/P1 is detected: **STOP immediately**, repair/reconcile, then revalidate before continuing downstream work.

## 13. Guardian of other agents

When another agent is working concurrently, independently verify:

- branch;
- commit HEAD;
- exact diff;
- PR scope;
- `main` movement;
- migration head if relevant;
- test evidence;
- conflicts with active work;
- canonical-sequence compliance;
- visual-scope compliance.

Do not trust a PASS claim merely because it is detailed. Repository and runtime evidence win.

## 14. No Fake PASS

Never equate:

- documented with tested;
- unit test with E2E;
- preview exists with visual approval;
- CI failure with `steps=[]` with proven software failure;
- build success with full business-flow success;
- simulator with controlled pilot;
- backup exists with restore tested.

State exactly what was and was not verified.

## 15. Responsive, performance and accessibility standards

Desktop, tablet and mobile are first-class experiences. Do not merely stack desktop on mobile.

Check navigation, hierarchy, typography, touch targets, overflow, grids, spacing, fixed/sticky UI, product density and content order.

Protect performance: image sizing, lazy loading, DOM size, bundle impact, duplicated queries, layout shift and initial load.

Protect accessibility: contrast, keyboard navigation, semantic headings, labels, focus states, image-alt behaviour, readable text and logical navigation order.

## 16. Technical autonomy

Agents are expected to make normal technical decisions autonomously: component structure, API design, state handling, validation, refactoring, type design, error handling, test approach, responsive mechanics and safe implementation details.

Ask the owner only for genuine unresolved business, commercial, legal, brand, product-direction or irreversible high-impact choices.

When possible, provide a recommended option rather than an open-ended technical question.

## 17. Repository and source-of-truth hierarchy

When sources conflict, use:

1. controlling canonical contract;
2. newest controlling canonical clarification;
3. current repository state;
4. current production evidence;
5. verified official external evidence where required;
6. preparation documents;
7. historical plans;
8. assumptions.

Historical README text, old PR descriptions and stale branches do not override current canonical truth.

## 18. Change discipline

Do not:

- restart the project;
- invent a parallel roadmap;
- create unnecessary PRs;
- rewrite working systems without cause;
- redesign unrelated dashboards;
- import unrelated historical UI direction;
- bypass canonical gates;
- write directly to `main` without explicit authorization;
- make production DB changes casually;
- hide uncertainty;
- claim tests that did not run.

Before writes, inspect current `main`, relevant HEAD, open PRs, relevant branches and migration head where relevant.

Before merge, inspect exact diff, staleness, unrelated changes, evidence and integration risk.

## 19. Communication standard

The owner should not carry unnecessary technical burden.

Communicate clearly:

- what was found;
- what it means;
- what changed;
- what remains;
- what is blocked;
- what evidence exists.

If instructed to work autonomously until completion, do not send fragmented progress reports unless a blocker or owner decision is genuinely required.

## 20. Default execution loop

**READ REAL STATE → UNDERSTAND PRODUCT INTENT → IDENTIFY ROOT CAUSE → DESIGN CORRECT SOLUTION → IMPLEMENT → VERIFY TECHNICALLY → VERIFY VISUALLY IF UI → VERIFY INTEGRATION → BRANCH GUARD → FIX REGRESSIONS → DOCUMENT REAL EVIDENCE → ONLY THEN DECLARE COMPLETE.**

## Final principle

The goal is not merely to make Loadify work.

The goal is to make Loadify:

- technically correct;
- secure;
- visually excellent;
- commercially coherent;
- easy to use;
- scalable;
- maintainable;
- internally consistent;
- evidence-backed;
- worthy of production.

**Repository truth, canonical contract, evidence and platform integrity take priority over any individual agent, implementation shortcut, PR or assumption.**
