# Loadify Market — Public Presentation Audit

Date: 2026-09-02
Status: ACTIVE / P0 — FINAL OWNER ARCHITECTURE RECORDED
PR: #724 — DRAFT / OPEN / NOT MERGED

Controlling conclusion: `/` is official corporate/platform homepage and `/marketplace` preserves the separate old marketplace. Corporate and marketplace use distinct shells. Corporate routes: `/platform`, `/buyers`, `/sellers`, `/trade`, `/suppliers`, `/integrations`, `/partners`, `/developers`, `/how-it-works`, `/trust`. Shopping routes remain marketplace world. Buyer/Seller/Admin workspaces must not be disturbed.

Corporate header exposes core presentation destinations through navbar/dropdowns; Marketplace is distinct CTA; burger secondary. Marketplace retains search/categories/cart shell.

Preserve light Loadify identity: warm-white/light surfaces, navy structure/text, gold/orange accent. Dark/navy rebrand rejected. Homepage must meet/exceed ten presentation pages and use narrative hierarchy, real UI/truthful diagrams rather than ten equal cards.

Homepage story: What Loadify is → Platform → Buy → Sell/Supply → Connect → Lifecycle → Trust/Governance → role-specific next step.

Only LIVE/CURRENTLY SUPPORTED and SUPPORTED WITH CONDITIONS are normal live marketing claims. No provider logos/relationships, fabricated counts, testimonials, public APIs, certifications, enterprise/security claims, provider automation or unsupported global reach without verified evidence. Provider application/contact/review/readiness is not partnership.

Known contradictions remain: RFQ not marketable; services-marketplace wording unsupported by dominant implementation; pricing requires reconciliation before `/pricing`; no-email-confirmation wording conflicts with verification gates; absolute no-own/store/dispatch wording unsafe.

Desktop-first visual acceptance; responsive/non-breaking required; full mobile visual acceptance deferred. Do not restart audit. Before merge inspect App diff/current main, shell separation, marketplace preservation, auth/cart/checkout/workspaces/legal, build/type/lint/tests, Netlify, real desktop preview, Claims Matrix and behind/overlap. PR stays draft/not merged until owner approval.
