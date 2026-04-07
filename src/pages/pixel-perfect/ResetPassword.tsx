import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/loadify-logo.svg";
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

  return (
    <div className="min-h-screen flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:"radial-gradient(circle,rgba(255,255,255,0.9) 1px,transparent 1px)",backgroundSize:"24px 24px"}} />
        <div className="relative z-10 max-w-md text-center space-y-6">
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logo} alt="Loadify Market" className="h-12 w-12" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-3xl font-bold text-primary-foreground">Loadify</span>
              <span className="font-display text-2xl font-bold text-accent">Market</span>
            </span>
          </div>
          <h2 className="font-display text-2xl font-bold text-primary-foreground">
            The UK Multi-Category Marketplace
          </h2>
          <p className="text-primary-foreground/70 text-lg leading-relaxed">
            A trusted platform connecting buyers and sellers of physical goods across all categories in the UK.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: "Registered Sellers", value: "✓" },
              { label: "Secure Payments", value: "✓" },
              { label: "UK Businesses", value: "✓" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-2xl font-bold text-accent">{stat.value}</div>
                <div className="text-xs text-primary-foreground/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
            <img src={logo} alt="Loadify Market" className="h-9 w-9" />
            <span className="flex flex-col leading-tight">
              <span className="font-display text-xl font-bold text-foreground">Loadify</span>
              <span className="font-display text-base font-bold text-primary">Market</span>
            </span>
          </div>

          {sessionChecking ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : !submitted ? (
            <>
              <div className="space-y-2 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground">Set new password</h1>
                <p className="text-muted-foreground">
                  Choose a strong password with at least 8 characters.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      className="pl-10 pr-10 h-11"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive font-medium">{error}</p>
                )}

                <Button type="submit" disabled={loading || !hasSession} className="w-full h-11 bg-gradient-hero text-primary-foreground font-semibold">
                  {loading ? "Resetting…" : "Reset Password"}
                </Button>
              </form>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground">Password updated</h1>
              <p className="text-muted-foreground">
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
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
