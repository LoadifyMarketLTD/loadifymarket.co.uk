/**
 * Dynamic Sitemap Generator for Loadify Market
 * Generates XML sitemap with all important pages
 */

import { supabase } from './supabase';

export interface SitemapURL {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export const generateSitemap = async (): Promise<string> => {
  const baseUrl = 'https://loadifymarket.co.uk';
  const urls: SitemapURL[] = [];

  // Static pages
  const staticPages: SitemapURL[] = [
    {
      loc: `${baseUrl}/`,
      changefreq: 'daily',
      priority: 1.0,
      lastmod: new Date().toISOString(),
    },
    {
      loc: `${baseUrl}/catalog`,
      changefreq: 'hourly',
      priority: 0.9,
    },
    {
      loc: `${baseUrl}/about`,
      changefreq: 'monthly',
      priority: 0.5,
    },
    {
      loc: `${baseUrl}/contact`,
      changefreq: 'monthly',
      priority: 0.5,
    },
    {
      loc: `${baseUrl}/help`,
      changefreq: 'weekly',
      priority: 0.6,
    },
    {
      loc: `${baseUrl}/terms`,
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      loc: `${baseUrl}/privacy`,
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      loc: `${baseUrl}/cookies`,
      changefreq: 'yearly',
      priority: 0.3,
    },
    {
      loc: `${baseUrl}/returns`,
      changefreq: 'yearly',
      priority: 0.4,
    },
    {
      loc: `${baseUrl}/shipping`,
      changefreq: 'yearly',
      priority: 0.4,
    },
  ];

  urls.push(...staticPages);

  try {
    // Fetch all approved and active products
    const { data: products } = await supabase
      .from('products')
      .select('id, updatedAt')
      .eq('isApproved', true)
      .eq('isActive', true);

    if (products) {
      products.forEach((product: { id: string; updatedAt: string }) => {
        urls.push({
          loc: `${baseUrl}/product/${product.id}`,
          lastmod: product.updatedAt,
          changefreq: 'weekly',
          priority: 0.8,
        });
      });
    }

    // Fetch all categories
    const { data: categories } = await supabase
      .from('categories')
      .select('slug');

    if (categories) {
      categories.forEach((category: { slug: string }) => {
        urls.push({
          loc: `${baseUrl}/catalog?category=${category.slug}`,
          changefreq: 'daily',
          priority: 0.7,
        });
      });
    }
  } catch (error) {
    console.error('Error fetching dynamic sitemap data:', error);
  }

  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ''}
    ${url.changefreq ? `<changefreq>${url.changefreq}</changefreq>` : ''}
    ${url.priority !== undefined ? `<priority>${url.priority}</priority>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return xml;
};

export const downloadSitemap = async () => {
  const xml = await generateSitemap();
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'sitemap.xml';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Helper to generate robots.txt content
export const generateRobotsTxt = (): string => {
  return `# Loadify Market - Robots.txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /seller
Disallow: /checkout
Disallow: /cart

Sitemap: https://loadifymarket.co.uk/sitemap.xml`;
};
