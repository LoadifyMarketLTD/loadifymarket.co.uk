/**
 * MobileSellGate — wraps the /sell route.
 *
 * For guest users:
 *   - fires AuthPromptModal with 'sell' context
 *   - shows a friendly full-screen CTA (Create account / Log in / Continue browsing)
 *   - NO hard redirect to /login
 *
 * For authenticated sellers: delegates to RequireSeller + RequireEmailVerified
 * (unchanged security behaviour — role/status checks remain intact).
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import RequireSeller from './auth/RequireSeller';
import RequireEmailVerified from './auth/RequireEmailVerified';

function GuestSellScreen() {
  return (
    <div
      className="md:hidden min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
      style={{
        background: '#0A0E1A',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(245,200,66,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
        }}
        aria-hidden="true"
      >
        🏷️
      </div>

      <div style={{ maxWidth: 300 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', margin: '0 0 10px' }}>
          Create an account to sell
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)', margin: 0, lineHeight: 1.6 }}>
          List your items and reach buyers across the UK — 0% commission on Loadify Market.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          width: '100%',
          maxWidth: 320,
          marginTop: 8,
        }}
      >
        {/* Primary CTA */}
        <Link
          to="/register?type=seller"
          style={{
            display: 'block',
            height: 50,
            lineHeight: '50px',
            textAlign: 'center',
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #D4AF37 0%, #D4AF37 100%)',
            fontSize: 15,
            fontWeight: 700,
            color: '#121A2B',
            textDecoration: 'none',
          }}
        >
          Create account
        </Link>

        {/* Secondary CTA */}
        <Link
          to="/login"
          style={{
            display: 'block',
            height: 50,
            lineHeight: '50px',
            textAlign: 'center',
            borderRadius: 9999,
            background: 'transparent',
            border: '1.5px solid rgba(255,255,255,0.18)',
            fontSize: 15,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.80)',
            textDecoration: 'none',
          }}
        >
          Log in
        </Link>

        {/* Tertiary: continue browsing */}
        <Link
          to="/"
          style={{
            display: 'block',
            paddingTop: 8,
            fontSize: 14,
            color: 'rgba(255,255,255,0.35)',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          Continue browsing
        </Link>
      </div>
    </div>
  );
}

export default function MobileSellGate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const { open: promptAuth } = useAuthPromptStore();

  // Fire the auth modal as soon as we confirm the user is a guest —
  // this ensures the modal is visible even if the user navigated here directly.
  useEffect(() => {
    if (!isLoading && !user) {
      promptAuth('sell');
    }
  }, [isLoading, user, promptAuth]);

  // While auth state is resolving, show a neutral spinner
  if (isLoading) {
    return (
      <div
        className="md:hidden flex items-center justify-center min-h-screen"
        style={{ background: '#0A0E1A' }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.10)',
            borderTopColor: '#D4AF37',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  // Guest — show friendly gate; AuthPromptModal is already triggered above
  if (!user) {
    return <GuestSellScreen />;
  }

  // Authenticated user — delegate to RequireSeller + RequireEmailVerified
  // (role/status checks, suspension checks, etc. remain fully intact)
  return (
    <RequireSeller>
      <RequireEmailVerified>
        {children}
      </RequireEmailVerified>
    </RequireSeller>
  );
}
