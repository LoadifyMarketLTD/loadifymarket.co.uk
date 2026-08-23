import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCategoryVisualTree, type CategoryVisualNode } from '@/hooks/useCategoryVisualTree';
import CategoryVisualCard from './CategoryVisualCard';
import { getCategoryVisual, getRootCategoryFallback } from '@/data/categoryVisualContract';

function findNode(nodes: CategoryVisualNode[], slug: string, parent?: CategoryVisualNode): { node: CategoryVisualNode; parent?: CategoryVisualNode } | null {
  for (const node of nodes) {
    if (node.slug === slug) return { node, parent };
    const nested = findNode(node.children, slug, node);
    if (nested) return nested;
  }
  return null;
}

export default function CategoryRouteVisualBanner() {
  const location = useLocation();
  const { categories, loading } = useCategoryVisualTree();
  const slug = location.pathname.startsWith('/category/')
    ? decodeURIComponent(location.pathname.slice('/category/'.length).split('/')[0] ?? '')
    : '';

  const resolved = useMemo(() => slug ? findNode(categories, slug) : null, [categories, slug]);

  useEffect(() => {
    if (!slug) return;
    document.body.classList.add('visual-category-route');
    return () => document.body.classList.remove('visual-category-route');
  }, [slug]);

  if (!slug || loading || !resolved) return null;

  const { node, parent } = resolved;
  const visual = getCategoryVisual(node.slug, parent?.slug, node.name);
  const fallback = getRootCategoryFallback(parent?.slug ?? node.slug);

  return (
    <section className="visual-category-banner bg-[#F7F9FC] px-4 pb-8 pt-20 sm:px-6 lg:px-10" aria-label={`${node.name} category overview`}>
      <div className="mx-auto max-w-[1280px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col justify-center p-6 md:p-9">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#1D57D8]">Browse category</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0A234F] md:text-4xl">{node.name}</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
              Explore {node.name.toLowerCase()} across the marketplace. Category imagery is for navigation and does not represent a live product listing.
            </p>
            {parent ? (
              <Link to={`/category/${parent.slug}`} className="mt-4 text-sm font-bold text-[#1D57D8] hover:underline">
                Back to {parent.name}
              </Link>
            ) : null}
          </div>

          <div className="aspect-[4/3] bg-slate-100 md:aspect-auto md:min-h-[300px]">
            <img
              src={visual.image}
              alt={visual.alt}
              className="h-full w-full object-cover"
              style={{ objectPosition: visual.objectPosition ?? 'center' }}
              onError={(event) => {
                if (fallback?.image && event.currentTarget.src !== new URL(fallback.image, window.location.origin).href) {
                  event.currentTarget.src = fallback.image;
                }
              }}
            />
          </div>
        </div>
      </div>

      {node.children.length > 0 ? (
        <div className="mx-auto mt-8 max-w-[1280px]">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-extrabold text-[#0A234F] md:text-2xl">Explore {node.name}</h2>
              <p className="mt-1 text-sm text-slate-600">Each area has its own visual identity, even before sellers add stock.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {node.children.map((child) => (
              <CategoryVisualCard
                key={child.id}
                name={child.name}
                slug={child.slug}
                parentSlug={node.slug}
                compact
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
