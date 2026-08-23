import { marketplaceTaxonomy, marketplaceCategorySlug } from "@/data/marketplaceTaxonomy";
import {
  duplicateDedicatedImagesGlobally,
  duplicateDedicatedImagesWithinCategory,
  hasDedicatedSubcategoryImage,
  imageForSubcategory,
} from "@/data/subcategoryImages";

const rootImages: Record<string, string> = {
  electronics: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1600&h=1200&q=82",
  clothing: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&h=1200&q=82",
  home: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&h=1200&q=82",
  "health-beauty": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1600&h=1200&q=82",
  toys: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=1600&h=1200&q=82",
  "food-drink": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&h=1200&q=82",
  tools: "https://images.unsplash.com/photo-1530124566582-a618bc2615dc?auto=format&fit=crop&w=1600&h=1200&q=82",
  sports: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1600&h=1200&q=82",
  automotive: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&h=1200&q=82",
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&h=1200&q=82",
  baby: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=1600&h=1200&q=82",
  jewellery: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1600&h=1200&q=82",
  "mixed-pallets": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&h=1200&q=82",
  returns: "https://images.unsplash.com/photo-1586528116493-da8b9e33eea5?auto=format&fit=crop&w=1600&h=1200&q=82",
  overstock: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1600&h=1200&q=82",
  clearance: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&h=1200&q=82",
};

const netlifyImage = (remoteUrl: string) =>
  `/.netlify/images?url=${encodeURIComponent(remoteUrl)}&w=1600&h=1200&fit=cover&q=82`;

export type MarketplaceVisual = {
  title: string;
  slug: string;
  image: string;
  altText: string;
  subcategories: Array<{ title: string; image: string; altText: string }>;
};

export const marketplaceVisuals: MarketplaceVisual[] = marketplaceTaxonomy.map((category) => {
  const parentRemoteImage = rootImages[category.imageKey] || rootImages["mixed-pallets"];
  const parentImage = netlifyImage(parentRemoteImage);
  const duplicateImages = duplicateDedicatedImagesWithinCategory(category.label);
  if (import.meta.env.DEV && duplicateImages.length > 0) {
    throw new Error(`Duplicate subcategory images in ${category.label}`);
  }

  const subcategories = category.subcategories.map((title) => {
    const dedicated = hasDedicatedSubcategoryImage(category.label, title);
    const subRemoteImage = imageForSubcategory(category.label, title, parentRemoteImage);
    if (import.meta.env.DEV && (!dedicated || subRemoteImage === parentRemoteImage)) {
      throw new Error(`Missing dedicated image for ${category.label} / ${title}`);
    }
    return {
      title,
      image: netlifyImage(subRemoteImage),
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
