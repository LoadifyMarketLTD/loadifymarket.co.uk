/**
 * MobileProfilePage — mobile profile / account hub.
 *
 * Navigation is derived through the same compatibility helpers used by the
 * canonical web workspaces. Seller sales and buyer purchases are intentionally
 * separate; admin remains isolated from ordinary commerce workspaces.
 */

import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { hasAdminAccess, hasBuyerAccess, hasSellerAccess } from '@/lib/roleUtils';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useUnreadNotificationsCount } from '@/hooks/useUnreadNotificationsCount';
import type { User as AppUser } from '@/types';

interface SectionItem {
  label: string;
  to: string;
  external?: boolean;
  badgeCount?: number;
}

interface Section {
  title: string;
  items: SectionItem[];
}

function buildSections(user: AppUser | null | undefined): Section[] {
  if (!user) return [];

  if (hasAdminAccess(user)) {
    return [
      {
        title: 'Administration',
        items: [
          { label: 'Admin dashboard', to: '/admin' },
          { label: 'Products & moderation', to: '/admin/products' },
          { label: 'Orders', to: '/admin/orders' },
        ],
      },
      {
        title: 'Settings',
        items: [
          { label: 'Security', to: '/profile/security' },
          { label: 'Activity', to: '/profile/notifications' },
        ],
      },
      {
        title: 'Support',
        items: [{ label: 'Help Centre', to: '/faq' }],
      },
    ];
  }

  const mainItems: SectionItem[] = [];

  if (hasSellerAccess(user)) {
    mainItems.push(
      { label: 'My listings', to: '/seller/products' },
      { label: 'Sales orders', to: '/seller/orders' },
      { label: 'Balance', to: '/profile/balance' },
    );
  }

  if (hasBuyerAccess(user)) {
    mainItems.push(
      { label: hasSellerAccess(user) ? 'My purchases' : 'Orders', to: '/orders' },
      { label: 'Favourite items', to: '/profile/favourites' },
    );
  }

  return [
    {
      title: 'Main',
      items: mainItems,
    },
    {
      title: 'Settings',
      items: [
        { label: 'Settings', to: '/profile/settings' },
        { label: 'Security', to: '/profile/security' },
        { label: 'Activity', to: '/profile/notifications' },
      ],
    },
    {
      title: 'Support',
      items: [{ label: 'Help Centre', to: '/faq' }],
    },
  ];
}

function MenuRow({ label, to, external, badgeCount }: SectionItem) {
  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingInline: 'var(--mob-side, 16px)',
        paddingTop: 14,
        paddingBottom: 14,
        cursor: 'pointer',
      }}
    >
      <span className="text-[15px] font-medium text-foreground/90">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badgeCount && badgeCount > 0 ? (
          <span
            className="bg-primary text-background text-[11px] font-bold inline-flex items-center justify-center"
            style={{ minWidth: 20, height: 20, borderRadius: 999, paddingInline: 6 }}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
        <ChevronRight className="text-foreground/30" style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden="true" />
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
        {inner}
      </a>
    );
  }

  return <Link to={to} style={{ display: 'block', textDecoration: 'none' }}>{inner}</Link>;
}

function MenuSection({ title, items }: Section) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <p
        className="text-xs font-semibold text-foreground/35 uppercase tracking-[0.07em] m-0"
        style={{ paddingInline: 'var(--mob-side, 16px)', paddingTop: 20, paddingBottom: 4 }}
      >
        {title}
      </p>
      <div
        className="bg-white/[0.04]"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {items.map((item, index) => (
          <div key={`${item.to}:${item.label}`}>
            <MenuRow {...item} />
            {index < items.length - 1 && (
              <div aria-hidden="true" className="bg-white/[0.05]" style={{ height: 1, marginInlineStart: 'var(--mob-side, 16px)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GuestView() {
  const navigate = useNavigate();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 64,
        paddingInline: 'var(--mob-side, 16px)',
        gap: 16,
        textAlign: 'center',
      }}
    >
      <div className="bg-white/[0.06] flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: '50%' }}>
        <User className="text-foreground/40" style={{ width: 32, height: 32 }} aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-foreground m-0">Sign in to your account</h2>
      <p className="text-sm text-foreground/50 m-0" style={{ maxWidth: 280 }}>
        Access your listings, orders, messages and more.
      </p>
      <button
        onClick={() => navigate('/login')}
        className="text-[15px] font-bold text-surface"
        style={{
          height: 48,
          paddingInline: 40,
          borderRadius: 9999,
          background: 'hsl(var(--primary))',
          border: 'none',
          cursor: 'pointer',
          marginTop: 8,
        }}
      >
        Sign in
      </button>
      <button
        onClick={() => navigate('/register')}
        className="text-[15px] font-semibold text-foreground/80"
        style={{
          height: 48,
          paddingInline: 40,
          borderRadius: 9999,
          background: 'transparent',
          border: '1.5px solid rgba(255,255,255,0.18)',
          cursor: 'pointer',
        }}
      >
        Create account
      </button>
    </div>
  );
}

export default function MobileProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const displayName = user
    ? ((user as { firstName?: string; lastName?: string }).firstName ?? user.email?.split('@')[0] ?? 'You')
    : null;

  const initials = user
    ? (((user as { firstName?: string }).firstName?.[0] ?? '') +
       ((user as { lastName?: string }).lastName?.[0] ?? '')).toUpperCase() || displayName?.[0]?.toUpperCase() || '?'
    : null;

  const sections = buildSections(user);
  const unreadNotifications = useUnreadNotificationsCount(user?.id);

  const profileTarget = user && hasAdminAccess(user)
    ? '/admin'
    : user && hasSellerAccess(user)
      ? '/seller/products'
      : '/catalog';

  const profileTargetLabel = user && hasAdminAccess(user)
    ? 'Open Admin Hub →'
    : user && hasSellerAccess(user)
      ? 'View my listings →'
      : 'Browse marketplace →';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{ paddingInline: 'var(--mob-side, 16px)', paddingTop: 20, paddingBottom: 8 }}>
        <h1 className="text-[22px] font-extrabold text-foreground m-0">Profile</h1>
      </div>

      {!user ? (
        <GuestView />
      ) : (
        <>
          <div
            style={{
              paddingInline: 'var(--mob-side, 16px)',
              paddingTop: 12,
              paddingBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
              className="bg-primary"
            >
              <span style={{ fontSize: 22, fontWeight: 700 }} className="text-surface">{initials}</span>
            </div>

            <div style={{ minWidth: 0 }}>
              <p className="text-[18px] font-bold text-foreground m-0" style={{ lineHeight: 1.2 }}>{displayName}</p>
              <Link to={profileTarget} style={{ fontSize: 13, textDecoration: 'none', fontWeight: 600 }} className="text-primary">
                {profileTargetLabel}
              </Link>
            </div>
          </div>

          {sections.map((section) => (
            <MenuSection
              key={section.title}
              {...section}
              items={section.items.map((item) =>
                item.to === '/profile/notifications'
                  ? { ...item, badgeCount: unreadNotifications }
                  : item,
              )}
            />
          ))}

          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                paddingInline: 'var(--mob-side, 16px)',
                paddingTop: 16,
                paddingBottom: 16,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <LogOut className="text-danger" style={{ width: 18, height: 18, flexShrink: 0 }} aria-hidden="true" />
              <span className="text-[15px] font-medium text-danger">Sign out</span>
            </button>
          </div>
        </>
      )}

      <MobileBottomNav />
    </div>
  );
}
