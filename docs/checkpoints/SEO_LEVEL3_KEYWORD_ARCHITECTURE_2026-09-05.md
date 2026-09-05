# SEO Level 3 — Keyword & Category Architecture

Date: 2026-09-05

## Base and scope

- Repository: `LoadifyMarketLTD/loadifymarket.co.uk`
- Base main: `a2abb867d2aa62139ed082985eca1f6b58996de7`
- PR: #749
- Branch: `fix/seo-level3-keyword-architecture-20260905`
- Level 1 technical SEO and Level 2 commercial on-page SEO are already separate completed workstreams.
- This workstream makes no visual redesign, Stripe/payment mutation, Supabase Production write, DDL or migration.

## Level 3 architecture

The keyword/content model has three layers:

1. Stable marketplace/commercial intent already established in Level 2 (`marketplace`, `catalog`, `buyers`, `sellers`, `business`, `trade`, `suppliers`).
2. Twelve retail parent-category intents covering the curated marketplace taxonomy.
3. Four trade-stock intents where UK search language is materially different from ordinary retail categories:
   - wholesale job lots / mixed stock;
   - customer returns pallets / resale stock;
   - wholesale overstock / excess inventory;
   - wholesale clearance stock / one-off deals.

No exact search-volume claims are made in this workstream. Search-language research is used to classify intent and wording, not to invent traffic estimates.

## Indexability policy

- A category landing is eligible for indexing only when a mapped hosted category has at least one public sellable listing.
- Public sellable means active + approved + active listing status + non-logistics + service or stock available.
- Empty category pages remain usable navigation surfaces but are `noindex, follow`.
- Unknown category URLs fail closed with crawler-visible 404 + `noindex, follow`.
- Category query/facet states such as `?sub=...` remain usable for navigation but are `noindex, follow`; the canonical stays on the parent category URL.
- Catalog search/filter query states are likewise `noindex, follow` with canonical `/catalog`.
- Dedicated indexable subcategory pages are intentionally NOT generated in Level 3. They should be promoted only when inventory and verified demand justify a standalone landing.

## Hosted category audit — read only

A read-only hosted Supabase check found a large active category vocabulary but very little current live inventory. At the audit point:

- `handmade` had 9 live products;
- `toys` had 1 live product;
- the large majority of active category rows returned 0 live products.

Therefore `isActive=true` alone is not an acceptable sitemap/indexability signal.

The curated visual taxonomy also does not map 1:1 to hosted slugs. Level 3 records explicit mappings, for example:

- `electronics-and-technology` -> `electronics`, `media-electronics`
- `clothing-and-apparel` -> `clothing-fashion`, `wholesale-clothing`
- `home-and-garden` -> `home-garden`, `homeware`, `garden`, `kitchenware`
- `toys-and-games` -> `toys-games`, `toys`
- `tools-and-diy` -> `diy`
- `sports-and-leisure` -> `sports-fitness`, `leisure-hobbies`
- `office-and-stationery` -> `office-business`, `stationery`
- `baby-and-nursery` -> `baby-supplies`

## Validation gate

Do not merge until the exact final PR HEAD passes the existing strict Netlify Deploy Preview command:

`npm ci && npm run lint && npm test && npm run build`

After exact-head PASS: final diff review -> race-check against main -> mark ready -> squash merge pinned to validated head SHA -> verify Production Netlify deploy is READY on the exact merge SHA.
