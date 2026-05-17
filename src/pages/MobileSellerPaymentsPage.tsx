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
      className="md:hidden min-h-screen"
      style={{
        background: 'rgba(10,14,26,1)',
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
          <ChevronLeft style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.70)' }} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,1)', margin: 0 }}>Payments</h1>
      </div>

      {/* Info card */}
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          marginTop: 8,
          padding: '20px var(--mob-side, 16px)',
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,1)', margin: '0 0 8px' }}>
          Stripe payments &amp; payouts
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 20px', lineHeight: 1.6 }}>
          Payments and payouts are handled securely through Stripe. Connect your Stripe account
          to receive payments from buyers and manage your payout schedule.
        </p>

        <button
          onClick={() => navigate('/seller/setup')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            height: 48,
            borderRadius: 9999,
            
            border: 'none',
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            
          }}
        >
          <ExternalLink style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden="true" />
          Manage Stripe payouts
        </button>
      </div>

      {/* Trust note */}
      <p
        style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.25)',
          textAlign: 'center',
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
