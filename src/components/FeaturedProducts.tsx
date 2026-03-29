import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const PRODUCTS = [
  {
    id: "fp-1",
    img: "/images/products/headphones.webp",
    title: "Electronics & Audio",
    category: "Electronics",
    href: "/category/electronics",
  },
  {
    id: "fp-2",
    img: "/images/categories/fashion.webp",
    title: "Fashion & Apparel",
    category: "Fashion",
    href: "/category/fashion",
  },
  {
    id: "fp-3",
    img: "/images/products/skincare.webp",
    title: "Beauty & Skincare",
    category: "Beauty",
    href: "/category/beauty",
  },
  {
    id: "fp-4",
    img: "/images/products/smartwatch.webp",
    title: "Wearables & Gadgets",
    category: "Electronics",
    href: "/category/electronics",
  },
  {
    id: "fp-5",
    img: "/images/products/laptop.webp",
    title: "Laptops & Computers",
    category: "Electronics",
    href: "/category/electronics",
  },
  {
    id: "fp-6",
    img: "/images/categories/health-wellness.webp",
    title: "Health & Wellness",
    category: "Health & Wellness",
    href: "/category/health-wellness",
  },
  {
    id: "fp-7",
    img: "/images/categories/home-kitchen.webp",
    title: "Home & Kitchen Essentials",
    category: "Home & Kitchen",
    href: "/category/home-kitchen",
  },
  {
    id: "fp-8",
    img: "/images/products/handbag.webp",
    title: "Bags & Accessories",
    category: "Fashion",
    href: "/category/fashion",
  },
  {
    id: "fp-9",
    img: "/images/products/toolset.webp",
    title: "Tools & DIY Supplies",
    category: "Tools & DIY",
    href: "/category/tools-diy",
  },
  {
    id: "fp-10",
    img: "/images/categories/automotive.webp",
    title: "Automotive & Accessories",
    category: "Automotive",
    href: "/category/automotive",
  },
  {
    id: "fp-11",
    img: "/images/categories/toys-games.webp",
    title: "Toys & Games",
    category: "Toys & Games",
    href: "/category/toys-games",
  },
  {
    id: "fp-12",
    img: "/images/featured/chair.webp",
    title: "Home Furniture & Decor",
    category: "Home & Kitchen",
    href: "/category/home-kitchen",
  },
];

const FeaturedProducts = () => {
  return (
    <section className="bg-[#F5F7FB] py-10 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">Marketplace Preview</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
              Browse the Marketplace
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Explore categories from independent UK sellers
            </p>
          </div>
          <Link
            to="/catalog"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            View Marketplace <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Product grid — 4 columns desktop, 2 mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {PRODUCTS.map((product) => (
            <Link
              key={product.id}
              to={product.href}
              className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Image */}
              <div className="relative overflow-hidden bg-slate-50 aspect-square">
                <img
                  src={product.img}
                  alt={product.title}
                  width="400"
                  height="400"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    if (el.src.endsWith(".webp")) {
                      el.src = el.src.replace(".webp", ".jpg");
                    } else {
                      el.src = "/images/placeholder-product.jpg";
                    }
                  }}
                />
                {/* Hover CTA overlay */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-[#2563EB] text-white text-[11px] font-semibold py-2 flex items-center justify-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  Browse Listings
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold text-[#2563EB] uppercase tracking-wide">{product.category}</p>
                <p className="text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug flex-1">{product.title}</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeaturedProducts;
