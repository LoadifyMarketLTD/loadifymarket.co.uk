import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const bigCategories = [
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
];

const mediumCategories = [
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
  imgHeight,
}: {
  slug: string;
  label: string;
  count: string;
  img: string;
  imgHeight: string;
}) {
  return (
    <Link
      to={`/category/${slug}`}
      className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-[3px] transition-all duration-300 flex flex-col"
    >
      <div className="overflow-hidden">
        <img
          src={img}
          alt={label}
          loading="lazy"
          className={`w-full ${imgHeight} object-cover group-hover:scale-105 transition-transform duration-300`}
        />
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-[#1F2937]">{label}</span>
        <span className="text-xs font-semibold text-[#1A4DBE] flex items-center gap-0.5 whitespace-nowrap">
          {count} <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

const CategoryGrid = () => {
  return (
    <section className="bg-[#F4F7FB] pt-6 pb-10 px-4 lg:px-6">
      <div className="max-w-[1360px] mx-auto space-y-4">
        {/* Row 1: 2 wide landscape cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bigCategories.map((cat) => (
            <CategoryCard
              key={cat.slug}
              slug={cat.slug}
              label={cat.label}
              count={cat.count}
              img={cat.img}
              imgHeight="h-52"
            />
          ))}
        </div>

        {/* Row 2: 3 medium cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mediumCategories.map((cat) => (
            <CategoryCard
              key={cat.slug}
              slug={cat.slug}
              label={cat.label}
              count={cat.count}
              img={cat.img}
              imgHeight="h-40"
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;
