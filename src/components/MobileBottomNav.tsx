/**
 * MobileBottomNav — pixel-perfect match to reference image.
 *
 * Items (left → right):
 *   Home (house) | Categories (grid) | Sell Item (big gold circle +) | Messages (chat + unread badge) | Profile (person)
 *
 * "Home" links to "/" (exact active match).
 * "Sell Item" is elevated above the bar with a large gold circle.
 * Safe-area-inset-bottom applied via inline padding.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Plus, LayoutGrid, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';

// ── Generic nav item ──────────────────────────────────────────────────────────

function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
  exact = false,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  exact?: boolean;
}) {
  void exact; // consumed by parent logic
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 px-3 py-2"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      style={{ textDecoration: 'none', minHeight: '44px', justifyContent: 'center' }}
    >
      <Icon
        style={{
          width: '22px',
          height: '22px',
          color: isActive ? '#F5B942' : 'rgba(255,255,255,0.45)',
          transition: 'color 0.2s',
        }}
        strokeWidth={isActive ? 2.2 : 1.8}
        aria-hidden="true"
      />
      <span
        style={{
          fontSize: '10px',
          fontWeight: isActive ? 700 : 400,
          color: isActive ? '#F5B942' : 'rgba(255,255,255,0.40)',
          lineHeight: 1,
          transition: 'color 0.2s',
          maxWidth: '52px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </Link>
  );
}

// ── Messages button with unread badge ────────────────────────────────────────

function MessagesNavButton({ isActive }: { isActive: boolean }) {
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) { if (!cancelled) setUnread(0); return; }
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiverId', user.id)
        .eq('isRead', false);
      if (!cancelled) setUnread(count ?? 0);
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <Link
      to="/inbox"
      className="flex flex-col items-center gap-1 px-3 py-2"
      aria-label={`Messages${unread > 0 ? `, ${unread} unread` : ''}`}
      style={{ textDecoration: 'none', minHeight: '44px', justifyContent: 'center' }}
    >
      <div style={{ position: 'relative' }}>
        <MessageCircle
          style={{
            width: '22px',
            height: '22px',
            color: isActive ? '#F5B942' : 'rgba(255,255,255,0.45)',
            transition: 'color 0.2s',
          }}
          strokeWidth={isActive ? 2.2 : 1.8}
          aria-hidden="true"
        />
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-6px',
              minWidth: '16px',
              height: '16px',
              backgroundColor: '#F5B942',
              color: '#0B0B0F',
              fontSize: '9px',
              fontWeight: 800,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 2px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
      <span
        style={{
          fontSize: '10px',
          fontWeight: isActive ? 700 : 400,
          color: isActive ? '#F5B942' : 'rgba(255,255,255,0.40)',
          lineHeight: 1,
          maxWidth: '52px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        Messages
      </span>
    </Link>
  );
}

// ── Bottom nav ────────────────────────────────────────────────────────────────

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuthStore();

  const profilePath =
    user?.role === 'seller' ? '/seller' :
    user?.role === 'admin'  ? '/admin'  :
    user                    ? '/buyer/profile' :
    '/login';

  const sellPath = user ? '/seller/products/new' : '/register?type=seller';

  // Exact match for home ("/"), prefix match for everything else
  const isHomeActive = location.pathname === '/';
  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-[9997] md:hidden"
      style={{
        background: 'rgba(11,11,15,0.97)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingTop: '4px', paddingBottom: '4px' }}>

        {/* Home */}
        <NavItem to="/" icon={Home} label="Home" isActive={isHomeActive} exact />

        {/* Categories */}
        <NavItem to="/categories" icon={LayoutGrid} label="Categories" isActive={isActive('/categories')} />

        {/* Sell Item — elevated large gold circle */}
        <Link
          to={sellPath}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '0 8px', textDecoration: 'none' }}
          aria-label="Sell an item"
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #F5C842, #C8860A)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '-26px',
              boxShadow: '0 0 24px rgba(200,134,10,0.50), 0 6px 16px rgba(0,0,0,0.65)',
            }}
          >
            <Plus style={{ width: '24px', height: '24px', color: '#0B0B0F' }} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span style={{ fontSize: '10px', fontWeight: 600, color: '#F5B942', lineHeight: 1, marginTop: '1px' }}>
            Sell Item
          </span>
        </Link>

        {/* Messages */}
        <MessagesNavButton isActive={isActive('/inbox')} />

        {/* Profile */}
        <NavItem to={profilePath} icon={User} label="Profile" isActive={isActive(profilePath)} />

      </div>
    </nav>
  );
}
