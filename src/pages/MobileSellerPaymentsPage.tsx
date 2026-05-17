/**
 * MobileSellerPaymentsPage — /seller/mobile-payments
 *
 * Simple mobile-safe seller payments hub.
 * Payments and payouts are handled exclusively via Stripe Connect.
 * No custom card forms, no Adyen, no manual card storage.
 */

import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function MobileSellerPaymentsPage() {
  const navigate = useNavigate();

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header */}
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

      {/* Info card */}
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
        <p className="text-sm text-foreground/55" style={{ margin: '0 0 20px', lineHeight: 1.6 }}>
          Payments and payouts are handled securely through Stripe. Connect your Stripe account
          to receive payments from buyers and manage your payout schedule.
        </p>

        <button
          onClick={() => navigate('/seller/setup')}
          className="text-[15px] font-bold flex items-center justify-center gap-2"
          style={{
            width: '100%',
            height: 48,
            borderRadius: 9999,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <ExternalLink style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
          Manage Stripe payouts
        </button>
      </div>

      {/* Trust note */}
      <p
        className="text-xs text-foreground/25 text-center"
        style={{
          paddingTop: 16,
          paddingInline: 'var(--mob-side, 16px)',
          lineHeight: 1.5,
        }}
      >
        Loadify Market uses Stripe only. No card details are stored on our servers.
      </p>

      <MobileBottomNav />
    </div>
  );
}
