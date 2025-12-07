/**
 * SEO Utilities for Loadify Market
 * Provides functions for generating meta tags, structured data, and SEO optimization
 */

export interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
  price?: number;
  currency?: string;
  availability?: string;
}

export const generateMetaTags = (config: SEOConfig): string => {
  const {
    title,
    description,
    canonical = 'https://loadifymarket.co.uk',
    image = 'https://loadifymarket.co.uk/og-image.jpg',
    type = 'website',
  } = config;

  return `
    <!-- Primary Meta Tags -->
    <meta name="title" content="${title}">
    <meta name="description" content="${description}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="${type}">
    <meta property="og:url" content="${canonical}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${image}">
    <meta property="og:site_name" content="Loadify Market">
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${canonical}">
    <meta property="twitter:title" content="${title}">
    <meta property="twitter:description" content="${description}">
    <meta property="twitter:image" content="${image}">
    
    <!-- Canonical -->
    <link rel="canonical" href="${canonical}">
  `.trim();
};

export const generateOrganizationSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Loadify Market',
    legalName: 'Danny Courier LTD',
    url: 'https://loadifymarket.co.uk',
    logo: 'https://loadifymarket.co.uk/logo.png',
    foundingDate: '2025',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+44',
      contactType: 'Customer Service',
      email: 'loadifymarket.co.uk@gmail.com',
      availableLanguage: ['English'],
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '101 Cornelian Street',
      addressLocality: 'Blackburn',
      postalCode: 'BB1 9QL',
      addressCountry: 'GB',
    },
    vatID: 'GB375949535',
    sameAs: [
      'https://loadifymarket.co.uk',
    ],
  };
};

export const generateProductSchema = (product: {
  id: string;
  title: string;
  description: string;
  images?: string[];
  price: number;
  stock: number;
  condition: string;
  averageRating?: number;
  reviewCount?: number;
}) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images || [],
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'Loadify Market',
    },
    offers: {
      '@type': 'Offer',
      url: `https://loadifymarket.co.uk/product/${product.id}`,
      priceCurrency: 'GBP',
      price: product.price.toFixed(2),
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      availability: product.stock > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      itemCondition: product.condition === 'new' 
        ? 'https://schema.org/NewCondition'
        : product.condition === 'refurbished'
        ? 'https://schema.org/RefurbishedCondition'
        : 'https://schema.org/UsedCondition',
      seller: {
        '@type': 'Organization',
        name: 'Loadify Market',
      },
    },
    aggregateRating: product.averageRating ? {
      '@type': 'AggregateRating',
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount || 0,
    } : undefined,
  };
};

export const generateBreadcrumbSchema = (breadcrumbs: { name: string; url: string }[]) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

export const generateWebsiteSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Loadify Market',
    url: 'https://loadifymarket.co.uk',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://loadifymarket.co.uk/catalog?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
};

export const injectStructuredData = (schema: Record<string, unknown>) => {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
};

export const updatePageMeta = (config: SEOConfig) => {
  // Update title
  document.title = config.title;

  // Update or create meta description
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    metaDescription.setAttribute('name', 'description');
    document.head.appendChild(metaDescription);
  }
  metaDescription.setAttribute('content', config.description);

  // Update OG tags
  const updateOrCreateMeta = (property: string, content: string, attribute = 'property') => {
    let meta = document.querySelector(`meta[${attribute}="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(attribute, property);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  updateOrCreateMeta('og:title', config.title);
  updateOrCreateMeta('og:description', config.description);
  updateOrCreateMeta('og:url', config.canonical || window.location.href);
  updateOrCreateMeta('og:image', config.image || 'https://loadifymarket.co.uk/og-image.jpg');
  updateOrCreateMeta('og:type', config.type || 'website');

  // Twitter tags
  updateOrCreateMeta('twitter:title', config.title, 'name');
  updateOrCreateMeta('twitter:description', config.description, 'name');
  updateOrCreateMeta('twitter:image', config.image || 'https://loadifymarket.co.uk/og-image.jpg', 'name');

  // Canonical
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.setAttribute('rel', 'canonical');
    document.head.appendChild(canonical);
  }
  canonical.setAttribute('href', config.canonical || window.location.href);
};

// Pre-defined SEO configs for common pages
export const pageSEO = {
  home: {
    title: 'Loadify Market - B2B & B2C Marketplace for Products, Pallets & Bulk Lots',
    description: 'Your trusted marketplace for buying and selling products, pallets, and bulk lots. Great deals on clearance items, wholesale products, and more. VAT registered, secure payments.',
    canonical: 'https://loadifymarket.co.uk',
  },
  catalog: {
    title: 'Browse Products - Pallets, Lots & More | Loadify Market',
    description: 'Explore our extensive catalog of products, pallets, and bulk lots. Filter by category, condition, and price. New items added daily.',
    canonical: 'https://loadifymarket.co.uk/catalog',
  },
  about: {
    title: 'About Loadify Market - Trusted B2B & B2C Marketplace',
    description: 'Learn about Loadify Market, operated by Danny Courier LTD. Your reliable partner for B2B and B2C trading since 2025.',
    canonical: 'https://loadifymarket.co.uk/about',
  },
};
