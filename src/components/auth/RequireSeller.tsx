import type { ReactNode } from 'react';
import { useState, useEffect, useRef } from 'react';
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
 *
 * When the seller's stored status is 'submitted', this guard attempts an
 * activation check (via the connect-status Netlify function) in case the
 * seller completed all requirements but never revisited the setup page. If
 * the check promotes them to 'active', they proceed immediately without
 * having to navigate to /seller/setup first.
 */
export default function RequireSeller({ children }: Props) {
  const { user, isLoading } = useAuthStore();
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const activationAttempted = useRef(false);

  useEffect(() => {
    if (!user || user.role !== 'seller') return;
    // Admins/owners bypass the seller status check entirely.
    if (hasAdminAccess(user)) {
      setFetchState('active');
      return;
    }
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data, error } = await supabase
          .from('seller_profiles')
          .select('sellerStatus')
          .eq('userId', user.id)
          .single<{ sellerStatus: string }>();

        if (cancelled) return;
        if (error) {
          console.warn('RequireSeller: failed to fetch sellerStatus', error.message);
          setFetchState('error');
          return;
        }

        const status = (data?.sellerStatus ?? 'draft') as FetchState;

        // For sellers who are 'submitted' (profile complete but Stripe not yet
        // confirmed), trigger a live connect-status check. This auto-promotes
        // sellers who completed all requirements but never revisited setup.
        if (status === 'submitted' && !activationAttempted.current) {
          activationAttempted.current = true;
          try {
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;
            if (token) {
              const res = await fetch('/.netlify/functions/connect-status', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok && !cancelled) {
                const result = await res.json() as { sellerStatus?: string };
                if (result.sellerStatus === 'active') {
                  setFetchState('active');
                  return;
                }
              }
            }
          } catch {
            // Non-fatal — fall through to the DB-derived status
          }
        }

        if (!cancelled) {
          setFetchState(status === 'active' ? 'active' : status);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        console.warn('RequireSeller: unexpected error', err);
        setFetchState('error');
      }
    };

    checkStatus();
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

