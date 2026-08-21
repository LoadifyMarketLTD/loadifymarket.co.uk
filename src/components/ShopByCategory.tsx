import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useCategories, type CategoryNode } from "@/hooks/useCategories";

const PRIORITY_SLUGS = ["electronics", "clothing-fashion", "home-garden", "health-beauty", "sports-fitness", "automotive"];

const CATEGORY_IMAGES: Record<string, string> = {
  electronics: "/images/categories/electronics.jpeg",
  "clothing-fashion": "/images/categories/fashion.jpeg",
  "home-garden": "/images/categories/home-kitchen.jpeg",
  "health-beauty": "/images/categories/beauty.jpeg",
  "sports-fitness": "/images/categories/sports.jpeg",
  automotive: "/images/categories/automotive.jpeg",
};

function imageFor(category: CategoryNode) {
  if (CATEGORY_IMAGES[category.slug]) return CATEGORY_IMAGES[category.slug];
  const value = `${category.slug} ${category.name}`.toLowerCase();
  if (value.includes("car") || value.includes("auto")) return "/images/categories/automotive.jpeg";
  if (value.includes("trainer") || value.includes("fashion") || value.includes("cloth")) return "/images/categories/fashion.jpeg";
  if (value.includes("food") || value.includes("crisp")) return "/images/categories/food-drink.jpeg";
  if (value.includes("sport") || value.includes("cardio") || value.includes("fitness")) return "/images/categories/sports.jpeg";
  if (value.includes("garden") || value.includes("tool")) return "/images/categories/tools-diy.jpeg";
  if (value.includes("beauty") || value.includes("health")) return "/images/categories/beauty.jpeg";
  if (value.includes("elect") || value.includes("printer")) return "/images/categories/electronics.jpeg";
  return "/images/categories/home-kitchen.jpeg";
}

export default function ShopByCategory() {
  const { categories } = useCategories();

  const priority = PRIORITY_SLUGS
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is CategoryNode => Boolean(category));

  const priorityIds = new Set(priority.map((category) => category.id));
  const visible = [...priority, ...categories.filter((category) => !priorityIds.has(category.id))].slice(0, 5);

  if (visible.length === 0) return null;

  return (
    <section aria-label="Shop by category" className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Explore Loadify</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.025em] text-white sm:text-3xl">Start with what you’re looking for.</h2>
          <p className="mt-2 text-sm text-white/60">Real marketplace categories, presented like a shop — not a database menu.</p>
        </div>
        <Link to="/catalog" className="hidden items-center gap-2 text-xs font-extrabold text-[#F5A300] transition-colors hover:text-white sm:inline-flex">
          All categories <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:auto-rows-[168px]">
        {visible.map((category, index) => {
          const featured = index === 0;
          return (
            <Link
              key={category.id}
              to={`/catalog?category=${encodeURIComponent(category.name)}`}
              className={[
                "group relative overflow-hidden rounded-[22px] border border-white/10 bg-[#101D33] shadow-[0_16px_35px_rgba(0,0,0,0.16)]",
                featured ? "col-span-2 min-h-[238px] md:row-span-2 md:min-h-0" : "min-h-[150px] md:min-h-0",
              ].join(" ")}
            >
              <img
                src={imageFor(category)}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071B3A]/90 via-[#071B3A]/18 to-transparent" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-white/55">Shop</span>
                  <span className={`mt-1 block font-extrabold text-white ${featured ? "text-xl sm:text-2xl" : "text-sm sm:text-base"}`}>
                    {category.name}
                  </span>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#0A234F] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <Link to="/catalog" className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-[#F5A300] sm:hidden">
        Browse all categories <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
