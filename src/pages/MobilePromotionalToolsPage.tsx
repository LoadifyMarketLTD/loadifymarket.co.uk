/**
 * MobilePromotionalToolsPage — /seller/promote
 *
 * Placeholder page for promotional tools (coming soon).
 * Sellers only — buyers/guests see a redirect prompt.
 */

import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Megaphone } from 'lucide-react';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function MobilePromotionalToolsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSeller = hasSellerAccess(user);

  return (
    <div
      className="md:hidden min-h-screen"
      style={{
        background: '#0A0E1A',
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
          onClick={() => navigate('/profile')}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.70)' }} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Promotional Tools</h1>
      </div>

      {/* Body */}
      <div
        style={{
          paddingInline: 'var(--mob-side, 16px)',
          marginTop: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(242,184,75,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Megaphone style={{ width: 28, height: 28, color: '#F2B84B' }} aria-hidden="true" />
        </div>

        {isSeller ? (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Promotional Tools
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
              Boost your listings and reach more buyers. Promotional tools are coming soon.
            </p>
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                paddingInline: 20,
                paddingBlock: 14,
                width: '100%',
                maxWidth: 320,
              }}
            >
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                In the meantime, keep your listings active and up to date to attract buyers.
              </p>
            </div>
            <button
              onClick={() => navigate('/seller/products')}
              style={{
                height: 44,
                paddingInline: 28,
                borderRadius: 9999,
                background: 'linear-gradient(135deg, #D4AF37 0%, #D4AF37 100%)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 700,
                color: '#121A2B',
                marginTop: 8,
              }}
            >
              View my listings
            </button>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
              Seller feature
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
              Promotional tools are only available to sellers.
            </p>
            <button
              onClick={() => navigate('/profile')}
              style={{
                height: 44,
                paddingInline: 28,
                borderRadius: 9999,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.80)',
                marginTop: 8,
              }}
            >
              Back to profile
            </button>
          </>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
