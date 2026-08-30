import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import MobileAppHeader from '@/components/MobileAppHeader';
import MobileGridCard from '@/components/MobileGridCard';
import { useMobileGrid } from '@/hooks/useMobileGrid';
import { hasSellerAccess } from '@/lib/roleUtils';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';

/**
 * Updated installed-app marketplace shell.
 *
 * Structure intentionally follows the established Capacitor application:
 * compact app header/search, horizontal categories, compact seller CTA,
 * continuous two-column product feed and app bottom navigation.
 *
 * Visual identity is the current Loadify Market site palette:
 * ivory #F8F7F4, navy #0A234F, warm accent #8A7351, white surfaces and
 * slate support text. This is not the Mobile Web homepage stack.
 */

const BG = '#F8F7F4';
const NAVY = '#0A234F';
const ACCENT = '#8A7351';
const TEXT = '#334155';
const MUTED = '#667085';
const BORDER = 'rgba(10,35,79,0.09)';

const CATEGORIES = [
  { id: 'all', label: 'All', to: '/catalog', match: '' },
  { id: 'home', label: 'Home', to: '/category/homeware', match: '/category/homeware' },
  { id: 'electronics', label: 'Electronics', to: '/category/electrical', match: '/category/electrical' },
  { id: 'entertainment', label: 'Entertainment', to: '/category/entertainment', match: '/category/entertainment' },
  { id: 'hobbies', label: 'Hobbies', to: '/category/toys', match: '/category/toys' },
  { id: 'sports', label: 'Sports', to: '/category/sports-fitness', match: '/category/sports-fitness' },
  { id: 'vehicles', label: 'Vehicles', to: '/category/vehicles', match: '/category/vehicles' },
  { id: 'fashion', label: 'Fashion', to: '/category/wholesale-clothing', match: '/category/wholesale-clothing' },
  { id: 'kids', label: 'Kids', to: '/category/kids', match: '/category/kids' },
];

function NativeCategoryShortcuts() {
  const { pathname } = useLocation();
  const activeId = pathname === '/' || pathname === '/catalog'
    ? 'all'
    : (CATEGORIES.find((category) => category.match && pathname.startsWith(category.match))?.id ?? '');

  return (
    <section aria-label="Browse by category" style={{ background: BG, paddingTop: 12, paddingBottom: 4 }}>
      <div
        className="scrollbar-hide overflow-x-auto"
        style={{ paddingLeft: 'var(--mob-side, 16px)', scrollPaddingInlineStart: 'var(--mob-side, 16px)' }}
      >
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {CATEGORIES.map(({ id, label, to }) => {
            const active = id === activeId;
            return (
              <Link
                key={to}
                to={to}
                style={{
                  display: 'flex',
                  minHeight: 36,
                  alignItems: 'center',
                  paddingInline: 14,
                  borderRadius: 9999,
                  border: active ? `1px solid ${NAVY}` : `1px solid ${BORDER}`,
                  background: active ? NAVY : '#FFFFFF',
                  color: active ? '#FFFFFF' : TEXT,
                  fontSize: 13,
                  fontWeight: active ? 650 : 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: active ? '0 4px 12px rgba(10,35,79,0.10)' : 'none',
                }}
              >
                {label}
              </Link>
            );
          })}
          <div style={{ minWidth: 'var(--mob-side, 16px)', flexShrink: 0 }} aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function NativeSellerBanner() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);

  const handleSell = () => {
    if (!user) {
      promptAuth('sell');
      return;
    }
    if (hasSellerAccess(user)) {
      navigate('/sell');
      return;
    }
    navigate('/register?type=seller');
  };

  return (
    <section style={{ background: BG, padding: '14px var(--mob-side, 16px) 6px' }} aria-label="Sell on Loadify Market">
      <div
        style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: '18px 18px 17px',
          background: '#FFFFFF',
          boxShadow: '0 8px 24px rgba(15,23,42,0.045)',
        }}
      >
        <p style={{ margin: 0, color: ACCENT, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Built for UK sellers
        </p>
        <h2 style={{ margin: '6px 0 0', color: NAVY, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 22, lineHeight: 1.12, fontWeight: 600, letterSpacing: '-0.025em' }}>
          Sell fast. Manage everything in one place.
        </h2>
        <p style={{ margin: '8px 0 0', color: MUTED, fontSize: 12.5, lineHeight: 1.5 }}>
          List products, manage marketplace orders and grow your presence from the app.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 15 }}>
          <button
            type="button"
            onClick={handleSell}
            style={{
              minHeight: 42,
              paddingInline: 20,
              borderRadius: 8,
              border: 'none',
              background: NAVY,
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 650,
              cursor: 'pointer',
            }}
          >
            Start selling
          </button>
          <button
            type="button"
            onClick={() => navigate('/seller-guidelines')}
            style={{
              minHeight: 42,
              padding: 0,
              border: 'none',
              background: 'transparent',
              color: TEXT,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Explore benefits
          </button>
        </div>
      </div>
    </section>
  );
}

function NativeSkeletonCard() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 12, background: '#E9E6DF' }} />
      <div style={{ width: '80%', height: 12, borderRadius: 6, background: '#E9E6DF' }} />
      <div style={{ width: '50%', height: 14, borderRadius: 6, background: '#E9E6DF' }} />
    </div>
  );
}

export function UpdatedNativeHome() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="min-h-screen" style={{ background: BG, color: NAVY }}>
      <MobileAppHeader />
      <NativeCategoryShortcuts />
      <NativeSellerBanner />

      <section
        aria-label="Marketplace products"
        style={{
          background: BG,
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 16,
          paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px) + 22px)',
        }}
      >
        <div style={{ marginBottom: 15 }}>
          <p style={{ margin: 0, color: ACCENT, fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Live on Loadify
          </p>
          <h2 style={{ margin: '6px 0 0', color: NAVY, fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 23, lineHeight: 1.1, fontWeight: 600, letterSpacing: '-0.025em' }}>
            Explore marketplace products
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 3vw, 14px)' }}>
          {loading
            ? Array.from({ length: 12 }).map((_, index) => <NativeSkeletonCard key={index} />)
            : products.map((product, index) => (
                <MobileGridCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  location={product.location}
                  priority={index < 4}
                />
              ))}
          {loadingMore && Array.from({ length: 4 }).map((_, index) => <NativeSkeletonCard key={`more-${index}`} />)}
        </div>

        {!loading && hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
      </section>
    </div>
  );
}
