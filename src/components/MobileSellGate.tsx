/**
 * MobileSellGate — entry gate for the /sell shortcut.
 *
 * Guests keep a mobile-friendly seller CTA. Authenticated Marketplace Sellers
 * are redirected to the canonical seller product editor so mobile and desktop
 * use one publication, image, stock, shipping and validation contract.
 *
 * The canonical /seller/products/new route remains protected by RequireSeller
 * + RequireEmailVerified, so suspension/onboarding/catalogue guards continue to
 * be enforced in one place instead of being reimplemented here.
 */

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useAuthPromptStore } from '@/store/authPromptStore';
import { hasAdminAccess, hasSellerAccess } from '@/lib/roleUtils';
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
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }} className="text-foreground">
          Create an account to sell
        </h2>
        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }} className="text-foreground/55">
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
          Create seller account
        </Link>

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
            border: '1.5px solid rgba(10,35,79,0.18)',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Log in
        </Link>

        <Link
          to="/"
          className="text-foreground/45"
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

function SellerAccessRequiredScreen() {
  return (
    <div
      className="md:hidden min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        className="bg-primary/10 flex items-center justify-center"
        style={{ width: 80, height: 80, borderRadius: '50%', fontSize: 36 }}
        aria-hidden="true"
      >
        🏪
      </div>
      <div style={{ maxWidth: 320 }}>
        <h2 className="text-foreground" style={{ fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
          Seller access required
        </h2>
        <p className="text-foreground/55" style={{ fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Add Marketplace Seller access to this account before creating listings.
        </p>
      </div>
      <Link
        to="/register?type=seller"
        className="text-surface bg-primary"
        style={{
          display: 'block',
          width: '100%',
          maxWidth: 320,
          height: 50,
          lineHeight: '50px',
          textAlign: 'center',
          borderRadius: 9999,
          fontSize: 15,
          fontWeight: 700,
          textDecoration: 'none',
        }}
      >
        Become a seller
      </Link>
      <Link to="/profile" className="text-foreground/55" style={{ fontSize: 14, textDecoration: 'none' }}>
        Back to profile
      </Link>
    </div>
  );
}

export default function MobileSellGate({ children }: { children: ReactNode }) {
  void children;
  const { user, isLoading } = useAuthStore();
  const { open: promptAuth } = useAuthPromptStore();

  useEffect(() => {
    if (!isLoading && !user) {
      promptAuth('sell');
    }
  }, [isLoading, user, promptAuth]);

  if (isLoading) {
    return (
      <div className="md:hidden flex items-center justify-center min-h-screen bg-background">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '3px solid rgba(10,35,79,0.10)',
            borderTopColor: 'rgba(245,163,0,1)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  if (!user) {
    return <GuestSellScreen />;
  }

  if (user.isActive !== true) {
    return <Navigate to="/login?error=account_inactive" replace />;
  }

  if (!hasSellerAccess(user) && !hasAdminAccess(user)) {
    return <SellerAccessRequiredScreen />;
  }

  // The canonical editor route owns Seller status, onboarding/catalogue
  // exceptions, listing locks, image optimisation, publication and tax/payment
  // separation. Do not duplicate those contracts in a mobile-only wizard.
  return (
    <RequireEmailVerified>
      <Navigate to="/seller/products/new" replace />
    </RequireEmailVerified>
  );
}
