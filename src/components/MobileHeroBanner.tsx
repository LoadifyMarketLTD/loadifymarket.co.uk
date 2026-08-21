/**
 * MobileHeroBanner — simple single sell CTA hero (no carousel).
 * Shows a short message + "Sell Now" button + optional "Learn how" link.
 */

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuthPromptStore } from '@/store/authPromptStore';

export default function MobileHeroBanner() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const promptAuth = useAuthPromptStore((s) => s.open);

  const handleSell = () => {
    if (!user) {
      promptAuth('sell');
      return;
    }
    if (hasSellerAccess(user)) {
      navigate(isMobile ? '/sell' : '/seller/products/new');
    } else {
      navigate('/register?type=seller');
    }
  };

  return (
    <div
      style={{
        paddingInline: 'var(--mob-side, 16px)',
        marginTop: 16,
        marginBottom: 4,
      }}
    >
      <div
        className="bg-[#0B2F6B]"
        style={{
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          padding: 'clamp(16px, 5vw, 24px)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          boxShadow: '0 16px 36px rgba(10,35,79,0.24)',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className="text-[#F5A300]"
            style={{
              fontSize: 'clamp(11px, 3vw, 13px)',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              lineHeight: 1,
              marginBottom: 6,
            }}
          >
            0% commission until 31 December 2026
          </p>
          <h2
            className="text-white"
            style={{
              fontSize: 'clamp(18px, 5.2vw, 24px)',
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Sell on Loadify Market
          </h2>
          <p
            className="text-white/65"
            style={{
              fontSize: 'clamp(12px, 3.4vw, 14px)',
              margin: '6px 0 0',
              lineHeight: 1.4,
            }}
          >
            Free listings. Fixed prices. Stripe payouts.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <button
              onClick={handleSell}
              style={{
                height: 40,
                paddingLeft: 20,
                paddingRight: 20,
                borderRadius: 9999,
                border: 'none',
                cursor: 'pointer',
                fontSize: 'clamp(13px, 3.6vw, 14px)',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: '#F5A300',
                color: '#0A234F',
              }}
            >
              Start selling
            </button>
            <button
              onClick={() => navigate('/help')}
              className="text-white/62"
              style={{
                height: 40,
                paddingLeft: 0,
                paddingRight: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'clamp(12px, 3.2vw, 13px)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Learn how it works
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
