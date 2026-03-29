// src/pages/Home.tsx
//
// IMAGE SWAP GUIDE — replace the empty strings below with the generated image
// URLs (or local public/ paths) when they become available.
// Each slot maps to one of the AI-generated cinematic product photos.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// ─── Hero ────────────────────────────────────────────────────────────────────
const HERO_IMAGE = "https://github.com/user-attachments/assets/bf6a8f51-4e1b-43a3-9ec0-3cdc972d7f30";

// ─── Category tiles ──────────────────────────────────────────────────────────
const CATEGORY_IMAGES: Record<string, string> = {
  "Electronics":    "https://github.com/user-attachments/assets/4c2485a1-d174-4a5f-b4e5-a3668d43a04e",
  "Fashion":        "", // prompt: handbag, heels, sunglasses, jewellery, hat…
  "Home & Kitchen": "https://github.com/user-attachments/assets/49a1b981-42c6-450d-bfc1-66c2aebfd04a",
  "Tools & DIY":    "", // prompt: cordless drill, hammer, screwdriver set…
};

// ─── Featured listing cards ───────────────────────────────────────────────────
const LISTING_IMAGES: string[] = [
  "", // #1 — cardboard shipping box, soft glow inside
  "", // #2 — compact smart gadget box / accessory case
  "", // #3 — medium home accessory box / lifestyle packaging
];

// ─── Secondary banners ────────────────────────────────────────────────────────
const BANNER_IMAGES: Record<string, string> = {
  "Spring Deals":        "", // prompt: green leaves, soft flares, product silhouettes
  "New Arrivals":        "", // prompt: abstract modern shapes, soft blue glow, floating silhouettes
  "Trending Now":        "", // prompt: diagonal light streaks, subtle reflections, product outlines
  "Limited Time Offers": "", // prompt: soft spotlight, subtle glow, minimal product shapes
};

// ─── App preview screens ──────────────────────────────────────────────────────
const APP_PREVIEW_IMAGES: string[] = [
  "", // #1 — Home Screen
  "", // #2 — Product Browsing
  "", // #3 — Product Page
  "", // #4 — Checkout Flow
  "", // #5 — Order Tracking
];

const APP_PREVIEW_LABELS = [
  "Home Screen",
  "Product Browsing",
  "Product Page",
  "Checkout Flow",
  "Order Tracking",
];

