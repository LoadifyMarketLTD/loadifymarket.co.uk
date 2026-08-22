import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess, hasBuyerAccess } from '../../lib/roleUtils';

interface Props {
  children: ReactNode;
}

/**
 * Buyer Space guard.
 *
 * Stage 2 identity contract: ordinary Marketplace Sellers keep Buyer capability
 * under the same Loadify identity. Admin remains isolated in Operations.
 *
 * Access rules:
 *   buyer            → render children
 *   seller           → render children (Buyer capability retained)
 *   admin            → redirect /admin
 *   unauthenticated  → redirect /login
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

  if (hasAdminAccess(user)) return <Navigate to="/admin" replace />;

  if (hasBuyerAccess(user)) return <>{children}</>;

  return <Navigate to="/login" replace />;
}
