import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * Each card maps ONE image to ONE specific product title and ONE category.
 * All images are served from Unsplash CDN — one unique real product photo per card.
 */
const PRODUCTS = [
  {
    id: "fp-1",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    title: "Wireless Noise-Cancelling Headphones",
    category: "Electronics",
    href: "/category/electronics",
  },
  {
    id: "fp-2",
    img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    title: "15.6\" Laptop Computer",
    category: "Electronics",
    href: "/category/electronics",
  },
  {
    id: "fp-3",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80",
    title: "Men's Digital Smartwatch",
    category: "Electronics",
    href: "/category/electronics",
  },
  {
    id: "fp-4",
    img: "https://images.unsplash.com/photo-1548036161-4b99f9ce9f16?auto=format&fit=crop&w=800&q=80",
    title: "Women's Leather Handbag",
    category: "Fashion",
    href: "/category/fashion",
  },
  {
    id: "fp-5",
    img: "https://images.unsplash.com/photo-1571781926291-522cb5c4ea0a?auto=format&fit=crop&w=800&q=80",
    title: "Luxury Skincare Bundle",
    category: "Beauty",
    href: "/category/beauty",
  },
  {
    id: "fp-6",
    img: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=800&q=80",
    title: "Professional Hand Tool Set",
    category: "Tools & DIY",
    href: "/category/tools-diy",
  },
  {
    id: "fp-7",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
    title: "Home & Kitchen Essentials",
    category: "Home & Kitchen",
    href: "/category/home-kitchen",
  },
  {
    id: "fp-8",
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
    title: "Fitness & Wellness Bundle",
    category: "Health & Wellness",
    href: "/category/health-wellness",
  },
  {
    id: "fp-9",
    img: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=800&q=80",
    title: "Children's Educational Games",
    category: "Toys & Games",
    href: "/category/toys-games",
  },
  {
    id: "fp-10",
    img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80",
    title: "Car & Van Accessories Kit",
    category: "Automotive",
    href: "/category/automotive",
  },
  {
    id: "fp-11",
    img: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    title: "Office & Desk Supplies Set",
    category: "Office Supplies",
    href: "/category/office-supplies",
  },
  {
    id: "fp-12",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
    title: "Men's & Women's Clothing",
    category: "Fashion",
    href: "/category/fashion",
  },
];

const FeaturedProducts = () => {
  return (
    <section className="bg-[#F5F7FB] py-10 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7C3AED]">Marketplace Preview</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
              Browse the Marketplace
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Products listed by independent UK sellers across all categories
            </p>
          </div>
          <Link
            to="/catalog"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED] hover:text-[#5B21B6] transition-colors"
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
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {/* Hover CTA overlay */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-[#22C55E] text-white text-[11px] font-semibold py-2 flex items-center justify-center gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  Browse Listings
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold text-[#7C3AED] uppercase tracking-wide">{product.category}</p>
                <p className="text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug flex-1">{product.title}</p>
                <p className="text-[10px] text-[#94A3B8] font-medium">Independent Seller</p>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeaturedProducts;
