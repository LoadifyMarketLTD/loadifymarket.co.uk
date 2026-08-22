import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess, hasSellerAccess } from '../../lib/roleUtils';

interface Props {
  children: ReactNode;
}

/**
 * Route guard for seller onboarding pages (profile edit).
 * Allows any user with the seller role regardless of activation status,
 * plus admins for inspection. Buyers and unauthenticated users are blocked.
 *
 * Use this guard (not RequireSeller) for:
 *   - /onboarding  — draft/submitted sellers complete onboarding here
 *   - /seller/profile — sellers can edit their profile at any status
 *
 * Access rules:
 *   admin              → render children (inspection access)
 *   seller (any status) → render children
 *   buyer              → show "seller account required" prompt
 *   unauthenticated    → redirect to /login
 */
export default function RequireSellerAny({ children }: Props) {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800" />
      </div>
    );
  }

  if (!user) return null;

  // Admin can access for inspection
  if (hasAdminAccess(user)) return <>{children}</>;

  // Any Marketplace Seller context can access onboarding/profile surfaces.
  // Keep this boundary aligned with the full Seller Workspace guard.
  if (hasSellerAccess(user)) return <>{children}</>;

  // Buyer or any other authenticated non-seller — show access denied
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="rounded-xl p-10 max-w-md w-full text-center" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-5xl mb-4">🏪</p>
        <h2 className="text-2xl font-bold text-white mb-2">Seller Account Required</h2>
        <p className="text-slate-400 mb-6">
          You need a seller account to access this page. Sign up as a seller to start
          listing products on Loadify Market.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup?type=seller" className="btn-primary">
            Create Seller Account
          </Link>
          <Link to="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
