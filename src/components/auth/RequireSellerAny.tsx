import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess, hasSellerAccess } from '../../lib/roleUtils';

interface Props {
  children: ReactNode;
}

/**
 * Seller onboarding/profile guard.
 *
 * Seller access comes from the server-governed Seller capability. Admin
 * privilege is not a substitute for Seller identity or payout capability.
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
  if (user.isActive !== true) {
    return <Navigate to="/login?error=account_inactive" replace />;
  }

  if (hasSellerAccess(user)) return <>{children}</>;

  const isAdminOnly = hasAdminAccess(user);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="rounded-xl p-10 max-w-md w-full text-center" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
        <p className="text-5xl mb-4">??</p>
        <h2 className="text-2xl font-bold text-white mb-2">Seller Access Required</h2>
        <p className="text-slate-400 mb-6">
          {isAdminOnly
            ? 'Administrative authority stays separate from Marketplace Seller identity and payout setup.'
            : 'Enable selling on this Loadify account. Your Buyer access and purchase history stay on the same identity.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isAdminOnly ? (
            <Link to="/admin" className="btn-primary">Back to Admin Hub</Link>
          ) : (
            <Link to="/onboarding/role-selection" className="btn-primary">Enable Selling</Link>
          )}
          <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
