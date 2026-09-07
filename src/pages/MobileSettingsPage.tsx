/**
 * MobileSettingsPage — /profile/settings
 * Personal marketplace account settings for native mobile.
 */

import { Link, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Heart,
  HelpCircle,
  Package,
  ShieldCheck,
  Store,
  UserRound,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';
import MobileBottomNav from '@/components/MobileBottomNav';

interface SettingsRow {
  label: string;
  description: string;
  to: string;
  icon: LucideIcon;
}

function SettingsGroup({ title, rows }: { title: string; rows: SettingsRow[] }) {
  return (
    <section className="mt-5">
      <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#7A8493]">{title}</p>
      <div className="overflow-hidden rounded-[18px] border border-[#0A234F]/[0.08] bg-white shadow-[0_7px_20px_rgba(10,35,79,0.05)]">
        {rows.map((row, index) => {
          const Icon = row.icon;
          return (
            <div key={row.label}>
              <Link to={row.to} className="flex min-h-[64px] items-center gap-3 px-4 py-3 no-underline">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-extrabold text-[#0A234F]">{row.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-[1.35] text-[#7A8493]">{row.description}</span>
                </span>
                <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#A0A8B4]" aria-hidden="true" />
              </Link>
              {index < rows.length - 1 ? <div className="ml-[66px] h-px bg-[#0A234F]/[0.07]" aria-hidden="true" /> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSeller = hasSellerAccess(user);

  const displayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0]
    : '';
  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || displayName[0]?.toUpperCase() || '?'
    : '?';
  const roleLabel = user?.role === 'admin'
    ? 'Administrator account'
    : user?.role === 'seller'
      ? 'Seller account'
      : 'Buyer account';

  const accountRows: SettingsRow[] = [
    { label: 'Profile details', description: 'Your personal account information', to: '/profile', icon: UserRound },
    { label: 'Security', description: 'Email address and password', to: '/profile/security', icon: ShieldCheck },
    { label: 'Activity', description: 'Orders, messages and account updates', to: '/profile/notifications', icon: Bell },
  ];

  const marketplaceRows: SettingsRow[] = [
    { label: 'Favourite items', description: 'Products you have saved', to: '/profile/favourites', icon: Heart },
    { label: 'Purchases', description: 'Orders placed from this account', to: '/orders?mode=buy', icon: Package },
    ...(isSeller ? [
      { label: 'Sales', description: 'Orders sold through your seller account', to: '/orders?mode=sell', icon: Store },
      { label: 'Seller payments', description: 'Payout and Stripe Connect settings', to: '/seller/mobile-payments', icon: WalletCards },
    ] : []),
  ];
  const supportRows: SettingsRow[] = [
    { label: 'Help Centre', description: 'Marketplace help and common questions', to: '/faq', icon: HelpCircle },
    { label: 'Privacy', description: 'How Loadify handles account information', to: '/privacy', icon: FileText },
  ];

  return (
    <div
      className="md:hidden min-h-screen bg-[#EEF3F8] text-[#0A234F]"
      style={{ paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))' }}
    >
      <header
        className="sticky top-0 z-40 bg-[#0A234F] text-white shadow-[0_5px_22px_rgba(10,35,79,0.18)]"
        style={{ paddingTop: 'calc(0.65rem + env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-3 px-[var(--mob-side,16px)] pb-4 pt-2">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            aria-label="Back to profile"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[9px] font-black uppercase tracking-[0.16em] text-[#F5A300]">Loadify Market</p>
            <h1 className="m-0 mt-0.5 text-[23px] font-black tracking-[-0.03em] text-white">Settings</h1>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-white/65">Manage your personal marketplace account</p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#0A234F]">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </header>

      <main className="px-[var(--mob-side,16px)] py-4">
        {!user ? (
          <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-10 text-center shadow-[0_8px_24px_rgba(10,35,79,0.05)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF3F8] text-[#0A234F]">
              <UserRound className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mb-0 mt-4 text-[15px] font-extrabold text-[#0A234F]">Sign in to manage settings</p>
            <p className="mx-auto mb-0 mt-1 max-w-[250px] text-[12px] leading-relaxed text-[#667085]">
              Your personal marketplace settings are available after sign-in.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-5 h-11 w-full rounded-[12px] border-0 bg-[#0A234F] text-[13px] font-extrabold text-white"
            >
              Sign in
            </button>
          </section>
        ) : (
          <>
            <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_8px_24px_rgba(10,35,79,0.05)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0A234F] text-[16px] font-black text-white ring-2 ring-[#F5A300]/60 ring-offset-2 ring-offset-white">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[15px] font-black text-[#0A234F]">{displayName}</p>
                  <p className="m-0 mt-1 truncate text-[11px] font-medium text-[#7A8493]">{user.email}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFF4D6] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-[#9A6500]">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {roleLabel}
                  </span>
                </div>
              </div>
              {user.role === 'admin' ? (
                <p className="mb-0 mt-3 text-[11px] leading-relaxed text-[#667085]">
                  These are your personal marketplace settings. Administrative controls stay in the separate Admin Hub.
                </p>
              ) : null}
            </section>

            <SettingsGroup title="Account" rows={accountRows} />
            <SettingsGroup title="Marketplace" rows={marketplaceRows} />
            <SettingsGroup title="Support & privacy" rows={supportRows} />
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
