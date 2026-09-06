/**
 * MobileProfilePage — native account hub.
 *
 * Keeps role/capability boundaries intact while presenting a simple marketplace
 * account surface: identity, high-frequency shortcuts, settings and support.
 */

import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Heart,
  HelpCircle,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  Store,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { supabase } from '@/lib/supabase';
import MobileBottomNav from '@/components/MobileBottomNav';
import officialLoadifyMarketLogo from '../../LOADIFY_MARKET_Master_Vector_BlackGold.svg';
import { useUnreadNotificationsCount } from '@/hooks/useUnreadNotificationsCount';

interface SectionItem {
  label: string;
  to: string;
  icon: LucideIcon;
  external?: boolean;
  badgeCount?: number;
}

interface Section {
  title: string;
  items: SectionItem[];
}

function buildSections(role: string | undefined): Section[] {
  const canSell = role === 'seller' || role === 'admin';

  return [
    {
      title: 'Marketplace',
      items: [
        ...(canSell ? [{ label: 'Sell an item', to: '/sell', icon: Store }] : []),
        { label: 'Favourite items', to: '/profile/favourites', icon: Heart },
        { label: 'Purchases', to: '/orders?mode=buy', icon: Package },
        { label: 'Sales', to: '/orders?mode=sell', icon: Store },
        { label: 'Balance', to: '/profile/balance', icon: Wallet },
      ],
    },
    {
      title: 'Account',
      items: [
        { label: 'Settings', to: '/profile/settings', icon: Settings },
        { label: 'Security', to: '/profile/security', icon: ShieldCheck },
        { label: 'Activity', to: '/profile/notifications', icon: Bell },
      ],
    },
    {
      title: 'Support',
      items: [{ label: 'Help Centre', to: '/faq', icon: HelpCircle }],
    },
  ];
}

function MenuRow({ label, to, external, badgeCount, icon: Icon }: SectionItem) {
  const inner = (
    <div className="flex min-h-[56px] items-center justify-between gap-3 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#F4F6F8] text-[#0A234F]">
          <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="truncate text-[14px] font-bold text-[#26354A]">{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badgeCount && badgeCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5A300] px-1.5 text-[10px] font-black text-[#0A234F]">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        ) : null}
        <ChevronRight className="h-[17px] w-[17px] text-[#A0A8B4]" aria-hidden="true" />
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" className="block no-underline">
        {inner}
      </a>
    );
  }

  return <Link to={to} className="block no-underline">{inner}</Link>;
}

function MenuSection({ title, items }: Section) {
  return (
    <section className="mb-4 px-[var(--mob-side,16px)]">
      <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#7A8493]">{title}</p>
      <div className="overflow-hidden rounded-[18px] border border-[#0A234F]/[0.08] bg-white shadow-[0_6px_22px_rgba(10,35,79,0.05)]">
        {items.map((item, index) => (
          <div key={item.to}>
            <MenuRow {...item} />
            {index < items.length - 1 && <div className="ml-[58px] h-px bg-[#0A234F]/[0.07]" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </section>
  );
}

function GuestView() {
  const navigate = useNavigate();
  return (
    <div className="px-[var(--mob-side,16px)] pt-7 text-center">
      <div className="mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#EEF2F7]">
        <User className="h-8 w-8 text-[#667085]" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-[20px] font-black tracking-[-0.02em] text-[#0A234F]">Your Loadify account</h2>
      <p className="mx-auto mt-2 max-w-[290px] text-[13px] leading-[1.5] text-[#667085]">Sign in to manage purchases, favourites, conversations and selling activity.</p>
      <button onClick={() => navigate('/login')} className="mt-6 h-12 w-full rounded-[14px] bg-[#0A234F] text-[14px] font-extrabold text-white shadow-[0_8px_20px_rgba(10,35,79,0.18)]">Sign in</button>
      <button onClick={() => navigate('/register')} className="mt-2.5 h-12 w-full rounded-[14px] border border-[#0A234F]/15 bg-white text-[14px] font-extrabold text-[#0A234F]">Create account</button>
    </div>
  );
}

export default function MobileProfilePage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const firstName = user ? (user as { firstName?: string }).firstName : undefined;
  const lastName = user ? (user as { lastName?: string }).lastName : undefined;
  const displayName = user ? (firstName || user.email?.split('@')[0] || 'You') : null;
  const initials = user
    ? `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || displayName?.[0]?.toUpperCase() || '?'
    : null;

  const sections = buildSections(user?.role as string | undefined);
  const unreadNotifications = useUnreadNotificationsCount(user?.id);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/marketplace');
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#F7F9FC] text-[#0A234F] md:hidden">
      <div
        className="h-full overflow-y-auto overflow-x-hidden overscroll-y-contain"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <header className="px-[var(--mob-side,16px)] pb-3 pt-5">
          <img
            src={officialLoadifyMarketLogo}
            alt="Loadify Market"
            className="h-[34px] w-auto max-w-[190px] object-contain object-left"
          />
          <h1 className="mt-2 text-[24px] font-black leading-none tracking-[-0.03em] text-[#0A234F]">Profile</h1>
        </header>

        {!user ? (
          <GuestView />
        ) : (
          <>
            <section className="px-[var(--mob-side,16px)] pb-5 pt-2">
              <div className="flex items-center gap-3.5 rounded-[20px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_8px_24px_rgba(10,35,79,0.06)]">
                <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full bg-[#0A234F] text-[20px] font-black text-white ring-2 ring-[#F5A300]/70 ring-offset-2 ring-offset-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[17px] font-black leading-tight text-[#0A234F]">{displayName}</p>
                  <p className="mt-1 truncate text-[11px] font-medium text-[#7A8493]">{user.email}</p>
                  <Link
                    to={user.role === 'seller' || user.role === 'admin' ? '/sell' : '/catalog'}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#1D57D8] no-underline"
                  >
                    {user.role === 'seller' || user.role === 'admin' ? 'Sell an item' : 'Browse marketplace'}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </section>

            {sections.map((section) => (
              <MenuSection
                key={section.title}
                {...section}
                items={section.items.map((item) =>
                  item.to === '/profile/notifications' ? { ...item, badgeCount: unreadNotifications } : item,
                )}
              />
            ))}

            <div className="px-[var(--mob-side,16px)] pb-3">
              <button
                onClick={handleSignOut}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-red-200 bg-white text-[13px] font-extrabold text-red-600"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}