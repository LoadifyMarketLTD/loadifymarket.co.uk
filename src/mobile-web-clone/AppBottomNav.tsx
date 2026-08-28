import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Search, Plus, Mail, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { supabase } from '@/lib/supabase';

function NavItem({ to, icon: Icon, label, isActive }: { to: string; icon: LucideIcon; label: string; isActive: boolean }) {
  return (
    <Link to={to} aria-label={label} aria-current={isActive ? 'page' : undefined} style={{ textDecoration: 'none', minHeight: 44, justifyContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
      <Icon style={{ width: 22, height: 22, color: isActive ? '#F5B942' : 'rgba(255,255,255,0.45)' }} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
      <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? '#F5B942' : 'rgba(255,255,255,0.40)', lineHeight: 1 }}>{label}</span>
    </Link>
  );
}

function InboxButton({ isActive }: { isActive: boolean }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) { if (!cancelled) setUnread(0); return; }
      const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('receiverId', user.id).eq('isRead', false);
      if (!cancelled) setUnread(count ?? 0);
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <button onClick={() => navigate('/?app=inbox')} aria-label={`Inbox${unread > 0 ? `, ${unread} unread` : ''}`} style={{ background: 'none', border: 0, minHeight: 44, justifyContent: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 12px' }}>
      <div style={{ position: 'relative' }}>
        <Mail style={{ width: 22, height: 22, color: isActive ? '#F5B942' : 'rgba(255,255,255,0.45)' }} strokeWidth={isActive ? 2.2 : 1.8} aria-hidden="true" />
        {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 16, height: 16, borderRadius: 8, background: '#F5B942', color: '#0B0B0F', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px' }}>{unread > 9 ? '9+' : unread}</span>}
      </div>
      <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? '#F5B942' : 'rgba(255,255,255,0.40)', lineHeight: 1 }}>Inbox</span>
    </button>
  );
}

/** Browser-only visual clone of the installed app bottom bar. */
export default function AppBottomNav() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);
  const view = searchParams.get('app') ?? 'home';

  const handleSell = () => {
    if (!user) { promptAuth('sell'); return; }
    navigate('/sell');
  };

  return (
    <nav aria-label="Mobile web app navigation" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9997, background: 'rgba(11,11,15,0.97)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', borderTop: '1px solid rgba(255,255,255,0.07)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
      <div style={{ minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-around', paddingTop: 4, paddingBottom: 4 }}>
        <NavItem to="/" icon={Home} label="Home" isActive={view === 'home'} />
        <NavItem to="/?app=search" icon={Search} label="Search" isActive={view === 'search'} />

        <button onClick={handleSell} aria-label="Sell an item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '0 8px', background: 'none', border: 0 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(145deg,#F5C842,#C8860A)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -26, boxShadow: '0 0 24px rgba(200,134,10,0.50), 0 6px 16px rgba(0,0,0,0.65)' }}>
            <Plus style={{ width: 24, height: 24, color: '#FFFFFF' }} strokeWidth={2.5} aria-hidden="true" />
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#FFFFFF', lineHeight: 1, marginTop: 1 }}>Sell</span>
        </button>

        <InboxButton isActive={view === 'inbox'} />
        <NavItem to="/?app=profile" icon={User} label="Profile" isActive={view === 'profile'} />
      </div>
    </nav>
  );
}
