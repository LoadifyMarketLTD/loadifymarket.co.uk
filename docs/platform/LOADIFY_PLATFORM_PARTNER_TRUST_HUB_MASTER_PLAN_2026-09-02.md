# Loadify Market — Platform & Partner Trust Hub Master Plan

Date: 2026-09-02
Status: ACTIVE / P0
Branch: `feat/platform-partner-trust-hub-20260902`
Base main: `4d52461823a13ab3412d074db17095df2bbf4fb2`

## Mission

Build a public, professional B2B presentation layer for Loadify Market that lets a buyer, seller, supplier, brand, fulfilment provider, technology platform, developer or commercial reviewer understand what Loadify is, who it serves, how commerce flows through it, how partnership/integration onboarding works, and how to take the correct next step.

This work is a trust and conversion layer, not a licence to claim capabilities that do not exist. Public statements must be evidence-backed. Planned, controlled, private, partner-only and generally available capabilities must be distinguished explicitly.

## Why P0

Loadify is actively approaching supplier-commerce and integration providers. A provider reviewing Loadify should not have to infer the business model from a consumer storefront. The public site must demonstrate marketplace purpose, roles, operating model, partnership intent, governance and credible contact paths.

## Research principles adopted

Reference patterns reviewed include Mirakl's separate Platform, Connect, Partner and Developer experiences and Faire's separation of retailer/brand workflows and integrations. Strong platforms do not force every audience through one generic About page. They route each audience to a dedicated proposition and then expose the appropriate onboarding or technical path.

Patterns to adopt, without copying third-party claims or design:

1. Audience-specific navigation and landing pages.
2. Clear role-based value proposition before feature detail.
3. A visible commerce/integration flow.
4. Dedicated partner and developer/integration surfaces.
5. Explicit capability/status language rather than ambiguous API claims.
6. Trust, governance and company identity near commercial calls to action.
7. Multiple role-specific CTAs instead of one generic Contact button.
8. Separate documentation/integration detail from marketing copy.

## Public information architecture

### Navbar group: Platform

#### `/platform`
Purpose: definitive overview of Loadify Market.
Must answer: What is Loadify? Who is it for? What problems does it solve? What are the major commerce roles and workflows?
Sections: hero; ecosystem role cards; marketplace lifecycle; capabilities; operating principles; trust strip; role selector; CTA.

#### `/platform/how-it-works`
Purpose: visual operational explanation.
Flows:
- Buyer: discover -> evaluate -> purchase -> fulfilment -> tracking/support.
- Seller: onboard -> list/manage -> receive order -> fulfil -> settlement/operations.
- Supplier: qualify -> catalogue/import review -> marketplace availability -> order routing -> fulfilment -> status/tracking.
- Integration partner: enquiry/application -> commercial/technical review -> test/validation -> controlled activation -> monitoring.

#### `/platform/commerce-infrastructure`
Purpose: explain the platform architecture in business language.
Topics: multi-vendor marketplace; catalogue and variants; offers; stock/price; order lifecycle; fulfilment/tracking; provider abstraction; audit/evidence; exception handling; fail-closed activation.
Do not expose secrets, internal security implementation details or unverified capabilities.

### Navbar group: Sell

#### `/sell`
Purpose: seller acquisition overview.
Audience: merchants, retailers, brands and approved marketplace sellers.
Sections: why sell; seller lifecycle; catalogue/order operations; customer reach proposition; seller responsibilities; onboarding CTA.

#### `/brands`
Purpose: brand-specific proposition.
Topics: brand presence, catalogue quality, controlled marketplace distribution, product/offer ownership, fulfilment options subject to onboarding.

### Navbar group: Supply

#### `/suppliers`
Purpose: primary supplier acquisition page.
Audience: manufacturers, distributors, wholesalers, dropship-capable suppliers and approved product sources.
Sections: supplier models; catalogue requirements; stock/price expectations; order fulfilment; tracking; returns expectations; compliance; onboarding stages.

#### `/suppliers/integration`
Purpose: supplier technical/commercial integration overview.
Explain supported integration approaches as availability-based, not promised: controlled API integration, approved feeds/files, provider-specific adapters or manual/direct-supplier onboarding where applicable.
Status wording must never imply a public API unless one is actually generally available.

### Navbar group: Partners

#### `/partners`
Purpose: partnership gateway.
Audience cards: supplier platforms; fulfilment/dropshipping platforms; technology providers; logistics/operations partners; strategic/commercial partners.
CTA routes each audience to the appropriate enquiry.

#### `/partners/integrations`
Purpose: explain Loadify's controlled integration programme.
Core model: external source/provider -> validation -> Loadify catalogue/commerce layer -> customer order -> authorised fulfilment -> status/tracking back to Loadify.
Explain provider approval, technical validation, commercial/compliance review, least-data principles and controlled activation.

