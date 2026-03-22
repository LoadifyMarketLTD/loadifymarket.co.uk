import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  BadgeCheck,
  ShieldCheck,
  Store,
  ArrowRight,
  Star,
  ChevronDown,
  User,
  Menu,
  X,
  MapPin,
} from "lucide-react";
import logo from "@/assets/loadify-logo.svg";
import { useAuthStore } from "@/store";
import { supabase } from "@/lib/supabase";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const trustItems = [
  {
    icon: BadgeCheck,
    title: "Verified Sellers",
    sub: "All listings verified",
    color: "text-blue-500",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    sub: "Secure transactions",
    color: "text-blue-500",
  },
  {
    icon: Store,
    title: "Free to Join",
    sub: "No listing fees",
    color: "text-emerald-500",
  },
  {
    icon: MapPin,
    title: "UK-Based Marketplace",
    sub: "Shop UK Marketplace",
    color: "text-blue-500",
  },
];

const topCategories = [
  {
    name: "Electronics",
    count: "130+ listings",
    priceRange: "£130.60+ · £299",
    stars: 4,
    image: "/images/categories/electronics.jpg",
  },
  {
    name: "Fashion",
    count: "900+ listings",
    priceRange: "",
    stars: 3,
    image: "/images/categories/fashion.jpg",
  },
  {
    name: "Home & Kitchen",
    count: "110+ listings",
    priceRange: "",
    stars: 4,
    image: "/images/categories/home-kitchen.jpg",
  },
];

const productCards = [
  {
    title: "Sample Listing",
    price: "£0.09 – £000",
    category: "Bulk listing",
    stars: 4,
    image: "/images/products/sample-listing.jpg",
  },
  {
    title: "Tool Set",
    price: "£0.009 – £000",
    category: "Tools & DIY",
    stars: 4,
    image: "/images/products/toolset.jpg",
  },
  {
    title: "Designer Handbag",
    price: "£0.90",
    category: "Fashion",
    stars: 3,
    image: "/images/products/handbag.jpg",
  },
  {
    title: "Smartwatch",
    price: "£110.9 – £000",
    category: "Electronics",
    stars: 4,
    image: "/images/products/smartwatch.jpg",
  },
];

