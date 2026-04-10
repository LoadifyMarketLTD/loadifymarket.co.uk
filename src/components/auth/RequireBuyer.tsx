import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess, hasSellerAccess, hasBuyerAccess } from '../../lib/roleUtils';

interface Props {
  children: ReactNode;
}

/**
 * Route guard for buyer-only pages.
 * Self-contained: handles unauthenticated redirect, loading state, and role checks
 * without wrapping RequireAuth.
 *
 * Access rules:
 *   buyers          → render children
 *   admins          → redirect to /admin (their own dashboard)
 *   sellers         → redirect to /seller (their own dashboard)
 *   unauthenticated → redirect to /login
 *
 * Admins are redirected to /admin rather than given silent access to the buyer
 * shell — this prevents an admin from seeing "Buyer Hub" as their landing page
 * when role resolution fails upstream and the DashboardRedirect sends them here.
 */
export default function RequireBuyer({ children }: Props) {
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

  // Admin is redirected to their own dashboard — never show "Buyer Hub" to admins
  if (hasAdminAccess(user)) return <Navigate to="/admin" replace />;

  // Seller is redirected to their own dashboard
  if (hasSellerAccess(user)) return <Navigate to="/seller" replace />;

  // Buyer gets full access
  if (hasBuyerAccess(user)) return <>{children}</>;

  // Any other authenticated user (unknown role) → login
  return <Navigate to="/login" replace />;
}
