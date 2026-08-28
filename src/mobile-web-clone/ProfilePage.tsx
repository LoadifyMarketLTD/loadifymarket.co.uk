import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { hasSellerAccess } from '@/lib/roleUtils';
import AppBottomNav from '@/mobile-web-clone/AppBottomNav';

interface SectionItem { label: string; to: string }
interface Section { title: string; items: SectionItem[] }

function MenuRow({ label, to }: SectionItem) {
  return (
    <Link to={to} style={{ display: 'block', textDecoration: 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px var(--mob-side,16px)' }}>
        <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.90)' }}>{label}</span>
        <ChevronRight style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.30)', flexShrink: 0 }} aria-hidden="true" />
      </div>
    </Link>
  );
}

function MenuSection({ title, items }: Section) {
  return (
    <div style={{ marginBottom: 8 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '20px var(--mob-side,16px) 4px', margin: 0 }}>{title}</p>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {items.map((item, index) => (
          <div key={item.to}>
            <MenuRow {...item} />
            {index < items.length - 1 && <div aria-hidden="true" style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginInlineStart: 'var(--mob-side,16px)' }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Browser-only clone of the installed app Profile screen. */
export default function MobileWebProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  if (!user) return null;

  const seller = hasSellerAccess(user);
  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user.email?.split('@')[0] ?? 'You';
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || displayName[0]?.toUpperCase() || '?';

  const sections: Section[] = [
    {
      title: 'Main',
      items: [
        { label: 'My listings', to: seller ? '/seller/products' : '/catalog' },
        { label: 'Favourite items', to: '/profile/favourites' },
        { label: seller ? 'Sales orders' : 'Orders', to: seller ? '/seller/orders' : '/orders' },
        { label: 'Balance', to: '/profile/balance' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'Settings', to: '/profile/settings' },
        { label: 'Security', to: '/profile/security' },
        { label: 'Activity', to: '/profile/notifications' },
      ],
    },
    { title: 'Support', items: [{ label: 'Help Centre', to: '/faq' }] },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#07080B', color: '#FFFFFF', paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom,0px))' }}>
      <div style={{ padding: '20px var(--mob-side,16px) 8px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Profile</h1>
      </div>

      <div style={{ padding: '12px var(--mob-side,16px) 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#F5C842 0%,#C8860A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#0B0B0F' }}>{initials}</span>
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>{displayName}</p>
          <Link to={seller ? '/seller/products' : '/catalog'} style={{ fontSize: 13, color: '#F2B84B', textDecoration: 'none', fontWeight: 600 }}>View my listings →</Link>
        </div>
      </div>

      {sections.map((section) => <MenuSection key={section.title} {...section} />)}

      <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '16px var(--mob-side,16px)', background: 'transparent', border: 0, textAlign: 'left' }}>
        <LogOut style={{ width: 18, height: 18, color: '#EF4444', flexShrink: 0 }} aria-hidden="true" />
        <span style={{ fontSize: 15, fontWeight: 500, color: '#EF4444' }}>Sign out</span>
      </button>

      <AppBottomNav />
    </div>
  );
}
