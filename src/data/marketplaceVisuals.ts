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

/**
 * Convert the temporary Unsplash editorial source into a Loadify same-origin
 * endpoint. The endpoint itself only accepts constrained Unsplash identifiers,
 * so browser navigation never receives an arbitrary third-party URL.
 */
const sameOriginEditorialImage = (source: string) => {
  try {
    const url = new URL(source);

    if (url.hostname === "images.unsplash.com") {
      const id = url.pathname.replace(/^\//, "");
      if (/^photo-[A-Za-z0-9_-]{10,80}$/.test(id)) {
        return `/api/category-editorial-image?kind=image&id=${encodeURIComponent(id)}`;
      }
    }

    if (url.hostname === "unsplash.com") {
      const match = url.pathname.match(/^\/photos\/([A-Za-z0-9_-]{6,80})\/download$/);
      if (match) {
        return `/api/category-editorial-image?kind=download&id=${encodeURIComponent(match[1])}`;
      }
    }
  } catch {
    // Non-URL values are handled by the caller's local fallback path.
  }

  return source;
};

export const marketplaceVisuals: MarketplaceVisual[] = marketplaceTaxonomy.map((category) => {
  const parentImage = imageForCategoryKey(category.imageKey);
  const duplicateImages = duplicateDedicatedImagesWithinCategory(category.label);
  if (import.meta.env.DEV && duplicateImages.length > 0) {
    throw new Error(`Duplicate subcategory images in ${category.label}`);
  }

  const subcategories = category.subcategories.map((title) => {
    const dedicated = hasDedicatedSubcategoryImage(category.label, title);
    const rawSubImage = imageForSubcategory(category.label, title, parentImage);
    const subImage = rawSubImage === parentImage ? parentImage : sameOriginEditorialImage(rawSubImage);
    if (import.meta.env.DEV && (!dedicated || rawSubImage === parentImage)) {
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
