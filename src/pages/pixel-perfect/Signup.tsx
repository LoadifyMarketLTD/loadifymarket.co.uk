import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, Store } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";
import { supabase } from "@/lib/supabase";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { useAuthStore } from "@/store";

const inputClass =
  "mt-1.5 block h-11 w-full rounded-xl border border-[#0A234F]/15 bg-white px-3.5 text-sm text-[#0A234F] outline-none transition focus:border-[#0E3FA9]/60 focus:ring-2 focus:ring-[#0E3FA9]/10";
const labelClass = "block text-xs font-extrabold text-[#334155]";

const Signup = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isSeller = searchParams.get("type") === "seller";
  const role: "buyer" | "seller" = isSeller ? "seller" : "buyer";

  const [loading, setLoading] = useState(false);
  const [registrationDisabled, setRegistrationDisabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    sellerType: "" as "" | "individual" | "sole_trader" | "company",
    agreeTerms: false,
    agreeSellerCompliance: false,
    newsletter: false,
  });

  useEffect(() => {
    void supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "feature_flags")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && typeof data.value === "object") {
          const flags = data.value as Record<string, boolean>;
          setRegistrationDisabled((isSeller ? flags.sellerRegistration : flags.buyerRegistration) === false);
        }
      });
  }, [isSeller]);

  const title = isSeller ? "Create your seller account" : "Create your Loadify account";
  const description = isSeller
    ? "Start with one secure Loadify identity, then complete your business, verification, store and payout setup step by step."
    : "Create one account for shopping, orders, tracking, returns and account management.";

  const destination = useMemo(() => {
    if (!user) return null;
    if (user.role === "admin") return "/admin";
    if (isSeller) {
      if (user.role === "seller") {
        return user.sellerStatus === "active" ? "/seller" : "/onboarding";
      }
      return null;
    }
    return "/buyer";
  }, [user, isSeller]);

  const setField = (name: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const startSellerForExistingAccount = async () => {
    if (!user || user.role === "admin") return;
    setError("");
    setLoading(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/start-seller-activation", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to start Seller setup");

      // Refresh the auth session so App.tsx rehydrates the newly persisted
      // compatibility role before RequireSellerAny evaluates /onboarding.
      await supabase.auth.refreshSession();
      toast({
        title: "Seller setup started",
        description: "Your Buyer access stays on this same Loadify account.",
      });
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start Seller setup");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (isSeller && !form.sellerType) {
      setError("Select the legal type you will sell under.");
      return;
    }
    if (!form.agreeTerms) {
      setError("You must agree to the Terms and Privacy Policy.");
      return;
    }
    if (isSeller && !form.agreeSellerCompliance) {
      setError("Please confirm the Seller Terms and verification requirements.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/.netlify/functions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          role,
          newsletter: form.newsletter,
          ...(isSeller ? { sellerType: form.sellerType } : {}),
        }),
      });
      const payload = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(payload.error || "Registration failed");

      toast({
        title: "Account created",
        description: "Check your email to confirm your address, then sign in.",
      });
      navigate(`/login?registered=1${isSeller ? "&next=%2Fonboarding" : ""}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <SEO
        title={isSeller ? "Start Selling | Loadify Market" : "Create an Account | Loadify Market"}
        description={isSeller
          ? "Create a Marketplace Seller account on Loadify and continue through business, verification, store and payout setup."
          : "Create a Loadify Market account for shopping, orders, tracking and returns."}
        robots="noindex, nofollow"
      />

      <main id="main-content" className="min-h-screen bg-[#F7F9FC] pb-14 pt-6 text-[#0A234F] md:pt-[150px]">
        <div className="mx-auto w-full max-w-[1120px] px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[26px] border border-[#0A234F]/10 bg-white shadow-[0_22px_65px_rgba(10,35,79,0.10)]">
            <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
              <aside className="relative overflow-hidden bg-[#0A234F] px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-12">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#1D57D8]/30 blur-3xl" aria-hidden="true" />
                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#F5A300]">
                    {isSeller ? "Marketplace Seller" : "Loadify account"}
                  </p>
                  <h1 className="mt-3 text-3xl font-black leading-[1.03] tracking-[-0.035em] sm:text-4xl">{title}</h1>
                  <p className="mt-4 text-sm font-medium leading-6 text-white/75 sm:text-base">{description}</p>

                  <div className="mt-7 space-y-3 text-sm text-white/80">
                    {(isSeller
                      ? [
                          "Your Buyer access stays on the same identity",
                          "Seller readiness is completed progressively",
                          "Stripe payouts are connected during Seller setup",
                        ]
                      : [
                          "Shop current marketplace listings",
                          "Keep orders, tracking and returns together",
                          "Add Seller access later without another login",
                        ]
                    ).map((item) => (
                      <div key={item} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F5A300]" aria-hidden="true" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-white">
                      <ShieldCheck className="h-4 w-4 text-[#F5A300]" aria-hidden="true" />
                      One identity. Separate responsibilities.
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/65">
                      Marketplace Seller access is separate from Supplier Partner relationships and is subject to Loadify Seller readiness controls.
                    </p>
                  </div>
                </div>
              </aside>

              <section className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
                {user ? (
                  <div className="flex min-h-[430px] flex-col justify-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0E3FA9]">Signed in</p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.025em] text-[#0A234F]">
                      {isSeller
                        ? user.role === "seller" ? "Your Seller relationship already exists." : "Use this account to start selling."
                        : "Your Loadify account is ready."}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#64748B]">
                      {isSeller
                        ? user.role === "seller"
                          ? "Continue to your current Seller setup or Seller Workspace. No second account is needed."
                          : "We will add Marketplace Seller access to this identity. Your Buyer orders, wishlist and account history stay intact."
                        : "You do not need to register again. Continue to Buyer Space."}
                    </p>

                    {error && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                        {error}
                      </div>
                    )}

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                      {destination ? (
                        <Link to={destination} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-5 text-sm font-extrabold text-[#0A234F]">
                          Continue <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : isSeller && user.role !== "admin" ? (
                        <button
                          type="button"
                          disabled={loading || registrationDisabled}
                          onClick={startSellerForExistingAccount}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-5 text-sm font-extrabold text-[#0A234F] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                          Start Seller setup
                        </button>
                      ) : null}
                      <Link to="/" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[#0A234F]/15 px-5 text-sm font-bold text-[#0A234F]">
                        Back to marketplace
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#0E3FA9]">Account creation</p>
                        <h2 className="mt-1 text-2xl font-black tracking-[-0.025em] text-[#0A234F]">
                          {isSeller ? "Start your Seller journey" : "Join Loadify"}
                        </h2>
                      </div>
                      <p className="text-xs text-[#64748B]">
                        Already registered? <Link to="/login" className="font-extrabold text-[#0E3FA9] hover:underline">Sign in</Link>
                      </p>
                    </div>

                    {registrationDisabled && (
                      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800" role="alert">
                        {isSeller ? "Seller" : "Buyer"} registration is temporarily disabled.
                      </div>
                    )}

                    {error && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
                        {error}
                      </div>
                    )}

                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      <label className={labelClass}>
                        First name
                        <input autoComplete="given-name" className={inputClass} value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} />
                      </label>
                      <label className={labelClass}>
                        Last name
                        <input autoComplete="family-name" className={inputClass} value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} />
                      </label>
                    </div>

                    <label className={`${labelClass} mt-4`}>
                      Email address
                      <input type="email" autoComplete="email" className={inputClass} value={form.email} onChange={(e) => setField("email", e.target.value)} />
                    </label>

                    {isSeller && (
                      <label className={`${labelClass} mt-4`}>
                        How will you sell?
                        <select className={inputClass} value={form.sellerType} onChange={(e) => setField("sellerType", e.target.value)}>
                          <option value="">Select legal type</option>
                          <option value="individual">Individual</option>
                          <option value="sole_trader">Sole trader</option>
                          <option value="company">Registered company</option>
                        </select>
                        <span className="mt-1.5 block text-[11px] font-medium leading-4 text-[#64748B]">
                          Business details, store identity and verification continue after email confirmation.
                        </span>
                      </label>
                    )}

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <label className={labelClass}>
                        Password
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            className={`${inputClass} pr-11`}
                            value={form.password}
                            onChange={(e) => setField("password", e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            className="absolute right-3 top-[13px] text-[#64748B]"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </label>
                      <label className={labelClass}>
                        Confirm password
                        <input type={showPassword ? "text" : "password"} autoComplete="new-password" className={inputClass} value={form.confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} />
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-[#64748B]">Use at least 8 characters.</p>

                    <div className="mt-6 space-y-3 border-t border-[#0A234F]/10 pt-5">
                      <label className="flex items-start gap-3 text-xs font-medium leading-5 text-[#475569]">
                        <input type="checkbox" className="mt-1 h-4 w-4" checked={form.agreeTerms} onChange={(e) => setField("agreeTerms", e.target.checked)} />
                        <span>
                          I agree to the <Link to="/terms" className="font-bold text-[#0E3FA9] hover:underline">Terms &amp; Conditions</Link> and <Link to="/privacy" className="font-bold text-[#0E3FA9] hover:underline">Privacy Policy</Link>.
                        </span>
                      </label>

                      {isSeller && (
                        <label className="flex items-start gap-3 text-xs font-medium leading-5 text-[#475569]">
                          <input type="checkbox" className="mt-1 h-4 w-4" checked={form.agreeSellerCompliance} onChange={(e) => setField("agreeSellerCompliance", e.target.checked)} />
                          <span>
                            I agree to the <Link to="/seller-terms" className="font-bold text-[#0E3FA9] hover:underline">Seller Terms</Link> and understand that Seller activation is subject to Loadify verification/readiness requirements.
                          </span>
                        </label>
                      )}

                      <label className="flex items-start gap-3 text-xs font-medium leading-5 text-[#475569]">
                        <input type="checkbox" className="mt-1 h-4 w-4" checked={form.newsletter} onChange={(e) => setField("newsletter", e.target.checked)} />
                        <span>Send me useful Loadify marketplace updates. Optional.</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || registrationDisabled}
                      className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F5A300] px-5 text-sm font-extrabold text-[#0A234F] transition hover:bg-[#E69500] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isSeller ? "Create Seller account" : "Create account"}
                      {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    </button>

                    <div className="mt-5 text-center text-xs text-[#64748B]">
                      {isSeller ? (
                        <>Here to shop? <Link to="/register" className="font-extrabold text-[#0E3FA9] hover:underline">Create a Buyer account</Link></>
                      ) : (
                        <>Want to sell? <Link to="/register?type=seller" className="font-extrabold text-[#0E3FA9] hover:underline">Start as a Marketplace Seller</Link></>
                      )}
                    </div>
                  </form>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default Signup;
