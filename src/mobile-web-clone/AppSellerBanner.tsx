import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { hasSellerAccess } from '@/lib/roleUtils';

/** Browser-only visual clone of the installed app's compact seller CTA. */
export default function AppSellerBanner() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const promptAuth = useAuthPromptStore((state) => state.open);

  const handleSell = () => {
    if (!user) { promptAuth('sell'); return; }
    if (hasSellerAccess(user)) navigate('/sell');
    else navigate('/register?type=seller');
  };

  return (
    <div style={{ paddingInline: 'var(--mob-side,16px)', marginTop: 16, marginBottom: 4, background: '#07080B' }}>
      <div style={{ background: '#14151B', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 18, padding: '20px 18px' }}>
        <p style={{ margin: 0, color: '#F2B84B', fontSize: 'clamp(11px,3vw,13px)', fontWeight: 750, letterSpacing: '0.055em', textTransform: 'uppercase', lineHeight: 1.2 }}>
          0% commission until 31 December 2026
        </p>
        <h2 style={{ margin: '12px 0 0', color: '#FFFFFF', fontSize: 'clamp(22px,6vw,28px)', lineHeight: 1.1, fontWeight: 820, letterSpacing: '-0.025em' }}>
          Sell on Loadify Market
        </h2>
        <p style={{ margin: '9px 0 0', color: 'rgba(255,255,255,0.56)', fontSize: 'clamp(14px,4vw,17px)', lineHeight: 1.45 }}>
          Free listings. Fixed prices. Stripe payouts.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 22, flexWrap: 'wrap' }}>
          <button type="button" onClick={handleSell} style={{ padding: 0, border: 0, background: 'transparent', color: '#FFFFFF', fontSize: 'clamp(14px,4vw,16px)', fontWeight: 800 }}>
            Start selling
          </button>
          <button type="button" onClick={() => navigate('/faq')} style={{ padding: 0, border: 0, background: 'transparent', color: 'rgba(255,255,255,0.50)', fontSize: 'clamp(13px,3.7vw,15px)', fontWeight: 650 }}>
            Learn how it works
          </button>
        </div>
      </div>
    </div>
  );
}
