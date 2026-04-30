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
    // Listen for the PASSWORD_RECOVERY event that Supabase fires when a user
    // arrives via the reset-password email link (the token is in the URL hash).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setHasSession(true);
        setSessionChecking(false);
      }
    });

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // Fallback: user may already have an active session (e.g. still logged in)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasSession(true);
        setSessionChecking(false);
      } else {
        // Don't show the error immediately — wait for the auth state change
        // event which fires shortly after mount when the hash token is processed.
        timeoutId = setTimeout(() => {
          setSessionChecking((checking) => {
            if (checking) {
              setError("This password reset link is invalid or has expired. Please request a new one.");
            }
            return false;
          });
        }, PASSWORD_RECOVERY_WAIT_MS);
      }
    }).catch(() => {
      setError("Failed to verify reset link. Please try again.");
      setSessionChecking(false);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
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

  const headerHeight = "calc(7.625rem + env(safe-area-inset-top, 0px))";

  return (
    <div className="flex bg-[#020617]" style={{ minHeight: `calc(100vh - ${headerHeight})`, marginTop: headerHeight }}>
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
      <div className="flex-1 lg:w-[35%] xl:w-[33%] flex flex-col bg-[#020617]" style={{ minHeight: `calc(100vh - ${headerHeight})` }}>
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full">
            <div className="rounded-2xl p-7 sm:p-8 space-y-6" style={{ background: "linear-gradient(145deg, #0B1220, #0F172A)", border: "1px solid rgba(255,255,255,0.08)" }}>

              {sessionChecking ? (
                <div className="flex items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FBBF24]"></div>
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
                          className="h-11 pl-10 pr-10 bg-[#0F172A] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[#FBBF24]/25 focus-visible:border-[#FBBF24]"
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
                          className="h-11 pl-10 pr-10 bg-[#0F172A] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[#FBBF24]/25 focus-visible:border-[#FBBF24]"
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
                      <p className="text-sm text-red-400">{error}</p>
                    )}

                    <Button type="submit" disabled={loading || !hasSession} className="w-full h-11 bg-gradient-hero text-primary-foreground font-semibold">
                      {loading ? "Resetting…" : "Reset Password"}
                    </Button>
                  </form>
                </>
              ) : (
                <div className="space-y-4 text-center py-2">
                  <div className="flex justify-center">
                    <div className="h-16 w-16 rounded-full bg-[#FBBF24]/10 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-[#FBBF24]" />
                    </div>
                  </div>
                  <h1 className="text-[22px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>Password updated</h1>
                  <p className="text-slate-400 text-sm">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                  <Link to="/login">
                    <Button className="w-full h-11 bg-gradient-hero text-primary-foreground font-semibold mt-2">
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
