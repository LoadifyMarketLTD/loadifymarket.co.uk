import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, Camera, Filter, Home, Mail, Plus, Search, User, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import logo from '@/assets/loadify-logo.svg';
import NativeImg from '@/components/NativeImg';
import ProductImagePlaceholder from '@/components/ProductImagePlaceholder';
import { useMobileGrid } from '@/hooks/useMobileGrid';
import { formatPrice } from '@/lib/formatPrice';
import { productThumbnail } from '@/lib/imageOptimization';
import { MOBILE_NOTIFICATION_QUERY_TYPES } from '@/lib/notificationUtils';
import { hasSellerAccess } from '@/lib/roleUtils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';

/**
 * Canonical installed-app marketplace shell.
 *
 * This intentionally preserves the established May 2026 Capacitor APK identity
 * while continuing to use the current auth, data, notification and marketplace
 * contracts. Mobile web must not import this component.
 */}

const NATIVE_BG = '#0A0E1A';
const NATIVE_HEADER = '#07080B';
const NATIVE_GOLD = '#F2B84B';
const NATIVE_TEXT = '#FFFFFF';

interface Category {
  id: string;
  label: string;
  to: string;
  match: string;
}

const CATEGORIES: Category[] = [
  { id: 'all', label: 'All', to: '/catalog', match: '' },
  { id: 'home', label: 'Home', to: '/category/homeware', match: '/category/homeware' },
  { id: 'electronics', label: 'Electronics', to: '/category/electrical', match: '/category/electrical' },
  { id: 'entertainment', label: 'Entertainment', to: '/category/entertainment', match: '/category/entertainment' },
  { id: 'hobbies', label: 'Hobbies & Collectables', to: '/category/toys', match: '/category/toys' },
  { id: 'sports', label: 'Sports', to: '/category/sports-fitness', match: '/category/sports-fitness' },
  { id: 'vehicles', label: 'Vehicles', to: '/category/vehicles', match: '/category/vehicles' },
  { id: 'fashion', label: 'Fashion', to: '/category/wholesale-clothing', match: '/category/wholesale-clothing' },
  { id: 'kids', label: 'Kids', to: '/category/kids', match: '/category/kids' },
];

const QUICK_CATEGORIES = [
  { label: 'Electronics', value: 'electronics' },
  { label: 'Clothing', value: 'clothing' },
  { label: 'Automotive', value: 'automotive' },
  { label: 'Home', value: 'home-garden' },
  { label: 'Sports', value: 'sports' },
  { label: 'Toys', value: 'toys-games' },
  { label: 'Tools', value: 'diy-tools' },
  { label: 'All', value: '' },
];

