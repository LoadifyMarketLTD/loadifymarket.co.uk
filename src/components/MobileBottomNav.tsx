/**
 * MobileBottomNav
 *
 * Mobile web uses the premium light navigation below. Capacitor delegates to
 * LegacyNativeBottomNav so standalone mobile pages cannot bypass the native
 * identity boundary simply by importing this shared component directly.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, Plus, Mail, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { supabase } from '@/lib/supabase';
import { isCapacitorContext } from '@/lib/capacitorUtils';
import { LegacyNativeBottomNav } from '@/components/native/LegacyNativeMarketplace';

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
        className={`h-[21px] w-[21px] transition-colors ${isActive ? 'text-[#0A234F]' : 'text-[#8A94A3]'}`}
        strokeWidth={isActive ? 2.1 : 1.7}
        aria-hidden="true"
      />
      <span
        className={`max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none transition-colors ${isActive ? 'font-semibold text-[#0A234F]' : 'font-normal text-[#7A8492]'}`}
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
      className="flex flex-col items-center gap-1 px-3 py-2"
      aria-label={`Inbox${unread > 0 ? `, ${unread} unread` : ''}`}
      style={{ background: 'none', border: 'none', cursor: 'pointer', minHeight: '44px' }}
    >
      <div className="relative">
        <Mail
          className={`h-[21px] w-[21px] transition-colors ${isActive ? 'text-[#0A234F]' : 'text-[#8A94A3]'}`}
          strokeWidth={isActive ? 2.1 : 1.7}
          aria-hidden="true"
        />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="flex items-center justify-center bg-[#0A234F] text-white"
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-7px',
              minWidth: '16px',
              height: '16px',
              fontSize: '9px',
              fontWeight: 700,
              borderRadius: '8px',
              padding: '0 2px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
      <span
        className={`max-w-[52px] overflow-hidden text-ellipsis whitespace-nowrap text-[10px] leading-none ${isActive ? 'font-semibold text-[#0A234F]' : 'font-normal text-[#7A8492]'}`}
      >
        Inbox
      </span>
    </button>
  );
}

function MobileWebBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((s) => s.open);

  const profilePath = '/profile';

  const handleSell = () => {
    if (!user) {
      promptAuth('sell');
      return;
    }
    navigate('/sell');
  };

  const isHomeActive = location.pathname === '/';
  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + '/');

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-[9997] border-t border-[#0A234F]/[0.08] bg-[#FCFBF9]/[0.98] md:hidden"
      style={{
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 -5px 18px rgba(15,23,42,0.055)',
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
            className="flex items-center justify-center bg-[#0A234F] text-white"
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              marginTop: '-24px',
              border: '4px solid #FCFBF9',
              boxShadow: '0 7px 18px rgba(10,35,79,0.18)',
            }}
          >
            <Plus className="h-6 w-6" strokeWidth={2.2} aria-hidden="true" />
          </div>
          <span className="text-[#0A234F]" style={{ fontSize: '10px', fontWeight: 600, lineHeight: 1, marginTop: '1px' }}>
            Sell
          </span>
        </button>

        <MessagesNavButton isActive={isActive('/inbox')} />
        <NavItem to={profilePath} icon={User} label="Profile" isActive={isActive(profilePath)} />
      </div>
    </nav>
  );
}

export default function MobileBottomNav() {
  return isCapacitorContext() ? <LegacyNativeBottomNav /> : <MobileWebBottomNav />;
}
