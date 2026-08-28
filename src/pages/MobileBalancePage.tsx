/**
 * MobileBalancePage — /profile/balance
 *
 * Uses the same seller_balance projection as the canonical Seller Dashboard.
 * Buyers do not have a seller payout balance.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';
import MobileBottomNav from '@/components/MobileBottomNav';

type SellerBalance = {
  availableAmount: number;
  totalEarned: number;
};

export default function MobileBalancePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSeller = hasSellerAccess(user);

  const [balance, setBalance] = useState<SellerBalance | null>(null);
  const [loading, setLoading] = useState(isSeller);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!isSeller || !user?.id) {
      setLoading(false);
      setBalance(null);
      setLoadError(false);
      return () => { cancelled = true; };
    }

    const load = async () => {
      setLoading(true);
      setLoadError(false);

      const { data, error } = await supabase
        .from('seller_balance')
        .select('availableAmount, totalEarned')
        .eq('sellerId', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setBalance(null);
        setLoadError(true);
      } else {
        const row = data as { availableAmount?: number | null; totalEarned?: number | null } | null;
        setBalance({
          availableAmount: row?.availableAmount ?? 0,
          totalEarned: row?.totalEarned ?? 0,
        });
      }
      setLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [isSeller, user?.id]);

  const formatBalance = (value: number) =>
    value.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' });

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
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
          ) : !isSeller ? (
            <p className="text-[15px] text-muted-foreground m-0">
              Balance is available to Marketplace Sellers only.
            </p>
          ) : loadError ? (
            <p className="text-[15px] text-danger m-0">
              We could not load your seller balance. Please refresh or open Payments.
            </p>
          ) : (
            <>
              <p className="text-foreground font-extrabold m-0" style={{ fontSize: 'clamp(28px, 8vw, 36px)', letterSpacing: '-0.02em' }}>
                {formatBalance(balance?.availableAmount ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground m-0">
                Total earned: {formatBalance(balance?.totalEarned ?? 0)}
              </p>
            </>
          )}
        </div>
      </div>

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
                Payments &amp; payouts
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
