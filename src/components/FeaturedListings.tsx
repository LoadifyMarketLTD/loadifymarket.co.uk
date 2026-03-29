import { Link } from "react-router-dom";
import React, { useState, useCallback } from "react";
import { ArrowRight, Eye, X } from "lucide-react";

const FILTER_TABS = [
  { key: "all",         label: "All"               },
  { key: "electronics", label: "Electronics"       },
  { key: "fashion",     label: "Fashion"           },
  { key: "beauty",      label: "Beauty"            },
  { key: "home",        label: "Home & Kitchen"    },
  { key: "tools",       label: "Tools & DIY"       },
  { key: "health",      label: "Health & Wellness" },
];

const featuredListings = [
  {
    id: "1",
    img: "/images/featured/earbuds.jpg",
    title: "Wireless Earbuds Pro",
    category: "Electronics",
    filterKey: "electronics",
    href: "/category/electronics",
  },
  {
    id: "2",
    img: "/images/featured/toolbox.jpg",
    title: "Heavy-Duty Toolbox Set",
    category: "Tools & DIY",
    filterKey: "tools",
    href: "/category/tools-diy",
  },
  {
    id: "3",
    img: "/images/categories/fashion.jpg",
    title: "Women's Summer Dress Collection",
    category: "Fashion",
    filterKey: "fashion",
    href: "/category/fashion",
  },
  {
    id: "4",
    img: "/images/categories/beauty.jpg",
    title: "Premium Beauty & Skincare",
    category: "Beauty",
    filterKey: "beauty",
    href: "/category/beauty",
  },
  {
    id: "5",
    img: "/images/featured/skincare2.jpg",
    title: "Natural Face Serum Set",
    category: "Beauty",
    filterKey: "beauty",
    href: "/category/beauty",
  },
  {
    id: "6",
    img: "/images/products/office-chair.jpeg",
    title: "Ergonomic Office Chair",
    category: "Home & Kitchen",
    filterKey: "home",
    href: "/category/home-kitchen",
  },
  {
    id: "7",
    img: "/images/categories/health-wellness.jpg",
    title: "Yoga Mat & Fitness Accessories",
    category: "Health & Wellness",
    filterKey: "health",
    href: "/category/health-wellness",
  },
  {
    id: "8",
    img: "/images/categories/tools-diy.jpg",
    title: "Power Drill & Bit Set",
    category: "Tools & DIY",
    filterKey: "tools",
    href: "/category/tools-diy",
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
      style={{ backdropFilter: "blur(5px)", backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="relative">
          <img
            src={item.img}
            alt={item.title}
            className="w-full h-64 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/images/placeholder-product.jpg";
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-white/90 hover:bg-white text-gray-700 rounded-full w-8 h-8 flex items-center justify-center shadow transition-all"
            aria-label="Close quick view"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wide mb-1">
            {item.category}
          </p>
          <h3 id="quick-view-title" className="text-xl font-extrabold text-[#0F172A] mb-4">
            {item.title}
          </h3>
          <div className="flex gap-3">
            <Link
              to={item.href}
              onClick={onClose}
              className="flex-1 text-center bg-[#2563EB] text-white font-semibold py-2.5 rounded-xl hover:bg-[#1D4ED8] transition-all text-sm"
            >
              Explore Listings
            </Link>
            <Link
              to="/signup"
              onClick={onClose}
              className="flex-1 text-center border-2 border-[#2563EB] text-[#2563EB] font-semibold py-2.5 rounded-xl hover:bg-blue-50 transition-all text-sm"
            >
              Browse Marketplace
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

      <section className="bg-white py-12 px-4 sm:px-6">
        <div className="max-w-[1280px] mx-auto">
          {/* Section header */}
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
              Featured <span className="text-[#2563EB]">Listings</span>
            </h2>
            <Link
              to="/catalog"
              className="text-sm font-medium text-[#2563EB] hover:underline flex items-center gap-1 mt-1"
            >
              View All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <p className="text-sm text-[#64748B] mb-6">
            Products listed by independent UK sellers across all categories
          </p>

          {/* Filter pills */}
          <div
            className="flex flex-wrap gap-2 mb-8"
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
                    ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                    : "bg-white text-[#334155] border-gray-200 hover:border-[#2563EB] hover:text-[#2563EB]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Product grid: 4-column */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {visibleListings.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
              >
                <div className="relative overflow-hidden w-full">
                  <img
                    src={item.img}
                    alt={item.title}
                    loading="lazy"
                    width="400"
                    height="300"
                    className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/placeholder-product.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-300 flex items-center justify-center">
                    <button
                      type="button"
                      aria-label={`Quick view ${item.title}`}
                      className="opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white text-[#0F172A] text-[10px] font-semibold px-2.5 py-1 rounded-full shadow flex items-center gap-1"
                      onClick={(e) => {
                        e.preventDefault();
                        setQuickViewItem(item);
                      }}
                    >
                      <Eye className="h-3 w-3" aria-hidden="true" /> Quick View
                    </button>
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col gap-1">
                  <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wide">{item.category}</p>
                  <p className="text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug flex-1">
                    {item.title}
                  </p>
                  <span className="text-[10px] font-semibold text-[#2563EB] mt-auto">Explore →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default FeaturedListings;
