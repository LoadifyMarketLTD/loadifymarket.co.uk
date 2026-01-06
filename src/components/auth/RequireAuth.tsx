import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Route guard component that requires authentication.
 * Redirects unauthenticated users to /login with a return URL.
 */
export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Wait for auth check to complete
    if (!isLoading && !user) {
      // Redirect to login with the current path as return URL
      const returnUrl = `${location.pathname}${location.search}`;
      navigate(`/login?next=${encodeURIComponent(returnUrl)}`, { replace: true });
    }
  }, [user, isLoading, navigate, location]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render children
  if (user) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}
