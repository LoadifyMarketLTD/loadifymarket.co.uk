/**
 * MobileHeroBanner — buyer-first marketplace hero with a secondary seller path.
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
        className="bg-white/[0.04]"
        style={{
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 18,
          padding: 'clamp(18px, 5vw, 24px)',
        }}
      >
        <p
          className="text-primary"
          style={{
            fontSize: 'clamp(10px, 2.8vw, 12px)',
            fontWeight: 800,
            letterSpacing: '0.09em',
            textTransform: 'uppercase',
            margin: 0,
            lineHeight: 1,
            marginBottom: 8,
          }}
        >
          UK marketplace for buying and selling
        </p>

        <h1
          className="text-foreground"
          style={{
            fontSize: 'clamp(24px, 7vw, 32px)',
            fontWeight: 850,
            margin: 0,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
          }}
        >
          Shop. Sell. Grow.
          <span className="text-primary" style={{ display: 'block' }}>All in one marketplace.</span>
        </h1>

        <p
          className="text-foreground/75"
          style={{
            fontSize: 'clamp(13px, 3.5vw, 15px)',
            margin: '10px 0 0',
            lineHeight: 1.5,
          }}
        >
          Browse products, checkout securely through Stripe and track your orders from Loadify.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
          <button
            onClick={() => navigate('/catalog')}
            className="bg-primary text-black"
            style={{
              height: 44,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 800,
            }}
          >
            Shop now
          </button>
          <button
            onClick={handleSell}
            className="text-foreground"
            style={{
              height: 44,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.22)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 750,
            }}
          >
            Start selling
          </button>
        </div>

        <p className="text-foreground/65" style={{ fontSize: 11, lineHeight: 1.45, marginTop: 12 }}>
          Sellers can join with 0% commission until 31 December 2026.
        </p>

        <div className="text-foreground/65" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, fontSize: 11, fontWeight: 700 }}>
          <span>Secure checkout</span>
          <span aria-hidden="true">•</span>
          <span>Order tracking</span>
          <span aria-hidden="true">•</span>
          <span>UK operated</span>
        </div>
      </div>
    </div>
  );
}
