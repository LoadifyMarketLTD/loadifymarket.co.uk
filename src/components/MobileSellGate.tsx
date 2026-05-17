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
      className="md:hidden min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Icon */}
      <div
        className="bg-primary/10 flex items-center justify-center"
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          fontSize: 36,
        }}
        aria-hidden="true"
      >
        🏷️
      </div>

      <div style={{ maxWidth: 300 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }} className="text-white">
          Create an account to sell
        </h2>
        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }} className="text-white/50">
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
          className="text-surface bg-primary"
          style={{
            display: 'block',
            height: 50,
            lineHeight: '50px',
            textAlign: 'center',
            borderRadius: 9999,
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Create account
        </Link>

        {/* Secondary CTA */}
        <Link
          to="/login"
          className="text-foreground/80"
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
            textDecoration: 'none',
          }}
        >
          Log in
        </Link>

        {/* Tertiary: continue browsing */}
        <Link
          to="/"
          className="text-foreground/35"
          style={{
            display: 'block',
            paddingTop: 8,
            fontSize: 14,
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
        className="md:hidden flex items-center justify-center min-h-screen bg-background"
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.10)',
            borderTopColor: 'rgba(212,175,55,1)',
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