#### `/partners/provider-readiness`
Purpose: public-safe explanation of how Loadify evaluates integrations.
Do NOT publish private negotiations or internal provider blockers by default.
Publish process states generically: Discovery; Commercial Review; Technical Review; Validation; Approved; Active.

### Navbar group: Developers

#### `/developers`
Purpose: credible technical front door without falsely advertising an open public API.
Required statement: integration access is controlled/partner-based unless and until Loadify launches a generally available developer API.
Sections: who should contact us; integration use cases; data domains; authentication/security principles at a high level; environments/validation; lifecycle; documentation availability; integration enquiry CTA.

#### `/developers/integration-model`
Purpose: technical conceptual model.
Domains may include catalogue, products/variants, offers, inventory, pricing, orders, fulfilment, shipment/tracking and lifecycle events ONLY where the relevant integration contract supports them.
Include idempotency, retries, reconciliation, auditability and capability negotiation as platform principles.

#### `/developers/status`
Purpose: public-safe integration availability/status vocabulary.
Never expose secrets or private provider credentials. Distinguish: public; partner access; controlled pilot; planned; unavailable.

### Navbar group: Trust

#### `/trust`
Purpose: central credibility page.
Topics: UK business identity; marketplace governance; provider/seller onboarding principles; customer protection responsibilities; data/security principles; evidence-based provider activation; operational accountability.
Only publish certifications or regulatory claims after verification.

#### `/trust/supplier-standards`
Purpose: what Loadify expects from suppliers.
Topics: authentic business identity; accurate product information; lawful products; stock/price integrity; fulfilment SLAs; tracking; returns; product safety/compliance; cooperation with incidents/recalls where applicable.

#### `/trust/integration-governance`
Purpose: explain why integrations are not switched on merely because an API exists.
Stages: commercial permission -> capability evidence -> sandbox/test -> compliance review -> controlled activation -> monitoring/circuit breaker -> periodic review.

#### `/company`
Purpose: company/platform identity and mission.
Must contain verified legal/company information, contact routes and clear relationship between company and platform. No inflated scale claims.

## Navigation design

Desktop navbar target:
`Shop | Platform | Sell | Supply | Partners | Developers | Trust`

Use dropdown/mega-menu where appropriate so the primary navigation stays readable. Mobile must provide the same information architecture without hiding B2B routes.

Do not replace or visually redesign the existing consumer homepage as part of this workstream. Add the trust hub as dedicated routes first. Homepage promotion can be evaluated separately after preview approval.

## Page design system

Each page should feel like part of one premium platform family while having a distinct hero/message for its audience.

Common page anatomy:
1. Eyebrow / audience signal.
2. Strong outcome-led H1.
3. One concise credibility paragraph.
4. Primary + secondary CTA.
5. Visual/diagram or role-specific product story.
6. 3-6 value/capability blocks.
7. How-it-works sequence.
8. Governance/trust proof.
9. FAQ where useful.
10. Final role-specific CTA.

Avoid generic stock-SaaS copy, fake customer logos, fake metrics, fake testimonials, fake integrations and fake certifications.

## Content truth taxonomy

Every capability used in public copy must be classifiable as one of:
- `AVAILABLE`: demonstrably available now.
- `CONTROLLED`: implemented but restricted/admin/partner gated.
- `PARTNER_DEPENDENT`: available only when a provider contract/capability supports it.
- `IN_DEVELOPMENT`: actively being built, not sold as live.
- `PLANNED`: roadmap only; normally omit from primary marketing copy.
- `UNAVAILABLE`: must not be implied.

Public copy should normally describe AVAILABLE and appropriate CONTROLLED capabilities. PARTNER_DEPENDENT must be qualified. IN_DEVELOPMENT/PLANNED require explicit labels if shown.

## Integration truth requirements

Do not say "Public API" unless a generally available API, auth model, documentation and support policy exist.
Do not name a provider as integrated/partnered merely because Loadify contacted them or built an adapter.
Do not display provider logos without appropriate permission/basis.
Do not claim automated order submission, tracking, refunds or returns for a provider until that capability is verified for that provider.
Do not expose internal readiness evidence, credentials, supplier PII or security-sensitive implementation details.

## Supplier Commerce alignment

The public pages must accurately reflect the existing fail-closed architecture:
- provider capabilities are capability-scoped;
- provider activation can remain off while platform engineering continues;
- integrations require evidence before capability promotion;
- external provider failures or missing approvals must not force Loadify to make false public claims.

