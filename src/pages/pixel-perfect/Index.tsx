import { Link } from "react-router-dom";
import React, { useState, useCallback } from "react";
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
import Footer from "@/components/Footer";

// ─── CSS VARIABLES (design tokens) ────────────────────────────────────────────
// --primary-blue:    #1A4DBE
// --secondary-green: #28A745
// --text-dark:       #1F2937
// --bg-light:        #F9FAFB

// ─── DATA ─────────────────────────────────────────────────────────────────────

interface TrustItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  color: string;
}

const trustItems: TrustItem[] = [
  { icon: BadgeCheck,  title: "Verified Sellers",      sub: "All listings verified",      color: "text-[#1A4DBE]" },
  { icon: ShieldCheck, title: "Secure Payments",       sub: "Store trust & protection",   color: "text-[#1A4DBE]" },
  { icon: Store,       title: "Free to Join",          sub: "No upfront listing fees",    color: "text-[#28A745]" },
  { icon: MapPin,      title: "UK-Based Marketplace",  sub: "Serving UK businesses",      color: "text-[#1A4DBE]" },
];

// ── Big (landscape) category cards ─────────────────────────────────────────
const bigCategories = [
  {
    slug: "electronics",
    img: "/images/mock/electronics.jpg",
    label: "Electronics",
    priceRange: "£130 - £299",
    listingCount: "130+ listings",
    stars: 4,
  },
  {
    slug: "fashion",
    img: "/images/mock/fashion.jpg",
    label: "Fashion",
    priceRange: "",
    listingCount: "900+ listings",
    stars: 3,
  },
  {
    slug: "home-garden",
    img: "/images/mock/home.jpg",
    label: "Home & Kitchen",
    priceRange: "",
    listingCount: "110+ listings",
    stars: 4,
  },
];

// ── Small (product-card) category rows ─────────────────────────────────────
const smallCategories = [
  {
    slug: "business-supplies",
    img: "/images/mock/listing-desk.jpg",
    title: "Standing Desk",
    price: "£0.09 - £50",
    stars: 4,
    category: "Bulk listings",
  },
  {
    slug: "tools-diy",
    img: "/images/mock/listing-toolkit.jpg",
    title: "Tool Set",
    price: "£39 - £79",
    stars: 4,
    category: "Tools & DIY",
  },
  {
    slug: "fashion",
    img: "/images/mock/listing-bag.jpg",
    title: "Designer Handbag",
    price: "£54.90",
    stars: 3,
    category: "Fashion",
  },
  {
    slug: "electronics",
    img: "/images/mock/listing-smartwatch.jpg",
    title: "Smartwatch",
    price: "£89 - £149",
    stars: 3,
    category: "Electronics",
  },
];

// ── Filter tabs ────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: "all",         label: "All" },
  { key: "electronics", label: "Electronics" },
  { key: "fashion",     label: "Fashion" },
  { key: "home",        label: "Home" },
  { key: "beauty",      label: "Beauty" },
  { key: "tools",       label: "Tools" },
  { key: "office",      label: "Office" },
];

