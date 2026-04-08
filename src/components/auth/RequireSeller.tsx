import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasSellerAccess, hasAdminAccess } from '../../lib/roleUtils';
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
 *   admins         → bypass all seller checks (full access)
 *   active sellers → render children
 *   draft/submitted → redirect to /seller/setup (complete setup first)
 *   suspended       → show suspension notice (no redirect)
 *   non-sellers     → show "seller account required" prompt
 *   unauthenticated → redirect to /login
 *
 * Fast-path: if the user's sellerStatus is already cached in the auth store
 * (populated at login time by App.tsx), active/suspended sellers skip the DB
 * round-trip entirely — no spinner on subsequent page navigations.
 *
 * Slow-path: if the cached status is draft/submitted (or missing), the guard
 * calls recheck-activation to re-evaluate all conditions server-side in case
 * the seller just completed their setup and the DB value is stale.
 */
export default function RequireSeller({ children }: Props) {
  const { user, isLoading } = useAuthStore();

  // Seed the initial state from the auth-store cache so active/suspended
  // sellers never see the spinner on the first render after a navigation.
  const [fetchState, setFetchState] = useState<FetchState>(() => {
    if (!user) return 'loading';
    if (hasAdminAccess(user)) return 'active';
    const cached = user.sellerStatus;
    if (cached === 'active' || cached === 'suspended') return cached;
    return 'loading';
  });

  useEffect(() => {
    // Only run the seller status check for actual seller accounts.
    // Admins/owners bypass via hasSellerAccess in the render tree below.
    if (!user || user.role !== 'seller') return;
    // Admins bypass all seller checks — no DB status lookup needed.
    if (hasAdminAccess(user ?? null)) {
      setFetchState('active');
      return;
    }

    // Only run the seller status check for users with the 'seller' role.
    if (!user || !hasSellerAccess(user)) return;

    // Fast path: if sellerStatus is already cached in the auth store as a
    // deterministic value, use it immediately — no DB round-trip needed.
    const cached = user.sellerStatus;
    if (cached === 'active' || cached === 'suspended') {
      setFetchState(cached);
      return;
    }

    let cancelled = false;

    const checkStatus = async () => {
      const { supabase } = await import('../../lib/supabase');

      let dbStatus: FetchState;

      if (cached === 'draft' || cached === 'submitted') {
        // Status is cached as draft/submitted — skip the DB round-trip and
        // jump straight to the recheck-activation call.
        dbStatus = cached;
      } else {
        // Step 1: Read the persisted sellerStatus from the DB (cache miss).
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

        dbStatus = (data?.sellerStatus ?? 'draft') as FetchState;

        // Active or suspended from DB — use it directly, no recheck needed.
        if (dbStatus === 'active' || dbStatus === 'suspended') {
          setFetchState(dbStatus);
          return;
        }
      }

      // Step 2: Status is draft or submitted — the DB value may be stale.
      // Call recheck-activation to re-evaluate all conditions server-side.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const res = await fetch('/.netlify/functions/recheck-activation', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const recheckData = await res.json() as { sellerStatus?: string };
            if (cancelled) return;
            const recheckStatus = recheckData.sellerStatus as FetchState | undefined;
            if (recheckStatus) {
              setFetchState(recheckStatus);
              return;
            }
          }
        }
      } catch (err) {
        // Non-fatal — fall through and use the DB status.
        console.warn('RequireSeller: recheck-activation failed (non-fatal)', err);
      }

      if (cancelled) return;
      // Fall back to the DB/cached status if the recheck did not return a value.
      setFetchState(dbStatus);
    };

    checkStatus().catch((err: unknown) => {
      if (!cancelled) {
        console.warn('RequireSeller: unexpected error', err);
        setFetchState('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const sellerFetchInProgress =
    user?.role === 'seller' && fetchState === 'loading';
  const loading = isLoading || sellerFetchInProgress;

  return (
    <RequireAuth>
      {/* While the seller status async check is in progress, show a neutral spinner.
          This prevents dashboard content from flashing briefly before a redirect to
          /seller/setup fires when the seller's status is draft or submitted. */}
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800" />
        </div>
      ) : user && !hasSellerAccess(user) && !hasAdminAccess(user) ? (
        /* Not a seller and not admin — show account-type prompt */
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
      ) : fetchState === 'suspended' ? (
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
      ) : fetchState === 'draft' || fetchState === 'submitted' ? (
        /* Setup incomplete — redirect to the seller setup page */
        <Navigate to="/seller/setup" replace />
      ) : fetchState === 'error' ? (
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

