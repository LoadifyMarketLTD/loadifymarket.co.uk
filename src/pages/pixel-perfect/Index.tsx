import { Link } from "react-router-dom";
import React, { useState, useCallback } from "react";
import {
  BadgeCheck,
  ShieldCheck,
  Store,
  MapPin,
  Star,
  ArrowRight,
  Zap,
  Package,
  TrendingUp,
  Users,
  CheckCircle2,
  ChevronRight,
  X,
  Eye,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── DATA ─────────────────────────────────────────────────────────────────────

interface TrustItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  color: string;
}

const trustItems: TrustItem[] = [
  {
    icon: BadgeCheck,
    title: "Verified Sellers",
    sub: "All listings verified",
    color: "text-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    sub: "Protected transactions",
    color: "text-blue-500",
  },
  {
    icon: Store,
    title: "Free to List",
    sub: "No upfront listing fees",
    color: "text-emerald-500",
  },
  {
    icon: MapPin,
    title: "UK-Based Marketplace",
    sub: "Serving UK businesses",
    color: "text-blue-500",
  },
];

const categories = [
  { slug: "electronics", img: "/images/mock/electronics.jpg", label: "Electronics" },
  { slug: "fashion", img: "/images/mock/fashion.jpg", label: "Fashion" },
  { slug: "home-garden", img: "/images/mock/home.jpg", label: "Home & Garden" },
  { slug: "health-beauty", img: "/images/mock/beauty.jpg", label: "Beauty" },
  { slug: "tools-diy", img: "/images/mock/tools.jpg", label: "Tools & DIY" },
  { slug: "business-supplies", img: "/images/mock/office.jpg", label: "Office & Business" },
  { slug: "baby-kids", img: "/images/mock/baby.jpg", label: "Baby & Kids" },
  { slug: "automotive", img: "/images/mock/automotive.jpg", label: "Automotive" },
];

const specialCategories = [
  { slug: "clearance", img: "/images/mock/clearance.jpg", label: "Clearance Sale", badge: "Up to 70% off" },
  { slug: "amazon-returns", img: "/images/mock/returns.jpg", label: "Amazon Returns", badge: "Great Deals" },
  { slug: "wholesale", img: "/images/mock/overstock.jpg", label: "Wholesale & Bulk", badge: "Trade Prices" },
];

const FILTER_TABS = [
  { key: "all",         label: "All" },
  { key: "electronics", label: "Electronics" },
  { key: "fashion",     label: "Fashion" },
  { key: "home",        label: "Home" },
  { key: "beauty",      label: "Beauty" },
  { key: "tools",       label: "Tools" },
  { key: "office",      label: "Office" },
];

const featuredListings = [
  {
    id: "1",
    img: "/images/mock/listing-smartwatch.jpg",
    title: "Smart Watch Pro Series X",
    price: "£89.99",
    originalPrice: "£149.99",
    stars: 5,
    reviews: 124,
    category: "Electronics",
    filterKey: "electronics",
    badge: "Hot Deal",
  },
  {
    id: "2",
    img: "/images/mock/listing-bag.jpg",
    title: "Premium Leather Handbag",
    price: "£54.99",
    originalPrice: "£99.00",
    stars: 4,
    reviews: 87,
    category: "Fashion",
    filterKey: "fashion",
    badge: "New In",
  },
  {
    id: "3",
    img: "/images/mock/listing-chair.jpg",
    title: "Ergonomic Office Chair",
    price: "£199.00",
    originalPrice: "£349.00",
    stars: 5,
    reviews: 213,
    category: "Office",
    filterKey: "office",
    badge: "Best Seller",
  },
  {
    id: "4",
    img: "/images/mock/listing-toolkit.jpg",
    title: "Professional Tool Kit 150pc",
    price: "£44.99",
    originalPrice: "£79.99",
    stars: 4,
    reviews: 56,
    category: "Tools",
    filterKey: "tools",
    badge: "",
  },
  {
    id: "5",
    img: "/images/mock/listing-skincare.jpg",
    title: "Luxury Skincare Gift Set",
    price: "£34.99",
    originalPrice: "£60.00",
    stars: 5,
    reviews: 98,
    category: "Beauty",
    filterKey: "beauty",
    badge: "Limited",
  },
  {
    id: "6",
    img: "/images/mock/listing-laptop.jpg",
    title: "Refurbished Laptop 15.6″",
    price: "£349.00",
    originalPrice: "£599.00",
    stars: 4,
    reviews: 174,
    category: "Electronics",
    filterKey: "electronics",
    badge: "Clearance",
  },
  {
    id: "7",
    img: "/images/mock/listing-headphones.jpg",
    title: "Wireless Noise-Cancelling Headphones",
    price: "£79.99",
    originalPrice: "£129.99",
    stars: 5,
    reviews: 311,
    category: "Electronics",
    filterKey: "electronics",
    badge: "Top Rated",
  },
  {
    id: "8",
    img: "/images/mock/listing-desk.jpg",
    title: "Height-Adjustable Standing Desk",
    price: "£279.00",
    originalPrice: "£450.00",
    stars: 4,
    reviews: 65,
    category: "Home",
    filterKey: "home",
    badge: "",
  },
];

