/**
 * AuthCallbackPage — handles the OAuth redirect from Supabase after social login.
 *
 * Web redirects can be auto-detected by supabase-js during client startup, but
 * Capacitor App Links resume an already-running WebView. In that case the auth
 * callback URL is delivered to the app after the Supabase client has already
 * initialized, so we must explicitly recover the session from the callback.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import SEO from '@/components/SEO';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const completeOAuth = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const authCode = currentUrl.searchParams.get('code');
        const hashParams = new URLSearchParams(currentUrl.hash.replace(/^#/, ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCode);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?error=oauth_failed', { replace: true });
        }
      } catch (error) {
        console.error('[Auth] OAuth callback session recovery failed:', error);
        if (!cancelled) {
          navigate('/login?error=oauth_failed', { replace: true });
        }
      }
    };

    void completeOAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <>
      <SEO
        title="Signing In"
        description="Completing sign-in."
        robots="noindex, nofollow"
      />
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="mt-4 text-slate-400 text-sm">Completing sign-in…</p>
        </div>
      </div>
    </>
  );
}
