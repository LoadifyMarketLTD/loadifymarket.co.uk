import { Link } from "react-router-dom";
import React, { useState, useCallback, lazy, Suspense } from "react";
import {
  BadgeCheck,
  ShieldCheck,
  Store,
  MapPin,
  Star,
  ArrowRight,
  ShoppingBag,
  X,
  Eye,
} from "lucide-react";
import Navbar from "@/components/Navbar";

// Footer is below the fold — lazy load to keep initial bundle lean
const Footer = lazy(() => import("@/components/Footer"));

// ─── TRUST STRIP ──────────────────────────────────────────────────────────────

const trustItems = [
  { icon: BadgeCheck,  title: "Verified Sellers",     sub: "All listings verified",   color: "text-[#1A4DBE]" },
  { icon: ShieldCheck, title: "Secure Payments",      sub: "Protected transactions",  color: "text-[#1A4DBE]" },
  { icon: Store,       title: "Free to Join",         sub: "No upfront listing fees", color: "text-[#28A745]" },
  { icon: MapPin,      title: "UK-Based Marketplace", sub: "Serving UK businesses",   color: "text-[#1A4DBE]" },
];

// ─── ROW 1 — 2 WIDE CATEGORY CARDS ───────────────────────────────────────────

const bigCategories = [
  {
    slug: "electronics",
    label: "Electronics",
    count: "1,300+",
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&auto=format&fit=crop",
  },
  {
    slug: "fashion",
    label: "Fashion",
    count: "900+",
    img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=700&auto=format&fit=crop",
  },
];

// ─── ROW 2 — 3 MEDIUM CATEGORY CARDS ─────────────────────────────────────────

const mediumCategories = [
  {
    slug: "home-garden",
    label: "Home & Kitchen",
    count: "1,100+",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&auto=format&fit=crop",
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    count: "450+",
    img: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=500&auto=format&fit=crop",
  },
  {
    slug: "toys",
    label: "Toys & Games",
    count: "320+",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&auto=format&fit=crop",
  },
];

// ─── FILTER TABS ──────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: "all",         label: "All"         },
  { key: "electronics", label: "Electronics" },
  { key: "fashion",     label: "Fashion"     },
  { key: "home",        label: "Home"        },
  { key: "beauty",      label: "Beauty"      },
  { key: "tools",       label: "Tools"       },
  { key: "office",      label: "Office"      },
];

// ─── FEATURED LISTINGS ────────────────────────────────────────────────────────