// ─── Component ────────────────────────────────────────────────────────────────

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
  };

  const features = [
    "Verified Sellers",
    "Secure Payments",
    "Free to Join",
    "UK-Based Marketplace",
  ];

  const categories = [
    { name: "Electronics",    slug: "electronics" },
    { name: "Fashion",        slug: "fashion" },
    { name: "Home & Kitchen", slug: "home-kitchen" },
    { name: "Tools & DIY",    slug: "tools-diy" },
  ];

  const featuredListings = [
    { name: "Featured Listing #1", image: LISTING_IMAGES[0] },
    { name: "Featured Listing #2", image: LISTING_IMAGES[1] },
    { name: "Featured Listing #3", image: LISTING_IMAGES[2] },
  ];

  const banners = [
    { label: "Spring Deals",        slug: "spring-deals",        href: "/deals?tag=spring" },
    { label: "New Arrivals",        slug: "new-arrivals",        href: "/catalog?sort=newest" },
    { label: "Trending Now",        slug: "trending",            href: "/catalog?sort=trending" },
    { label: "Limited Time Offers", slug: "limited-time-offers", href: "/deals" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b">
        <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-blue-600 font-semibold text-sm tracking-wide uppercase">
              UK Multi‑Seller Marketplace
            </span>

            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-slate-900 leading-tight">
              The UK Marketplace Connecting Buyers & Sellers
            </h1>

            <p className="mt-5 text-lg text-slate-600 max-w-lg">
              Discover trusted suppliers, list your products, and grow your business —
              all in one secure platform. Loadify Market connects independent sellers
              with buyers across the UK.
            </p>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="mt-7 flex max-w-md">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, categories…"
                className="flex-1 rounded-l-lg border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Search products"
              />
              <button
                type="submit"
                className="rounded-r-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Search
              </button>
            </form>

            {/* CTA buttons */}
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/catalog"
                className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700"
              >
                Shop Now
              </Link>
              <Link
                to="/catalog#categories"
                className="px-6 py-3 border border-slate-300 text-slate-800 font-semibold rounded-lg hover:bg-slate-100"
              >
                Browse Categories
              </Link>
            </div>
          </div>

          <div className="hidden md:flex justify-center">
            {/* Hero image — self-host by placing file at public/hero-devices.jpg
                and updating HERO_IMAGE at the top of this file. */}
            <img
              src={HERO_IMAGE}
              alt="Loadify Market — shop on any device"
              width={672}
              height={448}
              className="w-full max-w-lg rounded-2xl shadow-xl object-cover"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* ── FEATURES STRIP ───────────────────────────────────────────────────── */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {features.map((f) => (
            <div key={f} className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-lg font-bold">
                •
              </div>
              <p className="mt-3 font-semibold text-slate-800">{f}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. FEATURED LISTINGS ─────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Featured Listings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {featuredListings.map(({ name, image }) => (
              <div
                key={name}
                className="rounded-xl overflow-hidden bg-slate-50 shadow hover:shadow-lg transition"
              >
                {image ? (
                  <img
                    src={image}
                    alt={name}
                    width={600}
                    height={240}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-48 bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                    Listing Preview
                  </div>
                )}
                <div className="p-4">
                  <p className="font-semibold text-slate-800">{name}</p>
                  <Link
                    to="/catalog"
                    className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                  >
                    View in Marketplace →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. CATEGORY GRID ─────────────────────────────────────────────────── */}
      <section id="categories" className="py-16 bg-slate-50 border-b">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Explore Categories
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {categories.map(({ name, slug }) => {
              const img = CATEGORY_IMAGES[name];
              return (
                <Link
                  key={name}
                  to={`/catalog?category=${slug}`}
                  className="rounded-xl overflow-hidden bg-white shadow hover:shadow-lg transition"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={name}
                      width={400}
                      height={128}
                      className="h-32 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-32 bg-slate-200 flex items-center justify-center text-slate-500 text-sm">
                      {name}
                    </div>
                  )}
                  <div className="p-4 font-semibold text-slate-800">{name}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. SECONDARY BANNERS ─────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            Deals & Highlights
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {banners.map(({ label, href }) => {
              const img = BANNER_IMAGES[label];
              return (
                <Link
                  key={label}
                  to={href}
                  className="rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-slate-100 shadow hover:shadow-lg transition group"
                >
                  {img ? (
                    <img
                      src={img}
                      alt={label}
                      width={600}
                      height={200}
                      className="h-36 w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-36 bg-gradient-to-br from-blue-100 to-slate-200 flex items-center justify-center text-slate-500 text-sm">
                      Banner Preview
                    </div>
                  )}
                  <div className="p-4 font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                    {label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. APP DOWNLOAD ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold">
              Loadify Market — Coming to Mobile
            </h2>
            <p className="mt-4 text-blue-100 max-w-xl mx-auto">
              Shop and sell on the go. Browse listings, manage orders, and track
              deliveries — all from your phone.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {/* App Store */}
              <span
                aria-label="App Store — coming soon"
                className="inline-flex items-center gap-3 px-6 py-3 bg-white text-slate-900 font-semibold rounded-xl shadow cursor-not-allowed opacity-80"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store
                <span className="text-xs font-normal text-slate-500">(Coming Soon)</span>
              </span>

              {/* Google Play */}
              <span
                aria-label="Google Play — coming soon"
                className="inline-flex items-center gap-3 px-6 py-3 bg-white text-slate-900 font-semibold rounded-xl shadow cursor-not-allowed opacity-80"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M3.18 23.76a1.99 1.99 0 0 1-.99-1.74V1.99A2 2 0 0 1 3.18.23l11.9 11.77-11.9 11.76zM20.4 13.48l-2.6 1.5-2.79-2.75 2.79-2.75 2.6 1.5c.74.43.74 1.57 0 2zM5.12 22.96l9.31-9.2-2.33-2.3-6.98 11.5zm9.31-11.73-9.31-9.2 6.98 11.5 2.33-2.3z"/>
                </svg>
                Google Play
                <span className="text-xs font-normal text-slate-500">(Coming Soon)</span>
              </span>
            </div>
          </div>

          {/* App preview screens */}
          <div className="flex gap-4 overflow-x-auto pb-4 justify-center flex-wrap">
            {APP_PREVIEW_IMAGES.map((img, i) => (
              <div
                key={APP_PREVIEW_LABELS[i]}
                className="flex-shrink-0 w-32 md:w-40 rounded-2xl overflow-hidden shadow-lg bg-blue-800"
                title={APP_PREVIEW_LABELS[i]}
              >
                {img ? (
                  <img
                    src={img}
                    alt={`App preview — ${APP_PREVIEW_LABELS[i]}`}
                    width={160}
                    height={284}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="h-56 md:h-64 flex items-center justify-center text-blue-300 text-xs text-center px-2">
                    {APP_PREVIEW_LABELS[i]}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t bg-white pt-12 pb-6 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Branding */}
          <div>
            <p className="font-bold text-slate-800 text-base mb-3">Loadify Market</p>
            <p className="text-xs leading-relaxed">
              UK Multi‑Category Marketplace for Buyers & Sellers. Independent,
              trusted, secure.
            </p>
            {/* Social icons */}
            <div className="mt-4 flex gap-3">
              <a href="https://www.facebook.com/profile.php?id=61583570176707" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="https://www.instagram.com/loadifymarket/" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162S8.597 18.163 12 18.163s6.162-2.759 6.162-6.162S15.403 5.838 12 5.838zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://www.linkedin.com/company/loadify-market/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <p className="font-semibold text-slate-800 mb-3">Quick Links</p>
            <ul className="space-y-2">
              <li><Link to="/catalog" className="hover:text-slate-800">Browse Marketplace</Link></li>
              <li><Link to="/signup" className="hover:text-slate-800">Start Selling</Link></li>
              <li><Link to="/deals" className="hover:text-slate-800">Deals</Link></li>
              <li><Link to="/catalog?sort=newest" className="hover:text-slate-800">New Arrivals</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <p className="font-semibold text-slate-800 mb-3">Policies</p>
            <ul className="space-y-2">
              <li><Link to="/privacy" className="hover:text-slate-800">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-slate-800">Terms of Use</Link></li>
              <li><Link to="/cookies" className="hover:text-slate-800">Cookie Policy</Link></li>
              <li><Link to="/returns" className="hover:text-slate-800">Returns & Refunds</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <p className="font-semibold text-slate-800 mb-3">Help & Company</p>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-slate-800">About Us</Link></li>
              <li><Link to="/faq" className="hover:text-slate-800">Help Centre</Link></li>
              <li><Link to="/contact" className="hover:text-slate-800">Contact Us</Link></li>
              <li><Link to="/blog" className="hover:text-slate-800">Blog</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 border-t pt-5 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Loadify Market Ltd. All rights reserved.</p>
          <p className="text-xs">
            Loadify Market is a marketplace platform only. All products are listed,
            managed, and fulfilled by independent sellers.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default Home;
