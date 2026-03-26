import { Link } from "react-router-dom";
import { Star, ArrowRight, ShoppingCart } from "lucide-react";

const PRODUCTS = [
  {
    id: "fp-1",
    img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&auto=format&fit=crop&q=80",
    title: "Pro Wireless Headphones",
    stars: 5,
    reviews: 248,
    category: "Electronics",
    badge: "Best Seller",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  {
    id: "fp-2",
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80",
    title: "Athletic Running Shoes",
    stars: 4,
    reviews: 183,
    category: "Fashion",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-3",
    img: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&auto=format&fit=crop&q=80",
    title: "Luxury Skincare Set",
    stars: 5,
    reviews: 312,
    category: "Beauty",
    badge: "New",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "fp-4",
    img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&auto=format&fit=crop&q=80",
    title: "Minimalist Leather Watch",
    stars: 5,
    reviews: 97,
    category: "Fashion",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-5",
    img: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&auto=format&fit=crop&q=80",
    title: "Mechanical Keyboard RGB",
    stars: 5,
    reviews: 431,
    category: "Electronics",
    badge: "Top Rated",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "fp-6",
    img: "https://images.unsplash.com/photo-1541643600914-78b084683702?w=400&auto=format&fit=crop&q=80",
    title: "Perfume Gift Collection",
    stars: 4,
    reviews: 156,
    category: "Beauty",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-7",
    img: "https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&auto=format&fit=crop&q=80",
    title: "Smart Home LED Strip",
    stars: 4,
    reviews: 274,
    category: "Home & Kitchen",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-8",
    img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop&q=80",
    title: "Designer Leather Handbag",
    stars: 5,
    reviews: 89,
    category: "Fashion",
    badge: "Premium",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  {
    id: "fp-9",
    img: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&auto=format&fit=crop&q=80",
    title: "18V Cordless Drill Set",
    stars: 5,
    reviews: 163,
    category: "Tools & DIY",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-10",
    img: "https://images.unsplash.com/photo-1544244015-0df4592987d0?w=400&auto=format&fit=crop&q=80",
    title: "Tablet Protective Case",
    stars: 4,
    reviews: 98,
    category: "Electronics",
    badge: "New",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "fp-11",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&auto=format&fit=crop&q=80",
    title: "Creative Building Blocks",
    stars: 5,
    reviews: 207,
    category: "Toys & Games",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-12",
    img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&auto=format&fit=crop&q=80",
    title: "Premium Yoga Mat",
    stars: 4,
    reviews: 145,
    category: "Health & Wellness",
    badge: "New",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
];

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${count} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden="true"
          className={`h-3 w-3 ${n <= count ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

const FeaturedProducts = () => {
  return (
    <section className="bg-[#F5F7FB] py-10 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">

        {/* Section header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">Handpicked</span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
              Featured Products
            </h2>
            <p className="mt-1 text-sm text-[#64748B]">
              Top picks from our independent UK sellers
            </p>
          </div>
          <Link
            to="/catalog"
            className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Product grid — masonry columns, no empty row gaps */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-x-5 space-y-5">
          {PRODUCTS.map((product) => (
            <Link
              key={product.id}
              to="/catalog"
              className="break-inside-avoid group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Image */}
              <div className="relative overflow-hidden bg-slate-50 aspect-square">
                <img
                  src={product.img}
                  alt={product.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.src = "/images/placeholder-product.jpg";
                  }}
                />
                {/* Badge */}
                <span className={`absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${product.badgeColor}`}>
                  {product.badge}
                </span>
                {/* Quick-add overlay */}
                <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-[#2563EB] text-white text-[11px] font-semibold py-2 flex items-center justify-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                  View Product
                </div>
              </div>

              {/* Info */}
              <div className="p-3 flex-1 flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold text-[#2563EB] uppercase tracking-wide">{product.category}</p>
                <p className="text-sm font-bold text-[#0F172A] line-clamp-2 leading-snug flex-1">{product.title}</p>

                <div className="flex items-center gap-1.5">
                  <StarRow count={product.stars} />
                  <span className="text-[10px] text-[#64748B]">({product.reviews})</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
};

export default FeaturedProducts;
