import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMobileGrid } from '@/hooks/useMobileGrid';
import AppHeader from '@/mobile-web-clone/AppHeader';
import AppCategoryShortcuts from '@/mobile-web-clone/AppCategoryShortcuts';
import AppSellerBanner from '@/mobile-web-clone/AppSellerBanner';
import AppGridCard from '@/mobile-web-clone/AppGridCard';
import AppBottomNav from '@/mobile-web-clone/AppBottomNav';
import MobileWebCategoriesPage from '@/mobile-web-clone/CategoriesPage';
import MobileWebInboxPage from '@/mobile-web-clone/InboxPage';

function SkeletonGridCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="animate-pulse" style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 12, background: 'rgba(255,255,255,0.06)' }} />
      <div className="animate-pulse" style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '80%' }} />
      <div className="animate-pulse" style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '50%' }} />
    </div>
  );
}

/**
 * Authenticated mobile WEBSITE shell.
 * Visual source of truth: the installed Loadify app UI. This component is
 * browser-only; Capacitor/native is excluded by Home.tsx before selection.
 */
export default function AuthenticatedMobileWebHome() {
  const [searchParams] = useSearchParams();
  const view = searchParams.get('app') ?? 'home';
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view !== 'home') return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '220px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, view]);

  if (view === 'search') return <MobileWebCategoriesPage />;
  if (view === 'inbox') return <MobileWebInboxPage />;

  return (
    <div data-mobile-web-app-home="true" style={{ minHeight: '100dvh', background: '#07080B', color: '#FFFFFF' }}>
      <AppHeader />
      <AppCategoryShortcuts />
      <AppSellerBanner />

      <section
        aria-label="Products"
        style={{
          paddingInline: 'var(--mob-side,16px)',
          paddingTop: 12,
          paddingBottom: 'calc(80px + env(safe-area-inset-bottom,0px))',
          background: '#07080B',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px,3vw,14px)' }}>
          {loading
            ? Array.from({ length: 12 }).map((_, index) => <SkeletonGridCard key={index} />)
            : products.map((product, index) => (
                <AppGridCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  location={product.location}
                  priority={index < 4}
                />
              ))}
          {loadingMore && Array.from({ length: 4 }).map((_, index) => <SkeletonGridCard key={`more-${index}`} />)}
        </div>

        {!loading && hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
      </section>

      <AppBottomNav />
    </div>
  );
}
