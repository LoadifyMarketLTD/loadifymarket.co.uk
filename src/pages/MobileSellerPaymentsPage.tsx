/**
 * MobileSellerPaymentsPage - /seller/mobile-payments
 * Native Stripe Connect payout hub for marketplace sellers.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  CircleAlert,
  Clock3,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';
import officialLoadifyMarketLogo from '../../LOADIFY_MARKET_Master_Vector_WhiteGold.svg';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { openExternalUrl } from '@/lib/capacitorUtils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';

type ConnectStatus = 'active' | 'pending' | 'restricted' | null;

export default function MobileSellerPaymentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const userId = user?.id;
  const [status, setStatus] = useState<ConnectStatus>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) {
      setLoadingStatus(false);
      return;
    }

    let cancelled = false;
    void supabase
      .from('seller_profiles')
      .select('stripeConnectStatus')
      .eq('userId', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const value = (data as { stripeConnectStatus?: string | null } | null)?.stripeConnectStatus;
        setStatus(value === 'active' || value === 'pending' || value === 'restricted' ? value : null);
        setLoadingStatus(false);
      }, () => {
        if (!cancelled) setLoadingStatus(false);
      });

    return () => { cancelled = true; };
  }, [userId]);

  const openStripe = async () => {
    if (opening) return;
    setOpening(true);
    setError('');

    try {
      const endpoint = status === 'active'
        ? '/.netlify/functions/connect-dashboard'
        : '/.netlify/functions/connect-onboard';
      const response = await authorizedFetch(endpoint, { method: 'POST' });
      let body: Record<string, unknown> = {};
      try { body = await response.json() as Record<string, unknown>; } catch { /* handled below */ }
      if (!response.ok || typeof body.url !== 'string' || !body.url) {
        throw new Error(typeof body.error === 'string' ? body.error : 'Unable to open Stripe securely.');
      }
      await openExternalUrl(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open Stripe securely.');
    } finally {
      setOpening(false);
    }
  };

  const statusMeta = status === 'active'
    ? {
        label: 'Connected',
        description: 'Stripe Connect is ready for payout management.',
        icon: CheckCircle2,
        badge: 'bg-[#EAF8EF] text-[#16794B]',
      }
    : status === 'pending'
      ? {
          label: 'Setup pending',
          description: 'Complete the remaining Stripe account steps to continue.',
          icon: Clock3,
          badge: 'bg-[#FFF4D6] text-[#9A6500]',
        }
      : status === 'restricted'
        ? {
            label: 'Action required',
            description: 'Stripe requires additional information before payouts can continue.',
            icon: CircleAlert,
            badge: 'bg-[#FFF0EE] text-[#A53A2A]',
          }
        : {
            label: 'Not connected',
            description: 'Connect Stripe to activate secure seller payouts.',
            icon: CircleAlert,
            badge: 'bg-[#EEF3F8] text-[#526071]',
          };

  const StatusIcon = statusMeta.icon;
  const actionLabel = status === 'active' ? 'Open Stripe payout dashboard' : 'Complete Stripe setup';

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
            onClick={() => navigate('/profile/balance')}
            aria-label="Back to balance"
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
            <h1 className="m-0 mt-1.5 text-[22px] font-black tracking-[-0.03em] text-white">Payments</h1>
            <p className="m-0 mt-0.5 text-[11px] font-medium text-white/65">Stripe Connect and seller payouts</p>
          </div>
        </div>
      </header>

      <main className="px-[var(--mob-side,16px)] py-4">
        <section className="overflow-hidden rounded-[22px] bg-[#0A234F] text-white shadow-[0_14px_34px_rgba(10,35,79,0.16)]">
          <div className="h-1 bg-[#F5A300]" aria-hidden="true" />
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-[9px] font-black uppercase tracking-[0.15em] text-white/55">Payout account</p>
                <p className="m-0 mt-1 text-[18px] font-black tracking-[-0.02em] text-white">Stripe Connect</p>
                <p className="m-0 mt-1 max-w-[250px] text-[11px] leading-[1.55] text-white/65">Secure account setup and payout management for your Loadify sales.</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.05em] ${statusMeta.badge}`}>
                <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {loadingStatus ? 'Checking' : statusMeta.label}
              </span>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[18px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_7px_20px_rgba(10,35,79,0.05)]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
              <StatusIcon className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[13px] font-extrabold text-[#0A234F]">{loadingStatus ? 'Checking payout account...' : statusMeta.label}</p>
              <p className="m-0 mt-1 text-[11px] leading-[1.5] text-[#7A8493]">{statusMeta.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={openStripe}
            disabled={opening || loadingStatus}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[13px] border-0 bg-[#0A234F] px-4 text-[12px] font-extrabold text-white shadow-[0_7px_18px_rgba(10,35,79,0.14)] disabled:cursor-default disabled:opacity-60"
          >
            {opening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
            {opening ? 'Opening securely...' : actionLabel}
          </button>

          {error ? (
            <div className="mt-3 rounded-[12px] bg-[#FFF0EE] px-3 py-2.5 text-[11px] font-semibold leading-[1.5] text-[#A53A2A]">
              {error}
            </div>
          ) : null}
        </section>

        <section className="mt-5 rounded-[18px] border border-[#0A234F]/[0.08] bg-white p-4 shadow-[0_7px_20px_rgba(10,35,79,0.04)]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#EEF3F8] text-[#0A234F]">
              <ShieldCheck className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div>
              <p className="m-0 text-[12px] font-extrabold text-[#0A234F]">Protected by Stripe Connect</p>
              <p className="m-0 mt-1 text-[11px] leading-[1.55] text-[#7A8493]">
                Bank details and payout settings are handled securely by Stripe. Loadify Market does not store your bank account details.
              </p>
            </div>
          </div>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
}
