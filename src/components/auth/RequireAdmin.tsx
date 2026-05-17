import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { hasAdminAccess } from '../../lib/roleUtils';

interface Props {
  children: ReactNode;
}

/**
 * Route guard that requires the admin role.
 * Self-contained: handles unauthenticated redirect, loading state, and access denial
 * without wrapping RequireAuth.
 *
 * Access rules:
 *   admin       → render children
 *   non-admin   → 403 message
 *   unauthenticated → redirect to /login with return URL
 */
export default function RequireAdmin({ children }: Props) {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800" />
      </div>
    );
  }

  if (!user) return null;

  if (!hasAdminAccess(user)) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center px-4">
        <div className="rounded-xl p-10 max-w-md w-full text-center" style={{ background: "linear-gradient(145deg, #121A2B, #182235)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <p className="text-5xl mb-4">🚫</p>
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400 mb-6">
            You need admin privileges to view this page.
          </p>
          <Link to="/dashboard" className="btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
