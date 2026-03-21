import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasSellerAccess } from '../../lib/roleUtils';
import RequireAuth from './RequireAuth';

interface Props {
  children: ReactNode;
}

/**
 * Route guard that requires seller, admin, or owner role.
 * Unauthenticated users are redirected to /login.
 * Authenticated buyers see a prompt to register as a seller instead.
 */
export default function RequireSeller({ children }: Props) {
  const { user, isLoading } = useAuthStore();

  return (
    <RequireAuth>
      {!isLoading && user && !hasSellerAccess(user) ? (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
          <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-md w-full text-center">
            <p className="text-5xl mb-4">🏪</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Seller Account Required</h2>
            <p className="text-gray-500 mb-6">
              You need a seller account to access this page. Register as a seller to start
              listing products on Loadify Market.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register?type=seller" className="btn-primary">
                Register as Seller
              </Link>
              <Link to="/dashboard" className="btn-secondary">
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>{children}</>
      )}
    </RequireAuth>
  );
}
