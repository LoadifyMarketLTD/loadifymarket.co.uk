import { Link } from 'react-router-dom';
import { useState } from 'react';
import { getCategoryVisual, getRootCategoryFallback } from '@/lib/categoryVisuals';

interface CategoryVisualCardProps {
  name: string;
  slug: string;
  parentSlug?: string | null;
  description?: string;
  compact?: boolean;
}

export default function CategoryVisualCard({
  name,
  slug,
  parentSlug,
  description,
  compact = false,
}: CategoryVisualCardProps) {
  const visual = getCategoryVisual(slug, parentSlug, name);
  const fallback = getRootCategoryFallback(parentSlug ?? slug);
  const [src, setSrc] = useState(visual.image);

  return (
    <Link
      to={`/category/${slug}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-[4/3] overflow-hidden bg-slate-100">
        <img
          src={src}
          alt={visual.alt}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
          style={{ objectPosition: visual.objectPosition ?? 'center' }}
          onError={() => {
            if (fallback?.image && src !== fallback.image) setSrc(fallback.image);
          }}
        />
      </div>
      <div className={compact ? 'p-3' : 'p-4'}>
        <h3 className="font-display text-base font-bold text-slate-900 group-hover:text-blue-700">{name}</h3>
        {!compact && description ? (
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{description}</p>
        ) : null}
      </div>
    </Link>
  );
}
