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

import electronicsImg from '@/assets/categories/electronics.jpg';
import clothingImg from '@/assets/categories/clothing.jpg';
import homeImg from '@/assets/categories/home.jpg';
import healthBeautyImg from '@/assets/categories/health-beauty.jpg';
import toysImg from '@/assets/categories/toys.jpg';
import foodDrinkImg from '@/assets/categories/food-drink.jpg';
import toolsImg from '@/assets/categories/tools.jpg';
import sportsImg from '@/assets/categories/sports.jpg';
import automotiveImg from '@/assets/categories/automotive.jpg';
import officeImg from '@/assets/categories/office.jpg';
import babyImg from '@/assets/categories/baby.jpg';
import jewelleryImg from '@/assets/categories/jewellery.jpg';
import mixedPalletsImg from '@/assets/categories/mixed-pallets.jpg';
import returnsImg from '@/assets/categories/returns.jpg';
import overstockImg from '@/assets/categories/overstock.jpg';
import clearanceImg from '@/assets/categories/clearance.jpg';

interface CategoryBrowseSectionProps {
  compact?: boolean;
}

const IMAGE_BY_KEY: Record<string, string> = {
  electronics: electronicsImg,
  clothing: clothingImg,
  home: homeImg,
  'health-beauty': healthBeautyImg,
  toys: toysImg,
  'food-drink': foodDrinkImg,
  tools: toolsImg,
  sports: sportsImg,
  automotive: automotiveImg,
  office: officeImg,
  baby: babyImg,
  jewellery: jewelleryImg,
  'mixed-pallets': mixedPalletsImg,
  returns: returnsImg,
  overstock: overstockImg,
  clearance: clearanceImg,
};

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
  const visibleCategories = showAll ? WHOLESALE_VISUAL_TAXONOMY : WHOLESALE_VISUAL_TAXONOMY.slice(0, 8);

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
            const image = IMAGE_BY_KEY[category.imageKey];

            return (
              <article
                key={category.slug}
                className="group overflow-hidden rounded-xl border border-[#DCE2ED] bg-white shadow-[0_1px_2px_rgba(10,35,79,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#1D57D8]/30 hover:shadow-[0_10px_28px_rgba(10,35,79,0.08)]"
              >
                <Link to={catalogSearchUrl(category.label)} className="block overflow-hidden bg-slate-100">
                  <div className="aspect-[16/5.6] overflow-hidden">
                    <img
                      src={image}
                      alt={`${category.label} products`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
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

                  <Link
                    to={catalogSearchUrl(category.label)}
                    className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#0057E7] hover:underline"
                  >
                    View All <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-7 text-center">
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
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
