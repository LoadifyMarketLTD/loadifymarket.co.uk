# Loadify Market — Public Platform Presentation & Partner Trust Hub — Canonical Execution Plan

Date: 2026-09-02
Status: ACTIVE / P0 / CANONICAL FOR PR #724
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724 — DRAFT / OPEN / NOT MERGED

## CONTINUITY OVERRIDE — READ FIRST

This is the newest owner-approved architecture and supersedes every older statement that conflicts with it.

### Architecture
- `/` = official premium corporate/platform presentation homepage and primary business credential.
- `/marketplace` = separate entrance to the existing commercial marketplace.
- `/catalog`, `/category/*`, `/product/*`, `/cart`, `/checkout` = marketplace/commercial world.
- `/buyer`, `/seller`, `/admin` = functional workspaces/back office.
- Presentation family: `/platform`, `/buyers`, `/sellers`, `/trade`, `/suppliers`, `/integrations`, `/partners`, `/developers`, `/how-it-works`, `/trust`, with company/support/legal pages as appropriate.

Corporate presentation and marketplace MUST NOT share one visually mixed shell. Product search, category strips and cart belong to marketplace UI and must not dominate the corporate header. Preserve the old marketplace experience behind `/marketplace` rather than destroying it.

### Corporate desktop navigation
Core presentation destinations must be directly discoverable in the navbar/dropdowns, NOT hidden primarily in the burger.

Target hierarchy, refined for available width:
`Platform | Buyers | Sellers | Business ▾ | Technology/Integrations ▾ | Partners | How It Works | Trust`

Business exposes Trade Buyers, Suppliers, Brands & Wholesalers. Technology exposes Integrations and Developers. A distinct `Marketplace` CTA opens `/marketplace`; Sign in and Join/Dashboard remain appropriate utilities. Burger/drawer is secondary navigation for About, Help, Contact, legal and full-directory fallback.

### Homepage role
The homepage is the strongest commercial presentation surface, not ten equal cards and not the old shop homepage with corporate links added. It sells one coherent Loadify ecosystem and routes visitors into the ten deeper pages.

Narrative:
1. What Loadify is / why it matters.
2. Platform backbone.
3. Buy through Loadify — Buyers + Trade.
4. Sell/supply through Loadify — Sellers + Suppliers/Brands/Wholesalers.
5. Connect with Loadify — Integrations + Partners + Developers.
6. How commerce moves through the platform.
7. Trust/governance/controlled activation.
8. Audience-specific next actions + Marketplace entrance.

A buyer, seller, trade buyer, supplier/brand, technology provider or prospective partner should understand within the first minute what Loadify is, where they fit, what is actually supported, why it is credible, and where to continue.

### Visual identity — NO REBRAND
Preserve current Loadify identity. Presentation is predominantly light: warm-white/light surfaces, existing navy for structure/text/controlled contrast, existing gold/orange accent. Do not turn Loadify into a dark/navy generic SaaS site and do not change palette without explicit owner instruction.

Homepage quality must be at least as high as the ten dedicated pages and should be the strongest composition in the family. Prefer real product/UI evidence and truthful platform diagrams. Avoid generic globes, sci-fi networks, stock handshakes and low-value AI decoration.

### Truth gate
Never invent or imply partner/integration relationships, provider logos/endorsements, product/customer/supplier/country/transaction counts, testimonials, certifications, public APIs, provider-specific automation, enterprise/security guarantees or unsupported global reach.

DSers, BigBuy, AppScenic, Syncee, Spocket, Avasam, SaleHoo or any other provider must NOT be shown as a Loadify partner/live integration unless exact current evidence proves the relationship/capability is live and publishable. Applications, reviews, contacts, adapters, migrations and readiness work are not public partnerships.

Capability classes remain:
1. LIVE / CURRENTLY SUPPORTED
2. SUPPORTED WITH CONDITIONS
3. INTERNAL / ADMIN ONLY
4. FOUNDATION PRESENT BUT NOT USER-AVAILABLE
5. PROVIDER-GATED / ACTIVATION OFF
6. STALE / CONTRADICTED / MUST NOT MARKET
7. NEEDS OWNER DECISION
Only 1 and 2 are ordinary live public claims.

### Desktop-first scope
Current visual acceptance is desktop-first. Implementation must remain responsive/non-breaking, but full mobile presentation redesign/acceptance is deferred until explicitly resumed. Do not let mobile scope dilute desktop quality.

