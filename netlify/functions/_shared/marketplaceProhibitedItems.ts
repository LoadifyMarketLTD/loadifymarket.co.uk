export const MARKETPLACE_PROHIBITED_ITEMS_POLICY_VERSION = '2026-09-10-play-v1';

export type MarketplaceProhibitedItemCategory =
  | 'dangerous_weapons'
  | 'marijuana_thc'
  | 'tobacco_nicotine'
  | 'alcohol'
  | 'prescription_controlled_drugs'
  | 'unapproved_health_product'
  | 'counterfeit_stolen_recalled';

export interface MarketplaceProhibitedItemViolation {
  category: MarketplaceProhibitedItemCategory;
  policyVersion: string;
}

export interface MarketplaceProhibitedItemInput {
  title?: unknown;
  description?: unknown;
  specifications?: unknown;
}

export const MARKETPLACE_PROHIBITED_ITEM_ERROR =
  'This product cannot be published or purchased on Loadify Market because it appears to fall within a prohibited or restricted product category. Review the Prohibited Items Policy or contact support if you believe this is incorrect.';
function flattenText(value: unknown, depth = 0): string[] {
  if (depth > 3 || value == null) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => flattenText(entry, depth + 1));
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) => [
      key,
      ...flattenText(entry, depth + 1),
    ]);
  }
  return [];
}

