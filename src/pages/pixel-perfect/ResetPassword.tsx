import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const ResetPassword = () => {
  // Time to wait for Supabase's PASSWORD_RECOVERY auth event before showing
  // the "invalid link" error. The event fires asynchronously after mount as
  // the SDK processes the hash token in the URL.
  const PASSWORD_RECOVERY_WAIT_MS = 2000;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const clearRecoveryCredentialsFromUrl = () => {
      if (window.location.search || window.location.hash) {
        window.history.replaceState(
          window.history.state,
          document.title,
          '/reset-password',
        );
      }
    };

    const scheduleInvalidLink = () => {
      timeoutId = setTimeout(() => {
        if (cancelled) return;

        setSessionChecking((checking) => {
          if (checking) {
            setError(
              "This password reset link is invalid or has expired. Please request a new one.",
            );
          }

          return false;
        });
      }, PASSWORD_RECOVERY_WAIT_MS);
    };

    // Browser page-load recovery can still arrive through Supabase's normal
    // PASSWORD_RECOVERY event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        event === "PASSWORD_RECOVERY" &&
        session &&
        !cancelled
      ) {
        setHasSession(true);
        setSessionChecking(false);
        clearRecoveryCredentialsFromUrl();
      }
    });

    const completeRecovery = async () => {
      try {
        const currentUrl = new URL(window.location.href);
        const authCode = currentUrl.searchParams.get('code');

        const hashParams = new URLSearchParams(
          currentUrl.hash.replace(/^#/, ''),
        );

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        const recoveryType =
          hashParams.get('type') ??
          currentUrl.searchParams.get('type');

        const hasRecoveryCredentials = Boolean(
          authCode ||
          (
            recoveryType === 'recovery' &&
            accessToken &&
            refreshToken
          ),
        );

        // Capacitor App Links can reach this route after the Supabase client
        // has already initialized. Explicitly consume the recovery credentials
        // instead of relying only on detectSessionInUrl at client startup.
        if (authCode) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(authCode);

          if (exchangeError) {
            const {
              data: { session: alreadyRecovered },
            } = await supabase.auth.getSession();

            if (!alreadyRecovered) {
              throw exchangeError;
            }
          }
        } else if (
          recoveryType === 'recovery' &&
          accessToken &&
          refreshToken
        ) {
          const { error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            throw sessionError;
          }
        }

        const {
          data: { session },
          error: getSessionError,
        } = await supabase.auth.getSession();

        if (getSessionError) {
          throw getSessionError;
        }

        if (cancelled) return;

        if (session) {
          setHasSession(true);
          setSessionChecking(false);

          if (hasRecoveryCredentials) {
            clearRecoveryCredentialsFromUrl();
          }

          return;
        }

        scheduleInvalidLink();
      } catch (recoveryError) {
        console.error(
          '[ResetPassword] Recovery session verification failed:',
          recoveryError,
        );

        if (!cancelled) {
          setError(
            "Failed to verify reset link. Please request a new one.",
          );
          setSessionChecking(false);
        }
      }
    };

    void completeRecovery();

    return () => {
      cancelled = true;
      subscription.unsubscribe();

      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSubmitted(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  // Uses --header-h CSS variable (6.875rem on mobile, 7.625rem on md+) so the
  // page content starts directly below the global Header on every screen size.
  const headerHeight = "calc(var(--header-h, 6.875rem) + env(safe-area-inset-top, 0px))";

  return (
    <div className="flex bg-background" style={{ minHeight: `calc(100vh - ${headerHeight})`, marginTop: headerHeight }}>
      {/* Left — hero image (desktop only) */}
      <div className="hidden lg:flex lg:w-[65%] xl:w-[67%] relative overflow-hidden">
        <img
          src="/hero-marketplace.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>

      {/* Right — form panel */}
      <div className="flex-1 lg:w-[35%] xl:w-[33%] flex flex-col bg-background" style={{ minHeight: `calc(100vh - ${headerHeight})` }}>
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full">
            <div className="rounded-2xl p-7 sm:p-8 space-y-6" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>

              {sessionChecking ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                </div>
              ) : !submitted ? (
                <>
                  <div className="space-y-1.5">
                    <h1 className="text-[22px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>Set new password</h1>
                    <p className="text-slate-400 text-sm">Choose a strong password with at least 8 characters.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="password" className="block text-[13px] font-medium text-slate-300">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pl-10 pr-10 bg-elevated border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-primary/25 focus-visible:border-primary"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="confirm-password" className="block text-[13px] font-medium text-slate-300">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="confirm-password"
                          type={showConfirm ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pl-10 pr-10 bg-elevated border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-primary/25 focus-visible:border-primary"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm(!showConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-danger">{error}</p>
                    )}

                    <Button type="submit" disabled={loading || !hasSession} className="w-full h-11 bg-primary hover:bg-primary-hover text-black font-semibold">
                      {loading ? "Resetting…" : "Reset Password"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h1 className="text-[22px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>Password updated</h1>
                  <p className="text-slate-400 text-sm">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                  <Link to="/login">
                    <Button className="w-full h-11 bg-primary hover:bg-primary-hover text-black font-semibold mt-2">
                      Sign In
                    </Button>
                  </Link>
                </div>
              )}

              {!sessionChecking && !submitted && (
                <div className="text-center pt-1">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
