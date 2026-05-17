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
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 'clamp(16px, 5vw, 24px)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
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
            style={{
              fontSize: 'clamp(18px, 5.2vw, 24px)',
              fontWeight: 800,
              color: 'rgba(255,255,255,1)',
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            Sell fast. Get paid.
          </h2>
          <p
            style={{
              fontSize: 'clamp(12px, 3.4vw, 14px)',
              color: 'rgba(255,255,255,0.55)',
              margin: '6px 0 0',
              lineHeight: 1.4,
            }}
          >
            List anything in seconds.
          </p>

          {/* CTAs */}
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
              }}
            >
              Start selling
            </button>
            <button
              onClick={() => navigate('/help')}
              style={{
                height: 40,
                paddingLeft: 0,
                paddingRight: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'clamp(12px, 3.2vw, 13px)',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.50)',
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
