/**
 * Product Ranking Algorithm
 *
 * ranking_score =
 *   relevance_score       (0–100)  keyword match quality
 * + rating_score          (0–50)   product.rating × 10
 * + sales_score           (0–30)   log(salesCount + 1) × 5
 * + seller_score          (0–25)   seller.rating × 5
 * + new_product_boost     (0–30)   +30 if created within 7 days
 * + featured_boost        (0–100)  +100 if isFeatured
 * − penalty_score         (0–40)   seller quality deductions
 */

import type { Product } from '../types';

// ─── Configuration ────────────────────────────────────────────────────────────

export const RANKING_CONFIG = {
  newProductBoostDays: 7,
  newProductBoostScore: 30,
  featuredBoostScore: 100,
  maxRatingScore: 50,      // product.rating (0–5) × 10
  maxSalesScore: 30,       // log-dampened
  maxSellerScore: 25,      // seller.rating (0–5) × 5
  penaltyPoorRating: 20,   // seller rating < 3.0
  penaltySometimesLate: 5,
  penaltyRepeatedDelays: 15,
  penaltyHighDisputeRate: 20, // dispute rate > 0.1 (10 %)
} as const;

// ─── Relevance scoring ────────────────────────────────────────────────────────

/**
 * Scores a single product against a search query.
 * Returns 0–100.
 */
export function computeRelevanceScore(product: Product, query: string): number {
  if (!query.trim()) return 50; // neutral score when no query

  const q = query.toLowerCase().trim();
  const tokens = q.split(/\s+/).filter(Boolean);

  const title       = (product.title       ?? '').toLowerCase();
  const description = (product.description ?? '').toLowerCase();
  const category    = (product.categoryId  ?? '').toLowerCase();

  let score = 0;

  for (const token of tokens) {
    // Title exact match — highest weight
    if (title === token)            { score += 100; continue; }
    // Title starts with token
    if (title.startsWith(token))    { score += 80; continue; }
    // Title contains token
    if (title.includes(token))      { score += 60; continue; }
    // Description contains token
    if (description.includes(token)){ score += 30; continue; }
    // Category contains token
    if (category.includes(token))   { score += 20; }
  }

  // Normalise to 0–100 based on number of tokens
  return Math.min(100, tokens.length > 0 ? score / tokens.length : 50);
}

// ─── Component scorers ────────────────────────────────────────────────────────

/** Returns 0–50 based on product.rating (0–5). */
export function computeRatingScore(rating: number): number {
  return Math.min(RANKING_CONFIG.maxRatingScore, (rating ?? 0) * 10);
}

/** Returns 0–30 based on salesCount (logarithmically dampened). */
export function computeSalesScore(salesCount: number): number {
  return Math.min(RANKING_CONFIG.maxSalesScore, Math.log(Math.max(salesCount ?? 0, 0) + 1) * 5);
}

/** Returns 0–25 based on seller.rating (0–5). */
export function computeSellerScore(sellerRating?: number): number {
  return Math.min(RANKING_CONFIG.maxSellerScore, (sellerRating ?? 0) * 5);
}

/** Returns +30 if product was created within the boost window. */
export function computeNewProductBoost(createdAt: string): number {
  const msInDay = 24 * 60 * 60 * 1000;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageDays = ageMs / msInDay;
  return ageDays <= RANKING_CONFIG.newProductBoostDays
    ? RANKING_CONFIG.newProductBoostScore
    : 0;
}

/** Returns +100 if product is admin-featured. */
export function computeFeaturedBoost(isFeatured?: boolean): number {
  return isFeatured ? RANKING_CONFIG.featuredBoostScore : 0;
}

/** Returns deduction points based on seller quality indicators. */
export function computePenaltyScore(
  sellerRating?: number,
  paymentBehaviour?: string | null,
  disputeRate?: number,
): number {
  let penalty = 0;

  if ((sellerRating ?? 5) < 3.0) {
    penalty += RANKING_CONFIG.penaltyPoorRating;
  }

  if (paymentBehaviour === 'repeated_delays') {
    penalty += RANKING_CONFIG.penaltyRepeatedDelays;
  } else if (paymentBehaviour === 'sometimes_late') {
    penalty += RANKING_CONFIG.penaltySometimesLate;
  }

  if ((disputeRate ?? 0) > 0.1) {
    penalty += RANKING_CONFIG.penaltyHighDisputeRate;
  }

  return penalty;
}

// ─── Composite score ──────────────────────────────────────────────────────────

export interface RankingScore {
  total: number;
  relevance: number;
  rating: number;
  sales: number;
  seller: number;
  newBoost: number;
  featuredBoost: number;
  penalty: number;
}

/**
 * Computes the full composite ranking score for a product.
 */
export function computeRankingScore(product: Product, query = ''): RankingScore {
  const relevance     = computeRelevanceScore(product, query);
  const rating        = computeRatingScore(product.rating);
  const sales         = computeSalesScore(
    (product as Product & { salesCount?: number }).salesCount ?? product.addToCartCount ?? 0,
  );
  const seller        = computeSellerScore(product.seller?.rating);
  const newBoost      = computeNewProductBoost(product.createdAt);
  const featuredBoost = computeFeaturedBoost(
    (product as Product & { isFeatured?: boolean }).isFeatured,
  );
  const penalty       = computePenaltyScore(
    product.seller?.rating,
    product.seller?.paymentBehaviour,
    (product as Product & { disputeRate?: number }).disputeRate,
  );

  const total = relevance + rating + sales + seller + newBoost + featuredBoost - penalty;

  return { total, relevance, rating, sales, seller, newBoost, featuredBoost, penalty };
}

// ─── Sort utility ─────────────────────────────────────────────────────────────

/**
 * Sorts an array of products by their composite ranking score (highest first).
 */
export function rankProducts(products: Product[], query = ''): Product[] {
  return [...products].sort((a, b) => {
    const sa = computeRankingScore(a, query).total;
    const sb = computeRankingScore(b, query).total;
    return sb - sa;
  });
}
