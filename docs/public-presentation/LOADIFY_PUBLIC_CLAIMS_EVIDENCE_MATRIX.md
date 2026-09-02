# Loadify Market — Public Claims Evidence Matrix

Date: 2026-09-02
Status: ACTIVE / CONTROLLING PUBLIC-COPY GATE — ARCHITECTURE UPDATE
Branch: `feat/platform-partner-trust-hub-20260902`
PR: #724 — DRAFT / OPEN / NOT MERGED

A source file, route, adapter, migration, application, provider email or test does not by itself prove a live public/provider capability. Claims involving money, provider execution, public API availability, pricing, security/compliance or partnerships require strongest relevant current evidence.

## Architecture / identity gate
| Claim or implication | Classification | Safe? | Rule |
|---|---|---|---|
| `/` is corporate/platform presentation homepage | OWNER-APPROVED TARGET | YES after routing | Primary business credential. |
| `/marketplace` is separate commercial entrance | OWNER-APPROVED TARGET | YES after routing | Preserve old marketplace experience. |
| Corporate and marketplace navigation may be visually mixed | REJECTED | NO | Separate shells. |
| Core presentation pages may live mainly in burger | REJECTED | NO | Navbar/dropdown discovery required. |
| Loadify should become dark/navy generic SaaS | REJECTED | NO | Preserve light Loadify identity: warm-white/light + navy + gold/orange. |
| Invented numbers/testimonials/provider logos may build homepage trust | PROHIBITED | NO | Use real product/capability/governance evidence. |

## Safe verified/conditional claims
| Public claim | Classification | Safe? | Qualification |
|---|---|---|---|
| Loadify Market is UK-operated | LIVE / CURRENTLY SUPPORTED | YES | No regulatory endorsement implication. |
| Multi-category marketplace/catalogue exists | LIVE / CURRENTLY SUPPORTED | YES | Avoid absolute category coverage. |
| Buyers can browse/search products/categories | LIVE / CURRENTLY SUPPORTED | YES | Normal claim. |
| Buyers can use cart and checkout | LIVE / CURRENTLY SUPPORTED | YES | Match implementation. |
| Checkout uses Stripe-backed payment processing | LIVE / CURRENTLY SUPPORTED | YES | Do not overstate PCI responsibility. |
| Buyers can track orders | LIVE / CURRENTLY SUPPORTED | YES | No arrival/carrier guarantee. |
| Buyer Space provides verified order/account tools | LIVE / CURRENTLY SUPPORTED | YES | Verify surfaced CTAs. |
| Trade/business registration exists | LIVE / CURRENTLY SUPPORTED | YES | No trade-credit/special-pricing implication. |
| Sellers can create/manage product listings | LIVE / CURRENTLY SUPPORTED | YES | Product marketplace; no unsupported services claim. |
| Sellers can manage orders/shipments/returns | LIVE / CURRENTLY SUPPORTED | YES | Policy-specific obligations remain separate. |
| Sellers can use reviews/messages/notifications | LIVE / CURRENTLY SUPPORTED | YES | No outcome promise. |
| Sellers have public profile/storefront | LIVE / CURRENTLY SUPPORTED | YES | Verify final route. |
| Seller payout path uses Stripe Connect where eligible | SUPPORTED WITH CONDITIONS | YES, QUALIFIED | Always retain eligibility/setup qualification. |

## Not safe as live marketing
| Claim | Classification | Safe? |
|---|---|---|
| 7% standard commission as permanent canonical price | NEEDS OWNER DECISION / RECONCILIATION | NO |
| 0% commission until 31 Dec 2026 as permanent presentation claim | NEEDS OWNER DECISION / TIME-SENSITIVE | NO for new permanent page |
| No monthly/listing fees | NEEDS OWNER DECISION / RECONCILIATION | NO |
| Automatic seller activation | STALE / CONTRADICTED | NO |
| Registration requires no email confirmation | STALE / CONTRADICTED | NO |
| RFQ is a live feature | STALE / CONTRADICTED | NO |
| Broad services marketplace | FOUNDATION/CLAIM UNVERIFIED | NO |
| Platform-wide absolute that Loadify never owns/stores/dispatches products | STALE/UNSAFE ABSOLUTE | NO |
| Generally available public API | FOUNDATION/ACCESS UNVERIFIED | NO |
| Provider-specific automated ordering/tracking/cancellation/refunds | PROVIDER-GATED / ACTIVATION OFF unless separately proven | NO |

## Provider relationship gate
DSers, BigBuy, AppScenic, Syncee, Spocket, Avasam, SaleHoo or any other provider must not appear publicly as Loadify partners/live integrations solely because of internal work. Applications, reviews, contacts, adapters, migrations, tests and readiness states are not partnerships.

Provider logos, endorsement language, `trusted by`, `integrated with`, `verified partners` and equivalent visual implications are prohibited without explicit current evidence and authorization.

## Homepage-specific gate
Homepage may truthfully describe the ecosystem at provider-neutral level and route to Buyers, Sellers, Trade, Suppliers, Integrations, Partners, Developers, How It Works, Trust and Marketplace. It may show real Loadify UI/workspace/product-flow evidence where accurate.

Homepage must NOT use fabricated product/customer/supplier/country/transaction counts, fake testimonials/ratings, unverified certification/security badges, unsupported global reach, public API promises or supplier/provider logos as social proof.

## Publication rule
Before new public copy ships, map every material capability/relationship/trust/commercial statement to this matrix or stronger current evidence. If ambiguous, qualify or omit it. Marketing ambition never upgrades evidence status.
