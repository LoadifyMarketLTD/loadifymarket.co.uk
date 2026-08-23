import { useState } from "react";
import { Link } from "react-router-dom";
import { marketplaceVisuals } from "@/data/marketplaceVisuals";
import { marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";

function MarketplaceImage({ src, alt, compact = false }: { src: string; alt: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#E8EEF8] via-[#F7F9FC] to-[#EAF0FA] px-3 text-center"
      >
        <span className={compact ? "text-[9px] font-bold leading-3 text-[#60708D]" : "text-xs font-bold text-[#52627E]"}>
          {alt.replace(/ — representative.*$/, "").replace(/ category — representative.*$/, "")}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Image-led marketplace taxonomy explorer.
 * Editorial category/subcategory imagery is navigation content only — never a fake listing.
 */
export default function VisualMarketplaceCategories() {
  return (
    <section className="bg-[#F7F9FC] py-12 sm:py-16" aria-labelledby="visual-marketplace-categories-heading">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
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

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {marketplaceVisuals.map((category) => (
            <article key={category.slug} className="overflow-hidden rounded-2xl border border-[#0A234F]/10 bg-white shadow-[0_10px_28px_rgba(10,35,79,0.06)]">
              <Link to={`/category/${category.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-[#E9EEF7]">
                  <MarketplaceImage src={category.image} alt={category.altText} />
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
                      <MarketplaceImage src={sub.image} alt={sub.altText} compact />
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
