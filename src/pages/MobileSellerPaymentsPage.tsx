/**
 * MobileSellerPaymentsPage — /seller/mobile-payments
 *
 * Mobile presentation of the same Stripe Connect readiness evidence used by the
 * canonical Seller flow. This page never invents checkout readiness: Stripe
 * account state and tax-location sync are shown separately, while checkout
 * remains the authoritative fail-closed boundary.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { authorizedFetch } from '@/lib/authorizedFetch';
import MobileBottomNav from '@/components/MobileBottomNav';

type ConnectStatus = {
  stripeConnectStatus: 'pending' | 'restricted' | 'active' | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  sellerStatus?: string | null;
  profileComplete?: boolean;
  taxEvidenceReady?: boolean;
  taxEvidenceReason?: string | null;
};

function statusLabel(status: ConnectStatus['stripeConnectStatus']) {
  if (status === 'active') return 'Active';
  if (status === 'restricted') return 'Restricted';
  if (status === 'pending') return 'Pending';
  return 'Not connected';
}

export default function MobileSellerPaymentsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authorizedFetch('/.netlify/functions/connect-status', { method: 'POST' });
      const payload = await response.json().catch(() => ({})) as ConnectStatus & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Could not refresh Stripe account status.');
      }
      setStatus(payload);
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : 'Could not refresh Stripe account status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  const stripeActive = status?.stripeConnectStatus === 'active'
    && status?.chargesEnabled === true
    && status?.payoutsEnabled === true;

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
        <h1 className="text-xl font-extrabold text-foreground m-0" style={{ flex: 1 }}>Payments</h1>
        <button
          type="button"
          onClick={() => { void refreshStatus(); }}
          disabled={loading}
          aria-label="Refresh payment status"
          style={{ background: 'none', border: 'none', cursor: loading ? 'wait' : 'pointer', padding: 8, opacity: loading ? 0.5 : 1 }}
        >
          <RefreshCw className="text-foreground/65" style={{ width: 19, height: 19 }} />
        </button>
      </div>

      <div style={{ padding: '8px var(--mob-side, 16px) 0' }}>
        <div
          className="bg-white/[0.04]"
          style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 18 }}
        >
          <p className="text-[15px] font-semibold text-foreground" style={{ margin: '0 0 14px' }}>
            Stripe Connect
          </p>

          {loading ? (
            <p className="text-sm text-foreground/55 m-0">Refreshing account status…</p>
          ) : error ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle className="text-danger" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
              <p className="text-sm text-danger m-0" style={{ lineHeight: 1.5 }}>{error}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="text-sm text-foreground/55">Account</span>
                <strong className="text-sm text-foreground">{statusLabel(status?.stripeConnectStatus ?? null)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="text-sm text-foreground/55">Buyer charges</span>
                <strong className="text-sm text-foreground">{status?.chargesEnabled ? 'Enabled' : 'Not ready'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="text-sm text-foreground/55">Payouts</span>
                <strong className="text-sm text-foreground">{status?.payoutsEnabled ? 'Enabled' : 'Not ready'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span className="text-sm text-foreground/55">Tax location sync</span>
                <strong className="text-sm text-foreground">{status?.taxEvidenceReady ? 'Synced' : 'Needs attention'}</strong>
              </div>
            </div>
          )}
        </div>

        {!loading && !error && stripeActive && (
          <div
            className="bg-success/[0.08]"
            style={{ border: '1px solid rgba(34,197,94,0.20)', borderRadius: 14, padding: 14, marginTop: 12, display: 'flex', gap: 10 }}
          >
            <CheckCircle2 className="text-success" style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
            <p className="text-sm text-foreground/75 m-0" style={{ lineHeight: 1.5 }}>
              Stripe can accept charges and payouts. Checkout still verifies the current seller tax declaration and listing evidence before any payment is created.
            </p>
          </div>
        )}

        {!loading && !error && status?.taxEvidenceReady === false && (
          <div
            className="bg-primary/[0.06]"
            style={{ border: '1px solid rgba(245,163,0,0.22)', borderRadius: 14, padding: 14, marginTop: 12 }}
          >
            <p className="text-sm text-foreground/75 m-0" style={{ lineHeight: 1.5 }}>
              Your listing can still be visible in the marketplace. Complete your Seller Profile tax declaration before expecting checkout to become available.
            </p>
          </div>
        )}

        <button
          onClick={() => navigate('/seller/setup')}
          className="text-[15px] font-bold flex items-center justify-center gap-2 bg-primary text-surface"
          style={{
            width: '100%',
            height: 48,
            borderRadius: 9999,
            border: 'none',
            cursor: 'pointer',
            marginTop: 16,
          }}
        >
          <ExternalLink style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
          Manage Stripe account
        </button>

        <button
          onClick={() => navigate('/seller/profile')}
          className="text-[15px] font-semibold text-foreground/80"
          style={{
            width: '100%',
            height: 48,
            borderRadius: 9999,
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
            marginTop: 10,
          }}
        >
          Review Seller Profile &amp; tax declaration
        </button>
      </div>

      <p
        className="text-xs text-foreground/35 text-center"
        style={{ paddingTop: 16, paddingInline: 'var(--mob-side, 16px)', lineHeight: 1.5 }}
      >
        Loadify Market uses Stripe for payment processing. Card details are not stored on Loadify servers.
      </p>

      <MobileBottomNav />
    </div>
  );
}
