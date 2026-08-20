import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

export default function ShopByCategory() {
  const { categories } = useCategories();
  const visible = categories.slice(0, 8);

  if (visible.length === 0) return null;

  return (
    <section aria-label="Shop by category" className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em] mb-1">Browse</p>
          <h2 className="text-lg sm:text-xl font-semibold text-white">Shop by category</h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">Find your way into the marketplace faster.</p>
        </div>
        <Link to="/catalog" className="text-[11px] font-bold text-primary uppercase tracking-wide hover:underline flex items-center gap-1 shrink-0">
          All Categories <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visible.map((category) => (
          <Link
            key={category.id}
            to={`/catalog?category=${encodeURIComponent(category.name)}`}
            className="group min-h-[96px] rounded-2xl border border-white/[0.07] bg-elevated px-5 py-4 flex flex-col justify-between hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_0_24px_rgba(212,175,55,0.10)] transition-all duration-300"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Explore</span>
            <div className="flex items-end justify-between gap-3">
              <span className="text-sm sm:text-base font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">
                {category.name}
              </span>
              <ArrowRight className="h-4 w-4 text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
