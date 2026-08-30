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
    <section className="bg-[#F8F7F4] pb-12 pt-12 sm:pb-16 sm:pt-14" aria-labelledby="visual-marketplace-categories-heading">
      <div className="mx-auto w-full max-w-[1480px] px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7351]">Explore the marketplace</p>
            <h2 id="visual-marketplace-categories-heading" className="mt-2 font-serif text-3xl font-normal tracking-[-0.025em] text-[#0A234F] sm:text-4xl">
              Browse visually by category
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5A6578] sm:text-base">
              Representative editorial imagery helps buyers navigate the range while seller listings remain the only source of live inventory.
            </p>
          </div>
          <Link to="/catalog" className="text-sm font-medium text-[#334155] transition-colors hover:text-[#0A234F]">
            Browse all live listings →
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {marketplaceVisuals.map((category, categoryIndex) => (
            <article key={category.slug} className="overflow-hidden rounded-2xl border border-[#0A234F]/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.045)]">
              <Link to={`/category/${category.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-[#EEECE7]">
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
                  <h3 className="text-base font-semibold text-[#0A234F]">{category.title}</h3>
                  <p className="mt-1 text-xs font-normal text-[#687386]">6 visual subcategories</p>
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
                    <div className="aspect-[4/3] overflow-hidden bg-[#F1EFEA]">
                      <img
                        src={sub.image}
                        alt={sub.altText}
                        loading="lazy"
                        onError={applyFallback(category.image)}
                        className="h-full w-full object-cover transition duration-300 group-hover/sub:scale-[1.04]"
                      />
                    </div>
                    <div className="min-h-[44px] px-2 py-2 text-[10px] font-medium leading-3 text-[#4F5968]">
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
