import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess } from '../../lib/roleUtils';

interface Props {
  children: ReactNode;
}

/**
 * Route guard for seller onboarding pages (setup, profile edit).
 * Allows any user with the seller role regardless of activation status,
 * plus admins for inspection. Buyers and unauthenticated users are blocked.
 *
 * Use this guard (not RequireSeller) for:
 *   - /seller/setup  — draft/submitted sellers must complete onboarding here
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

  // Any seller (draft, submitted, active, suspended) can access onboarding pages
  if (user.role === 'seller') return <>{children}</>;

  // Buyer or any other authenticated non-seller — show access denied
  return (
    <div className="min-h-screen bg-slate-950/20 backdrop-blur-[1px] flex items-center justify-center px-4">
      <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-md w-full text-center">
        <p className="text-5xl mb-4">🏪</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Seller Account Required</h2>
        <p className="text-gray-500 mb-6">
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
