import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, Camera, Filter, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { hasSellerAccess } from '@/lib/roleUtils';
import { supabase } from '@/lib/supabase';
import { MOBILE_NOTIFICATION_QUERY_TYPES } from '@/lib/notificationUtils';
import { useMobileGrid } from '@/hooks/useMobileGrid';
import MobileCategoryShortcuts from '@/components/MobileCategoryShortcuts';
import MobileGridCard from '@/components/MobileGridCard';
import MobileSearchOverlay from '@/components/MobileSearchOverlay';
import logo from '@/assets/loadify-logo.svg';

function SkeletonGridCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        className="animate-pulse"
        style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 12, background: 'rgba(255,255,255,0.06)' }}
      />
      <div className="animate-pulse" style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '80%' }} />
      <div className="animate-pulse" style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.06)', width: '50%' }} />
    </div>
  );
}

function AppLikeHeader() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  const loadUnread = useCallback(async () => {
    if (!user?.id) {
      setUnread(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('userId', user.id)
        .eq('isRead', false)
        .not('isArchived', 'is', true)
        .in('type', MOBILE_NOTIFICATION_QUERY_TYPES);
      if (error) throw error;
      setUnread(count ?? 0);
    } catch {
      // Badge is non-critical; preserve the current value if the read fails.
    }
  }, [user?.id]);

  useEffect(() => {
    void loadUnread();
  }, [loadUnread]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`mobile-web-header-notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` },
        () => { void loadUnread(); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [loadUnread, user?.id]);

  return (
    <>
      <header
        style={{
          background: '#07080B',
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <img src={logo} alt="" aria-hidden="true" width={42} height={42} style={{ width: 42, height: 42, flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
              <span style={{ color: '#FFFFFF', fontSize: 'clamp(18px, 5vw, 22px)', fontWeight: 800, lineHeight: 1, letterSpacing: 0.7, whiteSpace: 'nowrap' }}>
                Loadify
              </span>
              <span style={{ color: '#F2B84B', fontSize: 'clamp(11px, 3vw, 14px)', fontWeight: 800, lineHeight: 1, letterSpacing: 1.4, whiteSpace: 'nowrap' }}>
                MARKET
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/profile/notifications')}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            style={{ position: 'relative', width: 44, height: 44, padding: 0, background: 'transparent', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell style={{ width: 24, height: 24, color: '#FFFFFF' }} aria-hidden="true" />
            {unread > 0 && (
              <span
                aria-hidden="true"
                style={{ position: 'absolute', top: 3, right: 2, minWidth: 17, height: 17, borderRadius: 999, background: '#F2B84B', color: '#07080B', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search for items or members"
            style={{ flex: 1, height: 48, background: '#17181E', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 13, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', textAlign: 'left', minWidth: 0 }}
          >
            <Search style={{ width: 20, height: 20, color: 'rgba(255,255,255,0.48)', flexShrink: 0 }} aria-hidden="true" />
            <span style={{ color: 'rgba(255,255,255,0.58)', fontSize: 'clamp(14px, 4vw, 17px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              Search for items or members
            </span>
            <Camera style={{ width: 19, height: 19, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/catalog')}
            aria-label="Browse catalogue filters"
            style={{ width: 48, height: 48, borderRadius: 13, background: '#1E1A0E', border: '1px solid rgba(242,184,75,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Filter style={{ width: 19, height: 19, color: '#F2B84B' }} aria-hidden="true" />
          </button>
        </div>
      </header>

      {searchOpen && <MobileSearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function SellerBanner() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);

  const handleSell = () => {
    if (!user) {
      promptAuth('sell');
      return;
    }
    if (hasSellerAccess(user)) navigate('/sell');
    else navigate('/register?type=seller');
  };

  return (
    <div style={{ paddingInline: 'var(--mob-side,16px)', marginTop: 16, marginBottom: 4 }}>
      <div style={{ background: '#14151B', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '20px 18px' }}>
        <p style={{ margin: 0, color: '#F2B84B', fontSize: 'clamp(11px,3vw,13px)', fontWeight: 750, letterSpacing: '0.055em', textTransform: 'uppercase', lineHeight: 1.2 }}>
          0% commission until 31 December 2026
        </p>
        <h2 style={{ margin: '12px 0 0', color: '#FFFFFF', fontSize: 'clamp(22px,6vw,28px)', lineHeight: 1.1, fontWeight: 820, letterSpacing: '-0.025em' }}>
          Sell on Loadify Market
        </h2>
        <p style={{ margin: '9px 0 0', color: 'rgba(255,255,255,0.56)', fontSize: 'clamp(14px,4vw,17px)', lineHeight: 1.45 }}>
          Free listings. Fixed prices. Stripe payouts.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 22, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleSell} style={{ padding: 0, border: 0, background: 'transparent', color: '#FFFFFF', fontSize: 'clamp(14px,4vw,16px)', fontWeight: 800 }}>
            Start selling
          </button>
          <button type="button" onClick={() => navigate('/faq')} style={{ padding: 0, border: 0, background: 'transparent', color: 'rgba(255,255,255,0.50)', fontSize: 'clamp(13px,3.7vw,15px)', fontWeight: 650 }}>
            Learn how it works
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuthenticatedMobileWebHome() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMore(); },
      { rootMargin: '220px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div data-mobile-web-app-home="true" style={{ minHeight: '100dvh', background: '#07080B', color: '#FFFFFF' }}>
      <AppLikeHeader />
      <MobileCategoryShortcuts />
      <SellerBanner />

      <section
        aria-label="Products"
        style={{
          paddingInline: 'var(--mob-side,16px)',
          paddingTop: 14,
          paddingBottom: 'calc(var(--mob-nav-h,68px) + env(safe-area-inset-bottom,0px) + 24px)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px,3vw,14px)' }}>
          {loading
            ? Array.from({ length: 12 }).map((_, index) => <SkeletonGridCard key={index} />)
            : products.map((product, index) => (
                <MobileGridCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.image}
                  priority={index < 4}
                />
              ))}
          {loadingMore && Array.from({ length: 4 }).map((_, index) => <SkeletonGridCard key={`more-${index}`} />)}
        </div>

        {!loading && hasMore && <div ref={sentinelRef} style={{ height: 1 }} aria-hidden="true" />}
      </section>
    </div>
  );
}
