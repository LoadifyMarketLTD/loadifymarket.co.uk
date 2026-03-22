import { Link } from "react-router-dom";
import {
  BadgeCheck,
  ShieldCheck,
  Store,
  MapPin,
  ArrowRight,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ─── TRUST ITEMS ──────────────────────────────────────────────────────────────

const trustItems = [
  {
    icon: BadgeCheck,
    title: "Verified Sellers",
    sub: "All listings verified",
    color: "text-[#1A4DBE]",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    sub: "Protected transactions",
    color: "text-[#1A4DBE]",
  },
  {
    icon: Store,
    title: "Free to Join",
    sub: "No upfront listing fees",
    color: "text-[#28A745]",
  },
  {
    icon: MapPin,
    title: "UK-Based Marketplace",
    sub: "Serving UK businesses",
    color: "text-[#1A4DBE]",
  },
];

// ─── MAIN CATEGORIES ──────────────────────────────────────────────────────────
// Each has a unique Unsplash image; NO prices, NO ratings

const mainCategories = [
  {
    slug: "electronics",
    label: "Electronics",
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600&auto=format&fit=crop",
    sub: ["Phones", "Laptops", "Audio", "Accessories"],
  },
  {
    slug: "fashion",
    label: "Fashion",
    img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600&auto=format&fit=crop",
    sub: ["Men's Clothing", "Women's Clothing", "Footwear", "Bags"],
  },
  {
    slug: "home-garden",
    label: "Home & Kitchen",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&auto=format&fit=crop",
    sub: ["Furniture", "Appliances", "Home Decor", "Storage"],
  },
  {
    slug: "health-beauty",
    label: "Beauty",
    img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop",
    sub: ["Skincare", "Haircare", "Makeup", "Fragrance"],
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    img: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=600&auto=format&fit=crop",
    sub: ["Hand Tools", "Power Tools", "Hardware", "Garden Tools"],
  },
  {
    slug: "business-supplies",
    label: "Office & Business",
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop",
    sub: ["Office Supplies", "Furniture", "Printing", "Equipment"],
  },
  {
    slug: "baby-kids",
    label: "Baby & Kids",
    img: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop",
    sub: ["Baby Essentials", "Toys", "Nursery", "Kids Clothing"],
  },
  {
    slug: "automotive",
    label: "Automotive",
    img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop",
    sub: ["Car Accessories", "Maintenance", "Interior", "Tools"],
  },
];

// ─── DISCOVERY ROW ────────────────────────────────────────────────────────────
// Navigational tiles — NO prices, NO fake products

const discoveryTiles = [
  {
    label: "New Arrivals",
    desc: "Freshly listed products across all categories",
    img: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&auto=format&fit=crop",
    to: "/catalog?sort=newest",
  },
  {
    label: "Popular Categories",
    desc: "Explore top-performing category pages",
    img: "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=400&auto=format&fit=crop",
    to: "/catalog",
  },
  {
    label: "Trending Suppliers",
    desc: "Discover highly rated verified sellers",
    img: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&auto=format&fit=crop",
    to: "/catalog",
  },
  {
    label: "For Business Buyers",
    desc: "Wholesale, bulk & business-grade stock",
    img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&auto=format&fit=crop",
    to: "/catalog",
  },
  {
    label: "Recently Added Sellers",
    desc: "New stores opening on the marketplace",
    img: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&auto=format&fit=crop",
    to: "/catalog",
  },
  {
    label: "Explore All Categories",
    desc: "Browse every category in one place",
    img: "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?w=400&auto=format&fit=crop",
    to: "/catalog",
  },
];

// ─── EXPLORE MARKETPLACE ──────────────────────────────────────────────────────
// Replaces old "Featured Listings" — NO prices, NO fake discounts

const exploreCards = [
  {
    label: "Electronics Suppliers",
    desc: "Phones, laptops, smart devices and accessories from verified sellers",
    img: "https://images.unsplash.com/photo-1526406915894-7bcd65f60845?w=500&auto=format&fit=crop",
    slug: "electronics",
  },
  {
    label: "Trending Fashion Sellers",
    desc: "Men's, women's and children's fashion from UK sellers",
    img: "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=500&auto=format&fit=crop",
    slug: "fashion",
  },
  {
    label: "Home & Kitchen Essentials",
    desc: "Furniture, appliances and home décor for every space",
    img: "https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=500&auto=format&fit=crop",
    slug: "home-garden",
  },
  {
    label: "Beauty & Personal Care",
    desc: "Skincare, haircare, makeup and fragrance from top suppliers",
    img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop",
    slug: "health-beauty",
  },
  {
    label: "Office & Business Solutions",
    desc: "Supplies, furniture and equipment for modern workplaces",
    img: "https://images.unsplash.com/photo-1568992688065-536aad8a12f6?w=500&auto=format&fit=crop",
    slug: "business-supplies",
  },
  {
    label: "Automotive Accessories",
    desc: "Car care, tools, interior accessories and travel essentials",
    img: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=500&auto=format&fit=crop",
    slug: "automotive",
  },
];

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PixelPerfectIndex() {
  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <Navbar />
      <div className="pt-16" />

      <main>
        {/* ── 1. HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#dde9f8] via-[#e5eef9] to-[#eef3fc] px-4 pt-10 pb-20 lg:pt-14 lg:pb-28 lg:px-6">
          <div className="max-w-[1360px] mx-auto grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: copy */}
            <div className="space-y-5 max-w-xl">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-[#1F2937] leading-tight">
                The UK Marketplace<br />
                Connecting{" "}
                <span className="text-[#1A4DBE]">Buyers</span> &amp; Sellers
              </h1>
              <p className="text-base text-gray-600 leading-relaxed">
                Discover trusted suppliers, explore categories, and grow your
                business — all in one secure platform.
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

            {/* Right: premium multi-category marketplace collage */}
            <div className="relative rounded-2xl overflow-hidden shadow-2xl h-64 lg:h-[380px]">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&auto=format&fit=crop"
                alt="UK Multi-Category Marketplace"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            </div>
          </div>

          {/* Floating trust strip overlapping hero bottom */}
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

        {/* spacer for floating trust strip */}
        <div className="h-16 bg-[#F9FAFB]" />

        {/* ── 2. SHOP BY CATEGORY ─────────────────────────────────────────── */}
        <section className="bg-[#F9FAFB] pt-6 pb-10 px-4 lg:px-6">
          <div className="max-w-[1360px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-[#1F2937]">
                Shop by <span className="text-[#1A4DBE]">Category</span>
              </h2>
              <Link
                to="/catalog"
                className="text-sm font-medium text-[#1A4DBE] hover:underline flex items-center gap-1"
              >
                All Categories <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* 4 + 4 grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {mainCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/category/${cat.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 flex flex-col"
                >
                  {/* Category image */}
                  <div className="overflow-hidden">
                    <img
                      src={cat.img}
                      alt={cat.label}
                      className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  {/* Card body */}
                  <div className="p-3 flex-1 flex flex-col">
                    <p className="text-sm font-bold text-[#1F2937] mb-2">{cat.label}</p>
                    {/* Subcategory pills */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {cat.sub.slice(0, 3).map((s) => (
                        <span
                          key={s}
                          className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <span className="mt-auto text-xs font-semibold text-[#1A4DBE] flex items-center gap-0.5">
                      Explore <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. DISCOVERY ROW ────────────────────────────────────────────── */}
        <section className="bg-white py-10 px-4 lg:px-6">
          <div className="max-w-[1360px] mx-auto">
            <h2 className="text-xl font-extrabold text-[#1F2937] mb-5">
              Discover the Marketplace
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {discoveryTiles.map((tile) => (
                <Link
                  key={tile.label}
                  to={tile.to}
                  className="group relative rounded-xl overflow-hidden h-32 shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300"
                >
                  <img
                    src={tile.img}
                    alt={tile.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <p className="text-white text-xs font-bold leading-snug mb-0.5">
                      {tile.label}
                    </p>
                    <p className="text-gray-300 text-[10px] leading-snug line-clamp-2 hidden sm:block">
                      {tile.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. EXPLORE MARKETPLACE ──────────────────────────────────────── */}
        <section className="bg-[#F9FAFB] py-10 px-4 lg:px-6">
          <div className="max-w-[1360px] mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-[#1F2937]">
                Explore <span className="text-[#1A4DBE]">Marketplace</span>
              </h2>
              <Link
                to="/catalog"
                className="text-sm font-medium text-[#1A4DBE] hover:underline flex items-center gap-1"
              >
                Browse All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {exploreCards.map((card) => (
                <Link
                  key={card.slug + card.label}
                  to={`/category/${card.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 flex flex-col"
                >
                  <div className="overflow-hidden">
                    <img
                      src={card.img}
                      alt={card.label}
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-sm font-bold text-[#1F2937] mb-1">{card.label}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 flex-1">
                      {card.desc}
                    </p>
                    <span className="text-xs font-semibold text-[#1A4DBE] flex items-center gap-1">
                      Explore now <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. CTA BANNER ───────────────────────────────────────────────── */}
        <section
          className="relative py-16 px-4 overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, #0a1628 0%, #0f2347 35%, #1a3a6b 65%, #0a1628 100%)",
          }}
        >
          {/* decorative earth-glow */}
          <div
            className="absolute bottom-0 right-0 w-96 h-96 rounded-full opacity-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, #3a7bd5 0%, #1A4DBE 40%, transparent 70%)",
              transform: "translate(30%, 30%)",
            }}
          />
          <div className="relative max-w-[1360px] mx-auto text-center">
            <h2 className="text-3xl font-extrabold text-white mb-3">
              Ready to Join the Marketplace?
            </h2>
            <p className="text-blue-300 text-sm mb-7 max-w-md mx-auto">
              Connect with thousands of UK buyers and sellers. Free to join — start exploring today.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 border-2 border-white text-white font-semibold px-7 py-3 rounded-lg hover:bg-white/10 hover:-translate-y-[3px] transition-all duration-300 text-sm"
              >
                Browse Marketplace
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-[#28A745] text-white font-semibold px-7 py-3 rounded-lg hover:bg-[#219538] hover:-translate-y-[3px] transition-all duration-300 text-sm"
              >
                Create Account <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
