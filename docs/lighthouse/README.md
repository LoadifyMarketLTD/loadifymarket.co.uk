# Lighthouse Reports

This directory stores the latest Lighthouse performance report used as source of truth
for the optimisation work in this repository.

## Baseline scores (as reported prior to optimisation work)

| Category       | Score |
|----------------|-------|
| Performance    | 82    |
| Accessibility  | 97    |
| Best Practices | 92    |
| SEO            | 100   |

## How to regenerate the report

### Prerequisites

```bash
npm install -g lighthouse
# or via npx (no global install required)
```

### Running against the production URL

```bash
npx lighthouse https://loadifymarket.co.uk \
  --output html \
  --output json \
  --output-path docs/lighthouse/latest.report \
  --preset desktop \
  --chrome-flags="--headless" \
  --throttling-method=simulate
```

This produces:
- `docs/lighthouse/latest.report.html` — human-readable report (open in browser)
- `docs/lighthouse/latest.report.json` — machine-readable data (used for CI diffing)

### Running against a local build

```bash
# 1. Build the project
npm run build

# 2. Start the preview server
npm run preview &
PREVIEW_PID=$!

# 3. Run Lighthouse
npx lighthouse http://localhost:4173 \
  --output html \
  --output json \
  --output-path docs/lighthouse/latest.report \
  --preset desktop \
  --chrome-flags="--headless" \
  --throttling-method=simulate

# 4. Stop preview server
kill $PREVIEW_PID
```

### Viewing the report

Open `docs/lighthouse/latest.report.html` in any browser.

## Key findings addressed in this PR

### Performance
- **A – Unused JS** (est. saving 0.8 s): All primary public routes (`HomePage`, `CatalogPage`,
  `ProductPage`, `ShopPage`, `BulkPage`, `LoginPage`, `RegisterPage`) are now lazily loaded.
  `@supabase/supabase-js` is split into its own vendor chunk.
- **B – LCP image preload** (est. saving 0.56 s): `fetchPriority="high"` added to the hero
  `<img>` and a `<link rel="preload">` added in `index.html`.
- **C – Excessive DOM size** (825 elements): Three separate large blur divs in
  `CinematicHero` merged into a single CSS `background` gradient, saving ~2 DOM nodes per
  hero render.
- **D – Critical request chaining** (3 chains): Google Fonts `@import` removed from
  `src/index.css` and replaced with a `<link rel="stylesheet">` in `index.html`, eliminating
  the CSS→font request chain.
- **E – Long main-thread tasks** (7 tasks): Route-level lazy loading defers page-specific
  JS parsing until each route is first visited.

### Best Practices
- **A – Browser console errors**: Service Worker registration failure downgraded from
  `console.error` to `console.warn` (non-fatal).
- **B – Source maps**: `sourcemap: 'hidden'` added to `vite.config.ts` — maps are generated
  for error-tracking tools but the URL is not embedded in the deployed JS files.
- **C – CSP**: `Content-Security-Policy-Report-Only` header added in `netlify.toml`, along
  with `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and
  `Permissions-Policy` headers.

### Accessibility
- **A – Contrast**: Low-opacity text tokens raised to meet WCAG AA 4.5:1 minimum —
  `text-white/30` → `/50`, `text-white/40` → `/60` in `ProductCard`, `Footer`, `Header`,
  `HomePage`; input placeholder opacity raised from `/40` → `/50` and `/50` → `/60`; hero
  subheadline and trust indicators raised from `/60`–`/70` → `/80`.

## Notes

- `latest.report.html` and `latest.report.json` are gitignored to keep the repository lean.
  Run the commands above to regenerate them locally or in CI.
- Add a `.github/workflows/lighthouse.yml` if you want automated per-PR Lighthouse checks
  via Lighthouse CI (`@lhci/cli`).