const features = [
  {
    icon: Zap,
    title: "Instant Listings",
    desc: "List your products in minutes with our streamlined seller dashboard.",
  },
  {
    icon: Package,
    title: "All Categories",
    desc: "From electronics to fashion, beauty to bulk — one platform, every category.",
  },
  {
    icon: TrendingUp,
    title: "Grow Your Sales",
    desc: "Reach thousands of UK buyers actively shopping every day.",
  },
  {
    icon: Users,
    title: "Trusted Community",
    desc: "Verified sellers, buyer protection, and transparent reviews.",
  },
];

const howItWorksBuyer = [
  { step: "1", title: "Browse & Discover", desc: "Explore thousands of listings across every category." },
  { step: "2", title: "Compare & Buy", desc: "Secure checkout with buyer protection on every order." },
  { step: "3", title: "Receive & Review", desc: "Get your items delivered and leave a verified review." },
];

const howItWorksSeller = [
  { step: "1", title: "Create Your Account", desc: "Sign up for free and set up your seller profile." },
  { step: "2", title: "List Your Products", desc: "Add products with photos, prices, and descriptions." },
  { step: "3", title: "Get Paid", desc: "Receive payments securely, direct to your account." },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calculateSavingsPercent(price: string, originalPrice: string): number {
  const current = parseFloat(price.replace("£", ""));
  const original = parseFloat(originalPrice.replace("£", ""));
  if (!original || original <= current) return 0;
  return Math.round((1 - current / original) * 100);
}

function StarRow({ count, small = false }: { count: number; small?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((starNumber) => (
        <Star
          key={starNumber}
          className={`${small ? "h-2.5 w-2.5" : "h-3 w-3"} ${
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: "blur(5px)", backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in">
        <div className="relative">
          <img
            src={item.img}
            alt={item.title}
            className="w-full h-64 object-cover"
          />
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
          <h3 className="text-xl font-extrabold text-gray-900 mb-3">{item.title}</h3>
          <div className="flex items-center gap-2 mb-4">
            <StarRow count={item.stars} />
            <span className="text-sm text-gray-500">({item.reviews} reviews)</span>
          </div>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-2xl font-extrabold text-gray-900">{item.price}</span>
            <span className="text-sm text-gray-400 line-through">{item.originalPrice}</span>
            {item.originalPrice && calculateSavingsPercent(item.price, item.originalPrice) > 0 && (
              <span className="text-sm font-semibold text-emerald-600">
                Save {calculateSavingsPercent(item.price, item.originalPrice)}%
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              to="/catalog"
              onClick={onClose}
              className="flex-1 text-center bg-[#1A4DBE] text-white font-semibold py-2.5 rounded-xl hover:bg-[#1640a0] transition-all duration-300 text-sm"
            >
              View Full Details
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
        <section className="bg-gradient-to-br from-[#d6e8fb] via-[#ddeeff] to-[#e8f3ff] px-4 py-10 lg:py-16 lg:px-6">
          <div className="max-w-[1360px] mx-auto grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-5">
              <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                UK's Multi-Category Marketplace
              </span>
              <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                Buy & Sell Anything —{" "}
                <span className="text-[#1A4DBE]">All in One Place</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg">
                Discover great deals across electronics, fashion, home, beauty, tools, and more.
                Verified UK sellers. Secure payments. Free to list.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 bg-[#1A4DBE] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1640a0] hover:-translate-y-[3px] transition-all duration-300"
                >
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/register?type=seller"
                  className="inline-flex items-center gap-2 border-2 border-[#1A4DBE] text-[#1A4DBE] font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 hover:-translate-y-[3px] transition-all duration-300"
                >
                  Start Selling
                </Link>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> No listing fees
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Buyer protection
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> UK verified sellers
                </span>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-64 lg:h-[400px]">
              <img
                src="/images/mock/hero-collage.jpg"
                alt="Marketplace hero"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              {/* floating badge */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-gray-900">4.9</span>
                <span className="text-xs text-gray-500">Trusted UK Marketplace</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. TRUST STRIP ──────────────────────────────────────────────── */}
        <section className="bg-white border-y border-gray-100 py-4">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {trustItems.map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <item.icon className={`h-7 w-7 shrink-0 ${item.color}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. CATEGORIES ───────────────────────────────────────────────── */}
        <section className="bg-gray-50 py-10">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-gray-900">Shop by Category</h2>
              <Link
                to="/catalog"
                className="text-sm font-medium text-[#1A4DBE] hover:underline flex items-center gap-1"
              >
                All Categories <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Main categories */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-5">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="group flex flex-col items-center gap-2"
                >
                  <div className="w-full aspect-square rounded-2xl overflow-hidden bg-white shadow-sm group-hover:shadow-md transition-shadow">
                    <img
                      src={cat.img}
                      alt={cat.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center leading-tight">
                    {cat.label}
                  </span>
                </Link>
              ))}
            </div>

            {/* Special categories */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {specialCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="group relative rounded-2xl overflow-hidden h-36 shadow-sm hover:shadow-md transition-shadow"
                >
                  <img
                    src={cat.img}
                    alt={cat.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/20 flex flex-col justify-end p-4">
                    <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wide mb-1">
                      {cat.badge}
                    </span>
                    <span className="text-base font-bold text-white">{cat.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. FEATURED LISTINGS ────────────────────────────────────────── */}
        <section className="bg-white py-10">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-extrabold text-gray-900">
                Featured Listings
              </h2>
              <Link
                to="/catalog"
                className="text-sm font-medium text-[#1A4DBE] hover:underline flex items-center gap-1"
              >
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  data-filter={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all duration-300 ${
                    activeFilter === tab.key
                      ? "bg-[#1A4DBE] text-white border-[#1A4DBE]"
                      : "bg-white text-gray-600 border-gray-200 hover:border-[#1A4DBE] hover:text-[#1A4DBE]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {visibleListings.map((item) => (
                <div
                  key={item.id}
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-[3px] cursor-pointer"
                  onClick={() => setQuickViewItem(item)}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.badge && (
                      <span className="absolute top-2 left-2 bg-[#1A4DBE] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {/* Quick View overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" /> Quick View
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{item.category}</p>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug mb-1.5">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mb-2">
                      <StarRow count={item.stars} small />
                      <span className="text-[10px] text-gray-400">({item.reviews})</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-gray-900">{item.price}</span>
                      <span className="text-xs text-gray-400 line-through">{item.originalPrice}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. COMBINED BUYER + SELLER SECTION ──────────────────────────── */}
        <section className="bg-gradient-to-br from-[#f0f6ff] to-[#e8f0fd] py-12">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Buyer panel */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">For Buyers</p>
                    <h3 className="text-xl font-bold text-gray-900">Shop With Confidence</h3>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "Thousands of products across every category",
                    "Verified UK sellers — quality guaranteed",
                    "Secure checkout with buyer protection",
                    "Easy returns and responsive support",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/catalog"
                  className="inline-flex items-center gap-2 bg-[#1A4DBE] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1640a0] hover:-translate-y-[2px] transition-all duration-300 text-sm"
                >
                  Start Shopping <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Seller panel */}
              <div className="bg-white rounded-2xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Store className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">For Sellers</p>
                    <h3 className="text-xl font-bold text-gray-900">Grow Your Business</h3>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "Free to list — no monthly subscription",
                    "Reach thousands of UK buyers daily",
                    "Sell any category: retail, wholesale, clearance",
                    "Fast payouts and seller dashboard analytics",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register?type=seller"
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 hover:-translate-y-[2px] transition-all duration-300 text-sm"
                >
                  Become a Seller <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 6. FEATURES ─────────────────────────────────────────────────── */}
        <section className="bg-white py-12">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
                Why Loadify Market?
              </h2>
              <p className="text-gray-500 text-sm max-w-xl mx-auto">
                A modern UK marketplace built for buyers and sellers who want simplicity, trust, and results.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {features.map((f) => (
                <div key={f.title} className="text-center px-4 py-6 rounded-2xl bg-gray-50 hover:bg-blue-50 hover:-translate-y-[3px] transition-all duration-300 cursor-default">
                  <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <f.icon className="h-6 w-6 text-[#1A4DBE]" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. HOW IT WORKS ─────────────────────────────────────────────── */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900">How It Works</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              {/* Buyers */}
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">For Buyers</p>
                <div className="space-y-5">
                  {howItWorksBuyer.map((s) => (
                    <div key={s.step} className="flex gap-4 items-start">
                      <div className="w-9 h-9 rounded-full bg-[#1A4DBE] text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {s.step}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Sellers */}
              <div>
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-4">For Sellers</p>
                <div className="space-y-5">
                  {howItWorksSeller.map((s) => (
                    <div key={s.step} className="flex gap-4 items-start">
                      <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {s.step}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 8. FINAL CTA ────────────────────────────────────────────────── */}
        <section className="bg-[#1A4DBE] py-14 px-4">
          <div className="max-w-[1360px] mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Ready to get started?
            </h2>
            <p className="text-blue-200 text-sm mb-7 max-w-md mx-auto">
              Join thousands of UK buyers and sellers on Loadify Market today. It's free to join.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-[#28A745] text-white font-bold px-7 py-3 rounded-xl hover:bg-[#219538] transition-all duration-300 motion-safe:animate-pulse hover:animate-none"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-7 py-3 rounded-xl hover:bg-white/10 transition-all duration-300"
              >
                Start Selling
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── 9. FOOTER ───────────────────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