function normalise(value: unknown): string {
  return flattenText(value)
    .join(' ')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9.%+\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function violation(category: MarketplaceProhibitedItemCategory): MarketplaceProhibitedItemViolation {
  return { category, policyVersion: MARKETPLACE_PROHIBITED_ITEMS_POLICY_VERSION };
}

const SAFE_WEAPON_TOOL_PHRASES =
  /\b(glue gun|heat gun|spray gun|caulking gun|massage gun|price gun|tagging gun|water gun|toy gun|nerf gun|pistol grip)\b/g;

const DANGEROUS_PRODUCT_TERMS =
  /\b(ammunition|ammo|firearm|gunpowder|dynamite|detonator|grenade|fireworks?|firecrackers?|bump stock|auto sear|gatling trigger|drop-in auto sear|airsoft gun|air rifle|bb gun)\b/;
const FIREARM_TITLE_TERMS = /\b(gun|handgun|shotgun|rifle|revolver|pistol)\b/;
const HIGH_CAPACITY_MAGAZINE = /\b(?:3[1-9]|[4-9]\d|\d{3,})[- ]?(?:round|rd)\s+(?:magazine|mag|belt)\b/;

const MARIJUANA_TERMS = /\b(marijuana|cannabis|tetrahydrocannabinol|thc|hashish)\b/;
const HIGH_RISK_CBD_TERMS = /\bcbd\s+(?:oil|gumm(?:y|ies)|edibles?|vape|flower)\b/;

const NICOTINE_TERMS = /\b(nicotine|e[- ]?liquid|vape juice|nicotine pouches?|chewing tobacco|snuff)\b/;
const TOBACCO_TITLE_TERMS = /\b(tobacco|cigarettes?|cigars?|vape pens?|vapes?|e[- ]?cigarettes?)\b/;
const SAFE_TOBACCO_ACCESSORIES = /\b(cigar cutter|cigar case|cigar holder|humidor|cigarette case|ashtray|vape case)\b/g;
const ALCOHOL_TITLE_TERMS =
  /\b(vodka|whisky|whiskey|gin|rum|tequila|brandy|beer|lager|cider|wine|champagne|prosecco|liqueur|alcoholic drink|alcoholic beverage)\b/;
const NON_ALCOHOLIC_QUALIFIER = /\b(non[- ]?alcoholic|alcohol[- ]?free|zero[- ]alcohol|0\.0\s*%)\b/;
const SAFE_ALCOHOL_ACCESSORIES =
  /\b(wine glass(?:es)?|wine rack|wine stopper|wine cooler|wine vinegar|beer glass(?:es)?|beer mats?|champagne flutes?|gin glass(?:es)?|cocktail shaker|bottle opener|beer battered)\b/g;

const PRESCRIPTION_TITLE_TERMS =
  /\b(prescription (?:medicine|drug)|controlled drug|diazepam|alprazolam|xanax|tramadol|oxycodone|fentanyl|morphine|semaglutide|ozempic|wegovy|mounjaro|anabolic steroids?|testosterone injection)\b/;
const UNAPPROVED_HEALTH_TERMS =
  /\b(ephedra|2[\s,.-]?4[- ]?dinitrophenol|human chorionic gonadotropin)\b/;
const HCG_WEIGHT_LOSS = /\bhcg\b.*\b(weight loss|weight control|slimming)\b|\b(weight loss|weight control|slimming)\b.*\bhcg\b/;
const HARMFUL_HEALTH_CLAIMS = /\b(cures? cancer|treats? cancer|cures? diabetes|replaces? prescription medication)\b/;

const COUNTERFEIT_TERMS =
  /\b(counterfeit(?: goods?)?|fake branded|trademark[- ]infringing|unauthorised branded|stolen goods?|stolen merchandise|recalled product)\b/;

const COUNTERFEIT_NEGATION = /\b(?:not|never|no)\s+(?:a\s+)?(?:counterfeit|stolen|recalled)\b/g;

export function getMarketplaceProhibitedItemViolation(
  input: MarketplaceProhibitedItemInput,
): MarketplaceProhibitedItemViolation | null {
  const title = normalise(input.title);
  const description = normalise(input.description);
  const specifications = normalise(input.specifications);
  const allText = `${title} ${description} ${specifications}`.trim();
  if (!allText) return null;

  const weaponText = allText.replace(SAFE_WEAPON_TOOL_PHRASES, ' ');
  const weaponTitle = title.replace(SAFE_WEAPON_TOOL_PHRASES, ' ');
  if (
    DANGEROUS_PRODUCT_TERMS.test(weaponText) ||
    FIREARM_TITLE_TERMS.test(weaponTitle) ||
    HIGH_CAPACITY_MAGAZINE.test(weaponText)
  ) {
    return violation('dangerous_weapons');
  }

  if (MARIJUANA_TERMS.test(allText) || HIGH_RISK_CBD_TERMS.test(allText)) {
    return violation('marijuana_thc');
  }

  const tobaccoTitle = title.replace(SAFE_TOBACCO_ACCESSORIES, ' ');
  if (NICOTINE_TERMS.test(allText) || TOBACCO_TITLE_TERMS.test(tobaccoTitle)) {
    return violation('tobacco_nicotine');
  }

  const alcoholTitle = title.replace(SAFE_ALCOHOL_ACCESSORIES, ' ');
  if (ALCOHOL_TITLE_TERMS.test(alcoholTitle) && !NON_ALCOHOLIC_QUALIFIER.test(title)) {
    return violation('alcohol');
  }
  if (PRESCRIPTION_TITLE_TERMS.test(title)) {
    return violation('prescription_controlled_drugs');
  }

  if (
    UNAPPROVED_HEALTH_TERMS.test(allText) ||
    HCG_WEIGHT_LOSS.test(allText) ||
    HARMFUL_HEALTH_CLAIMS.test(allText)
  ) {
    return violation('unapproved_health_product');
  }

  const counterfeitText = allText.replace(COUNTERFEIT_NEGATION, ' ');
  if (COUNTERFEIT_TERMS.test(counterfeitText)) {
    return violation('counterfeit_stolen_recalled');
  }

  return null;
}

export function marketplaceProhibitedItemResponseBody(
  violationResult: MarketplaceProhibitedItemViolation,
): { error: string; code: 'PROHIBITED_ITEM'; policyVersion: string } {
  return {
    error: MARKETPLACE_PROHIBITED_ITEM_ERROR,
    code: 'PROHIBITED_ITEM',
    policyVersion: violationResult.policyVersion,
  };
}
