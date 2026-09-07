/**
 * MobileBalancePage - /profile/balance
 * Native marketplace balance and payout status.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  ShieldCheck,
  Wallet,
  WalletCards,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import MobileBottomNav from '@/components/MobileBottomNav';
import officialLoadifyMarketLogo from '../../LOADIFY_MARKET_Master_Vector_WhiteGold.svg';

type ConnectStatus = 'active' | 'pending' | 'restricted' | null;

interface BalanceProfile {
  balance?: number | null;
  stripeConnectStatus?: string | null;
}

export default function MobileBalancePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSeller = user?.role === 'seller' || user?.role === 'admin';
  const userId = user?.id;

  const [balance, setBalance] = useState<number | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>(null);
  const [loading, setLoading] = useState(isSeller);

  useEffect(() => {
    if (!isSeller || !userId) return;

    let cancelled = false;

    void supabase
      .from('seller_profiles')
      .select('balance, stripeConnectStatus')
      .eq('userId', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const profile = data as BalanceProfile | null;
        setBalance(profile?.balance ?? 0);
        const status = profile?.stripeConnectStatus;
        setConnectStatus(status === 'active' || status === 'pending' || status === 'restricted' ? status : null);
        setLoading(false);
      }, () => {
        if (!cancelled) {
          setBalance(0);
          setConnectStatus(null);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [isSeller, userId]);

  const formatBalance = (value: number) =>
    value.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  const statusMeta = connectStatus === 'active'
    ? {
        label: 'Stripe connected',
        description: 'Your payout account is connected and ready.',
        icon: CheckCircle2,
        badge: 'bg-[#EAF8EF] text-[#16794B]',
      }
    : connectStatus === 'pending'
      ? {
          label: 'Setup pending',
          description: 'Stripe setup still needs to be completed.',
          icon: Clock3,
          badge: 'bg-[#FFF4D6] text-[#9A6500]',
        }
      : connectStatus === 'restricted'
        ? {
            label: 'Action required',
            description: 'Stripe needs additional information before payouts can continue.',
            icon: CircleAlert,
            badge: 'bg-[#FFF0EE] text-[#A53A2A]',
          }
        : {
            label: 'Not connected',
            description: 'Connect Stripe to receive seller payouts.',
            icon: CircleAlert,
            badge: 'bg-[#EEF3F8] text-[#526071]',
          };

  const StatusIcon = statusMeta.icon;

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
            <img
              src={officialLoadifyMarketLogo}
              alt="Loadify Market"
              className="h-[28px] w-auto max-w-[150px] object-contain object-left"
            />
            <h1 className="m-0 mt-1.5 text-[22px] font-black tracking-[-0.03em] text-white">Balance</h1>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-white/65">Seller funds and payout access</p>
          </div>
        </div>
      </header>

      <main className="px-[var(--mob-side,16px)] py-4">
        {!isSeller ? (
          <section className="rounded-[20px] border border-[#0A234F]/[0.08] bg-white px-6 py-10 text-center shadow-[0_8px_24px_rgba(10,35,79,0.05)]">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF3F8] text-[#0A234F]">
              <WalletCards className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mb-0 mt-4 text-[15px] font-extrabold text-[#0A234F]">Seller balance</p>
            <p className="mx-auto mb-0 mt-1 max-w-[260px] text-[12px] leading-relaxed text-[#667085]">
              Balance and payout controls become available when this account has seller access.
            </p>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-[22px] bg-[#0A234F] text-white shadow-[0_14px_34px_rgba(10,35,79,0.16)]">
              <div className="h-1 bg-[#F5A300]" aria-hidden="true" />
              <div className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="m-0 text-[9px] font-black uppercase tracking-[0.15em] text-white/55">Available balance</p>
                    <p className="m-0 mt-1 text-[11px] font-medium text-white/65">Seller funds currently recorded in Loadify</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-white/10 text-[#F5A300]">
                    <Wallet className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                </div>

                {loading ? (
                  <div className="mt-5 h-11 w-36 animate-pulse rounded-[10px] bg-white/10" aria-label="Loading balance" />
                ) : (
                  <p className="m-0 mt-4 text-[34px] font-black tracking-[-0.04em] text-white">
                    {formatBalance(balance ?? 0)}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                  <div className="min-w-0">
                    <p className="m-0 text-[10px] font-bold text-white/55">Payout provider</p>
                    <p className="m-0 mt-0.5 text-[12px] font-extrabold text-white">Stripe Connect</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.05em] ${statusMeta.badge}`}>
                    <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {loading ? 'Checking' : statusMeta.label}
                  </span>
                </div>
              </div>
            </section>

            <section className="mt-5">
              <p className="mb-2 px-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#7A8493]">Payments & payouts</p>
              <div className="overflow-hidden rounded-[18px] border border-[#0A234F]/[0.08] bg-white shadow-[0_7px_20px_rgba(10,35,79,0.05)]">

                <div className="flex items-start gap-3 px-4 py-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
                    <StatusIcon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[13px] font-extrabold text-[#0A234F]">{loading ? 'Checking payout status...' : statusMeta.label}</p>
                    <p className="m-0 mt-1 text-[11px] leading-[1.5] text-[#7A8493]">{statusMeta.description}</p>
                  </div>
                </div>
                <div className="ml-[66px] h-px bg-[#0A234F]/[0.07]" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => navigate('/seller/mobile-payments')}
                  className="flex min-h-[62px] w-full items-center gap-3 border-0 bg-white px-4 py-3 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#FFF4D6] text-[#9A6500]">
                    <WalletCards className="h-[18px] w-[18px]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-extrabold text-[#0A234F]">Manage payouts</span>
                    <span className="mt-0.5 block text-[11px] leading-[1.4] text-[#7A8493]">Open Stripe Connect settings securely</span>
                  </span>
                  <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#A0A8B4]" aria-hidden="true" />
                </button>
              </div>
            </section>

            <section className="mt-5 rounded-[18px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_7px_20px_rgba(10,35,79,0.04)]">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
                  <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <div>
                  <p className="m-0 text-[12px] font-extrabold text-[#0A234F]">Secure payout management</p>
                  <p className="m-0 mt-1 text-[11px] leading-[1.55] text-[#7A8493]">
                    Bank and payout details are managed by Stripe Connect. Loadify Market does not store your bank account details.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
