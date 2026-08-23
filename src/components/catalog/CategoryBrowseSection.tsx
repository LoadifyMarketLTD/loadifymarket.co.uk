import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Baby,
  BriefcaseBusiness,
  Car,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Dumbbell,
  Gamepad2,
  Heart,
  Home,
  Laptop,
  Layers3,
  PackageOpen,
  RotateCcw,
  Shirt,
  Sparkles,
  Tags,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { WHOLESALE_VISUAL_TAXONOMY } from '@/data/wholesaleVisualTaxonomy';

interface CategoryBrowseSectionProps {
  compact?: boolean;
}

const ICON_BY_KEY: Record<string, LucideIcon> = {
  electronics: Laptop,
  clothing: Shirt,
  home: Home,
  'health-beauty': Heart,
  toys: Gamepad2,
  'food-drink': UtensilsCrossed,
  tools: Wrench,
  sports: Dumbbell,
  automotive: Car,
  office: BriefcaseBusiness,
  baby: Baby,
  jewellery: Sparkles,
  'mixed-pallets': Layers3,
  returns: RotateCcw,
  overstock: PackageOpen,
  clearance: Tags,
};

const catalogSearchUrl = (value: string) => `/catalog?q=${encodeURIComponent(value)}`;

export default function CategoryBrowseSection({ compact = false }: CategoryBrowseSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedCategorySlug, setExpandedCategorySlug] = useState<string | null>(null);
  const visibleCategories = showAll ? WHOLESALE_VISUAL_TAXONOMY : WHOLESALE_VISUAL_TAXONOMY.slice(0, 8);
  const expandedCategory = WHOLESALE_VISUAL_TAXONOMY.find((category) => category.slug === expandedCategorySlug) ?? null;

  return (
    <section id="categories" aria-label="Browse wholesale categories" className="bg-[#F7F9FC] py-10 md:py-14">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto mb-7 max-w-2xl text-center md:mb-9">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#071039] md:text-4xl">
            Browse by Category
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-[#536184] md:text-base">
            Find exactly what you're looking for across our wide range of wholesale, stock and clearance categories.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleCategories.map((category) => {
            const Icon = ICON_BY_KEY[category.imageKey] ?? Tags;
            const isExpanded = expandedCategorySlug === category.slug;

            return (
              <article
                key={category.slug}
                className="group overflow-hidden rounded-xl border border-[#DCE2ED] bg-white shadow-[0_1px_2px_rgba(10,35,79,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#1D57D8]/30 hover:shadow-[0_10px_28px_rgba(10,35,79,0.08)]"
              >
                <Link to={catalogSearchUrl(category.label)} className="block overflow-hidden bg-slate-100">
                  <div className="aspect-[16/5.6] overflow-hidden">
                    <img
                      src={category.imagePath}
                      alt={`${category.label} products`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                      onError={(event) => {
                        if (event.currentTarget.src !== category.fallbackImage) {
                          event.currentTarget.src = category.fallbackImage;
                        }
                      }}
                    />
                  </div>
                </Link>

                <div className={compact ? 'px-4 pb-4 pt-3' : 'px-4 pb-5 pt-3.5'}>
                  <div className="mb-3 flex items-center gap-2.5">
                    <Icon className="h-5 w-5 shrink-0 text-[#145CEB]" strokeWidth={1.9} />
                    <h3 className="font-display text-[17px] font-bold leading-tight text-[#071039]">
                      {category.label}
                    </h3>
                  </div>

                  <ul className="space-y-1.5">
                    {category.subcategories.map((subcategory) => (
                      <li key={subcategory.slug}>
                        <Link
                          to={catalogSearchUrl(subcategory.label)}
                          className="block text-[12px] font-medium leading-[1.25] text-[#172449] transition hover:text-[#145CEB]"
                          data-visual-status={subcategory.status}
                        >
                          {subcategory.label}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => setExpandedCategorySlug(isExpanded ? null : category.slug)}
                    className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0057E7] hover:underline"
                    aria-expanded={isExpanded}
                    aria-controls={`subcategory-gallery-${category.slug}`}
                  >
                    {isExpanded ? 'Hide visuals' : 'View All'}
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {expandedCategory ? (
          <div
            id={`subcategory-gallery-${expandedCategory.slug}`}
            className="mt-7 rounded-2xl border border-[#DCE2ED] bg-white p-4 shadow-[0_8px_30px_rgba(10,35,79,0.06)] sm:p-5"
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#145CEB]">Explore visually</p>
                <h3 className="mt-1 font-display text-xl font-extrabold text-[#071039]">{expandedCategory.label}</h3>
                <p className="mt-1 text-sm text-[#65708A]">
                  Each approved subcategory uses its own dedicated image. Parent imagery is only a temporary work-branch fallback.
                </p>
              </div>
              <Link to={catalogSearchUrl(expandedCategory.label)} className="text-sm font-bold text-[#0057E7] hover:underline">
                Browse matching listings
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {expandedCategory.subcategories.map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  to={catalogSearchUrl(subcategory.label)}
                  className="group/sub overflow-hidden rounded-xl border border-[#E0E6EF] bg-[#FBFCFE] transition hover:-translate-y-0.5 hover:border-[#145CEB]/30 hover:shadow-md"
                  data-visual-status={subcategory.status}
                >
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={subcategory.displayImage}
                      alt={`${subcategory.label} products`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover/sub:scale-[1.035]"
                      onError={(event) => {
                        if (subcategory.status === 'dedicated') return;
                        const image = event.currentTarget;
                        const stage = image.dataset.fallbackStage;
                        if (!stage) {
                          image.dataset.fallbackStage = 'root';
                          image.src = expandedCategory.imagePath;
                          return;
                        }
                        if (stage === 'root' && image.src !== expandedCategory.fallbackImage) {
                          image.dataset.fallbackStage = 'external';
                          image.src = expandedCategory.fallbackImage;
                        }
                      }}
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold leading-tight text-[#071039]">{subcategory.label}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#7B859B]">
                      {subcategory.status === 'dedicated' ? 'Dedicated visual' : 'Visual pending'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={() => {
              setShowAll((value) => !value);
              setExpandedCategorySlug(null);
            }}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0057E7] transition hover:underline"
          >
            {showAll ? 'Show First 8 Categories' : `View All ${WHOLESALE_VISUAL_TAXONOMY.length} Categories`}
            {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </section>
  );
}
