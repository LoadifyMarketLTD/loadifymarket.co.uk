/**
 * MobileBottomNav
 *
 * Fixed bottom navigation bar — visible only below md (768 px).
 * Hidden on desktop via Tailwind `md:hidden`.
 *
 * Items: Home | Messages (badge) | Sell Item (gold FAB) | Orders | Profile
 *
 * The "Sell Item" FAB is 56 px, elevated above the bar with -mt-7, with a
 * gold glow shadow — matching major marketplace app conventions.
 *
 * Safe-area-inset-bottom is applied via inline padding so the bar works
 * correctly on Android devices with gesture navigation.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, MessageSquare, Plus, ShoppingBag, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';

// ── Generic nav item ──────────────────────────────────────────────────────────

function NavItem({
  to,
  icon: Icon,
  label,
  isActive,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 px-3 py-1"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#F2B84B]' : 'text-white/50'}`}
        aria-hidden="true"
      />
      <span
        className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#F2B84B]' : 'text-white/40'}`}
      >
        {label}
      </span>
    </Link>
  );
}

// ── Messages badge helper ─────────────────────────────────────────────────────

function MessagesNavButton({ isActive }: { isActive: boolean }) {
  const { user } = useAuthStore();
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
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <Link
      to="/inbox"
      className="flex flex-col items-center gap-1 px-3 py-1"
      aria-label={`Messages${unread > 0 ? `, ${unread} unread` : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="relative">
        <MessageSquare
          className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#F2B84B]' : 'text-white/50'}`}
          aria-hidden="true"
        />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-[#F2B84B] text-[#020617] text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#F2B84B]' : 'text-white/40'}`}
      >
        Messages
      </span>
    </Link>
  );
}

// ── Profile nav button ────────────────────────────────────────────────────────

function ProfileNavButton({ to, isActive }: { to: string; isActive: boolean }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 px-3 py-1"
      aria-label="Profile"
      aria-current={isActive ? 'page' : undefined}
    >
      <User
        className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#F2B84B]' : 'text-white/50'}`}
        aria-hidden="true"
      />
      <span
        className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#F2B84B]' : 'text-white/40'}`}
      >
        Profile
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
    user            ? '/buyer'  :
    '/login';

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-[9997] md:hidden"
      style={{
        background: 'rgba(11,15,26,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px 20px 0 0',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="h-[60px] flex items-center justify-around">
        {/* Home */}
        <NavItem
          to="/"
          icon={Home}
          label="Home"
          isActive={location.pathname === '/'}
        />

        {/* Messages */}
        <MessagesNavButton isActive={isActive('/inbox')} />

        {/* Sell Item — elevated gold FAB */}
        <Link
          to="/register?type=seller"
          className="flex flex-col items-center gap-0.5 px-3"
          aria-label="Sell an item"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center -mt-7"
            style={{
              background: 'linear-gradient(135deg, #D89A28, #F7C867)',
              boxShadow: '0 0 24px rgba(242,184,75,0.35), 0 4px 14px rgba(0,0,0,0.5)',
            }}
          >
            <Plus className="h-6 w-6 text-black" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-semibold text-[#F2B84B] leading-none mt-0.5">
            Sell Item
          </span>
        </Link>

        {/* Orders */}
        <NavItem
          to="/orders"
          icon={ShoppingBag}
          label="Orders"
          isActive={isActive('/orders')}
        />

        {/* Profile */}
        <ProfileNavButton
          to={profilePath}
          isActive={user ? isActive(profilePath) : isActive('/login')}
        />
      </div>
    </nav>
  );
}

