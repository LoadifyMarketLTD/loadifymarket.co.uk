import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";

export default function ShopByCategory() {
  const { categories } = useCategories();
  const visible = categories.slice(0, 8);

  if (visible.length === 0) return null;

  return (
    <section aria-label="Shop by category" className="w-full max-w-[1280px] mx-auto py-8">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.18em] mb-1.5">Browse the marketplace</p>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">Find what you need, faster</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1.5">Start with a category, then explore live products across Loadify Market.</p>
        </div>
        <Link to="/catalog" className="text-[11px] font-bold text-primary uppercase tracking-wide hover:underline flex items-center gap-1 shrink-0">
          All Categories <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
        {visible.map((category, index) => (
          <Link
            key={category.id}
            to={`/catalog?category=${encodeURIComponent(category.name)}`}
            className="group relative min-h-[112px] rounded-2xl border border-white/[0.07] bg-elevated px-5 py-4 flex flex-col justify-between overflow-hidden hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_0_28px_rgba(212,175,55,0.10)] transition-all duration-300"
          >
            <div
              aria-hidden="true"
              className="absolute -right-8 -top-8 h-24 w-24 rounded-full border border-primary/10 bg-primary/[0.03] group-hover:scale-110 transition-transform duration-300"
            />
            <div className="relative flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">Category</span>
              <span className="text-[10px] font-bold text-primary/70">{String(index + 1).padStart(2, '0')}</span>
            </div>
            <div className="relative flex items-end justify-between gap-3">
              <span className="text-sm sm:text-base font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">
                {category.name}
              </span>
              <span className="h-8 w-8 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center shrink-0 group-hover:border-primary/30 group-hover:bg-primary/[0.06] transition-colors">
                <ArrowRight className="h-3.5 w-3.5 text-primary group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
