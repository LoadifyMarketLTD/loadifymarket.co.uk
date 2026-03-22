import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess, hasSellerAccess } from '../../lib/roleUtils';
import { supabase } from '../../lib/supabase';
import RequireAuth from './RequireAuth';

interface Props {
  children: ReactNode;
}

/**
 * Route guard that requires seller, admin, or owner role.
 * Unauthenticated users are redirected to /login.
 * Authenticated buyers see a prompt to register as a seller instead.
 * Sellers whose isApproved is false see a "pending approval" notice.
 * Admins and owners bypass the isApproved check entirely.
 *
 * isApproved state: null = not yet fetched (treated as loading for sellers),
 * true = approved, false = pending/rejected.
 */
export default function RequireSeller({ children }: Props) {
  const { user, isLoading } = useAuthStore();
  // null → fetch pending; true/false → result known
  const [isApproved, setIsApproved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'seller') return;
    let cancelled = false;
    supabase
      .from('seller_profiles')
      .select('isApproved')
      .eq('userId', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) setIsApproved(data?.isApproved ?? false);
      });
    return () => { cancelled = true; };
  }, [user]);

  // For seller role: also wait for the profile fetch to complete
  const sellerApprovalPending = user?.role === 'seller' && isApproved === null;
  const loading = isLoading || sellerApprovalPending;

  return (
    <RequireAuth>
      {!loading && user && !hasSellerAccess(user) ? (
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
      ) : !loading && user?.role === 'seller' && !hasAdminAccess(user) && isApproved === false ? (
        <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
          <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-md w-full text-center">
            <p className="text-5xl mb-4">⏳</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-500 mb-6">
              Your seller account is under review. Our team will assess your application and
              notify you by email once it has been approved — usually within 1–2 business days.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/contact" className="btn-primary">
                Contact Support
              </Link>
              <Link to="/" className="btn-secondary">
                Back to Home
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
