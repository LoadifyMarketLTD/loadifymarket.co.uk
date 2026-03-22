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
      className="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
      style={{ minHeight: tall ? "260px" : "190px" }}
    >
      <img
        src={img}
        alt={label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      {/* gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      {/* top badge */}
      <div className="absolute top-3 right-3">
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full border border-white/20">
          CATEGORIES <ArrowRight className="h-2.5 w-2.5" />
        </span>
      </div>
      {/* label */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
        <div>
          <p className="text-white font-bold text-sm sm:text-base leading-tight drop-shadow">{label}</p>
          <p className="text-white/70 text-xs mt-0.5">{count} items</p>
        </div>
      </div>
    </Link>
  );
}

const CategoryGrid = () => {
  return (
    <section className="bg-[#F5F7FB] py-12 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2563EB]">Explore</span>
          <h2 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[#0F172A]">
            Shop by Category
          </h2>
          <p className="mt-1.5 text-sm text-[#64748B]">
            Browse thousands of listings across every major product category.
          </p>
        </div>

        {/* Row 1: 2 tall cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {categories.slice(0, 2).map((cat) => (
            <CategoryCard key={cat.slug} {...cat} tall />
          ))}
        </div>

        {/* Row 2: 3 medium cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.slice(2, 5).map((cat) => (
            <CategoryCard key={cat.slug} {...cat} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