const featuredListings = [
  {
    title: "Sample Listing",
    seller: "Exact Bazaar",
    price: "£00.99",
    category: "Electronics",
    stars: 5,
    image: "/images/featured/earbuds.jpg",
  },
  {
    title: "Sample Listing",
    seller: "Dr. Blue Bazaar",
    price: "£00.99",
    category: "Heat Spray",
    stars: 5,
    image: "/images/featured/toolbox.jpg",
  },
  {
    title: "Designer Handbag",
    seller: "Greatfan",
    price: "£00.90",
    category: "Tools & DIY",
    stars: 3,
    image: "/images/featured/handbag2.jpg",
  },
  {
    title: "Smartwatch",
    seller: "Saver listings",
    price: "£00.99–£000",
    category: "Electronics",
    stars: 3,
    image: "/images/featured/smartwatch2.jpg",
  },
  {
    title: "Skincare Set",
    seller: "Gadgetbourne",
    price: "£00.99",
    category: "Beauty",
    stars: 4,
    image: "/images/featured/skincare2.jpg",
  },
  {
    title: "Office Chair",
    seller: "Steel listings",
    price: "£00.99",
    category: "Office",
    stars: 4,
    image: "/images/featured/chair.jpg",
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Light grey placeholder — neutral, does not make all broken images look identical
const FALLBACK_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3C/svg%3E";

function imgFallback(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget as HTMLImageElement;
  if (img.src !== FALLBACK_SVG) img.src = FALLBACK_SVG;
}

function StarRow({
  count = 4,
  small = false,
}: {
  count?: number;
  small?: boolean;
}) {
  const cls = small ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${cls} ${
            i < count
              ? "fill-[#FFC107] text-[#FFC107]"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

// ─── HERO TILE GRID DATA ───────────────────────────────────────────────────────

const heroTiles = [
  { img: "/images/categories/electronics.jpg", label: "Electronics" },
  { img: "/images/categories/fashion.jpg", label: "Fashion" },
  { img: "/images/categories/home-kitchen.jpg", label: "Home" },
  { img: "/images/products/toolset.jpg", label: "Tools" },
  { img: "/images/featured/skincare2.jpg", label: "Beauty" },
  { img: "/images/featured/toolbox.jpg", label: "Auto" },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PixelPerfectIndex() {
  const [searchValue, setSearchValue] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const dashboardPath =
    user?.role === "seller"
      ? "/pp/seller"
      : user?.role === "admin" || user?.role === "owner"
      ? "/pp/admin"
      : "/pp/buyer";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    navigate("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(
      `/catalog${searchValue ? `?q=${encodeURIComponent(searchValue)}` : ""}`
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* ── THIN DARK STRIP ────────────────────────────────────────────── */}
      <div className="h-7 w-full bg-[#0d1f3c]" />

      {/* ── MAIN HEADER ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-6 flex items-center gap-4 h-[68px]">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 w-[200px] lg:w-[220px]"
          >
            <img
              src={logo}
              alt="Loadify Market logo"
              className="h-9 w-9 object-contain"
            />
            <span className="font-bold text-[17px] tracking-tight text-[#0d1f3c] whitespace-nowrap">
              Loadify{" "}
              <span className="text-[#1A4DBE]">Market</span>
            </span>
          </Link>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            className="flex-1 hidden sm:block"
          >
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, categories..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full h-[46px] pl-10 pr-4 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition placeholder:text-gray-400"
              />
            </div>
          </form>

          {/* Desktop right actions */}
          <div className="hidden lg:flex items-center gap-5 ml-auto shrink-0">
            {user ? (
              <>
                <Link
                  to={dashboardPath}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-gray-500 hover:text-gray-800 transition"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition"
                >
                  Dashboard
                </Link>
                <User className="h-5 w-5 text-gray-400" />
                <Link
                  to="/register"
                  className="text-sm font-semibold text-gray-800 hover:text-blue-600 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden ml-auto p-2 text-gray-600"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
            <Link
              to="/catalog"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-gray-700"
            >
              Catalog
            </Link>
            <Link
              to="/clearance"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-gray-700"
            >
              Deals
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-gray-700"
            >
              Contact
            </Link>
            <div className="flex gap-3 pt-2 border-t border-gray-100">
              {user ? (
                <Link
                  to={dashboardPath}
                  className="flex-1 text-center py-2 text-sm font-medium bg-[#1A4DBE] text-white rounded-lg"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex-1 text-center py-2 text-sm font-medium border border-gray-200 rounded-lg text-gray-700"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="flex-1 text-center py-2 text-sm font-medium bg-[#1A4DBE] text-white rounded-lg"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── NAV ROW ────────────────────────────────────────────────────── */}
      <nav className="bg-white border-b border-gray-100 sticky top-[68px] z-40">
        <div className="max-w-[1360px] mx-auto px-4 lg:px-6 flex items-center h-[44px] overflow-x-auto scrollbar-hide gap-0">
          <Link
            to="/catalog"
            className="px-3 h-full flex items-center text-sm font-medium text-[#1A4DBE] border-b-2 border-[#1A4DBE] shrink-0 whitespace-nowrap"
          >
            Catalog
          </Link>
          <Link
            to="/clearance"
            className="px-3 h-full flex items-center text-sm text-gray-600 hover:text-gray-900 transition shrink-0"
          >
            Deals
          </Link>
          <Link
            to="/contact"
            className="px-3 h-full flex items-center text-sm text-gray-600 hover:text-gray-900 transition shrink-0"
          >
            Contact
          </Link>
          <button className="px-3 h-full flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition shrink-0">
            Information <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button className="px-3 h-full flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition shrink-0">
            Resources <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <Link
            to="/contact"
            className="px-3 h-full flex items-center text-sm text-gray-600 hover:text-gray-900 transition shrink-0"
          >
            Contact
          </Link>

          {/* Google rating */}
          <div className="ml-auto flex items-center gap-1.5 text-sm shrink-0 pl-4">
            <Star className="h-3.5 w-3.5 fill-[#FFC107] text-[#FFC107]" />
            <span className="font-semibold text-gray-800">5.0</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 text-[11px]">4.24</span>
            <span className="font-medium text-[#4285F4] text-[11px]">
              Google
            </span>
          </div>
        </div>
      </nav>

      <main>
        {/* ── HERO ───────────────────────────────────────────────────────── */}
        <section className="bg-[#f4f7fc] px-4 pt-5 pb-0 lg:px-6">
          <div className="max-w-[1360px] mx-auto">
            <div className="relative bg-gradient-to-br from-[#d6e8fb] via-[#ddeeff] to-[#e8f3ff] rounded-[24px] overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] items-stretch min-h-[380px] lg:min-h-[400px]">
                {/* Left: copy */}
                <div className="flex flex-col justify-center px-7 lg:px-12 pt-9 pb-6 max-w-[600px]">
                  <h1 className="text-[34px] sm:text-[42px] lg:text-[52px] font-extrabold text-[#0d1f3c] leading-[1.06] tracking-tight">
                    The UK Marketplace
                    <br />
                    Connecting{" "}
                    <span className="text-[#1A4DBE]">Buyers</span> &amp;
                    Sellers
                  </h1>
                  <p className="mt-4 text-[17px] leading-relaxed text-gray-500 max-w-[460px]">
                    Discover trusted suppliers, list your products, and grow
                    your business — all in one secure platform.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      to="/catalog"
                      className="inline-flex items-center gap-2 bg-[#1A4DBE] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#163fa0] transition shadow-md shadow-blue-200/60"
                    >
                      Browse Marketplace
                    </Link>
                    <Link
                      to="/register?type=seller"
                      className="inline-flex items-center gap-2 bg-[#28A745] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#22963d] transition shadow-sm"
                    >
                      <Store className="h-4 w-4 text-white" />
                      Start Selling
                    </Link>
                  </div>
                </div>

                {/* Right: product-tile + phone composition */}
                <div className="hidden lg:flex items-end self-stretch w-[480px] relative overflow-hidden">
                  {/* Dark panel */}
                  <div className="absolute inset-x-0 bottom-0 top-0 bg-[#1a3260] rounded-tl-[20px]">
                    {/* Tile grid background */}
                    <div className="grid grid-cols-3 gap-2.5 p-5">
                      {heroTiles.map((t) => (
                        <div
                          key={t.label}
                          className="aspect-square rounded-xl overflow-hidden bg-[#1f4475]/60 border border-white/10"
                        >
                          <img
                            src={t.img}
                            alt={t.label}
                            className="w-full h-full object-cover opacity-75"
                            onError={imgFallback}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Phone mockup — lower-right */}
                    <div className="absolute right-8 bottom-0 w-[132px]">
                      <div
                        className="relative bg-[#0a1a38] rounded-[30px] border-[5px] border-[#1e3870] shadow-2xl overflow-hidden"
                        style={{ paddingTop: "195%" }}
                      >
                        <div className="absolute inset-0 flex flex-col">
                          {/* Notch */}
                          <div className="flex justify-center pt-2.5">
                            <div className="h-1.5 w-10 bg-[#1e3870] rounded-full" />
                          </div>
                          {/* Screen */}
                          <div className="flex-1 bg-white mx-1 mb-1 rounded-b-[24px] overflow-hidden">
                            <div className="bg-[#1A4DBE] text-white text-[6.5px] font-bold px-2 py-1 flex items-center gap-1">
                              <span>≋</span> Loadify Market
                            </div>
                            <img
                              src="/images/products/smartwatch.jpg"
                              alt="Smartwatch listing"
                              className="w-full h-[68px] object-cover"
                              onError={imgFallback}
                            />
                            <div className="px-2 py-1.5">
                              <div className="text-[7px] font-bold text-gray-800">
                                Smartwatch
                              </div>
                              <div className="text-[6px] text-gray-400 mt-0.5">
                                £89.99
                              </div>
                              <div className="flex gap-0.5 mt-1">
                                {[1, 2, 3, 4].map((i) => (
                                  <Star
                                    key={i}
                                    className="h-1.5 w-1.5 fill-[#FFC107] text-[#FFC107]"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating info card */}
                    <div className="absolute top-5 right-5 bg-white rounded-xl shadow-lg px-3 py-2">
                      <div className="text-[10px] font-semibold text-gray-800">
                        Smartlisting
                      </div>
                      <div className="text-[9px] text-gray-400 mt-0.5">
                        Featurelisting
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trust bar — inside hero at bottom */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-5 lg:px-8 py-5">
                {trustItems.map(({ icon: Icon, title, sub, color }) => (
                  <div
                    key={title}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3"
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        {title}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {sub}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 3 LARGE CATEGORY CARDS ─────────────────────────────────────── */}
        <section className="bg-white">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {topCategories.map((cat) => (
                <Link
                  key={cat.name}
                  to="/catalog"
                  className="group block rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] transition bg-white"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-[#F9FAFB]">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      onError={imgFallback}
                    />
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-gray-900">
                        {cat.name}
                      </h3>
                      {cat.priceRange && (
                        <span className="text-[11px] text-gray-400">
                          {cat.priceRange}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <StarRow count={cat.stars} />
                      <span className="text-[11px] text-gray-400">
                        {cat.count}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4 PRODUCT CARDS ────────────────────────────────────────────── */}
        <section className="bg-white">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6 pb-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {productCards.map((p) => (
                <Link
                  key={p.title}
                  to="/catalog"
                  className="group block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] transition"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-white flex items-center justify-center p-3">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      onError={imgFallback}
                    />
                  </div>
                  <div className="px-3.5 py-3">
                    <h3 className="text-sm font-bold text-gray-900">
                      {p.title}
                    </h3>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {p.price}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <StarRow count={p.stars} small />
                      <span className="text-[10px] text-gray-400">
                        {p.category}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED LISTINGS ──────────────────────────────────────────── */}
        <section className="bg-white border-t border-gray-100 py-6">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6">
            <h2 className="text-[28px] font-extrabold text-gray-900 mb-5">
              Featured{" "}
              <span className="text-[#1A4DBE]">Listings</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {featuredListings.map((item, idx) => (
                <Link
                  key={idx}
                  to="/catalog"
                  className="group block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1)] transition"
                >
                  <div className="aspect-square overflow-hidden bg-white flex items-center justify-center p-2">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      onError={imgFallback}
                    />
                  </div>
                  <div className="px-2.5 py-2.5">
                    <div className="text-[12px] font-semibold text-gray-800 line-clamp-1">
                      {item.title}
                    </div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <StarRow count={item.stars} small />
                      <span className="text-[9px] text-gray-400 ml-0.5 line-clamp-1">
                        {item.seller}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-gray-900 mt-0.5">
                      {item.price}
                    </div>
                    <div className="text-[9px] text-gray-400">
                      {item.category}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA SECTION ────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Layered dark-blue atmospheric background */}
          <div className="absolute inset-0 bg-[#0d1f3c]" />
          <div className="absolute inset-0">
            <img
              src="/images/hero.jpg"
              alt=""
              className="h-full w-full object-cover opacity-25"
              onError={() => {}}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0d1f3c]/60 via-[#0a2040]/70 to-[#071830]/90" />

          <div className="relative max-w-[1360px] mx-auto px-4 lg:px-6 py-16 lg:py-20 text-center">
            <h2 className="text-[28px] sm:text-[38px] lg:text-[44px] font-extrabold text-white leading-tight">
              Ready to Join the Marketplace?
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-3.5 rounded-lg text-sm font-semibold hover:bg-gray-100 transition shadow-lg"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-[#28A745] text-white px-8 py-3.5 rounded-lg text-sm font-semibold hover:bg-[#22963d] transition shadow-lg"
              >
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <footer className="bg-[#0a1628] text-white">
          <div className="max-w-[1360px] mx-auto px-4 lg:px-6 pt-5 pb-4">
            {/* Links row */}
            <div className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-white/60">
              <Link to="/about" className="hover:text-white transition">
                About Us
              </Link>
              <Link to="/faq" className="hover:text-white transition">
                Help Center
              </Link>
              <Link to="/privacy" className="hover:text-white transition">
                Privacy Policy
              </Link>
              <Link to="/terms" className="hover:text-white transition">
                Terms
              </Link>
              {/* Payment labels */}
              <span className="text-white/35 text-[11px] font-medium tracking-wide">
                VISA
              </span>
              <span className="text-white/35 text-[11px] font-medium tracking-wide">
                Mastercard
              </span>
              {/* Social icons */}
              {[
                {
                  label: "Facebook",
                  href: "https://www.facebook.com/profile.php?id=61583570176707",
                  path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
                },
                {
                  label: "LinkedIn",
                  href: "https://www.linkedin.com/company/loadify-market/",
                  path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
                },
                {
                  label: "Instagram",
                  href: "https://www.instagram.com/loadifymarket/",
                  path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z",
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="hover:text-white transition"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>

            {/* Copyright */}
            <div className="mt-3 pt-3 border-t border-white/10 text-center text-[11px] text-white/30">
              © 2024 Loadify Market. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

