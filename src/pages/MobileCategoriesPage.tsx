/**
 * MobileCategoriesPage — /categories
 * DB-driven category list enriched with canonical editorial category imagery.
 * Editorial images are navigation aids only; live inventory remains seller-sourced.
 */

import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useCategories } from '@/hooks/useCategories';
import { visualForCategory } from '@/data/marketplaceVisuals';

export default function MobileCategoriesPage() {
  const navigate = useNavigate();
  const { categories, loading } = useCategories();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC]">
      <div
        className="shrink-0 flex items-center gap-3 px-4 sticky top-0 z-10 bg-[#F7F9FC]/[0.97]"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(10,35,79,0.08)',
          paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '1rem',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl active:bg-[#0A234F]/5 transition-colors bg-white border border-[#0A234F]/10"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 text-[#0A234F]" aria-hidden="true" />
        </button>
        <h1 className="flex-1 text-center text-[#0A234F] font-bold text-lg pr-9">Categories</h1>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Link
          to="/catalog"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-[#0A234F]/10 bg-white p-4 shadow-sm"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0A234F]">
            <LayoutGrid className="h-5 w-5 text-[#F5A300]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-extrabold text-[#0A234F]">All Categories</div>
            <div className="mt-0.5 text-[11px] text-[#64748B]">Browse current approved marketplace listings</div>
          </div>
          <ChevronRight className="h-5 w-5 text-[#94A3B8]" aria-hidden="true" />
        </Link>

        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-[4/3] animate-pulse rounded-2xl bg-[#0A234F]/5" aria-hidden="true" />
            ))}
          </div>
        )}

        {!loading && (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const visual = visualForCategory(cat.slug) ?? visualForCategory(cat.name);
              return (
                <Link
                  key={cat.id}
                  to={`/category/${cat.slug}`}
                  className="overflow-hidden rounded-2xl border border-[#0A234F]/10 bg-white shadow-sm active:scale-[0.99] transition-transform"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-[#E8EEF7]">
                    {visual ? (
                      <img
                        src={visual.image}
                        alt={visual.altText}
                        loading="lazy"
                        onError={(event) => {
                          if (event.currentTarget.dataset.fallbackApplied === 'true') return;
                          event.currentTarget.dataset.fallbackApplied = 'true';
                          event.currentTarget.src = '/hero-marketplace.jpg';
                        }}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl font-black text-[#1D57D8]">
                        {cat.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-[13px] font-extrabold leading-4 text-[#0A234F]">{cat.name}</div>
                    {cat.children.length > 0 && (
                      <div className="mt-1 text-[10px] font-medium text-[#64748B]">{cat.children.length} subcategories</div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}