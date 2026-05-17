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
          onClick={() => navigate('/profile')}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft className="text-foreground/70" style={{ width: 22, height: 22 }} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground m-0">Promotional Tools</h1>
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
          className="bg-primary/10 flex items-center justify-center"
          style={{ width: 64, height: 64, borderRadius: '50%' }}
        >
          <Megaphone style={{ width: 28, height: 28 }} aria-hidden="true" />
        </div>

        {isSeller ? (
          <>
            <h2 className="text-[18px] font-bold text-foreground m-0">
              Promotional Tools
            </h2>
            <p className="text-sm text-foreground/50 m-0" style={{ maxWidth: 280, lineHeight: 1.5 }}>
              Boost your listings and reach more buyers. Promotional tools are coming soon.
            </p>
            <div
              className="bg-white/[0.04] w-full"
              style={{
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                paddingInline: 20,
                paddingBlock: 14,
                maxWidth: 320,
              }}
            >
              <p className="text-[13px] text-muted-foreground m-0">
                In the meantime, keep your listings active and up to date to attract buyers.
              </p>
            </div>
            <button
              onClick={() => navigate('/seller/products')}
              className="text-sm font-bold"
              style={{
                height: 44,
                paddingInline: 28,
                borderRadius: 9999,
                border: 'none',
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              View my listings
            </button>
          </>
        ) : (
          <>
            <h2 className="text-[18px] font-bold text-foreground m-0">
              Seller feature
            </h2>
            <p className="text-sm text-foreground/50 m-0" style={{ maxWidth: 280, lineHeight: 1.5 }}>
              Promotional tools are only available to sellers.
            </p>
            <button
              onClick={() => navigate('/profile')}
              className="text-sm font-semibold text-foreground/80 bg-white/[0.07]"
              style={{
                height: 44,
                paddingInline: 28,
                borderRadius: 9999,
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
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
