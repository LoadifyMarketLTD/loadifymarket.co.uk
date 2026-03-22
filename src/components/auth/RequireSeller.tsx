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

type ApprovalState = 'pending' | 'approved' | 'unapproved' | 'error';

const CardShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
    <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-md w-full text-center">
      {children}
    </div>
  </div>
);

/**
 * Route guard that requires seller, admin, or owner role.
 * Unauthenticated users are redirected to /login.
 * Authenticated buyers see a prompt to register as a seller instead.
 * Sellers whose isApproved is false see a "pending approval" notice.
 * Admins and owners bypass the isApproved check entirely.
 *
 * approvalState: 'pending' = fetch in progress, 'approved'/'unapproved'/'error' = result known.
 */
export default function RequireSeller({ children }: Props) {
  const { user, isLoading } = useAuthStore();
  const [approvalState, setApprovalState] = useState<ApprovalState>('pending');

  useEffect(() => {
    if (!user || user.role !== 'seller') return;
    let cancelled = false;
    // Wrap in Promise.resolve to gain a full Promise (Supabase returns PromiseLike).
    Promise.resolve(
      supabase
        .from('seller_profiles')
        .select('isApproved')
        .eq('userId', user.id)
        .single()
    ).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.warn('RequireSeller: failed to fetch approval status', error.message);
        setApprovalState('error');
      } else {
        setApprovalState(data?.isApproved ? 'approved' : 'unapproved');
      }
    }).catch((err: unknown) => {
      if (cancelled) return;
      console.warn('RequireSeller: unexpected error fetching approval status', err);
      setApprovalState('error');
    });
    return () => { cancelled = true; };
  }, [user]);

  // For the seller role: block render until we know the approval state.
  const sellerFetchInProgress = user?.role === 'seller' && approvalState === 'pending';
  const loading = isLoading || sellerFetchInProgress;

  return (
    <RequireAuth>
      {!loading && user && !hasSellerAccess(user) ? (
        <CardShell>
          <p className="text-5xl mb-4">🏪</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Seller Account Required</h2>
          <p className="text-gray-500 mb-6">
            You need a seller account to access this page. Register as a seller to start
            listing products on Loadify Market.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register?type=seller" className="btn-primary">Register as Seller</Link>
            <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
          </div>
        </CardShell>
      ) : !loading && user?.role === 'seller' && !hasAdminAccess(user) && approvalState === 'unapproved' ? (
        <CardShell>
          <p className="text-5xl mb-4">⏳</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
          <p className="text-gray-500 mb-6">
            Your seller account is under review. Our team will assess your application and
            notify you by email once it has been approved — usually within 1–2 business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" className="btn-primary">Contact Support</Link>
            <Link to="/" className="btn-secondary">Back to Home</Link>
          </div>
        </CardShell>
      ) : !loading && user?.role === 'seller' && !hasAdminAccess(user) && approvalState === 'error' ? (
        <CardShell>
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Verify Access</h2>
          <p className="text-gray-500 mb-6">
            We could not verify your seller account status. Please try refreshing the page or
            contact support if the problem persists.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">Refresh</button>
            <Link to="/contact" className="btn-secondary">Contact Support</Link>
          </div>
        </CardShell>
      ) : (
        <>{children}</>
      )}
    </RequireAuth>
  );
}
