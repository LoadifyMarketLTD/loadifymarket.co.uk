/**
 * MobileBottomNav
 *
 * Fixed bottom navigation bar — visible only below md (768 px).
 * Hidden on desktop via Tailwind `md:hidden`.
 *
 * Items: Browse | Search | Sell (gold highlight) | Cart | Account
 *
 * The "Sell" button is elevated above the bar with a circular gold accent to
 * draw attention — matching the convention used by major marketplace apps.
 *
 * Safe-area-inset-bottom is applied via inline padding so the bar works
 * correctly on Android devices with gesture navigation.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Store, MessageSquare, Plus, ShoppingCart, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';

// ── Cart badge helper ─────────────────────────────────────────────────────────

function CartNavButton({ isActive }: { isActive: boolean }) {
  const { cartCount } = useCart();

  return (
    <Link
      to="/cart"
      className="flex flex-col items-center gap-1 px-3 py-1"
      aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`}
    >
      <div className="relative">
        <ShoppingCart
          className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-white/50'}`}
          aria-hidden="true"
        />
        {cartCount > 0 && (
          <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-[#FBBF24] text-[#020617] text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-white/40'}`}
      >
        Cart
      </span>
    </Link>
  );
}

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
        className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-white/50'}`}
        aria-hidden="true"
      />
      <span
        className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-white/40'}`}
      >
        {label}
      </span>
    </Link>
  );
}

// ── Inbox badge helper ────────────────────────────────────────────────────────

function InboxNavButton({ isActive }: { isActive: boolean }) {
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
      aria-label={`Inbox${unread > 0 ? `, ${unread} unread` : ''}`}
    >
      <div className="relative">
        <MessageSquare
          className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-white/50'}`}
          aria-hidden="true"
        />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1.5 min-w-[16px] h-[16px] rounded-full bg-[#FBBF24] text-[#020617] text-[9px] font-bold flex items-center justify-center px-0.5 leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
      <span
        className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-white/40'}`}
      >
        Inbox
      </span>
    </Link>
  );
}

// ── Orders badge helper — shows a dot for sellers with awaiting-payment orders ─

function AccountNavButton({ to, isActive }: { to: string; isActive: boolean }) {
  const { user } = useAuthStore();
  const [awaitingCount, setAwaitingCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'seller') { setAwaitingCount(0); return; }
    let cancelled = false;

    const load = async () => {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('sellerId', user.id)
        .eq('status', 'awaiting_payment');
      if (!cancelled) setAwaitingCount(count ?? 0);
    };

    void load();
    return () => { cancelled = true; };
  }, [user?.id, user?.role]);

  const label = user ? (user.role === 'seller' ? 'Dashboard' : 'Account') : 'Sign In';

  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1 px-3 py-1"
      aria-label={`${label}${awaitingCount > 0 ? `, ${awaitingCount} orders awaiting payment` : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <div className="relative">
        <User
          className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-white/50'}`}
          aria-hidden="true"
        />
        {awaitingCount > 0 && (
          <span className="absolute -top-1 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-[#0B0F1A]" />
        )}
      </div>
      <span className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-white/40'}`}>
        {label}
      </span>
    </Link>
  );
}

// ── Bottom nav ────────────────────────────────────────────────────────────────

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuthStore();

  const dashboardPath =
    user?.role === 'seller' ? '/seller' :
    user?.role === 'admin'  ? '/admin'  :
    '/buyer';

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
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="h-[60px] flex items-center justify-around">
        {/* Browse */}
        <NavItem
          to="/catalog"
          icon={Store}
          label="Browse"
          isActive={isActive('/catalog') || isActive('/category')}
        />

        {/* Inbox */}
        <InboxNavButton isActive={isActive('/inbox')} />

        {/* Sell — elevated gold CTA */}
        <Link
          to="/register?type=seller"
          className="flex flex-col items-center gap-0.5 px-3"
          aria-label="Start selling"
        >
          <div className="w-11 h-11 rounded-full bg-[#FBBF24] flex items-center justify-center -mt-5 shadow-[0_0_20px_rgba(251,191,36,0.4),0_4px_12px_rgba(0,0,0,0.5)]">
            <Plus className="h-5 w-5 text-[#020617]" aria-hidden="true" />
          </div>
          <span className="text-[10px] font-semibold text-[#FBBF24] leading-none mt-0.5">
            Sell
          </span>
        </Link>

        {/* Cart */}
        <CartNavButton isActive={isActive('/cart')} />

        {/* Account */}
        <AccountNavButton
          to={user ? dashboardPath : '/login'}
          isActive={user ? isActive(dashboardPath) : isActive('/login')}
        />
      </div>
    </nav>
  );
}
