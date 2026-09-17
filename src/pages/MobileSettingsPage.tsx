/** MobileSettingsPage ? capability-aware native account settings. */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck, Bell, ChevronLeft, ChevronRight, FileText, Heart, HelpCircle,
  MapPin, Package, PackageSearch, RefreshCcw, Settings, ShieldCheck, Star,
  Store, Truck, UserRound, WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { hasAdminAccess, hasBuyerAccess, hasSellerAccess } from '@/lib/roleUtils';
import { getMobileWorkspace, setMobileWorkspace, type MobileWorkspace } from '@/lib/mobileWorkspace';
import MobileBottomNav from '@/components/MobileBottomNav';

interface SettingsRow { label: string; description: string; to: string; icon: LucideIcon; }
function SettingsGroup({ title, rows }: { title: string; rows: SettingsRow[] }) {
  if (rows.length === 0) return null;
  return <section className="mt-5">
    <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#7A8493]">{title}</p>
    <div className="overflow-hidden rounded-[18px] border border-[#0A234F]/[0.08] bg-white shadow-[0_7px_20px_rgba(10,35,79,0.05)]">
      {rows.map((row, index) => { const Icon = row.icon; return <div key={row.label}>
        <Link to={row.to} className="flex min-h-[64px] items-center gap-3 px-4 py-3 no-underline">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]"><Icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[14px] font-extrabold text-[#0A234F]">{row.label}</span><span className="mt-0.5 block text-[11px] leading-[1.35] text-[#7A8493]">{row.description}</span></span>
          <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#A0A8B4]" aria-hidden="true" />
        </Link>{index < rows.length - 1 ? <div className="ml-[66px] h-px bg-[#0A234F]/[0.07]" aria-hidden="true" /> : null}
      </div>; })}
    </div>
  </section>;
}

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const canBuy = hasBuyerAccess(user);
  const canSell = hasSellerAccess(user);
  const isAdmin = hasAdminAccess(user);
  const sellerOperational = canSell && user?.sellerStatus !== 'suspended';
  const [workspaceState, setWorkspaceState] = useState<{ userId: string | null; workspace: MobileWorkspace }>(() => ({
    userId: user?.id ?? null,
    workspace: getMobileWorkspace(user),
  }));
  const workspace = workspaceState.userId === (user?.id ?? null) ? workspaceState.workspace : getMobileWorkspace(user);
  const showWorkspaceSwitch = Boolean(user && canBuy && canSell && !isAdmin);
  const effectiveWorkspace: MobileWorkspace = showWorkspaceSwitch ? workspace : canSell && !canBuy ? 'selling' : 'buying';

  const displayName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0] : '';
  const initials = user ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || displayName[0]?.toUpperCase() || '?' : '?';
  const roleLabel = isAdmin ? 'Administrator account' : canSell ? 'Buyer & Seller account' : 'Buyer account';

  const accountRows: SettingsRow[] = [
    ...(canBuy && effectiveWorkspace === 'buying' ? [{ label: 'Profile details', description: 'Buyer identity, business details and default address', to: '/profile/buyer-profile', icon: UserRound }] : []),
    ...(sellerOperational && effectiveWorkspace === 'selling' ? [{ label: 'Store profile', description: 'Public seller identity and storefront details', to: '/profile/store', icon: Store }] : []),
    { label: 'Security', description: 'Email address and password', to: '/profile/security', icon: ShieldCheck },
    { label: 'Activity', description: 'Orders, messages and account updates', to: '/profile/notifications', icon: Bell },
  ];
  const buyingRows: SettingsRow[] = canBuy ? [
    { label: 'Purchases', description: 'Orders placed from this account', to: '/orders?mode=buy', icon: Package },
    { label: 'Favourite items', description: 'Products you have saved', to: '/profile/favourites', icon: Heart },
    { label: 'Delivery addresses', description: 'Saved delivery destinations', to: '/profile/addresses', icon: MapPin },
    { label: 'Buyer preferences', description: 'Notifications, language, data export and account controls', to: '/profile/buyer-settings', icon: Settings },
  ] : [];
  const sellingRows: SettingsRow[] = sellerOperational && !isAdmin ? [
    { label: 'Sales', description: 'Orders sold through your seller account', to: '/orders?mode=sell', icon: Store },
    { label: 'My listings', description: 'Create and manage marketplace listings', to: '/profile/listings', icon: PackageSearch },
    { label: 'Shipments', description: 'Dispatch, tracking and delivery status', to: '/profile/shipments', icon: Truck },
    { label: 'Returns', description: 'Review and action buyer return requests', to: '/profile/seller-returns', icon: RefreshCcw },
    { label: 'Buyer reviews', description: 'Read and reply to feedback on your listings', to: '/profile/seller-reviews', icon: Star },
    { label: 'Seller payments', description: 'Payout and Stripe Connect status', to: '/seller/mobile-payments', icon: WalletCards },
    { label: 'Seller settings', description: 'Shipping defaults, alerts, Stripe and shop controls', to: '/profile/seller-settings', icon: Settings },
  ] : [];
  const supportRows: SettingsRow[] = [
    { label: 'Help Centre', description: 'Marketplace help and common questions', to: '/faq', icon: HelpCircle },
    { label: 'Privacy', description: 'How Loadify handles account information', to: '/privacy', icon: FileText },
  ];
  const marketplaceRows = effectiveWorkspace === 'selling' ? sellingRows : buyingRows;
  const selectWorkspace = (next: MobileWorkspace) => {
    const selected = setMobileWorkspace(user, next);
    setWorkspaceState({ userId: user?.id ?? null, workspace: selected });
  };

  return <div className="md:hidden min-h-screen bg-[#EEF3F8] text-[#0A234F]" style={{ paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))' }}>
    <header className="sticky top-0 z-40 bg-[#0A234F] text-white shadow-[0_5px_22px_rgba(10,35,79,0.18)]" style={{ paddingTop: 'calc(0.65rem + env(safe-area-inset-top, 0px))' }}>
      <div className="flex items-center gap-3 px-[var(--mob-side,16px)] pb-4 pt-2">
        <button type="button" onClick={() => navigate('/profile')} aria-label="Back to profile" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-[#F5A300]">Loadify Market</p><h1 className="m-0 mt-0.5 text-[23px] font-black tracking-[-0.03em] text-white">Settings</h1><p className="m-0 mt-0.5 text-[11px] font-medium text-white/65">Manage your marketplace account</p></div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0A234F]"><UserRound className="h-5 w-5" /></div>
      </div>
    </header>
    <main className="px-[var(--mob-side,16px)] py-4">
      {!user ? <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-10 text-center shadow-sm"><p className="text-[15px] font-extrabold">Sign in to manage settings</p><button type="button" onClick={() => navigate('/login')} className="mt-5 h-11 w-full rounded-[12px] border-0 bg-[#0A234F] text-[13px] font-extrabold text-white">Sign in</button></section> : <>
        <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0A234F] text-[16px] font-black text-white ring-2 ring-[#F5A300]/60 ring-offset-2">{initials}</div><div className="min-w-0 flex-1"><p className="m-0 truncate text-[15px] font-black">{displayName}</p><p className="m-0 mt-1 truncate text-[11px] text-[#7A8493]">{user.email}</p><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFF4D6] px-2.5 py-1 text-[9px] font-black uppercase text-[#9A6500]"><BadgeCheck className="h-3.5 w-3.5" />{roleLabel}</span></div></div></section>
        {showWorkspaceSwitch ? <div className="mt-4 grid grid-cols-2 rounded-[16px] bg-[#DDE6EF] p-1"><button type="button" onClick={() => selectWorkspace('buying')} className={`h-10 rounded-[12px] text-[12px] font-black ${effectiveWorkspace === 'buying' ? 'bg-white text-[#0A234F] shadow-sm' : 'text-[#667085]'}`}>Buying</button><button type="button" onClick={() => selectWorkspace('selling')} className={`h-10 rounded-[12px] text-[12px] font-black ${effectiveWorkspace === 'selling' ? 'bg-white text-[#0A234F] shadow-sm' : 'text-[#667085]'}`}>Selling</button></div> : null}
        <SettingsGroup title="Account" rows={accountRows} />
        <SettingsGroup title={effectiveWorkspace === 'selling' ? 'Selling' : 'Buying'} rows={marketplaceRows} />
        <SettingsGroup title="Support & privacy" rows={supportRows} />
      </>}
    </main><MobileBottomNav />
  </div>;
}