Current provider-specific facts are internal evidence, not automatic marketing claims. Syncee has stated that it does not support retailer-side/custom marketplace programmatic integration. DSers Sales Channel application is under review. Spocket response is pending. BigBuy requires authorised sandbox evidence for the current verification gate. AppScenic requires explicit retailer-side access evidence. These facts guide engineering but should not be turned into public partnership claims.

## Trust content checklist

Before preview approval, verify and present where appropriate:
- legal operator/company name;
- UK company number and registered/contact information intended for public use;
- marketplace terms links;
- privacy/cookie/data protection links;
- seller terms/onboarding rules;
- supplier standards;
- prohibited/restricted products policy or equivalent;
- returns/refund responsibility model;
- complaints/support path;
- contact/partnership path;
- security disclosure/contact path if appropriate;
- clear wording around payment/settlement responsibility.

## SEO / discoverability

Create unique title, description, canonical and social metadata per route.
Use semantic headings and internal links between Platform, Sell, Supply, Partners, Developers and Trust.
Add appropriate Organization/WebSite/Breadcrumb structured data only from verified facts.
Do not manufacture review/rating structured data.

Target intent families include:
- UK multi-vendor marketplace platform
- sell on Loadify Market
- become a Loadify supplier
- marketplace supplier integration
- Loadify integration partner
- Loadify developer integration

SEO copy must remain natural and evidence-backed.

## Conversion architecture

Role-specific CTAs:
- Explore Marketplace
- Sell on Loadify
- Become a Supplier
- Partner with Loadify
- Integration Enquiry
- Developer / Technology Enquiry

Forms must capture only necessary information and route by intent. Suggested partner fields: organisation, website, country, contact, organisation type, integration/partnership type, expected data/workflow, notes. Do not collect credentials or API secrets in public forms.

## Visual direction

Preserve Loadify's established brand system. No unsolicited palette replacement.
Use bright, credible commerce imagery and clean product/platform diagrams.
Avoid dark/cinematic treatment, generic crypto/startup visuals, fake dashboards and excessive decorative animation.
Pages should look credible to a procurement/partnership reviewer as well as attractive to sellers/suppliers.

## Delivery phases

### Phase 0 — Evidence and inventory
- Map existing routes/navbar/components/design tokens.
- Inventory public claims and legal/trust pages.
- Map implemented capabilities against truth taxonomy.
- Identify reusable components and missing content.

### Phase 1 — Foundation
- Add route/page shell and B2B navigation model.
- Add shared `PlatformPage` primitives/components.
- Add metadata and breadcrumbs.
- Add role-specific CTA model.

### Phase 2 — Core trust pages
Build first:
1. `/platform`
2. `/suppliers`
3. `/partners`
4. `/partners/integrations`
5. `/developers`
6. `/trust`

These are P0 because supplier/integration reviewers need them immediately.

### Phase 3 — Supporting pages
Build:
- `/platform/how-it-works`
- `/platform/commerce-infrastructure`
- `/sell`
- `/brands`
- `/suppliers/integration`
- `/developers/integration-model`
- `/developers/status`
- `/trust/supplier-standards`
- `/trust/integration-governance`
- `/company`

### Phase 4 — Forms and routing
- Partner enquiry.
- Supplier enquiry/onboarding entry.
- Integration/developer enquiry.
- Seller CTA routing.
- Spam/abuse controls and validation.

### Phase 5 — Verification
- responsive desktop/mobile;
- keyboard/accessibility;
- route/link integrity;
- metadata/canonical/robots checks;
- copy truth audit;
- legal/trust link audit;
- no secret/internal evidence leakage;
- build/lint/tests;
- Netlify Deploy Preview.

### Phase 6 — Review gate
User visually reviews preview. No merge to `main` until approved.
Homepage remains unchanged unless separately approved.

### Phase 7 — Launch and partner follow-up
After approved merge and verified production deployment, supplier/technology outreach can point reviewers to the relevant Loadify pages rather than a generic homepage.

## Definition of done

This workstream is complete only when:
- every primary audience has a dedicated public route;
- navbar exposes the new B2B information architecture cleanly;
- no page relies on invented capability claims;
- supplier/partner/developer visitors can identify their path within seconds;
- trust/legal/company context is readily discoverable;
- integration availability language is explicit;
- desktop/mobile/accessibility gates pass;
- preview is reviewed and approved;
- production merge/deployment occurs only after approval.

## Immediate execution order

1. Inspect current route/navbar/component architecture at the saved base.
2. Build the six P0 pages on this branch.
3. Wire dedicated navbar destinations without changing the existing homepage content.
4. Build remaining supporting pages.
5. Add forms only after confirming current backend/contact workflow.
6. Run truth audit against actual Supplier Commerce implementation.
7. Run technical/visual gates and produce Deploy Preview.
8. Review visually before any main merge.
