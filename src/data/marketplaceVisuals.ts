import { marketplaceTaxonomy, marketplaceCategorySlug } from "@/data/marketplaceTaxonomy";
import { imageForCategoryKey } from "@/data/categoryImages";
import {
  duplicateDedicatedImagesGlobally,
  duplicateDedicatedImagesWithinCategory,
  hasDedicatedSubcategoryImage,
  imageForSubcategory,
} from "@/data/subcategoryImages";

export type MarketplaceVisual = {
  title: string;
  slug: string;
  image: string;
  altText: string;
  subcategories: Array<{ title: string; image: string; altText: string }>;
};

export const marketplaceVisuals: MarketplaceVisual[] = marketplaceTaxonomy.map((category) => {
  const parentImage = imageForCategoryKey(category.imageKey);
  const duplicateImages = duplicateDedicatedImagesWithinCategory(category.label);
  if (import.meta.env.DEV && duplicateImages.length > 0) {
    throw new Error(`Duplicate subcategory images in ${category.label}`);
  }

  const subcategories = category.subcategories.map((title) => {
    const dedicated = hasDedicatedSubcategoryImage(category.label, title);
    const subImage = imageForSubcategory(category.label, title, parentImage);
    if (import.meta.env.DEV && (!dedicated || subImage === parentImage)) {
      throw new Error(`Missing dedicated image for ${category.label} / ${title}`);
    }
    return {
      title,
      image: subImage,
      altText: `${title} — representative products from ${category.label}`,
    };
  });

  return {
    title: category.label,
    slug: marketplaceCategorySlug(category.label),
    image: parentImage,
    altText: `${category.label} category — representative product range`,
    subcategories,
  };
});

if (import.meta.env.DEV && duplicateDedicatedImagesGlobally().length > 0) {
  throw new Error("Duplicate dedicated subcategory imagery detected globally");
}

export const visualForCategory = (slugOrName?: string | null) =>
  marketplaceVisuals.find((item) => item.slug === slugOrName || item.title === slugOrName);
