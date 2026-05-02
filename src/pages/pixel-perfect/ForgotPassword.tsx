import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Use the production URL explicitly so the reset link works whether the
      // user requested it from the web browser or from the Android app (where
      // window.location.origin resolves to the Capacitor internal scheme, not
      // the live domain).
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://loadifymarket.co.uk/reset-password`,
      });
      if (resetError) throw resetError;
      setSubmitted(true);
    } catch (err) {
      // APK-safe runtime diagnostics — dev-only to avoid exposing config details in production.
      if (import.meta.env.DEV) {
        console.error('[ForgotPassword] resetPasswordForEmail error:', err);
      }
      const raw = err instanceof Error ? err.message : "";
      // Android WebView (Capacitor APK) may throw a non-TypeError fetch error.
      const isFetchError =
        raw.includes("Failed to execute 'fetch'") ||
        raw.includes('Failed to execute "fetch"') ||
        ((err instanceof TypeError || err instanceof DOMException) &&
          (raw.toLowerCase().includes("fetch") || raw.toLowerCase().includes("network")));
      setError(
        isFetchError
          ? "Network error — please check your connection and try again."
          : raw || "Failed to send reset email"
      );
    } finally {
      setLoading(false);
    }
  };

  // Uses --header-h CSS variable (6.875rem on mobile, 7.625rem on md+) so the
  // page content starts directly below the global Header on every screen size.
  const headerHeight = "calc(var(--header-h, 6.875rem) + env(safe-area-inset-top, 0px))";

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

              {!submitted ? (
                <>
                  <div className="space-y-1.5">
                    <h1 className="text-[22px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>Reset your password</h1>
                    <p className="text-slate-400 text-sm">Enter the email address associated with your account and we'll send you a reset link.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-[13px] font-medium text-slate-300">Email address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="name@company.com"
                          className="h-11 pl-10 bg-[#0F172A] border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[#FBBF24]/25 focus-visible:border-[#FBBF24]"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-red-400 text-center">{error}</p>
                    )}
                    <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-hero text-primary-foreground font-semibold">
                      {loading ? "Sending…" : "Send Reset Link"}
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
                  <h1 className="text-[22px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>Check your email</h1>
                  <p className="text-slate-400 text-sm">
                    We've sent a reset link to <span className="font-medium text-white">{email}</span>. Check your inbox and follow the instructions.
                  </p>
                  <p className="text-sm text-slate-500">
                    Didn't receive it?{" "}
                    <button
                      type="button"
                      onClick={() => setSubmitted(false)}
                      className="text-[#FBBF24] font-medium hover:underline"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              )}

              <div className="text-center pt-1">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
