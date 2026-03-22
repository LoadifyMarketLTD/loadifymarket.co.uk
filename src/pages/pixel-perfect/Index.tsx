import { Link } from "react-router-dom";
import React from "react";
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
    category: "Office",
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

function StarRow({ count, small = false }: { count: number; small?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${small ? "h-2.5 w-2.5" : "h-3 w-3"} ${
            i <= count ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PixelPerfectIndex() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar />

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
                  className="inline-flex items-center gap-2 bg-[#1A4DBE] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#1640a0] transition"
                >
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/register?type=seller"
                  className="inline-flex items-center gap-2 border-2 border-[#1A4DBE] text-[#1A4DBE] font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition"
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
            <div className="flex items-center justify-between mb-6">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {featuredListings.map((item) => (
                <Link
                  key={item.id}
                  to="/catalog"
                  className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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
                </Link>
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
                  className="inline-flex items-center gap-2 bg-[#1A4DBE] text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-[#1640a0] transition text-sm"
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
                  className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition text-sm"
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
                <div key={f.title} className="text-center px-4 py-6 rounded-2xl bg-gray-50 hover:bg-blue-50 transition">
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
                className="inline-flex items-center gap-2 bg-white text-[#1A4DBE] font-bold px-7 py-3 rounded-xl hover:bg-blue-50 transition"
              >
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 border-2 border-white text-white font-bold px-7 py-3 rounded-xl hover:bg-white/10 transition"
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
