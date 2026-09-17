/**
 * MobileProfilePage — native account hub.
 *
 * Keeps role/capability boundaries intact while presenting a simple marketplace
 * account surface: identity, high-frequency shortcuts, settings and support.
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  Heart,
  HelpCircle,
  LogOut,
  MapPin,
  Package,
  PackageSearch,
  RefreshCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Store,
  Truck,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { hasAdminAccess, hasBuyerAccess, hasSellerAccess, isActiveSellerAccess } from '@/lib/roleUtils';
import type { User as LoadifyUser } from '@/types';
import { supabase } from '@/lib/supabase';
import { getMobileWorkspace, setMobileWorkspace, type MobileWorkspace } from '@/lib/mobileWorkspace';
import MobileBottomNav from '@/components/MobileBottomNav';
import officialLoadifyMarketLogo from '@/assets/branding/loadify-market-master-whitegold.svg';
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

type LiveSellerState = 'unknown' | 'ready' | 'incomplete' | 'suspended';

function buildSections(user: LoadifyUser | null | undefined, liveSellerState: LiveSellerState, workspace: MobileWorkspace): Section[] {
  const canSell = hasSellerAccess(user);
  const canBuy = hasBuyerAccess(user);
  const isAdminOnly = hasAdminAccess(user);
  const effectiveSellerState = liveSellerState === 'unknown'
    ? (user?.sellerStatus === 'suspended' ? 'suspended' : isActiveSellerAccess(user) ? 'ready' : 'incomplete')
    : liveSellerState;
  const sellerNotSuspended = canSell && effectiveSellerState !== 'suspended';
  const activeSeller = canSell && effectiveSellerState === 'ready';

  const buyingItems: SectionItem[] = [
    ...(!canSell && !isAdminOnly ? [{ label: 'Start selling', to: '/onboarding/role-selection', icon: Store }] : []),
    ...(canBuy ? [
      { label: 'Favourite items', to: '/profile/favourites', icon: Heart },
      { label: 'Purchases', to: '/orders?mode=buy', icon: Package },
      { label: 'Delivery addresses', to: '/profile/addresses', icon: MapPin },
      { label: 'Returns & refunds', to: '/profile/returns', icon: RefreshCcw },
      { label: 'Resolution Centre', to: '/profile/resolution', icon: ShieldAlert },
      { label: 'Reviews', to: '/profile/reviews', icon: Star },
    ] : []),
  ];
  const sellingItems: SectionItem[] = [
    ...(activeSeller ? [{ label: 'Sell an item', to: '/sell', icon: Store }] : []),
    ...(sellerNotSuspended && !activeSeller ? [{ label: 'Complete seller setup', to: '/onboarding', icon: Store }] : []),
    ...(sellerNotSuspended ? [
      { label: 'My listings', to: '/profile/listings', icon: PackageSearch },
      { label: 'Store profile', to: '/profile/store', icon: Store },
    ] : []),
    ...(activeSeller ? [
      { label: 'Shipments', to: '/profile/shipments', icon: Truck },
      { label: 'Sales', to: '/orders?mode=sell', icon: Store },
      { label: 'Returns', to: '/profile/seller-returns', icon: RefreshCcw },
      { label: 'Buyer reviews', to: '/profile/seller-reviews', icon: Star },
      { label: 'Balance', to: '/profile/balance', icon: Wallet },
      { label: 'Seller payments', to: '/seller/mobile-payments', icon: Wallet },
      { label: 'Seller settings', to: '/profile/seller-settings', icon: Settings },
    ] : []),
  ];

  return [
    {
      title: workspace === 'selling' ? 'Selling' : 'Buying',
      items: workspace === 'selling' ? sellingItems : buyingItems,
    },
    {
      title: 'Account',
      items: [
        { label: 'Settings', to: '/profile/settings', icon: Settings },
        { label: 'Security', to: '/profile/security', icon: ShieldCheck },
        { label: 'Notifications', to: '/profile/notifications', icon: Bell },
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
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [liveSellerState, setLiveSellerState] = useState<LiveSellerState>('unknown');
  const [workspaceState, setWorkspaceState] = useState<{ userId: string | null; workspace: MobileWorkspace }>(() => ({
    userId: user?.id ?? null,
    workspace: getMobileWorkspace(user),
  }));
  const canBuy = hasBuyerAccess(user);
  const canSell = hasSellerAccess(user);
  const showWorkspaceSwitch = Boolean(user && canBuy && canSell && !hasAdminAccess(user));
  const activeWorkspace = workspaceState.userId === (user?.id ?? null)
    ? workspaceState.workspace
    : getMobileWorkspace(user);

  useEffect(() => {
    if (!user?.id || !hasSellerAccess(user)) {
      queueMicrotask(() => setLiveSellerState('unknown'));
      return;
    }

    let cancelled = false;
    const fallbackSellerState: LiveSellerState = user.sellerStatus === 'suspended'
      ? 'suspended'
      : (user.onboardingCompleted === true || isActiveSellerAccess(user)) ? 'ready' : 'incomplete';
    void Promise.all([
      supabase
        .from('seller_profiles')
        .select('sellerStatus, sellerType, profileCompleted, storeCreated, firstProductCreated')
        .eq('userId', user.id)
        .maybeSingle(),
      supabase
        .from('users')
        .select('onboardingCompleted')
        .eq('id', user.id)
        .maybeSingle(),
    ]).then(([profileResult, userResult]) => {
      if (cancelled) return;
      if (profileResult.error || userResult.error) {
        setLiveSellerState(fallbackSellerState);
        return;
      }
      const profile = profileResult.data;
      if (profile?.sellerStatus === 'suspended') {
        setLiveSellerState('suspended');
        return;
      }
      const canonicalType = ['individual', 'sole_trader', 'company'].includes(profile?.sellerType ?? '');
      const ready = profile?.sellerStatus === 'active'
        && canonicalType
        && profile?.profileCompleted === true
        && profile?.storeCreated === true
        && profile?.firstProductCreated === true
        && userResult.data?.onboardingCompleted === true;
      setLiveSellerState(ready ? 'ready' : 'incomplete');
    });

    return () => { cancelled = true; };
  }, [user]);

  const firstName = user ? (user as { firstName?: string }).firstName : undefined;
  const lastName = user ? (user as { lastName?: string }).lastName : undefined;
  const displayName = user ? (firstName || user.email?.split('@')[0] || 'You') : null;
  const initials = user
    ? `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || displayName?.[0]?.toUpperCase() || '?'
    : null;

  const effectiveWorkspace: MobileWorkspace = showWorkspaceSwitch
    ? activeWorkspace
    : canSell && !canBuy ? 'selling' : 'buying';
  const sellerReady = canSell && liveSellerState === 'ready';
  const sections = buildSections(user, liveSellerState, effectiveWorkspace).filter((section) => section.items.length > 0);
  const unreadNotifications = useUnreadNotificationsCount(user?.id);

  const selectWorkspace = (workspace: MobileWorkspace) => {
    const next = setMobileWorkspace(user, workspace);
    setWorkspaceState({ userId: user?.id ?? null, workspace: next });
  };

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
        <header className="bg-[#0A234F] px-[var(--mob-side,16px)] pb-5 pt-5">
          <img
            src={officialLoadifyMarketLogo}
            alt="Loadify Market"
            className="h-auto w-[176px] max-w-[62vw] object-contain object-left"
          />
          <h1 className="mt-3 text-[24px] font-black leading-none tracking-[-0.03em] text-white">Profile</h1>
        </header>

        {isLoading || (user !== null && hasSellerAccess(user) && liveSellerState === 'unknown') ? (
          <div className="flex min-h-[220px] items-center justify-center" aria-label="Loading account">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0A234F]/15 border-b-[#0A234F]" />
          </div>
        ) : !user ? (
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
                    to={effectiveWorkspace === 'selling' ? (sellerReady ? '/sell' : '/onboarding') : '/catalog'}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-extrabold text-[#1D57D8] no-underline"
                  >
                    {effectiveWorkspace === 'selling' ? (sellerReady ? 'Sell an item' : 'Seller setup') : 'Browse marketplace'}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </section>

            {showWorkspaceSwitch ? (
              <section className="px-[var(--mob-side,16px)] pb-4">
                <div className="grid grid-cols-2 gap-1 rounded-[16px] border border-[#0A234F]/10 bg-[#E9EEF5] p-1 shadow-inner" aria-label="Marketplace workspace">
                  {(['buying', 'selling'] as const).map((workspace) => {
                    const selected = effectiveWorkspace === workspace;
                    return (
                      <button
                        key={workspace}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectWorkspace(workspace)}
                        className={`min-h-11 rounded-[12px] px-3 text-[13px] font-black transition ${selected ? 'bg-white text-[#0A234F] shadow-[0_4px_12px_rgba(10,35,79,0.12)]' : 'text-[#667085]'}`}
                      >
                        {workspace === 'buying' ? 'Buying' : 'Selling'}
                      </button>
                    );
                  })}
                </div>
                <p className="mb-0 mt-2 px-1 text-[10px] font-semibold text-[#7A8493]">
                  {effectiveWorkspace === 'buying' ? 'Purchases, returns and buyer tools' : 'Listings, sales and seller tools'}
                </p>
              </section>
            ) : null}

            {effectiveWorkspace === 'selling' && liveSellerState === 'suspended' ? (
              <section className="mx-[var(--mob-side,16px)] mb-4 rounded-[16px] border border-red-200 bg-red-50 p-4">
                <p className="m-0 text-[13px] font-black text-red-700">Selling is suspended</p>
                <p className="mb-0 mt-1 text-[11px] leading-relaxed text-red-600">Your Buying workspace remains available while seller access is restricted.</p>
              </section>
            ) : null}

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