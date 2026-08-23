import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess } from '../../lib/roleUtils';
import RequireAuth from './RequireAuth';

interface Props {
  children: ReactNode;
}

/**
 * Route guard that requires admin or owner role.
 * Unauthenticated users are redirected to /login.
 * Authenticated non-admin users see a 403 message instead of the page.
 */
export default function RequireAdmin({ children }: Props) {
  const { user, isLoading } = useAuthStore();

  return (
    <RequireAuth>
      {!isLoading && user && !hasAdminAccess(user) ? (
        <div className="min-h-screen bg-jet flex items-center justify-center px-4">
          <div className="card-glass max-w-md w-full text-center p-10">
            <p className="text-5xl mb-4">🚫</p>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-white/60 mb-6">
              You need admin privileges to view this page.
            </p>
            <Link to="/dashboard" className="btn-primary">
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        <>{children}</>
      )}
    </RequireAuth>
  );
}
