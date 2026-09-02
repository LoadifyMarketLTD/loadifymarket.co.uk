# Loadify Market — Public Presentation Audit

Date: 2026-09-02
Status: ACTIVE / P0 — FINAL OWNER ARCHITECTURE RECORDED
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724 — DRAFT / OPEN / NOT MERGED

## Controlling conclusion
Two coordinated, visually distinct environments are mandatory. `/` is official corporate/platform homepage; `/marketplace` preserves old marketplace. Corporate presentation routes are `/platform`, `/buyers`, `/sellers`, `/trade`, `/suppliers`, `/integrations`, `/partners`, `/developers`, `/how-it-works`, `/trust`. Shopping routes remain marketplace world. Buyer/Seller/Admin workspaces must not be disturbed.

Corporate header is presentation-first and exposes core destinations through navbar/dropdowns; Marketplace is distinct CTA; burger is secondary. Marketplace retains search/categories/cart shopping shell.

Preserve light Loadify identity: warm-white/light surfaces, navy structure/text, gold/orange accent. Dark/navy rebrand rejected. Homepage must meet/exceed ten presentation pages and use narrative hierarchy, real interface evidence/truthful diagrams rather than flat ten-card directory.

Homepage story: What Loadify is → Platform → Buy → Sell/Supply → Connect → Lifecycle → Trust/Governance → role-specific next step.

Only LIVE/CURRENTLY SUPPORTED and SUPPORTED WITH CONDITIONS are normal live marketing claims. Do not publish provider logos/relationships, fabricated counts, testimonials, public APIs, certifications, enterprise/security claims, provider automation or unsupported global reach without verified evidence. Provider application/contact/review/readiness is not partnership.

Known contradictions remain: RFQ not marketable; services-marketplace wording unsupported by dominant implementation; pricing needs reconciliation before `/pricing`; no-email-confirmation wording conflicts with verification gates; absolute no-own/store/dispatch wording unsafe.

Desktop-first visual acceptance; responsive/non-breaking required; full mobile visual acceptance deferred. Do not restart audit. Before merge inspect App diff/current main, shell separation, marketplace preservation, auth/cart/checkout/workspaces/legal, build/type/lint/tests, Netlify, real desktop preview, claims matrix, behind/overlap. PR remains draft/not merged until owner approval.
