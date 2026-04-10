import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye, EyeOff, Mail, Lock, User, Building2,
  ArrowLeft, ShieldCheck, CheckCircle2, TrendingUp, Package,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/loadify-logo.svg";

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

/* ── Left-panel content per role ─────────────────────────────────────── */
const SELLER_BULLETS = [
  { Icon: TrendingUp,   text: "Reach UK buyers across all categories" },
  { Icon: CheckCircle2, text: "Same-day account activation after setup" },
  { Icon: ShieldCheck,  text: "Secure payments via Stripe — 0% commission" },
  { Icon: Package,      text: "Full seller dashboard with order management" },
];
const BUYER_BULLETS = [
  { Icon: CheckCircle2, text: "Free to join — no upfront fees" },
  { Icon: ShieldCheck,  text: "Secure checkout on every purchase" },
  { Icon: Package,      text: "Thousands of products from UK sellers" },
  { Icon: TrendingUp,   text: "New listings added every day" },
];

/* ── Password strength helper ────────────────────────────────────────── */
const passwordStrength = (pw: string) => {
  if (pw.length === 0) return { label: "", width: "0%", color: "" };
  if (pw.length < 6)  return { label: "Weak",   width: "33%",  color: "bg-red-500"  };
  if (pw.length < 10) return { label: "Medium",  width: "66%",  color: "bg-yellow-500" };
  return              { label: "Strong",  width: "100%", color: "bg-[#22C55E]" };
};

