/**
 * MobileBalancePage — /profile/balance
 *
 * Displays the seller's current balance and links to seller settings for payouts.
 * Buyers see a placeholder since they don't hold a balance.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function MobileBalancePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSeller = user?.role === 'seller' || user?.role === 'admin';

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(isSeller);

  useEffect(() => {
    if (!isSeller || !user?.id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('seller_profiles')
        .select('balance')
        .eq('userId', user.id)
        .maybeSingle();
      setBalance((data as { balance?: number } | null)?.balance ?? 0);
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const formatBalance = (val: number) =>
    val.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  return (
    <div
      className="md:hidden min-h-screen"
      style={{
        background: '#07080B',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingInline: 'var(--mob-side, 16px)', paddingTop: 16, paddingBottom: 12 }}>
        <button
          onClick={() => navigate('/profile')}
          aria-label="Back"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: -4 }}
        >
          <ChevronLeft style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.70)' }} />
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Balance</h1>
      </div>

      {/* Balance card */}
      <div style={{ paddingInline: 'var(--mob-side, 16px)', marginTop: 8 }}>
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 'clamp(20px, 5vw, 28px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet style={{ width: 20, height: 20, color: '#F2B84B', flexShrink: 0 }} aria-hidden="true" />
            <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.45)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Available balance
            </p>
          </div>

          {loading ? (
            <div style={{ height: 40, width: 120, borderRadius: 8, background: 'rgba(255,255,255,0.06)' }} />
          ) : isSeller ? (
            <p style={{ fontSize: 'clamp(28px, 8vw, 36px)', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em' }}>
              {formatBalance(balance ?? 0)}
            </p>
          ) : (
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
              Balance is available to sellers only.
            </p>
          )}
        </div>
      </div>

      {/* Payout link for sellers */}
      {isSeller && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              onClick={() => navigate('/seller/settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                paddingInline: 'var(--mob-side, 16px)',
                paddingTop: 14,
                paddingBottom: 14,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.90)' }}>
                Payout settings
              </span>
              <ChevronLeft style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.30)', transform: 'rotate(180deg)' }} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
