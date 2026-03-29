# Loadify Market — Redesign Concept

**Direction:** Cinematic · Minimalist · Premium  
**Audience:** UK buyers and independent sellers  
**Benchmark:** Net-a-Porter (editorial luxury) × Depop (seller community) × Stripe (trust & clarity)

---

## 1. Visual Direction

### 1.1 Philosophy
*"Less noise. More signal."*  
Every element earns its place. White space is used as a premium signal, not an empty gap. Typography does the heavy lifting; photography provides emotional resonance.

### 1.2 Colour Palette

| Role | Hex | Usage |
|------|-----|-------|
| Midnight | `#0D0D0D` | Hero backgrounds, nav, footer |
| Pure White | `#FFFFFF` | Content sections, card backgrounds |
| Gold Accent | `#C9A86A` | CTAs, badges, highlight underlines |
| Off-White | `#F5F5F5` | Section alternates, input backgrounds |
| Muted Grey | `#8C8C8C` | Subtext, captions, secondary labels |
| Danger | `#E53E3E` | Discounts, urgency labels |

### 1.3 Typography

| Scale | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| Display | Inter / Geist | 56–72px | 700 | Hero headline |
| H1 | Inter | 40px | 600 | Page titles |
| H2 | Inter | 32px | 600 | Section headers |
| H3 | Inter | 24px | 600 | Card titles, subsections |
| Body | Inter | 16px | 400 | Paragraph text |
| Small | Inter | 14px | 400 | Captions, metadata |
| Label | Inter | 12px | 500 | Badges, tags |

### 1.4 Motion Principles
- **Entrance:** fade-up with 300ms ease-out (no bounce)
- **Hover:** `scale(1.02)` + `shadow-lg` on cards; `opacity 0.85` on links
- **Scroll:** staggered section entrance at 80px viewport offset
- **Loading:** skeleton screens with shimmer — no spinners

---

## 2. Hero Section

### 2.1 Layout
```
┌─────────────────────────────────────────────────────────┐
│  [NAV — transparent over hero]                          │
│                                                         │
│  ┌───────────────────────┐   ┌───────────────────────┐ │
│  │                       │   │                       │ │
│  │   HEADLINE (display)  │   │   HERO IMAGE          │ │
│  │   Subheadline         │   │   (cinematic photo)   │ │
│  │                       │   │                       │ │
│  │   [SHOP NOW]  [SELL]  │   │                       │ │
│  │                       │   │                       │ │
│  │   🔒 Stripe  ✅ Verified  🇬🇧 UK Support          │ │
│  └───────────────────────┘   └───────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Background Treatment
- **Desktop:** Full-bleed lifestyle photography (`/hero-marketplace.png`) with a dark overlay gradient (`linear-gradient(to right, rgba(13,13,13,0.85) 40%, transparent 100%)`)
- **Mobile:** Image cropped to portrait ratio, overlay increased to 0.7 opacity
- **Future:** Replace with looping 8-second WebM/MP4 hero video (muted, autoplay)

### 2.3 Headline Copy
```
Primary:    "The UK's Premium Marketplace
             for Independent Sellers"

Secondary:  "Discover curated products from verified UK sellers.
             Shop with confidence. Sell with ease."

CTA 1:      "Shop Now"        (gold button, primary)
CTA 2:      "Start Selling"   (outlined white button, secondary)
```

---

## 3. Full Page Structure

### Section 1 — Hero
*Dark background. Full viewport height. Cinematic image. Dual CTA.*

### Section 2 — USP Strip
*White background. 3 columns. Icon + headline + one-line description.*
```
🔒 Secure Payments     ✅ Verified Sellers     🇬🇧 UK-Based Support
   Powered by Stripe      Every seller checked    Real humans, real help
```

### Section 3 — Trending Now 🇬🇧
*Off-white background. Horizontal scroll on mobile. 4–6 product cards.*  
Data source: most-ordered products in the last 7 days.

### Section 4 — Top Categories
*Dark background. 4-column image grid. Category name overlaid on photo.*  
Categories: Electronics · Fashion · Home & Kitchen · Tools & DIY  
Images: `/electronics-category.png`, `/home-kitchen-category.png` (+ 2 pending)

### Section 5 — Featured Sellers
*White background. Seller profile cards: avatar, store name, category, rating, "Visit Store" CTA.*  
Data source: top-rated sellers with `seller_approved = true`.

### Section 6 — Buyer Protection Guarantee
*Gold accent section. 3 guarantees side by side.*
```
💳 Secure Checkout     📦 Buyer Protection     💬 48h Dispute Resolution
```

### Section 7 — Sell on Loadify
*Dark background. Left: headline + 3 benefits. Right: seller lifestyle image.*  
CTA: "Start Selling Free"

### Section 8 — Newsletter
*Off-white. Minimal email capture. One-line headline.*  
Copy: *"Get weekly deals from verified UK sellers."*

### Section 9 — Extended Footer
*Dark background. 4-column layout.*
```
Column 1: Loadify logo + tagline + social icons
Column 2: Shop (All Products, Deals, New Arrivals, Trending)
Column 3: Sell (Become a Seller, Seller Dashboard, Pricing, Seller Guide)
Column 4: Help (Contact, Returns, Buyer Protection, FAQ)
Column 5: Company (About, Blog, Careers, Press, Privacy, Terms)

Bottom bar: © 2026 Loadify Market · XDrive Logistics Ltd · Co. No: 13171804
            [Visa] [Mastercard] [Amex] [Stripe] [SSL badge]
```

---

## 4. Component Specifications

### 4.1 ProductCard — Redesigned
```
┌─────────────────┐
│   IMAGE (4:3)   │
│  [❤ wishlist]   │
├─────────────────┤
│ Seller ✅        │
│ Product Title   │
│ ★★★★☆ (42)      │
│ £24.99          │
│ 🚚 UK Dispatch  │
│ [Add to Cart]   │
└─────────────────┘
```

### 4.2 CategoryTile — Redesigned
```
┌─────────────────┐
│                 │
│   PHOTO         │  ← full-bleed category photo
│                 │
│ Electronics  →  │  ← overlay at bottom, gold arrow
└─────────────────┘
```

### 4.3 SellerCard
```
[Avatar]  Store Name  ★ 4.9
          Electronics · 47 products
          [Visit Store]
```

---

## 5. Responsive Breakpoints

| Breakpoint | Width | Columns | Notes |
|------------|-------|---------|-------|
| Mobile S | 375px | 1 | Full-width cards, stacked hero |
| Mobile L | 414px | 1 | |
| Tablet | 768px | 2 | 2-col grid, side-by-side hero |
| Desktop | 1024px | 3–4 | Full layout |
| Wide | 1440px | 4–5 | Max container 1280px |

---

*See `homepage_copy.md` for full copywriting and `homepage_structure.json` for component tree.*
