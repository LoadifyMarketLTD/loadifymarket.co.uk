/**
 * MobileSellerPaymentsPage — /seller/mobile-payments
 *
 * Mobile-safe Stripe Connect hub. This stays inside the marketplace app while
 * delegating onboarding and payout management to the existing server-governed
 * Stripe Connect boundaries.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, Loader2 } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';
import { authorizedFetch } from '@/lib/authorizedFetch';
import { openExternalUrl } from '@/lib/capacitorUtils';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';

type ConnectStatus = 'active' | 'pending' | 'restricted' | null;

export default function MobileSellerPaymentsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<ConnectStatus>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) {
      setLoadingStatus(false);
      return;
    }

    let cancelled = false;
    void supabase
      .from('seller_profiles')
      .select('stripeConnectStatus')
      .eq('userId', user.id)
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
  }, [user?.id]);

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
      try { body = await response.json() as Record<string, unknown>; } catch { /* controlled below */ }
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

  const statusLabel = status === 'active'
    ? 'Connected'
    : status === 'pending'
      ? 'Setup pending'
      : status === 'restricted'
        ? 'Action required'
        : 'Not connected';

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          paddingInline: 'var(--mob-side, 16px)',
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <button
          onClick={() => navigate('/profile/settings')}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft className="text-foreground/70" style={{ width: 22, height: 22 }} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground m-0">Payments</h1>
      </div>

      <div
        className="bg-white/[0.04]"
        style={{
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginTop: 8,
          padding: '20px var(--mob-side, 16px)',
        }}
      >
        <p className="text-[15px] font-semibold text-foreground" style={{ margin: '0 0 8px' }}>
          Stripe payments &amp; payouts
        </p>
        <p className="text-sm text-foreground/55" style={{ margin: '0 0 10px', lineHeight: 1.6 }}>
          Payments and payouts are handled securely through Stripe Connect. Loadify does not store your card or bank details.
        </p>
        <p className="text-xs text-foreground/45" style={{ margin: '0 0 20px' }}>
          Status: {loadingStatus ? 'Checking…' : statusLabel}
        </p>

        <button
          onClick={openStripe}
          disabled={opening || loadingStatus}
          className="text-[15px] font-bold flex items-center justify-center gap-2"
          style={{
            width: '100%',
            height: 48,
            borderRadius: 9999,
            border: 'none',
            cursor: opening || loadingStatus ? 'default' : 'pointer',
            opacity: opening || loadingStatus ? 0.65 : 1,
          }}
        >
          {opening ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} aria-hidden="true" /> : <ExternalLink style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />}
          {status === 'active' ? 'Open Stripe payout dashboard' : 'Complete Stripe setup'}
        </button>

        {error ? (
          <p className="text-xs text-danger" style={{ margin: '12px 0 0', lineHeight: 1.5 }}>{error}</p>
        ) : null}
      </div>

      <p
        className="text-xs text-foreground/25 text-center"
        style={{
          paddingTop: 16,
          paddingInline: 'var(--mob-side, 16px)',
          lineHeight: 1.5,
        }}
      >
        Stripe opens securely outside the app for account setup and payout management.
      </p>

      <MobileBottomNav />
    </div>
  );
}
