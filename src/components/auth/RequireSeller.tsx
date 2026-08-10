import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasSellerAccess, hasAdminAccess, isActiveSellerAccess } from '../../lib/roleUtils';
import { authorizedFetch } from '../../lib/authorizedFetch';
import { supabase } from '../../lib/supabase';

interface Props {
  children: ReactNode;
}

type FetchState = 'loading' | 'active' | 'draft' | 'submitted' | 'suspended' | 'error';

const CardShell = ({ children }: { children: ReactNode }) => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4">
    <div className="rounded-xl p-10 max-w-md w-full text-center" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
      {children}
    </div>
  </div>
);

/**
 * Active seller workspace guard.
 *
 * Only sellerStatus === 'active' may enter the seller workspace. A missing
 * status is never treated as active. This is important when auth hydration
 * falls back to session metadata because user_metadata is user-editable.
 * Admin bypass is allowed only through hasAdminAccess(), which itself requires
 * DB-hydrated isAdmin=true.
 */
export default function RequireSeller({ children }: Props) {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  const [fetchState, setFetchState] = useState<FetchState>(() => {
    if (!user) return 'loading';
    if (hasAdminAccess(user)) return 'active';
    if (isActiveSellerAccess(user)) return 'active';
    if (user.sellerStatus === 'suspended') return 'suspended';
    if (user.sellerStatus === 'submitted') return 'submitted';
    if (user.sellerStatus === 'draft') return 'draft';
    return 'loading';
  });

  useEffect(() => {
    if (!user) return;
    if (hasAdminAccess(user)) {
      queueMicrotask(() => setFetchState('active'));
      return;
    }
    if (!hasSellerAccess(user)) return;

    if (isActiveSellerAccess(user)) {
      queueMicrotask(() => setFetchState('active'));
      return;
    }
    if (user.sellerStatus === 'suspended') {
      queueMicrotask(() => setFetchState('suspended'));
      return;
    }

    let cancelled = false;

    const verifySeller = async () => {
      // Always resolve missing/draft/submitted state against the canonical DB.
      // This prevents session metadata from being enough to unlock the workspace.
      const { data, error } = await supabase
        .from('seller_profiles')
        .select('sellerStatus')
        .eq('userId', user.id)
        .maybeSingle<{ sellerStatus: string | null }>();

      if (cancelled) return;
      if (!error) {
        const dbStatus = data?.sellerStatus;
        if (dbStatus === 'active' || dbStatus === 'suspended') {
          setFetchState(dbStatus);
          return;
        }
      } else {
        console.warn('RequireSeller: seller status query failed; using server recheck', error.message);
      }

      // Server recheck uses service-role-backed canonical activation conditions.
      try {
        const response = await authorizedFetch('/.netlify/functions/recheck-activation', { method: 'POST' });
        if (response.ok) {
          const result = await response.json() as { sellerStatus?: string };
          if (cancelled) return;
          if (
            result.sellerStatus === 'active' ||
            result.sellerStatus === 'draft' ||
            result.sellerStatus === 'submitted' ||
            result.sellerStatus === 'suspended'
          ) {
            setFetchState(result.sellerStatus);
            return;
          }
        }
      } catch (err) {
        console.warn('RequireSeller: recheck-activation failed', err);
      }

      if (cancelled) return;
      if (data?.sellerStatus === 'submitted') setFetchState('submitted');
      else if (data?.sellerStatus === 'suspended') setFetchState('suspended');
      else setFetchState('draft');
    };

    void verifySeller().catch((err: unknown) => {
      if (!cancelled) {
        console.warn('RequireSeller: unexpected verification error', err);
        setFetchState('error');
      }
    });

    return () => { cancelled = true; };
  }, [user]);

  const loading = isLoading || (user?.role === 'seller' && fetchState === 'loading');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800" />
      </div>
    );
  }
  if (!user) return null;

  if (!hasSellerAccess(user) && !hasAdminAccess(user)) {
    return (
      <CardShell>
        <p className="text-5xl mb-4">🏪</p>
        <h2 className="text-2xl font-bold text-white mb-2">Seller Account Required</h2>
        <p className="text-slate-400 mb-6">You need a seller account to access this page.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/signup?type=seller" className="btn-primary">Create Seller Account</Link>
          <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
        </div>
      </CardShell>
    );
  }

  if (fetchState === 'suspended') {
    return (
      <CardShell>
        <p className="text-5xl mb-4">🚫</p>
        <h2 className="text-2xl font-bold text-white mb-2">Seller Account Suspended</h2>
        <p className="text-slate-400 mb-6">Your seller account has been suspended. Please contact support if you believe this is an error.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/contact" className="btn-primary">Contact Support</Link>
          <Link to="/" className="btn-secondary">Back to Home</Link>
        </div>
      </CardShell>
    );
  }

  if (fetchState === 'draft') return <Navigate to="/onboarding" replace />;

  if (fetchState === 'submitted') {
    return (
      <CardShell>
        <p className="text-5xl mb-4">⏳</p>
        <h2 className="text-2xl font-bold text-white mb-2">Application Under Review</h2>
        <p className="text-slate-400 mb-6">Your seller application has been submitted and is awaiting approval.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="btn-primary">Back to Home</Link>
          <Link to="/contact" className="btn-secondary">Contact Support</Link>
        </div>
      </CardShell>
    );
  }

  if (fetchState === 'error') {
    return (
      <CardShell>
        <p className="text-5xl mb-4">⚠️</p>
        <h2 className="text-2xl font-bold text-white mb-2">Unable to Verify Access</h2>
        <p className="text-slate-400 mb-6">We could not verify your seller status. Please refresh or contact support.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => window.location.reload()} className="btn-primary">Refresh</button>
          <Link to="/contact" className="btn-secondary">Contact Support</Link>
        </div>
      </CardShell>
    );
  }

  return <>{children}</>;
}
