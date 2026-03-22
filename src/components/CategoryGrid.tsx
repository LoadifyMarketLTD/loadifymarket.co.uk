import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const categories = [
  {
    slug: "electronics",
    label: "Electronics",
    count: "1,300+",
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&auto=format&fit=crop",
  },
  {
    slug: "fashion",
    label: "Fashion",
    count: "900+",
    img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=700&auto=format&fit=crop",
  },
  {
    slug: "home-garden",
    label: "Home & Kitchen",
    count: "1,100+",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&auto=format&fit=crop",
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    count: "450+",
    img: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=500&auto=format&fit=crop",
  },
  {
    slug: "toys",
    label: "Toys & Games",
    count: "320+",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&auto=format&fit=crop",
  },
  {
    slug: "beauty",
    label: "Beauty",
    count: "280+",
    img: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&auto=format&fit=crop",
  },
  {
    slug: "health-wellness",
    label: "Health & Wellness",
    count: "210+",
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&auto=format&fit=crop",
  },
  {
    slug: "automotive",
    label: "Automotive",
    count: "175+",
    img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=500&auto=format&fit=crop",
  },
];

function CategoryCard({
  slug,
  label,
  count,
  img,
  tall,
}: {
  slug: string;
  label: string;
  count: string;
  img: string;
  tall?: boolean;
}) {
  return (
    <Link
      to={`/category/${slug}`}
      className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
      style={{ minHeight: tall ? "260px" : "180px" }}
    >
      <img
        src={img}
        alt={label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {/* label */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
        <div>
          <p className="text-white font-bold text-sm sm:text-base leading-tight drop-shadow">{label}</p>
          <p className="text-white/70 text-xs mt-0.5">{count} items</p>
        </div>
        <span className="shrink-0 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <ArrowRight className="h-3.5 w-3.5 text-white" />
        </span>
      </div>
    </Link>
  );
}

const CategoryGrid = () => {
  return (
    <section className="bg-[#F5F7FB] py-12 px-4 lg:px-6">
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">Explore</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
            Shop by Category
          </h2>
          <p className="mt-1.5 text-sm text-[#334155]">
            Browse thousands of listings across every major product category.
          </p>
        </div>

        {/* Row 1: 2 wide cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {categories.slice(0, 2).map((cat) => (
            <CategoryCard key={cat.slug} {...cat} tall />
          ))}
        </div>

        {/* Row 2: 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {categories.slice(2, 5).map((cat) => (
            <CategoryCard key={cat.slug} {...cat} />
          ))}
        </div>

        {/* Row 3: 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.slice(5, 8).map((cat) => (
            <CategoryCard key={cat.slug} {...cat} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
