import { Helmet } from "react-helmet-async";
import { getCategorySeoLanding } from "@/lib/categorySeo";
import { getCommercialSeoMeta } from "@/lib/commercialSeo";
import { buildSeoTitle } from "@/lib/seo";
import { useMarket } from "@/contexts/MarketContext";
import { MARKET_CONFIG } from "@/lib/marketConfig";

const SITE_NAME = "Loadify Market";
const BASE_URL = "https://loadifymarket.co.uk";
const PRODUCT_SELLER_PROMO_RE = /\s*Sell with 0% commission on Loadify Market\.?\s*$/i;

interface SEOProps {
  title: string;
  description: string;
  /** Absolute or root-relative canonical path (e.g. "/catalog" or full URL). */
  canonical?: string;
  /** Override the og:image URL. */
  ogImage?: string;
  /** Open Graph type, e.g. "website" or "product". */
  ogType?: string;
  /** Set to "noindex, nofollow" for auth-gated or private pages. */
  robots?: string;
  /** Product price as a numeric string, e.g. "29.99". Used for og:price meta on product pages. */
  ogPrice?: string;
  /** ISO 4217 currency code for og:price, defaults to "GBP". */
  ogPriceCurrency?: string;
  /** Structured data to inject as a JSON-LD <script> in <head>. */
  structuredData?: Record<string, unknown>;
}

function canonicalPath(canonical?: string): string | undefined {
  if (!canonical) return undefined;
  try {
    const path = canonical.startsWith("http")
      ? new URL(canonical).pathname
      : canonical.split(/[?#]/, 1)[0];
    if (!path) return undefined;
    return path === "/" ? "/" : path.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function categoryMeta(canonical?: string) {
  const path = canonicalPath(canonical);
  const match = path?.match(/^\/category\/([a-z0-9-]+)$/i);
  return match ? getCategorySeoLanding(match[1]) : undefined;
}

function productDescription(description: string, ogType: string): string {
  if (ogType !== "product") return description;
  const cleaned = description.replace(PRODUCT_SELLER_PROMO_RE, "").trim();
  return cleaned || description;
}

export default function SEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = "website",
  robots = "index, follow",
  ogPrice,
  ogPriceCurrency = "GBP",
  structuredData,
}: SEOProps) {
  const { market, config } = useMarket();
  const sharedMeta = robots === "index, follow"
    ? getCommercialSeoMeta(canonical) ?? categoryMeta(canonical)
    : undefined;
  const resolvedTitle = sharedMeta?.title ?? title;
  const resolvedDescription = productDescription(
    sharedMeta?.description ?? description,
    ogType,
  );
  const fullTitle = buildSeoTitle(resolvedTitle);
  const alternatePath = canonicalPath(canonical);
  const roSeoLive = MARKET_CONFIG.RO.status === "live";
  const marketSeoIndexable = market !== "RO" || roSeoLive;
  const effectiveRobots = marketSeoIndexable ? robots : "noindex, nofollow";
  const activeBaseUrl = market === "RO" && roSeoLive ? "https://loadifymarket.ro" : BASE_URL;
  const resolvedOgImage = ogImage ?? `${activeBaseUrl}/og-loadify-market.png`;
  const canonicalUrl = canonical
    ? canonical.startsWith("http")
      ? `${activeBaseUrl}${canonicalPath(canonical) ?? "/"}`
      : `${activeBaseUrl}${canonical}`
    : undefined;
  const ukAlternateUrl = alternatePath ? `${BASE_URL}${alternatePath === "/" ? "" : alternatePath}` : undefined;
  const roAlternateUrl = roSeoLive && alternatePath ? `https://loadifymarket.ro${alternatePath === "/" ? "" : alternatePath}` : undefined;
  const marketOgLocale = market === "RO" ? "ro_RO" : "en_GB";

  // Product JSON-LD is injected server-side by product-meta with the canonical
  // DB-backed product identity. Suppressing the hydrated duplicate prevents two
  // conflicting Product objects from appearing after JavaScript execution.
  const shouldRenderStructuredData = Boolean(structuredData && ogType !== "product");

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {effectiveRobots !== "index, follow" && <meta name="robots" content={effectiveRobots} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {ukAlternateUrl && <link rel="alternate" hrefLang="en-GB" href={ukAlternateUrl} />}
      {roAlternateUrl && <link rel="alternate" hrefLang="ro-RO" href={roAlternateUrl} />}
      {ukAlternateUrl && <link rel="alternate" hrefLang="x-default" href={ukAlternateUrl} />}

      <meta property="og:type" content={ogType} />
      <meta property="og:locale" content={marketOgLocale} />
      <meta name="content-language" content={config.locale} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={resolvedOgImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {ogType === "product" && ogPrice && (
        <>
          <meta property="og:price:amount" content={ogPrice} />
          <meta property="og:price:currency" content={ogPriceCurrency} />
          <meta property="product:price:amount" content={ogPrice} />
          <meta property="product:price:currency" content={ogPriceCurrency} />
        </>
      )}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedOgImage} />

      {shouldRenderStructuredData && structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
