import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuthStore } from "@/store";

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
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      if (data.user) {
        const { data: userRow } = await supabase
          .from("users")
          .select("isActive")
          .eq("id", data.user.id)
          .single();
        if (userRow && userRow.isActive === false) {
          await supabase.auth.signOut();
          throw new Error("Your account has been suspended. Please contact support.");
        }
      }

      const nextUrl = searchParams.get("next");
      if (nextUrl) { navigate(nextUrl, { replace: true }); return; }
      // Default to /dashboard so DashboardRedirect (which waits for the correct
      // Zustand store state) handles role-based routing.  Avoid hardcoding
      // /buyer here — if the role query below fails, an admin would be
      // incorrectly sent to the buyer hub.
      let redirectTo = "/dashboard";
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from("users").select("role").eq("id", data.user.id).single();
        if (profileError) console.warn("Could not fetch user role:", profileError.message);
        if (profile?.role === "seller") redirectTo = "/seller";
        else if (profile?.role === "admin") redirectTo = "/admin";
        else if (profile?.role === "buyer") redirectTo = "/buyer";
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  /* Header height: Row1 72px + Row2 50px = 122px, plus iOS safe-area */
  const headerHeight = "calc(7.625rem + env(safe-area-inset-top, 0px))";

  return (
    <div className="flex bg-transparent" style={{ minHeight: `calc(100vh - ${headerHeight})`, marginTop: headerHeight }}>

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
      <div className="flex-1 lg:w-[35%] xl:w-[33%] flex flex-col bg-white" style={{ minHeight: `calc(100vh - ${headerHeight})` }}>

        {/* Centered form — vertically centred inside the right column */}
        <div className="flex-1 flex items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-[400px]">

            {/* Form card */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] border border-gray-100 p-7 sm:p-8">

              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-[22px] font-bold text-gray-900 leading-tight" style={{ letterSpacing: "-0.02em" }}>
                  Welcome back
                </h1>
                <p className="text-gray-400 text-sm mt-1">Sign in to your Loadify Market account</p>
              </div>

              {/* Social sign-in */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => toast({ title: "Coming soon", description: "Google sign-in will be available after launch." })}
                  className="flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-medium text-gray-600 transition-colors"
                >
                  <GoogleIcon /> Google
                </button>
                <button
                  type="button"
                  onClick={() => toast({ title: "Coming soon", description: "Apple sign-in will be available after launch." })}
                  className="flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-medium text-gray-600 transition-colors"
                >
                  <AppleIcon /> Apple
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-[11px] text-gray-400 uppercase tracking-wide">or continue with email</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="block text-[13px] font-medium text-gray-700">
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
                      className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-gray-200 bg-gray-50 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25 focus:border-[#22C55E] transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="login-password" className="block text-[13px] font-medium text-gray-700">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-[12px] text-[#16A34A] hover:text-[#15803D] hover:underline transition-colors">
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
                      className="w-full h-11 pl-10 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25 focus:border-[#22C55E] transition-all"
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
                    background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
                    boxShadow: "0 2px 12px rgba(34,197,94,0.35)",
                  }}
                >
                  {loading ? "Signing in…" : "Sign In"}
                </button>

                {/* SSL trust */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                  <span>Secured with 256-bit SSL encryption</span>
                </div>

              </form>
            </div>

            {/* Footer */}
            <p className="text-center text-[13px] text-slate-500 mt-5">
              Don't have an account?{" "}
              <Link to="/signup" className="text-[#16A34A] font-semibold hover:text-[#15803D] hover:underline transition-colors">
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
