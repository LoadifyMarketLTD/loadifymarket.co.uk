import type { SyntheticEvent } from "react";
import { Link } from "react-router-dom";
import { marketplaceVisuals } from "@/data/marketplaceVisuals";
import { marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";

const applyFallback = (fallback: string) => (event: SyntheticEvent<HTMLImageElement>) => {
  const image = event.currentTarget;
  if (image.dataset.fallbackApplied === "true") return;
  image.dataset.fallbackApplied = "true";
  image.src = fallback;
};

/**
 * Image-led marketplace taxonomy explorer.
 * Root imagery is same-origin/local. Dedicated subcategory editorial images may
 * still be remote while the 96 local premium assets are being prepared; if one
 * fails, it falls back to the local parent visual rather than rendering broken
 * browser image chrome.
 */
export default function VisualMarketplaceCategories() {
  return (
    <section className="bg-[#F7F9FC] pb-12 pt-[146px] sm:pb-16 sm:pt-[146px]" aria-labelledby="visual-marketplace-categories-heading">
      <div className="w-full px-6">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1D57D8]">Explore the marketplace</p>
            <h2 id="visual-marketplace-categories-heading" className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#0A234F] sm:text-4xl">
              Browse visually by category
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#64748B] sm:text-base">
              Representative editorial imagery helps buyers navigate the range while seller listings remain the only source of live inventory.
            </p>
          </div>
          <Link to="/catalog" className="text-sm font-extrabold text-[#1D57D8] hover:underline">
            Browse all live listings →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {marketplaceVisuals.map((category, categoryIndex) => (
            <article key={category.slug} className="overflow-hidden rounded-2xl border border-[#0A234F]/10 bg-white shadow-[0_10px_28px_rgba(10,35,79,0.06)]">
              <Link to={`/category/${category.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-[#E9EEF7]">
                  <img
                    src={category.image}
                    alt={category.altText}
                    loading={categoryIndex < 4 ? "eager" : "lazy"}
                    fetchPriority={categoryIndex < 4 ? "high" : "auto"}
                    onError={applyFallback("/hero-marketplace.jpg")}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="px-4 pb-3 pt-4">
                  <h3 className="text-base font-black text-[#0A234F]">{category.title}</h3>
                  <p className="mt-1 text-xs font-medium text-[#64748B]">6 visual subcategories</p>
                </div>
              </Link>

              <div className="grid grid-cols-3 gap-px border-t border-[#0A234F]/10 bg-[#0A234F]/10">
                {category.subcategories.map((sub) => (
                  <Link
                    key={sub.title}
                    to={`/category/${category.slug}?sub=${encodeURIComponent(marketplaceSubcategorySlug(category.title, sub.title))}`}
                    className="group/sub bg-white"
                    title={sub.title}
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-[#EEF2F7]">
                      <img
                        src={sub.image}
                        alt={sub.altText}
                        loading="lazy"
                        onError={applyFallback(category.image)}
                        className="h-full w-full object-cover transition duration-300 group-hover/sub:scale-[1.04]"
                      />
                    </div>
                    <div className="min-h-[44px] px-2 py-2 text-[10px] font-bold leading-3 text-[#334155]">
                      {sub.title}
                    </div>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