function LegacyNativeSearchOverlay({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const query = inputRef.current?.value.trim();
    onClose();
    navigate(query ? `/catalog?q=${encodeURIComponent(query)}` : '/catalog');
  };

  const handleCategory = (value: string) => {
    onClose();
    navigate(value ? `/catalog?category=${encodeURIComponent(value)}` : '/catalog');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search marketplace"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        background: 'rgba(10,14,26,0.985)',
        color: NATIVE_TEXT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 12px' }}>
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 14,
            padding: '13px 16px',
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          <Search style={{ width: 18, height: 18, flexShrink: 0, color: 'rgba(255,255,255,0.45)' }} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search items, brands, keywords…"
            aria-label="Search items, brands, keywords"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              lineHeight: 1.2,
              minWidth: 0,
              color: NATIVE_TEXT,
            }}
          />
        </form>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          style={{
            width: 44,
            height: 44,
            flexShrink: 0,
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          <X style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.72)' }} aria-hidden="true" />
        </button>
      </div>

      <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingTop: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, color: 'rgba(255,255,255,0.45)' }}>
          Browse categories
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} role="list" aria-label="Quick category shortcuts">
          {QUICK_CATEGORIES.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              role="listitem"
              onClick={() => handleCategory(value)}
              style={{
                minHeight: 44,
                padding: '0 16px',
                borderRadius: 22,
                border: `1px solid ${NATIVE_GOLD}66`,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(242,184,75,0.08)',
                color: NATIVE_GOLD,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegacyNativeAppHeader() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);

  const loadUnreadNotifications = useCallback(async () => {
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
      // Notification count is non-critical to rendering the installed-app shell.
    }
  }, [user?.id]);

  useEffect(() => {
    void loadUnreadNotifications();
  }, [loadUnreadNotifications]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`native-header-notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `userId=eq.${user.id}` },
        () => void loadUnreadNotifications(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadUnreadNotifications, user?.id]);

  return (
    <>
      <header
        style={{
          background: NATIVE_HEADER,
          paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '0.75rem',
          paddingLeft: 16,
          paddingRight: 16,
          color: NATIVE_TEXT,
        }}
      >
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex min-w-0 flex-1 items-center gap-2.5 border-0 bg-transparent p-0 text-left"
            aria-label="Loadify Market home"
          >
            <img src={logo} alt="" aria-hidden="true" width={38} height={38} style={{ width: 38, height: 38, flexShrink: 0 }} />
            <div className="flex min-w-0 flex-col leading-none" style={{ gap: 2 }}>
              <span style={{ fontSize: 'clamp(14px, 4.2vw, 19px)', fontWeight: 800, color: NATIVE_TEXT, letterSpacing: 'clamp(0.5px, 0.2vw, 1px)', lineHeight: 1, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
                Loadify
              </span>
              <span style={{ fontSize: 'clamp(10px, 2.8vw, 13px)', fontWeight: 800, color: NATIVE_GOLD, letterSpacing: 'clamp(0.5px, 0.3vw, 1.5px)', lineHeight: 1, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
                MARKET
              </span>
            </div>
          </button>

          <button
            onClick={() => navigate('/profile/notifications')}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            style={{ position: 'relative', width: 44, height: 44, padding: 0, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Bell style={{ width: 22, height: 22, color: NATIVE_TEXT }} aria-hidden="true" />
            {unread > 0 && (
              <span aria-hidden="true" style={{ position: 'absolute', top: 4, right: 4, minWidth: 17, height: 17, borderRadius: 9999, background: NATIVE_GOLD, color: '#000', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 2, paddingRight: 2 }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2" style={{ marginTop: 10 }}>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search for items or members"
            style={{ flex: 1, height: 44, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 14, cursor: 'pointer', textAlign: 'left' }}
          >
            <Search style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} aria-hidden="true" />
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
              Search for items or members
            </span>
            <Camera style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} aria-hidden="true" />
          </button>

          <button
            aria-label="Filter"
            onClick={() => navigate('/catalog')}
            style={{ width: 44, height: 44, background: '#1E1A0E', border: `1px solid ${NATIVE_GOLD}66`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}
          >
            <Filter style={{ width: 18, height: 18, color: NATIVE_GOLD }} aria-hidden="true" />
          </button>
        </div>
      </header>

      {searchOpen && <LegacyNativeSearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function LegacyNativeCategoryShortcuts() {
  const { pathname } = useLocation();
  const activePill = pathname === '/' || pathname === '/catalog'
    ? 'all'
    : (CATEGORIES.find((category) => category.match && pathname.startsWith(category.match))?.id ?? '');

  return (
    <section aria-label="Browse by category" style={{ paddingTop: 12, paddingBottom: 4, background: NATIVE_BG }}>
      <div className="overflow-x-auto scrollbar-hide" style={{ paddingLeft: 'var(--mob-side, 16px)', scrollPaddingInlineStart: 'var(--mob-side, 16px)' }}>
        <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
          {CATEGORIES.map(({ id, label, to }) => {
            const active = id === activePill;
            return (
              <Link
                key={id}
                to={to}
                aria-label={`Browse ${label}`}
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  height: 36,
                  paddingLeft: 14,
                  paddingRight: 14,
                  borderRadius: 9999,
                  border: active ? `1.5px solid ${NATIVE_GOLD}` : '1px solid rgba(255,255,255,0.14)',
                  background: active ? 'rgba(242,184,75,0.12)' : 'rgba(255,255,255,0.06)',
                  color: active ? NATIVE_GOLD : 'rgba(255,255,255,0.85)',
                  fontSize: 'clamp(13px, 3.6vw, 14px)',
                  fontWeight: active ? 600 : 500,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  WebkitTapHighlightColor: 'transparent',
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

function LegacyNativeHeroBanner() {
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
    } else {
      navigate('/register?type=seller');
    }
  };

  return (
    <div style={{ paddingInline: 'var(--mob-side, 16px)', marginTop: 16, marginBottom: 4, background: NATIVE_BG }}>
      <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 'clamp(16px, 5vw, 24px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, background: 'rgba(255,255,255,0.04)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 'clamp(11px, 3vw, 13px)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, lineHeight: 1, marginBottom: 6, color: NATIVE_GOLD }}>
            0% commission until 31 December 2026
          </p>
          <h2 style={{ fontSize: 'clamp(18px, 5.2vw, 24px)', fontWeight: 800, margin: 0, lineHeight: 1.2, letterSpacing: '-0.02em', color: NATIVE_TEXT }}>
            Sell fast. Get paid.
          </h2>
          <p style={{ fontSize: 'clamp(12px, 3.4vw, 14px)', margin: '6px 0 0', lineHeight: 1.4, color: 'rgba(255,255,255,0.55)' }}>
            List anything in seconds.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button onClick={handleSell} style={{ height: 40, paddingLeft: 20, paddingRight: 20, borderRadius: 9999, border: 'none', cursor: 'pointer', fontSize: 'clamp(13px, 3.6vw, 14px)', fontWeight: 700, whiteSpace: 'nowrap', background: NATIVE_GOLD, color: '#111827' }}>
              Start selling
            </button>
            <button onClick={() => navigate('/help')} style={{ height: 40, paddingLeft: 0, paddingRight: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'clamp(12px, 3.2vw, 13px)', fontWeight: 600, whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.5)' }}>
              Learn how it works
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const darkPlaceholder = (
  <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <ProductImagePlaceholder theme="dark" />
  </div>
);

function LegacyNativeGridCard({ id, title, price, image, location, priority = false }: { id: string; title: string; price: number; image?: string; location?: string; priority?: boolean }) {
  return (
    <Link to={`/product/${id}`} style={{ display: 'block', textDecoration: 'none' }} aria-label={title}>
      <div style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 12, overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.05)' }}>
        <NativeImg
          src={image ? productThumbnail(image) : undefined}
          alt={title}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding={priority ? 'auto' : 'async'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          fallback={darkPlaceholder}
        />
      </div>
      <div style={{ paddingTop: 8, paddingBottom: 4 }}>
        <p style={{ fontSize: 'clamp(12px, 3.2vw, 13px)', fontWeight: 500, margin: 0, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', color: 'rgba(255,255,255,0.9)' }}>
          {title}
        </p>
        <p style={{ fontSize: 'clamp(13px, 3.8vw, 15px)', fontWeight: 700, margin: '4px 0 0', color: NATIVE_TEXT }}>
          {formatPrice(price)}
        </p>
        {location && (
          <p style={{ fontSize: 11, margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.5)' }}>
            {location}
          </p>
        )}
      </div>
    </Link>
  );
}

function SkeletonGridCard() {
  return (
    <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="w-full rounded-xl" style={{ aspectRatio: '1 / 1', background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-3 w-[80%] rounded-md" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-3.5 w-[50%] rounded-md" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

export function LegacyNativeHome() {
  const { products, loading, loadingMore, hasMore, loadMore } = useMobileGrid();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="min-h-screen" style={{ background: NATIVE_BG, color: NATIVE_TEXT }}>
      <LegacyNativeAppHeader />
      <LegacyNativeCategoryShortcuts />
      <LegacyNativeHeroBanner />

      <section
        aria-label="Products"
        style={{
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 12,
          paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px) + 20px)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(10px, 3vw, 14px)' }}>
          {loading
            ? Array.from({ length: 12 }).map((_, index) => <SkeletonGridCard key={index} />)
            : products.map((product, index) => (
                <LegacyNativeGridCard
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
    </div>
  );
}

function NavItem({ to, icon: Icon, label, isActive }: { to: string; icon: LucideIcon; label: string; isActive: boolean }) {
  return (
    <Link to={to} className="flex min-h-11 flex-col items-center justify-center gap-1 px-3 py-2 no-underline" aria-label={label} aria-current={isActive ? 'page' : undefined}>
      <Icon style={{ width: 22, height: 22, color: isActive ? NATIVE_GOLD : 'rgba(255,255,255,0.45)' }} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
      <span style={{ maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, lineHeight: 1, fontWeight: isActive ? 700 : 400, color: isActive ? NATIVE_GOLD : 'rgba(255,255,255,0.4)' }}>
        {label}
      </span>
    </Link>
  );
}

function LegacyMessagesNavButton({ isActive }: { isActive: boolean }) {
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) {
        if (!cancelled) setUnread(0);
        return;
      }
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiverId', user.id)
        .eq('isRead', false);
      if (!cancelled) setUnread(count ?? 0);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const handleInbox = () => {
    if (!user) {
      promptAuth('message');
      return;
    }
    navigate('/inbox');
  };

  return (
    <button onClick={handleInbox} className="flex flex-col items-center gap-1 px-3 py-2" aria-label={`Inbox${unread > 0 ? `, ${unread} unread` : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer', minHeight: 44 }}>
      <div className="relative">
        <Mail style={{ width: 22, height: 22, color: isActive ? NATIVE_GOLD : 'rgba(255,255,255,0.45)' }} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
        {unread > 0 && (
          <span aria-hidden="true" style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, fontSize: 9, fontWeight: 800, borderRadius: 8, padding: '0 2px', background: NATIVE_GOLD, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
      <span style={{ maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, lineHeight: 1, fontWeight: isActive ? 700 : 400, color: isActive ? NATIVE_GOLD : 'rgba(255,255,255,0.4)' }}>
        Inbox
      </span>
    </button>
  );
}

export function LegacyNativeBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);

  const handleSell = () => {
    if (!user) {
      promptAuth('sell');
      return;
    }
    navigate('/sell');
  };

  const isHomeActive = location.pathname === '/';
  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-[9997] md:hidden"
      style={{
        background: 'rgba(10,14,26,0.97)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingTop: 4, paddingBottom: 4 }}>
        <NavItem to="/" icon={Home} label="Home" isActive={isHomeActive} />
        <NavItem to="/categories" icon={Search} label="Search" isActive={isActive('/categories')} />

        <button onClick={handleSell} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer', color: NATIVE_TEXT }} aria-label="Sell an item">
          <div style={{ width: 52, height: 52, borderRadius: '50%', marginTop: -26, boxShadow: '0 0 24px rgba(242,184,75,0.45), 0 6px 16px rgba(0,0,0,0.65)', background: NATIVE_GOLD, color: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, lineHeight: 1, marginTop: 1, color: NATIVE_TEXT }}>Sell</span>
        </button>

        <LegacyMessagesNavButton isActive={isActive('/inbox')} />
        <NavItem to="/profile" icon={User} label="Profile" isActive={isActive('/profile')} />
      </div>
    </nav>
  );
}