// ── Featured Listings data ─────────────────────────────────────────────────
const featuredListings = [
  {
    id: "1",
    img: "/images/mock/listing-headphones.jpg",
    title: "Wireless Headphones",
    seller: "TechDeals UK",
    price: "£49.99",
    originalPrice: "£89.99",
    stars: 5,
    reviews: 124,
    category: "Electronics",
    filterKey: "electronics",
    badge: "",
  },
  {
    id: "2",
    img: "/images/mock/listing-desk.jpg",
    title: "Standing Desk",
    seller: "Office Direct",
    price: "£199.00",
    originalPrice: "£349.00",
    stars: 5,
    reviews: 87,
    category: "Home & Office",
    filterKey: "home",
    badge: "",
  },
  {
    id: "3",
    img: "/images/mock/listing-bag.jpg",
    title: "Designer Handbag",
    seller: "Fashion Vault",
    price: "£54.90",
    originalPrice: "£120.00",
    stars: 3,
    reviews: 34,
    category: "Fashion",
    filterKey: "fashion",
    badge: "",
  },
  {
    id: "4",
    img: "/images/mock/listing-smartwatch.jpg",
    title: "Smartwatch Pro",
    seller: "GadgetHub",
    price: "£89.99",
    originalPrice: "£149.99",
    stars: 3,
    reviews: 56,
    category: "Electronics",
    filterKey: "electronics",
    badge: "",
  },
  {
    id: "5",
    img: "/images/mock/listing-skincare.jpg",
    title: "Skincare Gift Set",
    seller: "Beauty Boutique",
    price: "£34.99",
    originalPrice: "£60.00",
    stars: 5,
    reviews: 98,
    category: "Beauty",
    filterKey: "beauty",
    badge: "",
  },
  {
    id: "6",
    img: "/images/mock/listing-chair.jpg",
    title: "Office Chair",
    seller: "Comfort Seating",
    price: "£199.00",
    originalPrice: "£350.00",
    stars: 4,
    reviews: 65,
    category: "Office",
    filterKey: "office",
    badge: "",
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calculateSavingsPercent(price: string, originalPrice: string): number {
  const current = parseFloat(price.replace("£", "").split("-")[0].trim());
  const original = parseFloat(originalPrice.replace("£", "").trim());
  if (isNaN(current) || isNaN(original) || original <= current) return 0;
  return Math.round((1 - current / original) * 100);
}

function StarRow({ count, total = 5, small = false }: { count: number; total?: number; small?: boolean }) {
  const size = small ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }, (_, idx) => idx + 1).map((starNumber) => (
        <Star
          key={starNumber}
          className={`${size} ${
            starNumber <= count ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── QUICK VIEW MODAL ─────────────────────────────────────────────────────────

type Listing = (typeof featuredListings)[0];

interface QuickViewModalProps {
  item: Listing;
  onClose: () => void;
}

function QuickViewModal({ item, onClose }: QuickViewModalProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  const savings = item.originalPrice
    ? calculateSavingsPercent(item.price, item.originalPrice)
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(5px)", backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="relative">
          <img src={item.img} alt={item.title} className="w-full h-64 object-cover" />
          {item.badge && (
            <span className="absolute top-3 left-3 bg-[#1A4DBE] text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
              {item.badge}
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center shadow transition-all duration-300"
            aria-label="Close quick view"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold text-[#1A4DBE] uppercase tracking-wide mb-1">
            {item.category}
          </p>
          <h3 className="text-xl font-extrabold text-[#1F2937] mb-1">{item.title}</h3>
          <p className="text-xs text-gray-500 mb-3">by {item.seller}</p>
          <div className="flex items-center gap-2 mb-4">
            <StarRow count={item.stars} />
            <span className="text-sm text-gray-500">({item.reviews} reviews)</span>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-2xl font-extrabold text-[#1F2937]">{item.price}</span>
            {item.originalPrice && (
              <span className="text-sm text-gray-400 line-through">{item.originalPrice}</span>
            )}
            {savings > 0 && (
              <span className="text-sm font-semibold text-emerald-600">Save {savings}%</span>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              to="/catalog"
              onClick={onClose}
              className="flex-1 text-center bg-[#1A4DBE] text-white font-semibold py-2.5 rounded-xl hover:bg-[#1640a0] transition-all duration-300 text-sm"
            >
              View Details
            </Link>
            <Link
              to="/register"
              onClick={onClose}
              className="flex-1 text-center border-2 border-[#1A4DBE] text-[#1A4DBE] font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-all duration-300 text-sm"
            >
              Buy Now
            </Link>
          </div>
        </div>
      </div>
    </div>
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

      {/* Quick View Modal */}
      {quickViewItem && (
        <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />
      )}

      {/* top padding to clear fixed Navbar */}
      <div className="pt-16" />

      <main>
        {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#dde9f8] via-[#e5eef9] to-[#eef3fc] px-4 pt-10 pb-20 lg:pt-14 lg:pb-28 lg:px-6">
          <div className="max-w-[1360px] mx-auto grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: text */}
            <div className="space-y-5 max-w-xl">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-[#1F2937] leading-tight">
                The UK Marketplace<br />
                Connecting{" "}
                <span className="text-[#1A4DBE]">Buyers</span> &amp; Sellers
              </h1>
              <p className="text-base text-gray-600">
                Discover trusted suppliers, list your products, and grow your business
                — all in one secure platform.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 bg-[#1A4DBE] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#1640a0] hover:-translate-y-[3px] transition-all duration-300 text-sm"
                >
                  Browse Marketplace
                </Link>
                <Link
                  to="/register?type=seller"
                  className="inline-flex items-center gap-2 bg-white border border-gray-300 text-[#1F2937] font-semibold px-6 py-3 rounded-lg hover:border-[#1A4DBE] hover:-translate-y-[3px] transition-all duration-300 text-sm shadow-sm"
                >
                  <ShoppingBag className="h-4 w-4 text-[#28A745]" />
                  Start Selling
                </Link>
              </div>
            </div>

            {/* Right: hero image */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-64 lg:h-[380px]">
              <img
                src="/images/mock/hero-collage.jpg"
                alt="UK Marketplace"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>

          {/* ── Trust strip (floating card, overlaps bottom of hero) ── */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 px-4 lg:px-6 z-10">
            <div className="max-w-[1100px] mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 px-6 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-x divide-gray-100">
                {trustItems.map((item) => (
                  <div key={item.title} className="flex items-center gap-3 px-2 first:pl-0">
                    <item.icon className={`h-7 w-7 shrink-0 ${item.color}`} />
                    <div>
                      <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                      <p className="text-[11px] text-gray-400">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* spacer to compensate for trust strip overlap */}
        <div className="h-16 bg-[#F9FAFB]" />

        {/* ── 2. CATEGORIES ───────────────────────────────────────────────── */}
        <section className="bg-[#F9FAFB] pt-6 pb-10 px-4 lg:px-6">
          <div className="max-w-[1360px] mx-auto space-y-4">
            {/* Row 1 — 3 large landscape cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {bigCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="group relative rounded-2xl overflow-hidden h-48 shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
                >
                  <img
                    src={cat.img}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white font-bold text-base mb-0.5">{cat.label}</p>
                    <div className="flex items-center gap-2">
                      <StarRow count={cat.stars} small />
                      <span className="text-[11px] text-gray-300">{cat.priceRange ? `${cat.priceRange} · ` : ""}{cat.listingCount}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Row 2 — 4 compact product cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {smallCategories.map((item) => (
                <Link
                  key={item.slug + item.title}
                  to={`/category/${item.slug}`}
                  className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 flex flex-col"
                >
                  <div className="overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-3 flex-1">
                    <p className="text-xs font-semibold text-[#1F2937] mb-0.5 truncate">{item.title}</p>
                    <p className="text-[11px] text-[#1A4DBE] font-medium mb-1">{item.price}</p>
                    <div className="flex items-center gap-1">
                      <StarRow count={item.stars} small />
                      <span className="text-[10px] text-gray-400 ml-0.5">{item.category}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. FEATURED LISTINGS ────────────────────────────────────────── */}
        <section className="bg-white py-10 px-4 lg:px-6">
          <div className="max-w-[1360px] mx-auto">
            {/* Title */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-extrabold text-[#1F2937]">
                Featured{" "}
                <span className="text-[#1A4DBE]">Listings</span>
              </h2>
              <Link
                to="/catalog"
                className="text-sm font-medium text-[#1A4DBE] hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  data-filter={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
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

            {/* Product grid — 6 compact cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {visibleListings.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 cursor-pointer flex flex-col"
                  onClick={() => setQuickViewItem(item)}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Quick View overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white text-gray-900 text-[10px] font-semibold px-2.5 py-1 rounded-full shadow flex items-center gap-1">
                        <Eye className="h-3 w-3" /> Quick View
                      </span>
                    </div>
                  </div>
                  <div className="p-2 flex-1 flex flex-col">
                    <p className="text-[11px] font-semibold text-[#1F2937] line-clamp-1 mb-0.5">{item.title}</p>
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <StarRow count={item.stars} small />
                    </div>
                    <p className="text-[10px] text-gray-400 mb-0.5 truncate">{item.seller}</p>
                    <p className="text-xs font-bold text-[#1F2937] mt-auto">{item.price}</p>
                    <p className="text-[10px] text-gray-400 truncate">{item.category}</p>
                  </div>
                </div>
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
          {/* decorative earth-glow overlay */}
          <div
            className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
            style={{
              background: "radial-gradient(circle, #3a7bd5 0%, #1A4DBE 40%, transparent 70%)",
              transform: "translate(30%, 30%)",
            }}
          />
          <div className="relative max-w-[1360px] mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-white mb-7">
              Ready to Join the Marketplace?
            </h2>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 border-2 border-white text-white font-semibold px-7 py-3 rounded-lg hover:bg-white/10 hover:-translate-y-[3px] transition-all duration-300 text-sm"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-[#28A745] text-white font-semibold px-7 py-3 rounded-lg hover:bg-[#219538] hover:-translate-y-[3px] transition-all duration-300 text-sm motion-safe:animate-pulse hover:animate-none"
              >
                Create Account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
