import { Helmet } from "react-helmet-async";
import { getCategorySeoLanding } from "@/lib/categorySeo";
import { getCommercialSeoMeta } from "@/lib/commercialSeo";
import { buildSeoTitle } from "@/lib/seo";

const SITE_NAME = "Loadify Market";
const BASE_URL = "https://loadifymarket.co.uk";
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-loadify-market.png`;

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

export default function SEO({
  title,
  description,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  robots = "index, follow",
  ogPrice,
  ogPriceCurrency = "GBP",
  structuredData,
}: SEOProps) {
  const sharedMeta = robots === "index, follow"
    ? getCommercialSeoMeta(canonical) ?? categoryMeta(canonical)
    : undefined;
  const resolvedTitle = sharedMeta?.title ?? title;
  const resolvedDescription = sharedMeta?.description ?? description;
  const fullTitle = buildSeoTitle(resolvedTitle);
  const canonicalUrl = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${BASE_URL}${canonical}`
    : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      {robots !== "index, follow" && <meta name="robots" content={robots} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:image" content={ogImage} />
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
      <meta name="twitter:image" content={ogImage} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
