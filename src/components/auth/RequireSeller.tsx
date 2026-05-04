import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasSellerAccess, hasAdminAccess } from '../../lib/roleUtils';
import { authorizedFetch } from '../../lib/authorizedFetch';

interface Props {
  children: ReactNode;
}

type FetchState = 'loading' | 'active' | 'draft' | 'submitted' | 'suspended' | 'error';

const CardShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
    <div className="rounded-xl p-10 max-w-md w-full text-center" style={{ background: "linear-gradient(145deg, #0B1220, #0F172A)", border: "1px solid rgba(255,255,255,0.05)" }}>
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
 *   draft/submitted → redirect to /onboarding (complete setup first)
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
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!isLoading && !user) {
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  // Seed the initial state from the auth-store cache so active/suspended
  // sellers never see the spinner on the first render after a navigation.
  const [fetchState, setFetchState] = useState<FetchState>(() => {
    if (!user) return 'loading';
    if (hasAdminAccess(user)) return 'active';
    // An active seller (role=seller, isActive=true) gets dashboard access unless
    // explicitly suspended at the seller-profile level.
    if (user.role === 'seller' && user.isActive && user.sellerStatus !== 'suspended') return 'active';
    const cached = user.sellerStatus;
    if (cached === 'active' || cached === 'suspended') return cached;
    return 'loading';
  });

  useEffect(() => {
    // Only run the seller status check for actual seller accounts.
    if (!user || user.role !== 'seller') return;
    if (hasAdminAccess(user ?? null)) {
      setFetchState('active');
      return;
    }

    // Only run the seller status check for users with the 'seller' role.
    if (!user || !hasSellerAccess(user)) return;

    // Active sellers (isActive=true) get access unless explicitly suspended.
    // We do not gate on profile completion or Stripe Connect status here.
    if (user.isActive && user.sellerStatus !== 'suspended') {
      setFetchState('active');
      return;
    }

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

      let dbStatus: FetchState = 'draft';

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
          .maybeSingle<{ sellerStatus: string }>();

        if (cancelled) return;

        if (error) {
          // DB query failed (network/RLS/transient error). Don't show the error
          // screen yet — fall through to recheck-activation, which uses the
          // service role and can verify status independently. If that also fails
          // the guard will redirect to /onboarding (safe default).
          console.warn('RequireSeller: seller_profiles query failed, trying recheck', error.message);
          // dbStatus stays 'draft' — recheck will override it if successful.
        } else {
          // null means no seller_profiles row yet — treat as 'draft' so the
          // seller is directed to complete their setup rather than seeing an error.
          dbStatus = ((data?.sellerStatus) ?? 'draft') as FetchState;

          // Active or suspended from DB — use it directly, no recheck needed.
          if (dbStatus === 'active' || dbStatus === 'suspended') {
            setFetchState(dbStatus);
            return;
          }
        }
      }

      // Step 2: Status is draft or submitted — the DB value may be stale.
      // Call recheck-activation to re-evaluate all conditions server-side.
      try {
        const res = await authorizedFetch('/.netlify/functions/recheck-activation', {
          method: 'POST',
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
    <>
      {/* While the seller status async check is in progress, show a neutral spinner.
          This prevents dashboard content from flashing briefly before a redirect to
          /onboarding fires when the seller's status is draft or submitted. */}
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800" />
        </div>
      ) : !user ? null : user && !hasSellerAccess(user) && !hasAdminAccess(user) ? (
        /* Not a seller and not admin — show account-type prompt */
        <CardShell>
          <p className="text-5xl mb-4">🏪</p>
          <h2 className="text-2xl font-bold text-white mb-2">Seller Account Required</h2>
          <p className="text-slate-400 mb-6">
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
          <h2 className="text-2xl font-bold text-white mb-2">Seller Account Suspended</h2>
          <p className="text-slate-400 mb-6">
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
      ) : fetchState === 'draft' ? (
        /* Draft: setup incomplete — redirect to the seller onboarding wizard */
        <Navigate to="/onboarding" replace />
      ) : fetchState === 'submitted' ? (
        /* Submitted: awaiting admin approval — show a clear pending screen so
           the seller is not confused or looped through onboarding again. */
        <CardShell>
          <p className="text-5xl mb-4">⏳</p>
          <h2 className="text-2xl font-bold text-white mb-2">Application Under Review</h2>
          <p className="text-slate-400 mb-6">
            Your seller application has been submitted and is awaiting approval from the Loadify Market team.
            You will receive an email once your account has been reviewed. This typically takes 1–2 business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/" className="btn-primary">
              Back to Home
            </Link>
            <Link to="/contact" className="btn-secondary">
              Contact Support
            </Link>
          </div>
        </CardShell>
      ) : fetchState === 'error' ? (
        <CardShell>
          <p className="text-5xl mb-4">⚠️</p>
          <h2 className="text-2xl font-bold text-white mb-2">Unable to Verify Access</h2>
          <p className="text-slate-400 mb-6">
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
    </>
  );
}
