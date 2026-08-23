# User-provided visual restore source — 2026-08-23

## Authority boundary

This branch restores visual identity from the files supplied directly by the user on 2026-08-23.

- Visual identity/layout/assets source: user-provided `loadify-homepage-restore` and `Pixel Perfect` packages.
- Runtime/business authority: current `loadifymarket.co.uk` main.
- Do **not** import Supabase migrations, Edge Functions, commerce authority, auth authority or security logic from `Pixel Perfect`.
- Do **not** modify `focused-image-craft` as part of this work.
- `main`, `audit-fixes/e2e-20260823`, and production remain untouched until explicit review/approval.

## Homepage composition from supplied Index.tsx

`Navbar → HeroSection → CountdownBanner (mobile) → TrustSection → WhySellSection → FeaturesSection → StatsSection → HowItWorksSection → CategoriesSection → CTASection → Footer`

## Homepage source components supplied

- BreadcrumbNav.tsx
- CTASection.tsx
- CategoriesSection.tsx
- CookieConsent.tsx
- CountdownBanner.tsx
- FeaturesSection.tsx
- Footer.tsx
- HeroSection.tsx
- HowItWorksSection.tsx
- NavLink.tsx
- Navbar.tsx
- NavbarSearch.tsx
- StatsSection.tsx
- TrustSection.tsx
- WhySellSection.tsx
- Index.tsx
- index.css
- tailwind.config.ts

## Supplied visual assets

### Core
- auth-login-bg.jpg
- auth-signup-bg.jpg
- hero-clearance-alt1.jpg
- hero-clearance-alt2.jpg
- hero-clearance-alt3.jpg
- hero-seller-dashboard.jpg
- hero-warehouse.jpg
- loadify-logo.png

### Categories
- automotive.jpg
- baby.jpg
- clearance.jpg
- clothing.jpg
- electronics.jpg
- food-drink.jpg
- health-beauty.jpg
- home.jpg
- jewellery.jpg
- mixed-pallets.jpg
- office.jpg
- overstock.jpg
- returns.jpg
- sports.jpg
- tools.jpg
- toys.jpg

## Pixel Perfect UI coverage supplied

The package additionally contains the visual implementation for public and authenticated areas, including Catalog, Product Detail, Cart, Checkout, Login/Signup, Buyer, Seller and Admin layouts/sidebars.

These files are a visual reference only. Their data hooks/business logic must not replace current canonical Loadify contracts without separate evidence-based comparison.
