import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/store";
import { isApkNative } from "@/lib/apkDiagnostics";

/* ── Shared Google / Apple SVG logos ─────────────────────────────────── */
const GoogleIcon = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  // True when user just registered and needs to confirm email.
  const justRegistered = searchParams.get("registered") === "1";
  // True when user has just confirmed their email via the confirmation link.
  const justConfirmed = searchParams.get("confirmed") === "1";

  useEffect(() => {
    if (user) {
      const nextUrl = searchParams.get("next");
      if (nextUrl) navigate(nextUrl, { replace: true });
      else if (user.role === "seller") navigate("/seller", { replace: true });
      else if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "buyer") navigate("/buyer", { replace: true });
      // For any other/unknown role value, do not navigate — wait for the
      // Zustand store to receive a corrected profile from the DB query.
    }
  }, [user, searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // TEMPORARY mobile diagnostics — active on both the native APK and any
    // mobile browser (phone/tablet user-agent).  Uses console.warn so terser
    // does not strip these calls.  Remove once the mobile auth issue is fixed.
    const _apkDiag = isApkNative();
    const _mobileDiag = _apkDiag || /Mobi|Android|iPhone|iPad|iPod/i.test(
      typeof navigator !== 'undefined' ? navigator.userAgent : ''
    );

    if (_mobileDiag) {
      try {
        // localStorage writability
        let lsWritable = false;
        try {
          localStorage.setItem('__lm_check', '1');
          localStorage.removeItem('__lm_check');
          lsWritable = true;
        } catch { /* blocked */ }

        // service worker presence
        let swState = 'unsupported';
        try {
          const swReg = await navigator.serviceWorker?.getRegistration?.();
          swState = swReg?.active?.state ?? (swReg ? 'registered-no-active' : 'none');
        } catch { swState = 'error'; }

        const supabaseDomain = (() => {
          try { return new URL((import.meta.env.VITE_SUPABASE_URL ?? '').trim()).hostname; }
          catch { return '(invalid-url)'; }
        })();

        console.warn(
          '[Login] handleSubmit START',
          `platform: ${_apkDiag ? 'APK-native' : 'mobile-browser'}`,
          `ua: ${navigator.userAgent.slice(0, 80)}`,
          `window.fetch type: ${typeof window?.fetch}`,
          `fetch is patched: ${window?.fetch?.name === 'apkDiagFetch'}`,
          `localStorage writable: ${lsWritable}`,
          `serviceWorker state: ${swState}`,
          `supabase domain: ${supabaseDomain}`,
          `build: ${(import.meta.env.VITE_BUILD_SHA ?? 'local').slice(0, 7)} #${import.meta.env.VITE_BUILD_NUMBER ?? '0'}`,
        );
      } catch { /* ignore diagnostic errors */ }
    }

    try {
      const { supabase } = await import("@/lib/supabase");

      if (_mobileDiag) {
        console.warn('[Login] calling supabase.auth.signInWithPassword');
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

      if (_mobileDiag) {
        try {
          console.warn(
            '[Login] signInWithPassword returned',
            `user: ${data?.user?.id ?? 'null'}`,
            `session: ${data?.session ? 'present' : 'null'}`,
            `error: ${authError?.message ?? 'none'}`,
          );
        } catch { /* ignore */ }
      }

      if (authError) throw authError;

      // After a successful sign-in, navigate immediately without making extra
      // DB round-trips.  App.tsx's onAuthStateChange listener already:
      //   • checks isActive and signs out suspended users
      //   • fetches the full user profile (role, seller status, etc.)
      //   • populates the Zustand store
      // DashboardRedirect at /dashboard waits for isLoading=false and then
      // routes to the correct role-based hub (/buyer, /seller, /admin).
      // Removing the redundant isActive + role queries here fixes the
      // "Signing in…" stall on slow mobile networks where those queries hang.
      const nextUrl = searchParams.get("next");
      const redirectTo = nextUrl ?? "/dashboard";

      if (_mobileDiag) {
        try {
          console.warn('[Login] navigating to:', redirectTo);
        } catch { /* ignore */ }
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      // TEMPORARY mobile diagnostics — active for APK and mobile browsers.
      // Remove once root cause is confirmed.
      if (_mobileDiag) {
        try {
          const name = err instanceof Error ? err.name : 'UnknownError';
          const msg = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? (err.stack ?? '(no stack)') : '(no stack)';
          console.error(
            '[Login] signInWithPassword FAILED',
            `error: ${name}: ${msg}`,
            `stack: ${stack}`,
          );
        } catch { /* ignore diagnostic errors */ }
      }

      // APK-safe runtime diagnostics — dev-only to avoid exposing config details in production.
      if (import.meta.env.DEV) {
        try {
          const supabaseUrlRuntime = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
          console.error('[Login] signInWithPassword error:', err);
          console.error('[Login] typeof window.fetch:', typeof window?.fetch);
          console.error('[Login] supabaseUrl starts with https://', supabaseUrlRuntime.startsWith('https://'));
          try {
            console.error('[Login] supabaseUrl hostname:', new URL(supabaseUrlRuntime).hostname);
          } catch {
            console.error('[Login] supabaseUrl is not a valid URL:', supabaseUrlRuntime);
          }
          const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
          console.error('[Login] anon key present:', anonKey.length > 0);
          console.error('[Login] anon key length:', anonKey.length);
        } catch {
          // ignore diagnostic errors
        }
      }
      const raw = err instanceof Error ? err.message : "";
      // Low-level fetch/network errors (e.g. Capacitor Android WebView
      // "Failed to execute 'fetch' on 'Window': Invalid value") should be
      // replaced with a user-friendly message.
      // In Android WebView the error may not be a TypeError or DOMException,
      // so check the message directly for the WebView-specific pattern first,
      // then fall back to the standard web error types.
      const isFetchError =
        /failed to execute ['"]?fetch['"]?/i.test(raw) ||
        ((err instanceof TypeError || err instanceof DOMException) &&
          (raw.toLowerCase().includes("fetch") ||
            raw.toLowerCase().includes("network") ||
            raw.toLowerCase().includes("failed to execute")));
      setError(
        isFetchError
          ? "Network error — please check your connection and try again."
          : raw || "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  /* Header height: Row1 72px + Row2 50px = 122px, plus iOS safe-area */
  const headerHeight = "calc(7.625rem + env(safe-area-inset-top, 0px))";

  return (
    <div className="flex bg-[#020617]" style={{ minHeight: `calc(100vh - ${headerHeight})`, marginTop: headerHeight }}>

      {/* ── LEFT — hero image (desktop only, 65%) ───────────────────────── */}
      <div className="hidden lg:flex lg:w-[65%] xl:w-[67%] relative overflow-hidden">
        <img
          src="/hero-marketplace.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
      </div>

      {/* ── RIGHT — login card panel (full height under navbar) ─────────── */}
      <div className="flex-1 lg:w-[35%] xl:w-[33%] flex flex-col bg-[#020617]" style={{ minHeight: `calc(100vh - ${headerHeight})` }}>

        {/* Centered form — vertically centred inside the right column */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full">

            {/* Form card */}
            <div className="rounded-2xl p-7 sm:p-8" style={{ background: "linear-gradient(145deg, #0B1220, #0F172A)", border: "1px solid rgba(255,255,255,0.08)" }}>

              {/* Email confirmation banner — shown after successful registration */}
              {justRegistered && (
                <div className="flex items-start gap-2.5 rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-3 mb-5">
                  <svg className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-[13px] text-blue-700 leading-snug">
                    <strong>Check your email</strong> to confirm your account, then sign in below.
                  </p>
                </div>
              )}

              {/* Email confirmed banner — shown after clicking the confirmation link */}
              {justConfirmed && (
                <div className="flex items-start gap-2.5 rounded-lg bg-green-50 border border-green-200 px-3.5 py-3 mb-5">
                  <svg className="h-4 w-4 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-[13px] text-green-700 leading-snug">
                    <strong>Email confirmed!</strong> You can now sign in to your account.
                  </p>
                </div>
              )}

              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-[22px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>
                  Welcome back
                </h1>
                <p className="text-slate-400 text-sm mt-1">Sign in to your Loadify Market account</p>
              </div>

              {/* Social sign-in — not yet available; shown as disabled to set expectations */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Coming soon after launch"
                  className="relative flex items-center justify-center gap-2 h-10 rounded-lg border border-white/10 bg-white/5 text-[13px] font-medium text-slate-500 cursor-not-allowed select-none"
                >
                  <GoogleIcon /> Google
                  <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-[#C99A3E] text-[#0B1016] rounded-full px-1.5 py-0.5 leading-none uppercase tracking-wide">Soon</span>
                </button>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Coming soon after launch"
                  className="relative flex items-center justify-center gap-2 h-10 rounded-lg border border-white/10 bg-white/5 text-[13px] font-medium text-slate-500 cursor-not-allowed select-none"
                >
                  <AppleIcon /> Apple
                  <span className="absolute -top-2 -right-2 text-[9px] font-bold bg-[#C99A3E] text-[#0B1016] rounded-full px-1.5 py-0.5 leading-none uppercase tracking-wide">Soon</span>
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0B1220] px-3 text-[11px] text-slate-500 uppercase tracking-wide">or continue with email</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="block text-[13px] font-medium text-slate-300">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-white/10 bg-[#0F172A] text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FBBF24]/25 focus:border-[#FBBF24] transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-[13px] font-medium text-slate-300">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-[12px] text-[#FBBF24] hover:text-yellow-300 hover:underline transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 pl-10 pr-10 rounded-lg border border-white/10 bg-[#0F172A] text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FBBF24]/25 focus:border-[#FBBF24] transition-all"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3">
                    <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="text-[13px] text-red-600 leading-snug">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg text-white text-[14px] font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg, #B45309 0%, #FBBF24 100%)",
                    boxShadow: "0 2px 12px rgba(251,191,36,0.35)",
                  }}
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>

                {/* SSL trust */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                  <span>Secured with 256-bit SSL encryption</span>
                </div>

                {/* TEMPORARY build stamp — remove once APK fetch root cause confirmed. */}
                <p className="text-center font-mono text-[9px] text-slate-600 select-all leading-tight mt-1" title="Build diagnostics">
                  {(import.meta.env.VITE_BUILD_SHA ?? 'local').slice(0, 7)}
                  {' '}#{import.meta.env.VITE_BUILD_NUMBER ?? '0'}
                  {' '}{import.meta.env.VITE_BUILD_TIME ? import.meta.env.VITE_BUILD_TIME.slice(0, 16).replace('T', ' ') : ''}
                </p>

              </form>
            </div>

            {/* Footer */}
            <p className="text-center text-[13px] text-slate-500 mt-5">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[#FBBF24] font-semibold hover:text-yellow-300 hover:underline transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
