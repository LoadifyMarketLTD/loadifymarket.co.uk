/**
 * MobileBottomNav — native-app bottom navigation.
 *
 * Marketplace-first information architecture inspired by proven resale apps:
 * Home | Search | Sell | Inbox | Profile.
 * Loadify branding, routes, auth boundaries and unread-message behaviour remain
 * fully owned by Loadify Market.
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
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 no-underline"
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        className={isActive ? 'text-[#0A234F]' : 'text-[#7A8493]'}
        style={{ width: 22, height: 22 }}
        strokeWidth={isActive ? 2.4 : 1.9}
        aria-hidden="true"
      />
      <span
        className={isActive ? 'font-extrabold text-[#0A234F]' : 'font-semibold text-[#7A8493]'}
        style={{ fontSize: 10, lineHeight: 1, maxWidth: 58, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        style={{
          width: isActive ? 18 : 0,
          height: 2,
          borderRadius: 999,
          background: '#F5A300',
          marginTop: 1,
          transition: 'width 160ms ease',
        }}
      />
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
    <button
      onClick={handleInbox}
      className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2"
      aria-label={`Inbox${unread > 0 ? `, ${unread} unread` : ''}`}
      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <div className="relative">
        <Mail
          className={isActive ? 'text-[#0A234F]' : 'text-[#7A8493]'}
          style={{ width: 22, height: 22 }}
          strokeWidth={isActive ? 2.4 : 1.9}
          aria-hidden="true"
        />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="flex items-center justify-center bg-[#F5A300] text-[#0A234F]"
            style={{
              position: 'absolute',
              top: -5,
              right: -8,
              minWidth: 17,
              height: 17,
              fontSize: 9,
              fontWeight: 900,
              borderRadius: 9,
              padding: '0 3px',
              border: '2px solid #FFFFFF',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
      <span
        className={isActive ? 'font-extrabold text-[#0A234F]' : 'font-semibold text-[#7A8493]'}
        style={{ fontSize: 10, lineHeight: 1 }}
      >
        Inbox
      </span>
      <span aria-hidden="true" style={{ width: isActive ? 18 : 0, height: 2, borderRadius: 999, background: '#F5A300', marginTop: 1 }} />
    </button>
  );
}

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);

  const handleSell = () => {
    if (!user) {
      promptAuth('sell');
      return;
    }
    navigate('/sell');
  };

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-[9997] md:hidden"
      style={{
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        borderTop: '1px solid rgba(10,35,79,0.10)',
        boxShadow: '0 -8px 28px rgba(10,35,79,0.10)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto flex w-full max-w-[640px] items-end justify-between px-1" style={{ minHeight: 62 }}>
        <NavItem to="/marketplace" icon={Home} label="Home" isActive={location.pathname === '/marketplace'} />
        <NavItem to="/categories" icon={Search} label="Search" isActive={isActive('/categories') || isActive('/catalog')} />

        <button
          onClick={handleSell}
          className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-end gap-1 px-1 pb-2"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Sell an item"
        >
          <span
            className="flex items-center justify-center bg-[#0A234F] text-white"
            style={{
              width: 50,
              height: 42,
              borderRadius: 14,
              marginTop: -15,
              boxShadow: '0 8px 20px rgba(10,35,79,0.22)',
              border: '2px solid #F5A300',
            }}
          >
            <Plus style={{ width: 23, height: 23 }} strokeWidth={2.6} aria-hidden="true" />
          </span>
          <span className="font-extrabold text-[#0A234F]" style={{ fontSize: 10, lineHeight: 1 }}>
            Sell
          </span>
        </button>

        <MessagesNavButton isActive={isActive('/inbox')} />
        <NavItem to="/profile" icon={User} label="Profile" isActive={isActive('/profile')} />
      </div>
    </nav>
  );
}
