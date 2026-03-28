import { Link } from "react-router-dom";
import { Star, ArrowRight, ShoppingCart } from "lucide-react";

const PRODUCTS = [
  {
    id: "fp-1",
    img: "/images/products/headphones.webp",
    title: "Pro Wireless Headphones",
    stars: 5,
    reviews: 248,
    category: "Electronics",
    badge: "Best Seller",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  {
    id: "fp-2",
    img: "/images/categories/fashion.webp",
    title: "Women's Apparel Collection",
    stars: 4,
    reviews: 183,
    category: "Fashion",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-3",
    img: "/images/products/skincare.webp",
    title: "Luxury Skincare Set",
    stars: 5,
    reviews: 312,
    category: "Beauty",
    badge: "New",
    badgeColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "fp-4",
    img: "/images/products/smartwatch.webp",
    title: "Premium Smartwatch",
    stars: 5,
    reviews: 97,
    category: "Electronics",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-5",
    img: "/images/products/laptop.webp",
    title: "14-inch Ultrabook Laptop",
    stars: 5,
    reviews: 431,
    category: "Electronics",
    badge: "Top Rated",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  {
    id: "fp-6",
    img: "/images/featured/skincare2.webp",
    title: "Brightening Skin Serum Kit",
    stars: 4,
    reviews: 156,
    category: "Beauty",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-7",
    img: "/images/categories/home-kitchen.webp",
    title: "Premium Cookware Bundle",
    stars: 4,
    reviews: 274,
    category: "Home & Kitchen",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-8",
    img: "/images/products/handbag.webp",
    title: "Designer Leather Handbag",
    stars: 5,
    reviews: 89,
    category: "Fashion",
    badge: "Premium",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  {
    id: "fp-9",
    img: "/images/products/toolset.webp",
    title: "18V Cordless Drill Set",
    stars: 5,
    reviews: 163,
    category: "Tools & DIY",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-10",
    img: "/images/products/sample-listing.webp",
    title: "Mixed Tech Clearance Lot",
    stars: 4,
    reviews: 98,
    category: "Electronics",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-11",
    img: "/images/categories/toys-games.webp",
    title: "Educational Toy Bundle",
    stars: 5,
    reviews: 207,
    category: "Toys & Games",
    badge: "Sale",
    badgeColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "fp-12",
    img: "/images/featured/chair.webp",
    title: "Luxury Accent Chair",
    stars: 4,
    reviews: 145,
    category: "Home & Kitchen",
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

        {/* Product grid — 4 columns desktop, 2 mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {PRODUCTS.map((product) => (
            <Link
              key={product.id}
              to="/catalog"
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
