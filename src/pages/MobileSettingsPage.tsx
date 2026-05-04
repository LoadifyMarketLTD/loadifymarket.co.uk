/**
 * MobileSettingsPage — /profile/settings
 *
 * Simple mobile settings hub accessible to all logged-in users.
 * Links to profile sub-pages without forcing role-based redirects.
 */

import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store';
import { hasSellerAccess } from '@/lib/roleUtils';
import MobileBottomNav from '@/components/MobileBottomNav';

interface SettingsRow {
  label: string;
  to: string;
}

export default function MobileSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSeller = hasSellerAccess(user);

  const rows: SettingsRow[] = [
    {
      label: 'Profile details',
      to: isSeller ? '/seller/profile' : '/buyer/profile',
    },
    {
      label: 'Account settings',
      to: isSeller ? '/seller/settings' : '/buyer/settings',
    },
    {
      label: 'Payments',
      to: isSeller ? '/seller/settings' : '/buyer/payments',
    },
    {
      label: 'Shipping',
      to: isSeller ? '/seller/shipments' : '/buyer/orders',
    },
    {
      label: 'Security',
      to: '/profile/security',
    },
    {
      label: 'Notifications',
      to: '/profile/notifications',
    },
  ];

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
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', margin: 0 }}>Settings</h1>
      </div>

      {!user ? (
        <div
          style={{
            paddingInline: 'var(--mob-side, 16px)',
            paddingTop: 40,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
            Sign in to manage your settings.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              height: 44,
              paddingInline: 32,
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #F5C842 0%, #C8860A 100%)',
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              color: '#0B0B0F',
            }}
          >
            Sign in
          </button>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            marginTop: 8,
          }}
        >
          {rows.map((row, i) => (
            <div key={row.label}>
              <Link
                to={row.to}
                style={{ display: 'block', textDecoration: 'none' }}
              >
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
                  <span style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.90)' }}>
                    {row.label}
                  </span>
                  <ChevronRight
                    style={{ width: 18, height: 18, color: 'rgba(255,255,255,0.30)', flexShrink: 0 }}
                    aria-hidden="true"
                  />
                </div>
              </Link>
              {i < rows.length - 1 && (
                <div
                  aria-hidden="true"
                  style={{
                    height: 1,
                    background: 'rgba(255,255,255,0.05)',
                    marginInlineStart: 'var(--mob-side, 16px)',
                  }}
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