### Merge gate
PR #724 remains DRAFT / OPEN / NOT MERGED until exact diff/route regression review, Netlify preview PASS, actual desktop preview inspection, claim/evidence review and owner visual approval. Build success is not visual PASS.

## Mission
Build the complete public commercial, institutional and ecosystem presentation layer so a first-time visitor understands Loadify before entering marketplace product flows or workspaces. The exterior must credibly serve buyers, sellers, trade/business buyers, brands, wholesalers, suppliers/manufacturers/distributors, supplier-commerce platforms, fulfilment/commerce technology providers, integration teams, commercial/strategic partners and institutional reviewers.

## Source-of-truth order
1. controlling business/security contract;
2. this Continuity Override and newest explicit owner clarification;
3. current repository state;
4. current production/runtime evidence;
5. verified official external evidence;
6. Audit, Blueprint and Claims Evidence Matrix;
7. historical plans/checkpoints;
8. assumptions.

## Public page family
- `/` — corporate/platform presentation homepage.
- `/marketplace` — preserved marketplace homepage/entry.
- `/platform` — executive ecosystem map.
- `/buyers` — buyer proposition.
- `/sellers` — seller proposition.
- `/trade` — trade/business buying.
- `/suppliers` — supplier/brand/wholesaler participation.
- `/integrations` — controlled integration programme.
- `/partners` — commercial/strategic partnership gateway.
- `/developers` — technical front door with factual access model.
- `/how-it-works` — cross-platform lifecycle.
- `/trust` — trust/safety/governance.
- `/about` — concise institutional/company page.
- `/pricing` — only after commercial truth reconciliation.

## Page standard
Every presentation page requires a strong audience-specific hero, clear proposition, premium visual storytelling, evidence-backed capability sections, role-specific lifecycle, relevant trust/governance proof, role-specific CTA, adjacent-page links and unique SEO metadata/canonical. Avoid walls of text, repetitive card grids, fake metrics and generic SaaS clichés.

## Research principle
Study mature B2B marketplace, wholesale, marketplace-infrastructure, supplier-commerce and multichannel-commerce sites for information architecture, conversion sequence, product demonstration, audience separation, trust building, navigation and SEO. Do not copy their branding, wording, layouts, illustrations, logos or claims. Research improves Loadify's design discipline; Loadify remains Loadify.

## Supplier Commerce boundary
Public presentation may describe provider-neutral supplier-commerce architecture, controlled provider onboarding, integration programme/direction and a contact path. It must not claim provider-specific automation or relationships without verified publishable evidence. Hosted/provider activation remains evidence-gated.

## Current-state implementation order
The repository-truth Audit, Blueprint, Claims Matrix and ten presentation pages already exist on PR #724. Do not restart them from zero.

Next:
1. synchronize the four canonical documents with this architecture;
2. create separate PresentationHeader/PresentationDrawer/PresentationFooter/PresentationLayout or equally clean route-aware architecture;
3. preserve old marketplace header/drawer/footer as marketplace shell;
4. preserve old marketplace homepage under `/marketplace`;
5. install the new corporate Presentation Home at `/`;
6. move the ten presentation pages onto presentation shell;
7. revise shared navigation data for navbar-first corporate IA;
8. point corporate Marketplace CTAs to `/marketplace` or `/catalog` by intent;
9. run build/type/lint/relevant route tests and inspect App routing diff for regressions;
10. validate Netlify Deploy Preview;
11. inspect actual desktop preview around 1440/1536 including dropdowns and corporate↔marketplace transition;
12. run Branch Guard/current-main/overlap/diff checks;
13. keep PR draft/not merged until owner approval.

## SEO architecture
The corporate homepage is semantic root of the presentation family. Dedicated pages require unique H1/title/description/canonical and contextual internal links. Homepage distributes users/context to Platform, Buyers, Sellers, Trade, Suppliers, Integrations, Partners, Developers, How It Works and Trust. Structured data only from verified facts; never fabricate review/rating schema.

## Definition of done
Complete only when the corporate exterior explains Loadify credibly; marketplace remains usable but clearly separated; ten presentation pages are coherent destinations; desktop navigation exposes the ecosystem professionally; all claims are evidence-backed; corporate and marketplace shells do not mix; SEO/internal linking is coherent; route/auth/cart/checkout/workspace/legal/Supplier-Commerce behavior has not regressed; Netlify preview/checks pass; actual desktop screenshots have been reviewed; and owner approves the visual result.
