/**
 * MobileBottomNav — mobile bottom navigation bar.
 *
 * Items (left → right):
 *   Home | Search | Sell (gold circle) | Inbox (with unread badge) | Profile
 *
 * "Home" links to "/" (exact active match).
 * "Sell" is elevated above the bar with a large gold circle.
 * Safe-area-inset-bottom applied via inline padding.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Mail, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { supabase } from '@/lib/supabase';

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
  void exact;
  return (
    <Link
      to={to}
      className="flex min-h-11 flex-col items-center justify-center gap-1 px-3 py-2 no-underline"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#F5A300]' : 'text-white/58'}`}
        strokeWidth={isActive ? 2.2 : 1.8}
        aria-hidden="true"
      />
      <span
        className={`max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none transition-colors ${isActive ? 'font-bold text-[#F5A300]' : 'font-normal text-white/52'}`}
      >
        {label}
      </span>
    </Link>
  );
}

function MessagesNavButton({ isActive }: { isActive: boolean }) {
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);
  const navigate = useNavigate();
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

  const handleInbox = () => {
    if (!user) { promptAuth('message'); return; }
    navigate('/inbox');
  };

  return (
    <button
      onClick={handleInbox}
      className="flex flex-col items-center gap-1 px-3 py-2"
      aria-label={`Inbox${unread > 0 ? `, ${unread} unread` : ''}`}
      style={{ background: 'none', border: 'none', cursor: 'pointer', minHeight: '44px' }}
    >
      <div className="relative">
        <Mail
          className={`h-[22px] w-[22px] transition-colors ${isActive ? 'text-[#F5A300]' : 'text-white/58'}`}
          strokeWidth={isActive ? 2.2 : 1.8}
          aria-hidden="true"
        />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="flex items-center justify-center bg-[#F5A300] text-[#0A234F]"
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-6px',
              minWidth: '16px',
              height: '16px',
              fontSize: '9px',
              fontWeight: 800,
              borderRadius: '8px',
              padding: '0 2px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
      <span
        className={`max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none ${isActive ? 'font-bold text-[#F5A300]' : 'font-normal text-white/52'}`}
      >
        Inbox
      </span>
    </button>
  );
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);

  const profilePath = '/profile';

  const handleSell = () => {
    if (!user) { promptAuth('sell'); return; }
    navigate('/sell');
  };

  const isHomeActive = location.pathname === '/';
  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-[9997] bg-[#0A234F]/[0.98] md:hidden"
      style={{
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(245,163,0,0.20)',
        boxShadow: '0 -10px 28px rgba(10,35,79,0.18)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingTop: '4px', paddingBottom: '4px' }}>
        <NavItem to="/" icon={Home} label="Home" isActive={isHomeActive} exact />
        <NavItem to="/categories" icon={Search} label="Search" isActive={isActive('/categories')} />

        <button
          onClick={handleSell}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '0 8px', background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Sell an item"
        >
          <div
            className="flex items-center justify-center bg-[#F5A300] text-[#0A234F]"
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              marginTop: '-26px',
              boxShadow: '0 0 24px rgba(245,163,0,0.38), 0 6px 16px rgba(10,35,79,0.36)',
            }}
          >
            <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span className="text-white" style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1, marginTop: '1px' }}>
            Sell
          </span>
        </button>

        <MessagesNavButton isActive={isActive('/inbox')} />
        <NavItem to={profilePath} icon={User} label="Profile" isActive={isActive(profilePath)} />
      </div>
    </nav>
  );
}
