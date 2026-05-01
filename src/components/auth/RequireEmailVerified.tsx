import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store';
import { Button } from '../ui/button';

interface Props {
  children: ReactNode;
}

/**
 * Route guard: blocks access to any child route until the user has verified
 * their email address (isEmailVerified === true).
 *
 * - Unauthenticated users are not affected (RequireAuth handles them).
 * - Admins bypass the gate to prevent lockout.
 * - Provides a "Resend verification email" button via the existing
 *   /.netlify/functions/resend-verification endpoint.
 */
export default function RequireEmailVerified({ children }: Props) {
  const { user, isLoading } = useAuthStore();
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  // While auth is loading, render nothing (parent handles spinner).
  if (isLoading || !user) return <>{children}</>;

  // Admins bypass — they must always be able to access their dashboard.
  if (user.role === 'admin') return <>{children}</>;

  // If email is already verified, allow access.
  if (user.isEmailVerified) return <>{children}</>;

  // ── Unverified: render the blocking screen ──────────────────────────────────
  const handleResend = async () => {
    setResendState('sending');
    setResendError('');
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        setResendError('You must be signed in to resend the verification email.');
        setResendState('error');
        return;
      }

      // Use the Supabase client directly to resend — this calls the standard
      // Supabase resend confirmation flow so no admin token is needed.
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
      });

      if (error) {
        setResendError(error.message || 'Failed to resend. Please try again.');
        setResendState('error');
      } else {
        setResendState('sent');
      }
    } catch (err) {
      setResendError(err instanceof Error ? err.message : 'Failed to resend verification email.');
      setResendState('error');
    }
  };

  const handleRefresh = async () => {
    try {
      const { supabase } = await import('../../lib/supabase');
      // Refresh the session — Supabase will return an updated token if the user
      // has since confirmed their email (email_confirmed_at will be set).
      const { data } = await supabase.auth.refreshSession();
      if (data.session) {
        // Re-fetch the user profile so the auth store gets the updated
        // isEmailVerified flag without a full page reload.
        const { data: authUser } = await supabase.auth.getUser();
        if (authUser.user?.email_confirmed_at) {
          // Trigger a full reload so App.tsx re-runs its onAuthStateChange
          // listener and re-fetches the user profile from the DB.
          window.location.reload();
          return;
        }
      }
      // Session refresh didn't reveal a confirmed email — tell the user.
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center px-4">
      <div
        className="rounded-xl p-8 sm:p-10 max-w-md w-full text-center"
        style={{
          background: 'linear-gradient(145deg, #0B1220, #0F172A)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 mx-auto mb-5">
          <Mail className="h-8 w-8 text-blue-400" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Verify your email</h2>
        <p className="text-slate-400 text-sm mb-2">
          We sent a confirmation link to:
        </p>
        <p className="text-white font-semibold text-sm mb-5 truncate">{user.email}</p>
        <p className="text-slate-400 text-sm mb-6">
          Click the link in that email to activate your account. Check your spam folder if
          you don't see it within a few minutes.
        </p>

        {/* Resend button */}
        {resendState === 'sent' ? (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 mb-4">
            <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
            <p className="text-green-400 text-sm font-medium">Verification email resent — check your inbox.</p>
          </div>
        ) : (
          <Button
            onClick={handleResend}
            disabled={resendState === 'sending'}
            variant="outline"
            className="w-full mb-3 border-white/10 text-white hover:bg-white/5"
          >
            {resendState === 'sending' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Resend verification email
              </>
            )}
          </Button>
        )}

        {resendState === 'error' && (
          <p className="text-red-400 text-xs mb-3">{resendError}</p>
        )}

        {/* Already confirmed? Refresh session */}
        <Button
          onClick={handleRefresh}
          variant="ghost"
          className="w-full text-slate-400 hover:text-white text-sm mb-4"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          I've confirmed my email — refresh
        </Button>

        <div className="border-t border-white/5 pt-4">
          <p className="text-slate-500 text-xs">
            Wrong email?{' '}
            <Link to="/signup" className="text-[#FBBF24] hover:underline">
              Create a new account
            </Link>{' '}
            or{' '}
            <Link to="/contact" className="text-[#FBBF24] hover:underline">
              contact support
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
