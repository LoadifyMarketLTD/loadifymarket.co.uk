import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store";
import { isCapacitorNative } from "@/lib/capacitorUtils";
import { sanitizeRedirectUrl } from "@/lib/sanitizeRedirectUrl";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";

const GoogleIcon = () => (
  <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
    <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.007 1.792-4.669 4.532-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.49 0-1.955.925-1.955 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
  </svg>
);

const NATIVE_OAUTH_CALLBACK = "loadifymarket://app/auth/callback";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const justRegistered = searchParams.get("registered") === "1";
  const justConfirmed = searchParams.get("confirmed") === "1";
  const oauthFailed = searchParams.get("error") === "oauth_failed";

  useEffect(() => {
    if (!user || user.isActive !== true) return;
    const nextUrl = sanitizeRedirectUrl(searchParams.get("next"));
    navigate(nextUrl ?? "/dashboard", { replace: true });
  }, [user, searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
      const redirectTo = sanitizeRedirectUrl(searchParams.get("next")) ?? "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw || "Login failed. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      if (isCapacitorNative()) {
        const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: NATIVE_OAUTH_CALLBACK, skipBrowserRedirect: true },
        });
        if (oauthErr) throw oauthErr;
        if (data?.url) {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: data.url, windowName: "_self" });
        }
      } else {
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (oauthErr) throw oauthErr;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw || "Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError("");
    setFacebookLoading(true);
    try {
      if (isCapacitorNative()) {
        const { data, error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "facebook",
          options: { redirectTo: NATIVE_OAUTH_CALLBACK, skipBrowserRedirect: true },
        });
        if (oauthErr) throw oauthErr;
        if (data?.url) {
          const { Browser } = await import("@capacitor/browser");
          await Browser.open({ url: data.url, windowName: "_self" });
        }
      } else {
        const { error: oauthErr } = await supabase.auth.signInWithOAuth({
          provider: "facebook",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (oauthErr) throw oauthErr;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw || "Facebook sign-in failed. Please try again.");
      setFacebookLoading(false);
    }
  };

  const headerHeight = "calc(var(--header-h, 6.875rem) + env(safe-area-inset-top, 0px))";

  return (
    <>
      <SEO title="Sign In" description="Sign in to your Loadify Market account." robots="noindex, nofollow" />

      <main
        id="main-content"
        className="bg-[#F7F9FC] px-4 py-8 text-[#0A234F] sm:px-6 lg:px-8"
        style={{ minHeight: `calc(100vh - ${headerHeight})`, marginTop: headerHeight }}
      >
        <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[26px] border border-[#0A234F]/10 bg-white shadow-[0_22px_65px_rgba(10,35,79,0.10)]">
          <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
            <aside className="relative overflow-hidden bg-[#0A234F] px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-12">
              <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#1D57D8]/30 blur-3xl" aria-hidden="true" />
              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">Loadify account</p>
                <h1 className="mt-3 text-3xl font-black leading-[1.03] tracking-[-0.035em] sm:text-4xl">Welcome back to Loadify</h1>
                <p className="mt-4 text-sm font-medium leading-6 text-white/75 sm:text-base">
                  Sign in once to access the Loadify marketplace areas connected to your identity.
                </p>

                <div className="mt-7 space-y-3 text-sm text-white/80">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
                    <span>Buyer and Seller access stays on one secure identity</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
                    <span>Orders, delivery progress and account tools remain connected</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
                    <span>Role-based access sends you to the correct Loadify workspace</span>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                    <ShieldCheck className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
                    Secure account access
                  </div>
                  <p className="mt-3 text-[11px] leading-4 text-white/70">
                    Your account access is governed by the role and permissions already attached to your Loadify identity.
                  </p>
                </div>
              </div>
            </aside>

            <section className="bg-white px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
              {justRegistered && (
                <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  <strong>Check your email</strong> to confirm your account, then sign in below.
                </div>
              )}

              {justConfirmed && (
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <strong>Email confirmed.</strong> You can now sign in to your account.
                </div>
              )}

              {oauthFailed && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  Social sign-in was not completed or failed. Please try again, or sign in with email below.
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0E3FA9]">Account access</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-[#0A234F] sm:text-3xl">Sign in to Loadify</h2>
                </div>
                <Link to="/signup" className="shrink-0 text-xs font-semibold text-[#64748B]">
                  New to Loadify? <span className="font-extrabold text-[#0E3FA9]">Create account</span>
                </Link>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading || facebookLoading || loading}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#0A234F]/12 bg-white text-sm font-bold text-[#0A234F] transition hover:border-[#0E3FA9]/35 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {googleLoading ? "Loading…" : <><GoogleIcon /> Google</>}
                </button>
                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={facebookLoading || googleLoading || loading}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#0A234F]/12 bg-white text-sm font-bold text-[#0A234F] transition hover:border-[#0E3FA9]/35 hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {facebookLoading ? "Loading…" : <><FacebookIcon /> Facebook</>}
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-[#0A234F]/10" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#94A3B8]">or continue with email</span></div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="block text-[13px] font-bold text-[#0A234F]">Email address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#0A234F]/12 bg-white pl-10 pr-3.5 text-sm text-[#0A234F] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0E3FA9] focus:ring-2 focus:ring-[#0E3FA9]/10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-[13px] font-bold text-[#0A234F]">Password</label>
                    <Link to="/forgot-password" className="text-xs font-semibold text-[#0E3FA9] hover:underline">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 w-full rounded-xl border border-[#0A234F]/12 bg-white pl-10 pr-10 text-sm text-[#0A234F] outline-none transition placeholder:text-[#94A3B8] focus:border-[#0E3FA9] focus:ring-2 focus:ring-[#0E3FA9]/10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] transition hover:text-[#0A234F]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-5 text-sm font-extrabold text-[#0A234F] transition hover:bg-[#E69500] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Signing in…" : "Sign in"}
                  {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0E3FA9]" />
                  <span>Secured with 256-bit SSL encryption</span>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default Login;
