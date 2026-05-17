/**
 * MobileProfilePage — mobile profile / account hub.
 *
 * Sections: TOP (user card) / MAIN / TOOLS / SETTINGS / SUPPORT
 * Unauthenticated users see a login/register CTA.
 * Simple list rows with chevron — no descriptions or clutter.
 */

import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import MobileBottomNav from '@/components/MobileBottomNav';
import { useUnreadNotificationsCount } from '@/hooks/useUnreadNotificationsCount';

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

function buildSections(role: string | undefined): Section[] {
  const isSellerOrAdmin = role === 'seller' || role === 'admin';

  return [
    {
      title: 'Main',
      items: [
        // "My listings" is only meaningful for sellers and admins — hide for buyers
        ...(isSellerOrAdmin
          ? [{ label: 'My listings', to: '/seller/products' }]
          : []),
        { label: 'Favourite items', to: '/profile/favourites' },
        { label: 'Orders', to: '/orders' },
        { label: 'Balance', to: '/profile/balance' },
      ],
    },
    ...(isSellerOrAdmin ? [
      {
        title: 'Tools',
        items: [
          { label: 'Promotional tools', to: '/seller/promote' },
        ],
      },
    ] : []),
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
      items: [
        { label: 'Help Centre', to: '/faq' },
      ],
    },
  ];
}

// ── Row component ──────────────────────────────────────────────────────────────
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
      <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.90)' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {badgeCount && badgeCount > 0 ? (
          <span
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 999,
              background: 'rgba(212,175,55,1)',
              color: 'rgba(10,14,26,1)',
              fontSize: 11,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingInline: 6,
            }}
          >
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
        <ChevronRight style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.30)', flexShrink: 0 }} aria-hidden="true" />
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

  return (
    <Link to={to} style={{ display: 'block', textDecoration: 'none' }}>
      {inner}
    </Link>
  );
}

// ── Section component ──────────────────────────────────────────────────────────
function MenuSection({ title, items }: Section) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 20,
          paddingBottom: 4,
          margin: 0,
        }}
      >
        {title}
      </p>
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {items.map((item, i) => (
          <div key={item.to}>
            <MenuRow {...item} />
            {i < items.length - 1 && (
              <div
                aria-hidden="true"
                style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginInlineStart: 'var(--mob-side, 16px)' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Guest CTA ──────────────────────────────────────────────────────────────────
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
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <User style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.40)' }} aria-hidden="true" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'rgba(255,255,255,1)', margin: 0 }}>
        Sign in to your account
      </h2>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', margin: 0, maxWidth: 280 }}>
        Access your listings, orders, messages and more.
      </p>
      <button
        onClick={() => navigate('/login')}
        style={{
          height: 48,
          paddingInline: 40,
          borderRadius: 9999,
          background: 'hsl(var(--primary))',
          border: 'none',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 700,
          color: 'rgba(18,26,43,1)',
          marginTop: 8,
        }}
      >
        Sign in
      </button>
      <button
        onClick={() => navigate('/register')}
        style={{
          height: 48,
          paddingInline: 40,
          borderRadius: 9999,
          background: 'transparent',
          border: '1.5px solid rgba(255,255,255,0.18)',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.80)',
        }}
      >
        Create account
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
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

  const sections = buildSections(user?.role as string | undefined);
  const unreadNotifications = useUnreadNotificationsCount(user?.id);

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
      {/* ── Page title ──────────────────────────────────────────────────────── */}
      <div
        style={{
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 20,
          paddingBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,1)', margin: 0 }}>Profile</h1>
      </div>

      {!user ? (
        <GuestView />
      ) : (
        <>
          {/* ── Profile header ──────────────────────────────────────────────── */}
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
            {/* Avatar */}
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
              <span style={{ fontSize: 22, fontWeight: 700 }} className="text-surface">
                {initials}
              </span>
            </div>

            {/* Name + listings link */}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,1)', margin: 0, lineHeight: 1.2 }}>
                {displayName}
              </p>
              <Link
                to={user.role === 'seller' || user.role === 'admin' ? '/seller/products' : '/catalog'}
                style={{ fontSize: 13, textDecoration: 'none', fontWeight: 600 }}
                className="text-primary"
              >
                View my listings →
              </Link>
            </div>
          </div>

          {/* ── Sections ────────────────────────────────────────────────────── */}
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

          {/* ── Sign out ────────────────────────────────────────────────────── */}
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
              <LogOut style={{ width: 18, height: 18, color: 'rgba(239,68,68,1)', flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(239,68,68,1)' }}>Sign out</span>
            </button>
          </div>
        </>
      )}

      <MobileBottomNav />
    </div>
  );
}
