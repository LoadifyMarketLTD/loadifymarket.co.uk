import { Helmet } from "react-helmet-async";

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

/**
 * SEO — per-page <head> tags via react-helmet-async.
 *
 * Renders title, description, canonical link, Open Graph tags, and Twitter
 * card tags for every page that mounts it.  Wrap the app in <HelmetProvider>
 * (see main.tsx) to enable helmet context.
 */
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
  const fullTitle = title.endsWith(` | ${SITE_NAME}`) || title === SITE_NAME
    ? title
    : `${title} | ${SITE_NAME}`;
  const canonicalUrl = canonical
    ? canonical.startsWith("http")
      ? canonical
      : `${BASE_URL}${canonical}`
    : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {robots !== "index, follow" && <meta name="robots" content={robots} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Product-specific Open Graph (Facebook commerce & rich previews) */}
      {ogType === "product" && ogPrice && (
        <>
          <meta property="og:price:amount" content={ogPrice} />
          <meta property="og:price:currency" content={ogPriceCurrency} />
          <meta property="product:price:amount" content={ogPrice} />
          <meta property="product:price:currency" content={ogPriceCurrency} />
        </>
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD structured data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
