import { findWholesaleSubcategoryBlueprint } from './wholesaleSubcategoryBlueprint';
import { WHOLESALE_VISUAL_TAXONOMY } from './wholesaleVisualTaxonomy';

export type WholesaleSubcategoryVisualManifestEntry = {
  categoryLabel: string;
  categorySlug: string;
  subcategoryLabel: string;
  subcategorySlug: string;
  assetPath: string;
  displayImage: string;
  sourcePage?: string;
  status: 'subcategory-pending' | 'dedicated';
  alt: string;
  focus: string;
  ratio: '4:3';
  crop: 'cover';
  style: 'premium-commercial-clean';
  visualBrief: string;
};

const CATEGORY_ART_DIRECTION: Record<string, string> = {
  'electronics-and-technology': 'bright premium consumer-electronics retail photography, clean modern surface, crisp natural highlights, contemporary devices, no visible brand logos',
  'clothing-and-apparel': 'bright premium fashion retail photography, neatly styled garments and accessories, soft neutral backdrop, editorial merchandising, no visible brand logos',
  'home-and-garden': 'bright premium home-and-garden lifestyle photography, tasteful contemporary setting, natural daylight, clean commercial composition',
  'health-and-beauty': 'bright premium beauty and personal-care product photography, clean spa-like setting, soft daylight, elegant commercial composition, no visible brand logos',
  'toys-and-games': 'bright premium toy retail photography, colourful but controlled palette, clean family-friendly composition, products clearly readable as a category',
  'food-and-drink': 'bright premium grocery and packaged-food photography, clean retail presentation, appetising natural light, no visible brand logos',
  'tools-and-diy': 'bright premium workshop and DIY product photography, organised tools, clean workbench, realistic commercial lighting, no visible brand logos',
  'sports-and-leisure': 'bright premium sports and leisure equipment photography, energetic but clean composition, modern fitness or outdoor setting, no visible brand logos',
  automotive: 'bright premium automotive parts and accessories photography, clean workshop or detailing setting, realistic materials, no visible brand logos',
  'office-and-stationery': 'bright premium office and stationery photography, organised professional desk or workspace, clean commercial daylight, no visible brand logos',
  'baby-and-nursery': 'bright premium baby and nursery retail photography, soft neutral colours, safe clean setting, warm natural daylight, no visible brand logos',
  'jewellery-and-watches': 'bright premium jewellery and watches editorial photography, refined neutral surface, elegant controlled reflections, no visible brand logos',
  'mixed-lots': 'bright premium wholesale mixed-lot photography, organised cartons and assorted goods on clean pallets, warehouse setting, commercially realistic and tidy',
  'customer-returns': 'bright premium wholesale customer-returns photography, organised returned goods and cartons on clean pallets, warehouse setting, no damage sensationalism',
  overstock: 'bright premium wholesale overstock photography, abundant neatly arranged retail goods and sealed cartons, clean warehouse environment',
  'clearance-deals': 'bright premium clearance-stock photography, varied retail goods displayed as organised commercial stock, clean warehouse or retail environment, no sale-price text',
};

function buildBrief(categorySlug: string, categoryLabel: string, subcategoryLabel: string, focus: string): string {
  const direction = CATEGORY_ART_DIRECTION[categorySlug] ?? 'bright premium commercial retail photography, clean composition, natural light, no visible brand logos';
  return `${subcategoryLabel} within ${categoryLabel}. Required visual focus: ${focus}. Art direction: ${direction}. The image must immediately communicate this exact subcategory, use a balanced 4:3 composition, keep the main products fully visible, avoid people as the primary subject, avoid text, watermarks, logos, UI, collages, fake listing cards, exaggerated depth of field, dark cinematic grading, and excessive empty space.`;
}

export const WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST: WholesaleSubcategoryVisualManifestEntry[] =
  WHOLESALE_VISUAL_TAXONOMY.flatMap((category) =>
    category.subcategories.map((subcategory) => {
      const blueprint = findWholesaleSubcategoryBlueprint(category.label, subcategory.label);
      if (!blueprint) {
        throw new Error(`Missing visual blueprint for ${category.label} -> ${subcategory.label}`);
      }

      return {
        categoryLabel: category.label,
        categorySlug: category.slug,
        subcategoryLabel: subcategory.label,
        subcategorySlug: subcategory.slug,
        assetPath: subcategory.imagePath,
        displayImage: subcategory.displayImage,
        sourcePage: subcategory.sourcePage,
        status: subcategory.status,
        alt: `${subcategory.label}: ${blueprint.focus}`,
        focus: blueprint.focus,
        ratio: '4:3' as const,
        crop: 'cover' as const,
        style: 'premium-commercial-clean' as const,
        visualBrief: buildBrief(category.slug, category.label, subcategory.label, blueprint.focus),
      };
    }),
  );

export const WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST_COUNT =
  WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST.length;

export const PENDING_WHOLESALE_SUBCATEGORY_VISUALS =
  WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST.filter((entry) => entry.status === 'subcategory-pending');

export const DEDICATED_WHOLESALE_SUBCATEGORY_VISUALS =
  WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST.filter((entry) => entry.status === 'dedicated');

export function findWholesaleSubcategoryVisual(
  categorySlug: string,
  subcategorySlug: string,
): WholesaleSubcategoryVisualManifestEntry | undefined {
  return WHOLESALE_SUBCATEGORY_VISUAL_MANIFEST.find(
    (entry) => entry.categorySlug === categorySlug && entry.subcategorySlug === subcategorySlug,
  );
}