const featuredListings = [
  {
    id: "1",
    img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&auto=format&fit=crop",
    title: "Wireless Earbuds",
    seller: "TechDeals UK",
    price: "£49.99",
    stars: 4,
    reviews: 124,
    category: "Electronics",
    filterKey: "electronics",
  },
  {
    id: "2",
    img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&auto=format&fit=crop",
    title: "Professional Tool Kit",
    seller: "ToolMaster Pro",
    price: "£79.99",
    stars: 5,
    reviews: 87,
    category: "Tools & DIY",
    filterKey: "tools",
  },
  {
    id: "3",
    img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&auto=format&fit=crop",
    title: "Designer Handbag",
    seller: "Fashion Vault UK",
    price: "£64.90",
    stars: 3,
    reviews: 34,
    category: "Fashion",
    filterKey: "fashion",
  },
  {
    id: "4",
    img: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&auto=format&fit=crop",
    title: "Smart Watch Pro",
    seller: "GadgetHub",
    price: "£129.99",
    stars: 3,
    reviews: 56,
    category: "Electronics",
    filterKey: "electronics",
  },
  {
    id: "5",
    img: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&auto=format&fit=crop",
    title: "Skincare Gift Set",
    seller: "Beauty Boutique",
    price: "£34.99",
    stars: 5,
    reviews: 98,
    category: "Beauty",
    filterKey: "beauty",
  },
  {
    id: "6",
    img: "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?w=400&auto=format&fit=crop",
    title: "Ergonomic Office Chair",
    seller: "WorkSpace Direct",
    price: "£199.00",
    stars: 4,
    reviews: 65,
    category: "Office",
    filterKey: "office",
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function StarRow({ count, small = false }: { count: number; small?: boolean }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${count} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`${small ? "h-2.5 w-2.5" : "h-3 w-3"} ${
            n <= count ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── QUICK VIEW MODAL ─────────────────────────────────────────────────────────

type Listing = (typeof featuredListings)[0];

function QuickViewModal({ item, onClose }: { item: Listing; onClose: () => void }) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(5px)", backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="relative">
          <img src={item.img} alt={item.title} className="w-full h-64 object-cover" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center shadow transition-all"
            aria-label="Close quick view"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold text-[#1A4DBE] uppercase tracking-wide mb-1">
            {item.category}
          </p>
          <h3 id="quick-view-title" className="text-xl font-extrabold text-[#1F2937] mb-1">{item.title}</h3>
          <p className="text-xs text-gray-500 mb-3">by {item.seller}</p>
          <div className="flex items-center gap-2 mb-4">
            <StarRow count={item.stars} />
            <span className="text-sm text-gray-500">({item.reviews} reviews)</span>
          </div>
          <p className="text-2xl font-extrabold text-[#1F2937] mb-6">{item.price}</p>
          <div className="flex gap-3">
            <Link
              to="/catalog"
              onClick={onClose}
              className="flex-1 text-center bg-[#1A4DBE] text-white font-semibold py-2.5 rounded-xl hover:bg-[#1640a0] transition-all text-sm"
            >
              View Details
            </Link>
            <Link
              to="/register"
              onClick={onClose}
              className="flex-1 text-center border-2 border-[#1A4DBE] text-[#1A4DBE] font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-all text-sm"
            >
              Buy Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CATEGORY CARD (shared) ───────────────────────────────────────────────────

function CategoryCard({
  slug,
  label,
  count,
  img,
  imgHeight,
}: {
  slug: string;
  label: string;
  count: string;
  img: string;
  imgHeight: string;
}) {
  return (
    <Link
      to={`/category/${slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 flex flex-col"
    >
      <div className="overflow-hidden">
        <img
          src={img}
          alt={label}
          loading="lazy"
          className={`w-full ${imgHeight} object-cover group-hover:scale-105 transition-transform duration-300`}
        />
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-[#1F2937]">{label}</span>
        <span className="text-xs font-semibold text-[#1A4DBE] flex items-center gap-0.5 whitespace-nowrap">
          {count} <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PixelPerfectIndex() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [quickViewItem, setQuickViewItem] = useState<Listing | null>(null);

  const visibleListings =
    activeFilter === "all"
      ? featuredListings
      : featuredListings.filter((item) => item.filterKey === activeFilter);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar />

      {quickViewItem && (
        <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />
      )}

      {/* clear fixed navbar */}
      <div className="pt-16" />

      <main>
        {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#d6e4f7] via-[#e2ecf8] to-[#eef3fc] px-4 pt-10 pb-24 lg:pt-14 lg:pb-32 lg:px-6">
          <div className="max-w-[1360px] mx-auto grid lg:grid-cols-2 gap-10 items-center">

            {/* Left: copy */}
            <div className="space-y-5 max-w-xl">
              <h1 className="text-4xl lg:text-[2.75rem] font-extrabold text-[#1F2937] leading-tight">
                The UK Marketplace Connecting{" "}
                <span className="text-[#1A4DBE]">Buyers</span> &amp; Sellers
              </h1>
              <p className="text-[15px] text-gray-600 leading-relaxed">
                Discover trusted suppliers, list your products, and grow your
                business — all in one secure platform.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 bg-[#1A4DBE] text-white font-semibold px-6 py-3 rounded-lg text-sm hover:bg-[#1640a0] hover:-translate-y-[3px] transition-all duration-300 shadow-md shadow-blue-200"
                >
                  Browse Marketplace
                </Link>
                <Link
                  to="/register?type=seller"
                  className="inline-flex items-center gap-2 bg-white border border-gray-300 text-[#1F2937] font-semibold px-6 py-3 rounded-lg text-sm hover:border-[#1A4DBE] hover:-translate-y-[3px] transition-all duration-300 shadow-sm"
                >
                  <ShoppingBag className="h-4 w-4 text-[#28A745]" />
                  Start Selling
                </Link>
              </div>
            </div>

            {/* Right: product collage */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-60 lg:h-[370px]">
              <img
                src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900&auto=format&fit=crop"
                alt="UK Multi-Category Marketplace"
                width="900"
                height="506"
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
            </div>
          </div>

          {/* ── Floating trust strip ── */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 px-4 lg:px-6 z-10">
            <div className="max-w-[1100px] mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
                {trustItems.map((item) => (
                  <div key={item.title} className="flex items-center gap-3 px-4 first:pl-0">
                    <item.icon className={`h-7 w-7 shrink-0 ${item.color}`} />
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                      <p className="text-[11px] text-gray-600">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* spacer for floating trust strip */}
        <div className="h-16 bg-[#F4F7FB]" />

        {/* ── 2. CATEGORIES ───────────────────────────────────────────────── */}
        <section className="bg-[#F4F7FB] pt-6 pb-10 px-4 lg:px-6">
          <div className="max-w-[1360px] mx-auto space-y-4">

            {/* Row 1: 2 wide landscape cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bigCategories.map((cat) => (
                <CategoryCard
                  key={cat.slug}
                  slug={cat.slug}
                  label={cat.label}
                  count={cat.count}
                  img={cat.img}
                  imgHeight="h-52"
                />
              ))}
            </div>

            {/* Row 2: 3 medium cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {mediumCategories.map((cat) => (
                <CategoryCard
                  key={cat.slug}
                  slug={cat.slug}
                  label={cat.label}
                  count={cat.count}
                  img={cat.img}
                  imgHeight="h-40"
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. FEATURED LISTINGS ────────────────────────────────────────── */}
        <section className="bg-white py-10 px-4 lg:px-6">
          <div className="max-w-[1360px] mx-auto">

            {/* Section header */}
            <div className="flex items-start justify-between mb-1">
              <h2 className="text-2xl font-extrabold text-[#1F2937]">
                Featured <span className="text-[#1A4DBE]">Listings</span>
              </h2>
              <Link
                to="/catalog"
                className="text-sm font-medium text-[#1A4DBE] hover:underline flex items-center gap-1 mt-1"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Discover the best products from our verified UK sellers
            </p>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter listings by category">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  aria-pressed={activeFilter === tab.key}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
                    activeFilter === tab.key
                      ? "bg-[#1A4DBE] text-white border-[#1A4DBE]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#1A4DBE] hover:text-[#1A4DBE]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Product grid: 6 compact cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {visibleListings.map((item) => (
                <Link
                  key={item.id}
                  to="/catalog"
                  className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 flex flex-col"
                >
                  <div className="relative overflow-hidden w-full">
                    <img
                      src={item.img}
                      alt={item.title}
                      loading="lazy"
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <button
                        type="button"
                        aria-label={`Quick view ${item.title}`}
                        className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white text-gray-900 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow flex items-center gap-1"
                        onClick={(e) => { e.preventDefault(); setQuickViewItem(item); }}
                      >
                        <Eye className="h-3 w-3" aria-hidden="true" /> Quick View
                      </button>
                    </div>
                  </div>
                  <div className="p-2 flex-1 flex flex-col">
                    <p className="text-[11px] font-bold text-[#1F2937] line-clamp-1 mb-0.5">
                      {item.title}
                    </p>
                    <StarRow count={item.stars} small />
                    <p className="text-[10px] text-gray-600 mt-0.5 truncate">{item.seller}</p>
                    <p className="text-xs font-extrabold text-[#1F2937] mt-1">{item.price}</p>
                    <p className="text-[10px] text-gray-600 truncate">{item.category}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. CTA BANNER ───────────────────────────────────────────────── */}
        <section
          className="relative py-16 px-4 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0a1628 0%, #0f2347 35%, #1a3a6b 65%, #0a1628 100%)",
          }}
        >
          {/* decorative glow */}
          <div
            className="absolute bottom-0 right-0 w-[32rem] h-[32rem] rounded-full opacity-25 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, #3a7bd5 0%, #1A4DBE 40%, transparent 70%)",
              transform: "translate(30%, 30%)",
            }}
          />
          <div
            className="absolute top-0 left-0 w-80 h-80 rounded-full opacity-10 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, #60a5fa 0%, transparent 70%)",
              transform: "translate(-40%, -40%)",
            }}
          />
          <div className="relative max-w-[1360px] mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Ready to Join the Marketplace?
            </h2>
            <p className="text-blue-300 text-sm mb-8 max-w-md mx-auto">
              Connect with thousands of UK buyers and sellers. Free to join — start exploring today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 border-2 border-white text-white font-semibold px-8 py-3 rounded-lg text-sm hover:bg-white/10 hover:-translate-y-[3px] transition-all duration-300"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-[#28A745] text-white font-semibold px-8 py-3 rounded-lg text-sm hover:bg-[#219538] hover:-translate-y-[3px] transition-all duration-300 shadow-lg shadow-green-900/30"
              >
                Create Account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}
