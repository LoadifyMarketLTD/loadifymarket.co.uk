import {
  Baby,
  Boxes,
  Briefcase,
  Car,
  Dumbbell,
  Gamepad2,
  Gem,
  HeartPulse,
  Home,
  Laptop,
  Package,
  RotateCcw,
  ShoppingBag,
  Tag,
  Utensils,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { marketplaceTaxonomy, marketplaceCategorySlug, marketplaceSubcategorySlug } from "@/data/marketplaceTaxonomy";
import { visualForCategory } from "@/data/marketplaceVisuals";

export interface CategoryChip {
  label: string;
  subSlug?: string;
  searchTerm?: string;
  condition?: string;
}

export interface CategoryProductFilter {
  types?: string[];
  categorySlug?: string;
}

export interface CategoryConfig {
  slug: string;
  label: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
  accentBg: string;
  chips: CategoryChip[];
  subcategories: string[];
  image: string;
  emptyState: { title: string; description: string };
  productFilter: CategoryProductFilter;
}

const iconByLabel: Record<string, LucideIcon> = {
  "Electronics & Technology": Laptop,
  "Clothing & Apparel": ShoppingBag,
  "Home & Garden": Home,
  "Health & Beauty": HeartPulse,
  "Toys & Games": Gamepad2,
  "Food & Drink": Utensils,
  "Tools & DIY": Wrench,
  "Sports & Leisure": Dumbbell,
  Automotive: Car,
  "Office & Stationery": Briefcase,
  "Baby & Nursery": Baby,
  "Jewellery & Watches": Gem,
  "Mixed Lots": Boxes,
  "Customer Returns": RotateCcw,
  Overstock: Package,
  "Clearance Deals": Tag,
};

const CATEGORY_CONFIG: readonly CategoryConfig[] = marketplaceTaxonomy.map((category) => {
  const slug = marketplaceCategorySlug(category.label);
  const visual = visualForCategory(slug);
  return {
    slug,
    label: category.label,
    title: category.label,
    subtitle: `Browse ${category.label.toLowerCase()} across six dedicated marketplace subcategories.`,
    icon: iconByLabel[category.label] ?? Tag,
    iconColor: "text-primary",
    accentBg: "bg-primary/10",
    image: visual?.image ?? "",
    subcategories: [...category.subcategories],
    chips: [
      { label: `All ${category.label}` },
      ...category.subcategories.map((subcategory) => ({
        label: subcategory,
        subSlug: marketplaceSubcategorySlug(category.label, subcategory),
        searchTerm: subcategory,
      })),
    ],
    emptyState: {
      title: `No ${category.label} listings found`,
      description: "Live inventory appears only when approved seller listings are available. Try another subcategory or check back later.",
    },
    productFilter: { categorySlug: slug },
  };
});

export default CATEGORY_CONFIG;

export function getCategoryConfig(slug: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG.find((category) => category.slug === slug);
}
