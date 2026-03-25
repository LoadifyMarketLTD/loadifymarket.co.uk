import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess, hasSellerAccess } from '../../lib/roleUtils';
import RequireAuth from './RequireAuth';

interface Props {
  children: ReactNode;
}

type FetchState = 'loading' | 'active' | 'draft' | 'submitted' | 'suspended' | 'error';

const CardShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
    <div className="bg-white border border-gray-200 rounded-xl p-10 max-w-md w-full text-center">
      {children}
    </div>
  </div>
);

/**
 * Route guard for seller-only pages.
 *
 * Access rules:
 *   active sellers   → render children
 *   draft/submitted  → redirect to /seller/setup (complete setup first)
 *   suspended        → show suspension notice (no redirect)
 *   non-sellers      → show "seller account required" prompt
 *   unauthenticated  → redirect to /login
 *   admins/owners    → bypass seller status check (full access)
 */
export default function RequireSeller({ children }: Props) {
  const { user, isLoading } = useAuthStore();
  const [fetchState, setFetchState] = useState<FetchState>('loading');

  useEffect(() => {
    if (!user || user.role !== 'seller') return;
    // Admins/owners bypass the seller status check entirely.
    if (hasAdminAccess(user)) {
      setFetchState('active');
      return;
    }
    let cancelled = false;
    import('../../lib/supabase')
      .then(({ supabase }) =>
        Promise.resolve(
          supabase
            .from('seller_profiles')
            .select('sellerStatus')
            .eq('userId', user.id)
            .single<{ sellerStatus: string }>(),
        ),
      )
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn('RequireSeller: failed to fetch sellerStatus', error.message);
          setFetchState('error');
          return;
        }
        const status = (data?.sellerStatus ?? 'draft') as FetchState;
        setFetchState(status === 'active' ? 'active' : status);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('RequireSeller: unexpected error', err);
        setFetchState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sellerFetchInProgress =
    user?.role === 'seller' && !hasAdminAccess(user) && fetchState === 'loading';
  const loading = isLoading || sellerFetchInProgress;

  return (
    <RequireAuth>
      {/* Not a seller (or admin/owner who bypasses) — show account-type prompt */}
      {!loading && user && !hasSellerAccess(user) ? (
        <CardShell>
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
        </CardShell>
      ) : !loading && fetchState === 'suspended' ? (
        /* Suspended — show notice, do not redirect */
        <CardShell>
          <p className="text-5xl mb-4">🚫</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Seller Account Suspended</h2>
          <p className="text-gray-500 mb-6">
            Your seller account has been suspended. Please contact our support team if you
            believe this is an error.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/contact" className="btn-primary">
              Contact Support
            </Link>
            <Link to="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </CardShell>
      ) : !loading && (fetchState === 'draft' || fetchState === 'submitted') ? (
        /* Setup incomplete — redirect to the seller setup page */
        <Navigate to="/seller/setup" replace />
      ) : !loading && fetchState === 'error' ? (
        <CardShell>
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Verify Access</h2>
          <p className="text-gray-500 mb-6">
            We could not verify your seller account status. Please try refreshing the page or
            contact support if the problem persists.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="btn-primary">
              Refresh
            </button>
            <Link to="/contact" className="btn-secondary">
              Contact Support
            </Link>
          </div>
        </CardShell>
      ) : (
        <>{children}</>
      )}
    </RequireAuth>
  );
}

