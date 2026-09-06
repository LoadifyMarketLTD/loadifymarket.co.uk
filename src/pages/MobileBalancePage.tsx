/**
 * MobileBalancePage — /profile/balance
 *
 * Displays the seller's current balance and links to the native seller payments hub.
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
      className="md:hidden min-h-screen bg-background"
      style={{
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
          <ChevronLeft className="text-foreground/70" style={{ width: 22, height: 22 }} />
        </button>
        <h1 className="text-xl font-extrabold text-foreground m-0">Balance</h1>
      </div>

      {/* Balance card */}
      <div style={{ paddingInline: 'var(--mob-side, 16px)', marginTop: 8 }}>
        <div
          className="bg-white/[0.04]"
          style={{
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: 'clamp(20px, 5vw, 28px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wallet style={{ width: 20, height: 20, flexShrink: 0 }} aria-hidden="true" />
            <p className="text-[13px] font-semibold text-muted-foreground uppercase m-0" style={{ letterSpacing: '0.06em' }}>
              Available balance
            </p>
          </div>

          {loading ? (
            <div className="bg-white/[0.06]" style={{ height: 40, width: 120, borderRadius: 8 }} />
          ) : isSeller ? (
            <p className="text-foreground font-extrabold m-0" style={{ fontSize: 'clamp(28px, 8vw, 36px)', letterSpacing: '-0.02em' }}>
              {formatBalance(balance ?? 0)}
            </p>
          ) : (
            <p className="text-[15px] text-muted-foreground m-0">
              Balance is available to sellers only.
            </p>
          )}
        </div>
      </div>

      {/* Payout link for sellers */}
      {isSeller && (
        <div style={{ marginTop: 16 }}>
          <div
            className="bg-white/[0.04]"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.06)',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <button
              onClick={() => navigate('/seller/mobile-payments')}
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
              <span className="text-[15px] font-medium text-foreground/90">
                Payout settings
              </span>
              <ChevronLeft className="text-foreground/30" style={{ width: 18, height: 18, transform: 'rotate(180deg)' }} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
