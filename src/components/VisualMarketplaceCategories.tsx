import { Link } from "react-router-dom";
import { marketplaceVisuals } from "@/data/marketplaceVisuals";
import { marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";

/**
 * Marketplace taxonomy explorer.
 *
 * Production-safe fallback: imagery is intentionally not rendered here until
 * the dedicated local 16x96 visual asset contract is deployed with the files.
 * This prevents broken remote-image placeholders on the live homepage while
 * preserving category and subcategory navigation.
 */
export default function VisualMarketplaceCategories() {
  return (
    <section className="bg-[#F7F9FC] py-12 sm:py-16" aria-labelledby="visual-marketplace-categories-heading">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1D57D8]">Explore the marketplace</p>
            <h2 id="visual-marketplace-categories-heading" className="mt-2 text-3xl font-black tracking-[-0.03em] text-[#0A234F] sm:text-4xl">
              Browse by category
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#64748B] sm:text-base">
              Explore marketplace departments and product types while seller listings remain the source of live inventory.
            </p>
          </div>
          <Link to="/catalog" className="text-sm font-extrabold text-[#1D57D8] hover:underline">
            Browse all live listings →
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {marketplaceVisuals.map((category) => (
            <article
              key={category.slug}
              className="overflow-hidden rounded-2xl border border-[#0A234F]/10 bg-white shadow-[0_10px_28px_rgba(10,35,79,0.06)]"
            >
              <Link
                to={`/category/${category.slug}`}
                className="group block border-b border-[#0A234F]/10 bg-gradient-to-br from-[#0A234F] via-[#123A78] to-[#1D57D8] px-4 py-5 transition hover:brightness-105"
              >
                <h3 className="text-base font-black text-white">{category.title}</h3>
                <p className="mt-1 text-xs font-semibold text-white/75">6 subcategories</p>
              </Link>

              <div className="grid grid-cols-2 gap-px bg-[#0A234F]/10">
                {category.subcategories.map((sub) => (
                  <Link
                    key={sub.title}
                    to={`/category/${category.slug}?sub=${encodeURIComponent(marketplaceSubcategorySlug(category.title, sub.title))}`}
                    className="min-h-[58px] bg-white px-3 py-3 text-[11px] font-bold leading-4 text-[#334155] transition hover:bg-[#F4F7FC] hover:text-[#1D57D8]"
                    title={sub.title}
                  >
                    {sub.title}
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
