/**
 * AuthCallbackPage — handles the OAuth redirect from Supabase after Google login.
 *
 * The browser is sent here by Supabase after the user completes Google sign-in.
 * Supabase sets the session tokens in the URL hash/fragment.  We call
 * getSession() so the client picks them up from the URL, then redirect to
 * /dashboard where the role-aware redirect takes over.
 *
 * For the Capacitor APK the deep-link scheme is caught by the Android intent
 * filter (see capacitor.config.ts → allowNavigation).  The @capacitor/app
 * "appUrlOpen" event fires, which triggers supabase.auth.signInWithOAuth
 * session recovery via the standard onAuthStateChange listener in App.tsx.
 * This component therefore also works correctly in the APK.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Allow Supabase to detect and apply the session from the URL hash.
    // getSession() triggers the detectSessionInUrl logic configured in supabase.ts.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Authenticated — the onAuthStateChange listener in App.tsx will fetch
        // the full profile row and populate the Zustand store. Navigate to
        // /dashboard so the role-aware redirect sends the user to the right hub.
        navigate('/dashboard', { replace: true });
      } else {
        // No session detected — send to login so the user can try again.
        navigate('/login?error=oauth_failed', { replace: true });
      }
    });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#020617]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#C99A3E]" />
        <p className="mt-4 text-slate-400 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}
