import { Link } from "react-router-dom";
import React, { useState, useCallback } from "react";
import { ArrowRight, Eye, X } from "lucide-react";

const FILTER_TABS = [
  { key: "all",         label: "All"           },
  { key: "electronics", label: "Electronics"   },
  { key: "fashion",     label: "Fashion"       },
  { key: "beauty",      label: "Beauty"        },
  { key: "home",        label: "Home"          },
  { key: "tools",       label: "Tools & DIY"   },
];

const featuredListings = [
  {
    id: "1",
    img: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80",
    title: "Wireless Earbuds Pro",
    category: "Electronics",
    filterKey: "electronics",
    href: "/category/electronics",
  },
  {
    id: "2",
    img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80",
    title: "Heavy-Duty Toolbox Set",
    category: "Tools & DIY",
    filterKey: "tools",
    href: "/category/tools-diy",
  },
  {
    id: "3",
    img: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=80",
    title: "Women's Summer Dress Collection",
    category: "Fashion",
    filterKey: "fashion",
    href: "/category/fashion",
  },
  {
    id: "4",
    img: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    title: "Premium Beauty & Skincare",
    category: "Beauty",
    filterKey: "beauty",
    href: "/category/beauty",
  },
  {
    id: "5",
    img: "https://images.unsplash.com/photo-1505843513577-22bb7d21e455?auto=format&fit=crop&w=800&q=80",
    title: "Ergonomic Office Chair",
    category: "Home & Kitchen",
    filterKey: "home",
    href: "/category/home-kitchen",
  },
  {
    id: "6",
    img: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?auto=format&fit=crop&w=800&q=80",
    title: "Yoga Mat & Fitness Accessories",
    category: "Health & Wellness",
    filterKey: "health",
    href: "/category/health-wellness",
  },
];

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
      style={{ backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={handleBackdropClick}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border"
        style={{ background: "#0d1d36", borderColor: "rgba(255,255,255,0.10)" }}
      >
        <div className="relative">
          <img
            src={item.img}
            alt={item.title}
            className="w-full h-56 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center shadow transition-all"
            aria-label="Close quick view"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-1">
            {item.category}
          </p>
          <h3 id="quick-view-title" className="text-xl font-extrabold text-white mb-4">
            {item.title}
          </h3>
          <div className="flex gap-3">
            <Link
              to={item.href}
              onClick={onClose}
              className="flex-1 text-center bg-[#22C55E] hover:bg-[#16A34A] text-white font-semibold py-2.5 rounded-full transition-all text-sm"
            >
              Explore Category
            </Link>
            <Link
              to="/catalog"
              onClick={onClose}
              className="flex-1 text-center border text-white/80 font-semibold py-2.5 rounded-full hover:border-white/40 transition-all text-sm"
              style={{ borderColor: "rgba(255,255,255,0.15)" }}
            >
              All Listings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const FeaturedListings = () => {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [quickViewItem, setQuickViewItem] = useState<Listing | null>(null);

  const visibleListings =
    activeFilter === "all"
      ? featuredListings
      : featuredListings.filter((item) => item.filterKey === activeFilter);

  return (
    <>
      {quickViewItem && (
        <QuickViewModal item={quickViewItem} onClose={() => setQuickViewItem(null)} />
      )}

      <section
        className="relative overflow-hidden py-12 px-4 sm:px-6 min-h-[85vh] flex flex-col justify-center"
        style={{
          background: "linear-gradient(135deg, #0a1628 0%, #0e1e3a 60%, #091220 100%)",
        }}
      >
        {/* Subtle dot texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative max-w-[1280px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Curated Selection
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-display font-bold text-white">
                Featured <span className="text-[#22C55E]">Listings</span>
              </h2>
              <p className="mt-1 text-sm text-white/50">
                Products listed by independent UK sellers
              </p>
            </div>
            <Link
              to="/catalog"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors mt-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Filter pills */}
          <div
            className="flex flex-wrap gap-2 mb-6"
            role="group"
            aria-label="Filter listings by category"
          >
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                aria-pressed={activeFilter === tab.key}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                  activeFilter === tab.key
                    ? "bg-[#22C55E] text-white border-[#22C55E] shadow-sm"
                    : "text-white/60 hover:text-white hover:border-white/25 transition-colors"
                }`}
                style={
                  activeFilter !== tab.key
                    ? { background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.10)" }
                    : undefined
                }
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Product grid: 3-column, max 6 items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {visibleListings.slice(0, 6).map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative overflow-hidden w-full">
                  <img
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    width="800"
                    height="600"
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/90 via-[#0a1628]/15 to-transparent" />
                  {/* Quick view button */}
                  <button
                    type="button"
                    aria-label={`Quick view ${item.title}`}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/50 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow flex items-center gap-1"
                    onClick={(e) => {
                      e.preventDefault();
                      setQuickViewItem(item);
                    }}
                  >
                    <Eye className="h-3 w-3" aria-hidden="true" /> Quick View
                  </button>
                  {/* Content overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-1">
                      {item.category}
                    </p>
                    <p className="text-sm font-bold text-white line-clamp-2 leading-snug">
                      {item.title}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Mobile view all */}
          <div className="mt-6 flex justify-center sm:hidden">
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 h-11 px-6 bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-bold rounded-full"
            >
              View All Listings <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default FeaturedListings;
