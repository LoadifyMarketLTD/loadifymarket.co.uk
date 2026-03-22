import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Shirt, Home, Wrench, Gamepad2 } from "lucide-react";

const categories = [
  {
    slug: "electronics",
    label: "Electronics",
    count: "1,300+",
    img: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=700&auto=format&fit=crop",
    icon: Cpu,
    accent: "bg-blue-50 text-[#2563EB]",
  },
  {
    slug: "fashion",
    label: "Fashion",
    count: "900+",
    img: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=700&auto=format&fit=crop",
    icon: Shirt,
    accent: "bg-pink-50 text-pink-600",
  },
  {
    slug: "home-garden",
    label: "Home & Kitchen",
    count: "1,100+",
    img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500&auto=format&fit=crop",
    icon: Home,
    accent: "bg-amber-50 text-amber-600",
  },
  {
    slug: "tools-diy",
    label: "Tools & DIY",
    count: "450+",
    img: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=500&auto=format&fit=crop",
    icon: Wrench,
    accent: "bg-orange-50 text-orange-600",
  },
  {
    slug: "toys",
    label: "Toys & Games",
    count: "320+",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&auto=format&fit=crop",
    icon: Gamepad2,
    accent: "bg-violet-50 text-violet-600",
  },
];

type Category = (typeof categories)[0];

function CategoryCard({ slug, label, count, img, icon: Icon, accent }: Category) {
  return (
    <Link
      to={`/category/${slug}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="relative overflow-hidden h-40">
        <img
          src={img}
          alt={label}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      {/* Info */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold text-[#0F172A] leading-tight">{label}</p>
            <p className="text-xs text-[#64748B] mt-0.5">{count} items</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-[#64748B] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
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

        {/* 5-column grid on large, 2-col on small */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.slug} {...cat} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