const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ name: "", company: "", email: "", password: "" });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isSeller = searchParams.get("type") === "seller";
  const role: "buyer" | "seller" = isSeller ? "seller" : "buyer";
  const bullets = isSeller ? SELLER_BULLETS : BUYER_BULLETS;
  const strength = passwordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const nameParts = formData.name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const body: Record<string, string> = {
        firstName, lastName, email: formData.email, password: formData.password, role,
      };
      if (isSeller && formData.company.trim()) body.storeName = formData.company.trim();

      const res = await fetch("/.netlify/functions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "Registration failed");

      const description = json.message || (isSeller
        ? "Your seller account has been created. Sign in to complete your setup and start selling."
        : "Your account is ready. Sign in to get started.");
      toast({ title: "Account created!", description });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f5f7fa]">

      {/* ── LEFT — dark navy branding panel (desktop only) ─────────────── */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[42%] bg-[#0A1930] relative flex-col items-center justify-center p-10 xl:p-14 overflow-hidden">
        {/* Subtle dot-grid texture */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        {/* Soft green glow */}
        <div aria-hidden="true" className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-[#22C55E]/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-xs w-full space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="Loadify Market" className="h-11 w-11" />
            <div className="flex flex-col leading-none">
              <span className="text-[22px] font-bold text-white" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", letterSpacing: "-0.02em" }}>Loadify</span>
              <span className="text-[20px] font-bold text-[#22C55E]" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", letterSpacing: "-0.02em" }}>Market</span>
            </div>
          </div>

          {/* Account type badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#22C55E] text-[12px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
            {isSeller ? "Seller Account" : "Buyer Account"}
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h2 className="text-[26px] font-bold text-white leading-tight" style={{ letterSpacing: "-0.02em" }}>
              {isSeller ? "Sell on Loadify Market" : "Join the UK Marketplace"}
            </h2>
            <p className="text-white/55 text-[15px] leading-relaxed">
              {isSeller
                ? "Create your seller account and start reaching UK buyers across all categories."
                : "Create your free account to browse and buy from verified UK sellers."}
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {bullets.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-[#22C55E] shrink-0" />
                <span className="text-white/65 text-sm">{text}</span>
              </div>
            ))}
          </div>

          {/* Role switch link */}
          <div className="pt-2">
            {isSeller ? (
              <p className="text-white/40 text-[13px]">
                Just want to buy?{" "}
                <Link to="/signup" className="text-[#22C55E] hover:text-[#4ADE80] underline transition-colors">
                  Create a buyer account
                </Link>
              </p>
            ) : (
              <p className="text-white/40 text-[13px]">
                Want to sell?{" "}
                <Link to="/signup?type=seller" className="text-[#22C55E] hover:text-[#4ADE80] underline transition-colors">
                  Apply as a seller
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT — form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2">
            <img src={logo} alt="Loadify Market" className="h-7 w-7" />
            <span className="font-bold text-[15px] text-gray-800" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
              Loadify Market
            </span>
          </Link>
          <div className="hidden lg:block" />
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to site
          </Link>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-4 py-4 sm:px-8">
          <div className="w-full max-w-[420px]">

            {/* Mobile role badge */}
            <div className="lg:hidden flex justify-center mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#22C55E]/30 bg-[#22C55E]/10 text-[#16A34A] text-[12px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                {isSeller ? "Seller Account" : "Buyer Account"}
              </span>
            </div>

            {/* Form card */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.07)] border border-gray-100 p-7 sm:p-8">

              {/* Heading */}
              <div className="mb-5">
                <h1 className="text-[22px] font-bold text-gray-900 leading-tight" style={{ letterSpacing: "-0.02em" }}>
                  {isSeller ? "Apply as a Seller" : "Create your account"}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {isSeller
                    ? "Complete your details to set up your seller account."
                    : "Get started on Loadify Market today — it's free."}
                </p>
              </div>

              {/* Social sign-up */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => toast({ title: "Coming soon", description: "Google sign-up will be available after launch." })}
                  className="flex items-center justify-center gap-2 h-10 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-[13px] font-medium text-gray-600 transition-colors"
                >
                  <GoogleIcon /> Google
                </button>
                <button
                  type="button"
                  onClick={() => toast({ title: "Coming soon", description: "Apple sign-up will be available after launch." })}
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
                  <span className="bg-white px-3 text-[11px] text-gray-400 uppercase tracking-wide">or register with email</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-name" className="block text-[13px] font-medium text-gray-700">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="reg-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-gray-200 bg-gray-50 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25 focus:border-[#22C55E] transition-all"
                    />
                  </div>
                </div>

                {/* Company / Store Name */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-company" className="block text-[13px] font-medium text-gray-700">
                    {isSeller ? "Store / Company Name" : "Company"}
                    {!isSeller && <span className="ml-1 text-gray-400 font-normal">(optional)</span>}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="reg-company"
                      name="company"
                      type="text"
                      autoComplete="organization"
                      placeholder={isSeller ? "My Store Ltd" : "Acme Ltd"}
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-gray-200 bg-gray-50 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25 focus:border-[#22C55E] transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-email" className="block text-[13px] font-medium text-gray-700">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="reg-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@company.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-gray-200 bg-gray-50 text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#22C55E]/25 focus:border-[#22C55E] transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="reg-password" className="block text-[13px] font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="Create a strong password"
                      value={formData.password}
                      onChange={handleChange}
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
                  {/* Password strength bar */}
                  {formData.password.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                          style={{ width: strength.width }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400">{strength.label} password</p>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3">
                    <svg className="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
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
                  {loading ? "Creating account…" : isSeller ? "Create Seller Account" : "Create Account"}
                </button>

                {/* Legal */}
                <p className="text-[11px] text-center text-gray-400">
                  By creating an account you agree to our{" "}
                  <Link to="/terms" className="text-[#16A34A] hover:underline">Terms of Service</Link> and{" "}
                  <Link to="/privacy" className="text-[#16A34A] hover:underline">Privacy Policy</Link>
                </p>

                {/* SSL trust */}
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
                  <span>Secured with 256-bit SSL encryption</span>
                </div>

              </form>
            </div>

            {/* Footer links */}
            <div className="text-center mt-4 space-y-2">
              {/* Mobile role switch */}
              <p className="lg:hidden text-[13px] text-gray-500">
                {isSeller ? (
                  <>Just want to buy?{" "}<Link to="/signup" className="text-[#16A34A] font-semibold hover:underline">Create a buyer account</Link></>
                ) : (
                  <>Want to sell?{" "}<Link to="/signup?type=seller" className="text-[#16A34A] font-semibold hover:underline">Apply as a seller</Link></>
                )}
              </p>
              <p className="text-[13px] text-gray-500">
                Already have an account?{" "}
                <Link to="/login" className="text-[#16A34A] font-semibold hover:text-[#15803D] hover:underline transition-colors">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
