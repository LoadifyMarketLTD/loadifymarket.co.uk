import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import CATEGORY_CONFIG from "@/lib/category-config";
import type { CategoryConfig } from "@/lib/category-config";

type CategoryTileProps = Pick<CategoryConfig, "slug" | "label" | "icon" | "iconColor" | "image">;

function CategoryTile({ slug, label, icon: Icon, iconColor, image }: CategoryTileProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <Link
      to={`/category/${slug}`}
      className="flex flex-col items-center gap-2 shrink-0 group"
    >
      <div
        className="w-14 h-14 rounded-2xl overflow-hidden group-hover:shadow-[0_0_0_2px_rgba(34,197,94,0.4)] group-hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        {imgFailed ? (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
          </div>
        ) : (
          <img
            src={image}
            alt={label}
            width="64"
            height="64"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      <span className="text-[11px] font-semibold text-white/70 group-hover:text-[#22C55E] text-center leading-tight max-w-[72px] transition-colors">
        {label}
      </span>
    </Link>
  );
}

const CategorySlider = () => {
  return (
    <section
      className="border-b py-10 px-4 sm:px-6"
      style={{
        background: "linear-gradient(180deg, #0a1628 0%, #0d1d36 100%)",
        borderColor: "rgba(255,255,255,0.07)",
      }}
    >
      <div className="max-w-[1280px] mx-auto">

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-white/80">Shop by Category</h2>
          <Link
            to="/catalog"
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            All Categories <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Horizontally scrollable strip */}
        <div
          className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide"
          role="list"
          aria-label="Browse product categories"
        >
          {CATEGORY_CONFIG.map((cat) => (
            <div key={cat.slug} role="listitem">
              <CategoryTile
                slug={cat.slug}
                label={cat.label}
                icon={cat.icon}
                iconColor={cat.iconColor}
                image={cat.image}
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default CategorySlider;
