import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess, hasSellerAccess } from '../../lib/roleUtils';
import RequireAuth from './RequireAuth';

interface Props {
  children: ReactNode;
}

/**
 * Route guard for buyer-only pages.
 *
 * Access rules:
 *   buyers          → render children
 *   sellers         → redirect to /pp/seller (their own dashboard)
 *   admins          → redirect to /pp/admin  (their own dashboard)
 *   unauthenticated → redirect to /login
 *
 * This ensures strict role separation: sellers and admins are never shown
 * buyer-only pages; they are sent to their correct dashboard instead.
 */
export default function RequireBuyer({ children }: Props) {
  const { user, isLoading } = useAuthStore();

  return (
    <RequireAuth>
      {!isLoading && user && hasAdminAccess(user) ? (
        <Navigate to="/pp/admin" replace />
      ) : !isLoading && user && hasSellerAccess(user) ? (
        <Navigate to="/pp/seller" replace />
      ) : (
        <>{children}</>
      )}
    </RequireAuth>
  );
}
