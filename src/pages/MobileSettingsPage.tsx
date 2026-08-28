/**
 * MobileSettingsPage — /profile/settings
 *
 * Shared mobile settings hub. Commerce destinations follow the same Buyer,
 * Seller and Admin separation as the canonical workspaces.
 */

import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store';
import { hasAdminAccess, hasSellerAccess } from '@/lib/roleUtils';
import MobileBottomNav from '@/components/MobileBottomNav';

interface SettingsRow {
  label: string;
  to: string;
}

function settingsRowsForUser(user: ReturnType<typeof useAuthStore.getState>['user']): SettingsRow[] {
  if (user && hasAdminAccess(user)) {
    return [
      { label: 'Admin settings', to: '/admin/settings' },
      { label: 'Admin notifications', to: '/admin/notifications' },
      { label: 'Security', to: '/profile/security' },
    ];
  }

  const isSeller = hasSellerAccess(user);

  if (isSeller) {
    return [
      { label: 'Seller profile', to: '/seller/profile' },
      { label: 'Seller settings', to: '/seller/settings' },
      { label: 'Payments & payouts', to: '/seller/mobile-payments' },
      { label: 'Shipments', to: '/seller/shipments' },
      { label: 'Security', to: '/profile/security' },
    ];
  }

  return [
    { label: 'Profile details', to: '/buyer/profile' },
    { label: 'Account settings', to: '/buyer/settings' },
    { label: 'Payments', to: '/buyer/payments' },
    { label: 'Orders & delivery', to: '/buyer/orders' },
    { label: 'Security', to: '/profile/security' },
  ];
}

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const rows = settingsRowsForUser(user);

  return (
    <div
      className="md:hidden min-h-screen bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'calc(var(--mob-nav-h, 68px) + env(safe-area-inset-bottom, 0px))',
      }}
    >
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
        <h1 className="text-xl font-extrabold text-foreground m-0">Settings</h1>
      </div>

      {!user ? (
        <div
          style={{
            paddingInline: 'var(--mob-side, 16px)',
            paddingTop: 40,
            textAlign: 'center',
          }}
        >
          <p className="text-[15px] text-muted-foreground" style={{ marginBottom: 20 }}>
            Sign in to manage your settings.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-bold"
            style={{
              height: 44,
              paddingInline: 32,
              borderRadius: 9999,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </div>
      ) : (
        <div
          className="bg-white/[0.04]"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginTop: 8,
          }}
        >
          {rows.map((row, index) => (
            <div key={`${row.to}:${row.label}`}>
              <Link to={row.to} style={{ display: 'block', textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingInline: 'var(--mob-side, 16px)',
                    paddingTop: 14,
                    paddingBottom: 14,
                    cursor: 'pointer',
                  }}
                >
                  <span className="text-[15px] font-medium text-foreground/90">{row.label}</span>
                  <ChevronRight
                    className="text-foreground/30"
                    style={{ width: 18, height: 18, flexShrink: 0 }}
                    aria-hidden="true"
                  />
                </div>
              </Link>
              {index < rows.length - 1 && (
                <div
                  aria-hidden="true"
                  className="bg-white/[0.05]"
                  style={{ height: 1, marginInlineStart: 'var(--mob-side, 16px)' }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <MobileBottomNav />
    </div>
  );
}
