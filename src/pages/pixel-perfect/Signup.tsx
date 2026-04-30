import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MainLayout from "@/layouts/MainLayout";

/* ── Password strength ─────────────────────────────────────────────── */
const getStrength = (pw: string) => {
  if (!pw) return { label: "", pct: 0, color: "bg-gray-300" };
  if (pw.length < 6) return { label: "Too short", pct: 20, color: "bg-red-500" };
  if (pw.length < 8) return { label: "Weak", pct: 40, color: "bg-orange-400" };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = [hasUpper, hasNum, hasSpecial].filter(Boolean).length;
  if (score === 0) return { label: "Moderate", pct: 60, color: "bg-yellow-400" };
  if (score === 1) return { label: "Good", pct: 75, color: "bg-lime-500" };
  return { label: "Strong", pct: 100, color: "bg-green-600" };
};

/* ── Shared primitives ─────────────────────────────────────────────── */
const lbl = "block text-[13px] font-semibold text-slate-300 uppercase tracking-wide mb-0.5";
const req = <span className="text-red-600"> *</span>;

/* Touch-friendly input — h-11 (44px) meets Apple/Google touch-target spec */
const inputBase =
  "block w-full h-11 rounded-lg border border-white/10 bg-[#0F172A] text-white text-sm px-3 focus:outline-none focus:border-[#FBBF24] focus:ring-0";

/* Select wrapper adds the caret manually */
const SelectField = ({
  id, name, value, onChange, required = false, children,
}: {
  id: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  required?: boolean; children: React.ReactNode;
}) => (
  <div className="relative">
    <select
      id={id} name={name} value={value} onChange={onChange} required={required}
      className={`${inputBase} appearance-none pr-6 cursor-pointer`}
    >
      {children}
    </select>
    <svg
      className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none"
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </div>
);

/* ── Main page ─────────────────────────────────────────────────────── */
const Signup = () => {
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSeller = searchParams.get("type") === "seller";
  const isPrivate = searchParams.get("account") === "private";
  const role: "buyer" | "seller" = isSeller ? "seller" : "buyer";

  const [f, setF] = useState({
    /* Col 1 */
    firstName: "", middleName: "", lastName: "", email: "",
    newsletter: false, vatNumber: "", customerType: "", requestAssistance: false,
    /* Col 2 */
    company: "", phone: "", country: "United Kingdom",
    postcode: "", streetAddress: "", city: "",
    /* Col 3 */
    password: "", confirmPassword: "", showPassword: false,
    /* Bottom */
    agreeTerms: false,
  });

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setF((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const strength = getStrength(f.password);
  const passwordsMatch = f.confirmPassword.length > 0 && f.password === f.confirmPassword;
  const passwordsMismatch = f.confirmPassword.length > 0 && f.password !== f.confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!f.firstName.trim() || !f.lastName.trim()) {
      setError("First name and last name are required."); return;
    }
    if (!f.email.trim()) { setError("Email address is required."); return; }
    if (!isPrivate && !f.company.trim()) { setError("Company name is required."); return; }
    if (f.password.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    if (f.password !== f.confirmPassword) {
      setError("Passwords do not match."); return;
    }
    if (!f.agreeTerms) {
      setError("You must agree to the Privacy Policy and Terms of Use."); return;
    }

    setLoading(true);
    try {
      const businessAddress: Record<string, string> = {};
      if (f.streetAddress.trim()) businessAddress.streetAddress = f.streetAddress.trim();
      if (f.city.trim())          businessAddress.city          = f.city.trim();
      if (f.postcode.trim())      businessAddress.postcode      = f.postcode.trim();
      if (f.country.trim())       businessAddress.country       = f.country.trim();

      const body: Record<string, unknown> = {
        firstName:          f.firstName.trim(),
        lastName:           f.lastName.trim(),
        email:              f.email.trim(),
        password:           f.password,
        role,
        ...(f.middleName.trim()   ? { middleName:          f.middleName.trim() }   : {}),
        ...(f.phone.trim()        ? { phone:               f.phone.trim() }        : {}),
        ...(f.vatNumber.trim()    ? { vatNumber:           f.vatNumber.trim() }    : {}),
        ...(f.customerType        ? { customerType:        f.customerType }        : {}),
        ...(f.newsletter          ? { newsletter:          true }                  : {}),
        ...(f.requestAssistance   ? { requestAssistance:   true }                  : {}),
        ...(Object.keys(businessAddress).length > 0 ? { businessAddress }         : {}),
      };

      // storeName is used for sellers; companyName for buyers
      if (f.company.trim()) {
        if (role === 'seller') {
          body.storeName   = f.company.trim();
        } else {
          body.companyName = f.company.trim();
        }
      }

      const res = await fetch("/.netlify/functions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "Registration failed");

      toast({
        title: "Account created!",
        description: "Check your email to confirm your account, then sign in.",
      });
      // Redirect to login with a flag so the login page can show
      // the "check your email" confirmation banner.
      navigate("/login?registered=1", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      {/* ── Full-page container — light grey, NO card ────────────── */}
      <div className="bg-[#020617] pt-28 pb-10">
        <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10">

          {/* ══════════════════════════════════════════════════════════
              PAGE HEADER — dominant B2B registration heading
          ══════════════════════════════════════════════════════════ */}
          <div className="mb-3">

            {/* Primary heading bar */}
            <div className="bg-[#0B1220] border border-white/10 px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h1 className="text-white text-xl font-black uppercase tracking-widest leading-tight">
                  {isPrivate ? "Personal Account Registration" : "Business Account Registration"}
                </h1>
                <p className="text-slate-500 text-[11px] uppercase tracking-widest mt-0.5">
                  {isSeller
                    ? isPrivate ? "Private Seller Account — Loadify Market" : "Trade Supplier Account — Loadify Market Wholesale Platform"
                    : isPrivate ? "Private Buyer Account — Loadify Market" : "Trade Buyer Account — Loadify Market Wholesale Platform"}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                {/* Buyer / Supplier toggle */}
                <div className="flex items-center gap-0">
                  <button
                    type="button"
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.delete("type");
                      setSearchParams(p);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide border border-white/10 transition-colors ${
                      !isSeller ? "bg-[#FBBF24] text-white" : "bg-transparent text-slate-500 hover:text-white"
                    }`}
                  >
                    Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.set("type", "seller");
                      setSearchParams(p);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide border border-l-0 border-white/10 transition-colors ${
                      isSeller ? "bg-[#FBBF24] text-white" : "bg-transparent text-slate-500 hover:text-white"
                    }`}
                  >
                    Supplier
                  </button>
                </div>
                {/* Company / Private toggle */}
                <div className="flex items-center gap-0">
                  <button
                    type="button"
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.delete("account");
                      setSearchParams(p);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide border border-white/10 transition-colors ${
                      !isPrivate ? "bg-[#0d2240] text-white" : "bg-transparent text-slate-500 hover:text-white"
                    }`}
                  >
                    Company
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = new URLSearchParams(searchParams);
                      p.set("account", "private");
                      setSearchParams(p);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide border border-l-0 border-white/10 transition-colors ${
                      isPrivate ? "bg-[#0d2240] text-white" : "bg-transparent text-slate-500 hover:text-white"
                    }`}
                  >
                    Private
                  </button>
                </div>
                <span className="text-slate-500 text-[11px] hidden sm:block">
                  Registered?{" "}
                  <Link to="/login" className="text-[#FBBF24] hover:underline font-semibold">
                    Sign In
                  </Link>
                </span>
              </div>
            </div>

            {/* IMPORTANT notice bar — like reference */}
            <div className="bg-[#fef3c7] border-l-4 border-[#d97706] px-5 py-2.5 flex items-start gap-3">
              <span className="text-[#92400e] text-[11px] font-black uppercase tracking-widest shrink-0 mt-0.5">
                Important:
              </span>
              <p className="text-[#78350f] text-[11px] leading-snug">
                {isPrivate
                  ? <>This registration is for <strong>individual buyers and sellers</strong>. All accounts are subject to review.</>
                  : <>Create an account to buy or sell on Loadify Market. Available for <strong>individuals and businesses</strong>.</>

                }
                {" "}Fields marked <span className="text-red-700 font-bold">*</span> are mandatory. Already have an account?{" "}
                <Link to="/login" className="underline font-semibold hover:text-[#92400e]">Sign in here</Link>.
              </p>
            </div>

          </div>

          {/* ── ERROR BANNER ──────────────────────────────────────── */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-300 px-4 py-2.5 mt-0">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ═══════════════════════════════════════════════════════
                MAIN GRID — 3 columns desktop, 2 tablet, 1 mobile
            ════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border border-white/10 border-t-0">

              {/* ╔══════════════════════════════════════════════════╗
                  ║  COLUMN 1 — Personal / Business Information      ║
                  ╚══════════════════════════════════════════════════╝ */}
              <div className="bg-[#0B1220] border-b md:border-b-0 md:border-r border-white/10">
                {/* Column header */}
                <div className="bg-[#1e3a5f] border-b border-white/10 px-4 py-2">
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">
                    Personal / Business Information
                  </span>
                </div>

                <div className="px-4 py-3 space-y-2">

                  <div>
                    <label htmlFor="firstName" className={lbl}>First Name{req}</label>
                    <input
                      id="firstName" name="firstName" type="text"
                      autoComplete="given-name" required
                      value={f.firstName} onChange={set} className={inputBase}
                    />
                  </div>

                  <div>
                    <label htmlFor="middleName" className={lbl}>Middle Name / Initial</label>
                    <input
                      id="middleName" name="middleName" type="text"
                      value={f.middleName} onChange={set} className={inputBase}
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className={lbl}>Last Name{req}</label>
                    <input
                      id="lastName" name="lastName" type="text"
                      autoComplete="family-name" required
                      value={f.lastName} onChange={set} className={inputBase}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className={lbl}>Email Address{req}</label>
                    <input
                      id="email" name="email" type="email"
                      autoComplete="email" required
                      value={f.email} onChange={set} className={inputBase}
                    />
                  </div>

                  {/* Newsletter checkbox */}
                  <div className="flex items-start gap-2 py-0.5">
                    <input
                      id="newsletter" name="newsletter" type="checkbox"
                      checked={f.newsletter} onChange={set}
                      className="mt-0.5 h-3.5 w-3.5 border border-white/10 cursor-pointer"
                    />
                    <label
                      htmlFor="newsletter"
                      className="text-[11px] text-slate-400 leading-snug cursor-pointer"
                    >
                      Subscribe to our trade newsletter for exclusive offers and updates
                    </label>
                  </div>

                  {!isPrivate && (
                  <div>
                    <label htmlFor="vatNumber" className={lbl}>Tax / VAT Number</label>
                    <input
                      id="vatNumber" name="vatNumber" type="text"
                      placeholder="e.g. GB123456789"
                      value={f.vatNumber} onChange={set} className={inputBase}
                    />
                  </div>
                  )}

                  <div>
                    <label htmlFor="customerType" className={lbl}>Customer Type{req}</label>
                    <SelectField
                      id="customerType" name="customerType" required
                      value={f.customerType} onChange={set}
                    >
                      <option value="">— Please Select —</option>
                      <option>Retailer</option>
                      <option>Wholesaler / Distributor</option>
                      <option>Online Seller</option>
                      <option>Market Trader</option>
                      <option>Sole Trader</option>
                      <option>Limited Company</option>
                      <option>Charity / Non-Profit</option>
                      <option>Other</option>
                    </SelectField>
                  </div>

                  {/* Assistance checkbox */}
                  <div className="flex items-start gap-2 py-0.5">
                    <input
                      id="requestAssistance" name="requestAssistance" type="checkbox"
                      checked={f.requestAssistance} onChange={set}
                      className="mt-0.5 h-3.5 w-3.5 border border-white/10 cursor-pointer"
                    />
                    <label
                      htmlFor="requestAssistance"
                      className="text-[11px] text-slate-400 leading-snug cursor-pointer"
                    >
                      I would like assistance setting up my account from the sales team
                    </label>
                  </div>

                </div>
              </div>

              {/* ╔══════════════════════════════════════════════════╗
                  ║  COLUMN 2 — Address Information                  ║
                  ╚══════════════════════════════════════════════════╝ */}
              <div className="bg-[#0F172A] border-b md:border-b-0 md:border-r-0 lg:border-r border-white/10">
                {/* Column header */}
                <div className="bg-[#1e3a5f] border-b border-white/10 px-4 py-2">
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">
                    Address Information
                  </span>
                </div>

                <div className="px-4 py-3 space-y-2">

                  <div>
                    <label htmlFor="company" className={lbl}>Company{!isPrivate && req}</label>
                    <input
                      id="company" name="company" type="text"
                      autoComplete="organization" required={!isPrivate}
                      placeholder={isPrivate ? "Optional" : ""}
                      value={f.company} onChange={set} className={inputBase}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className={lbl}>Phone Number{req}</label>
                    <input
                      id="phone" name="phone" type="tel"
                      autoComplete="tel" required
                      value={f.phone} onChange={set} className={inputBase}
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className={lbl}>Country{req}</label>
                    <SelectField
                      id="country" name="country" required
                      value={f.country} onChange={set}
                    >
                      <option>United Kingdom</option>
                      <option>Republic of Ireland</option>
                      <option>Channel Islands</option>
                      <option>Isle of Man</option>
                      <option>Other</option>
                    </SelectField>
                  </div>

                  <div>
                    <label htmlFor="postcode" className={lbl}>Zip / Postcode{req}</label>
                    <div className="flex gap-0">
                      <input
                        id="postcode" name="postcode" type="text" required
                        value={f.postcode} onChange={set}
                        className={`${inputBase} flex-1`}
                      />
                      <button
                        type="button"
                        className="px-3 h-11 bg-[#FBBF24] hover:bg-[#B45309] text-white text-[11px] font-black uppercase tracking-wide border border-[#B45309] transition-colors whitespace-nowrap rounded-r-lg"
                      >
                        Find Address
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Enter your postcode and click "Find Address" to auto-fill.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="streetAddress" className={lbl}>Street Address{req}</label>
                    <input
                      id="streetAddress" name="streetAddress" type="text"
                      autoComplete="street-address" required
                      value={f.streetAddress} onChange={set} className={inputBase}
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className={lbl}>City{req}</label>
                    <input
                      id="city" name="city" type="text"
                      autoComplete="address-level2" required
                      value={f.city} onChange={set} className={inputBase}
                    />
                  </div>

                </div>
              </div>

              {/* ╔══════════════════════════════════════════════════╗
                  ║  COLUMN 3 — Sign-in Information                  ║
                  ╚══════════════════════════════════════════════════╝ */}
              <div className="bg-[#0B1220] md:col-span-2 lg:col-span-1">
                {/* Column header */}
                <div className="bg-[#1e3a5f] border-b border-white/10 px-4 py-2">
                  <span className="text-[11px] font-black text-white uppercase tracking-widest">
                    Sign-in Information
                  </span>
                </div>

                <div className="px-4 py-3 space-y-2">

                  <div>
                    <label htmlFor="password" className={lbl}>Password{req}</label>
                    <div className="relative">
                      <input
                        id="password" name="password"
                        type={showPw ? "text" : "password"}
                        autoComplete="new-password" required
                        value={f.password} onChange={set}
                        className={`${inputBase} pr-8`}
                      />
                      <button
                        type="button"
                        aria-label={showPw ? "Hide password" : "Show password"}
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    {/* Strength bar */}
                    {f.password.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        <div className="h-[3px] w-full bg-white/10">
                          <div
                            className={`h-full transition-all duration-300 ${strength.color}`}
                            style={{ width: `${strength.pct}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Password strength:{" "}
                          <span className="font-semibold text-slate-300">{strength.label}</span>
                        </p>
                      </div>
                    )}

                    <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
                      Must be at least 8 characters. Use a combination of uppercase letters,
                      numbers, and symbols for a stronger password.
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className={lbl}>Confirm Password{req}</label>
                    <input
                      id="confirmPassword" name="confirmPassword"
                      type={showPw ? "text" : "password"}
                      autoComplete="new-password" required
                      value={f.confirmPassword} onChange={set}
                      className={`${inputBase} ${passwordsMismatch ? "border-red-500" : ""}`}
                    />
                    {passwordsMatch && (
                      <p className="text-[11px] text-green-600 mt-0.5 font-medium">
                        ✓ Passwords match
                      </p>
                    )}
                    {passwordsMismatch && (
                      <p className="text-[11px] text-red-500 mt-0.5">
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  {/* Show Password checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      id="showPassword" type="checkbox"
                      checked={showPw} onChange={() => setShowPw((v) => !v)}
                      className="h-3.5 w-3.5 border border-white/10 cursor-pointer"
                    />
                    <label
                      htmlFor="showPassword"
                      className="text-[11px] text-slate-400 cursor-pointer select-none"
                    >
                      Show Password
                    </label>
                  </div>

                </div>
              </div>

            </div>
            {/* end 3-col grid */}

            {/* ════════════════════════════════════════════════════════
                BOTTOM SECTION — reCAPTCHA · Terms · Submit
            ════════════════════════════════════════════════════════ */}
            <div className="bg-[#0B1220] border border-t-4 border-t-[#FBBF24] border-x-white/10 border-b-white/10">

              <div className="px-5 py-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">

                {/* Left: reCAPTCHA + Terms */}
                <div className="flex flex-col gap-3">

                  {/* Mandatory terms checkbox */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Legal Agreement <span className="text-red-600">*</span></p>
                    <div className="flex items-start gap-2 border border-white/10 bg-[#0F172A] px-3 py-2.5 max-w-lg">
                      <input
                        id="agreeTerms" name="agreeTerms" type="checkbox"
                        required checked={f.agreeTerms} onChange={set}
                        className="mt-0.5 h-4 w-4 border-2 border-white/30 cursor-pointer shrink-0"
                      />
                      <label
                        htmlFor="agreeTerms"
                        className="text-xs text-slate-300 leading-relaxed cursor-pointer"
                      >
                        <span className="text-red-600 font-bold">*</span>{" "}
                        I have read and agree to the{" "}
                        <Link to="/privacy" className="text-[#FBBF24] underline font-semibold">
                          Privacy Policy
                        </Link>{" "}
                        and{" "}
                        <Link to="/terms" className="text-[#FBBF24] underline font-semibold">
                          Terms and Conditions of Use
                        </Link>
                        . I confirm I am registering for <strong>business use only</strong> and am
                        authorised to create this account on behalf of my organisation.
                      </label>
                    </div>
                  </div>

                </div>

                {/* Right: Submit */}
                <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-14 py-3 text-white text-sm font-black uppercase tracking-widest transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full lg:min-w-[280px]"
                    style={{ background: "linear-gradient(135deg, #B45309, #FBBF24)" }}
                  >
                    {loading
                      ? "Submitting…"
                      : isSeller
                      ? isPrivate ? "▶  Submit Seller Application" : "▶  Submit Supplier Application"
                      : isPrivate ? "▶  Create Personal Account" : "▶  Create Business Account"}
                  </button>
                  <p className="text-[10px] text-slate-500 lg:text-right leading-relaxed">
                    Fields marked <span className="text-red-600 font-bold">*</span> are mandatory.
                    <br />
                    You will receive a confirmation email once your application is reviewed.
                    <br />
                    Already have an account?{" "}
                    <Link to="/login" className="text-[#FBBF24] underline font-semibold">
                      Sign in here
                    </Link>
                    .
                  </p>
                </div>

              </div>
            </div>
            {/* end bottom */}

          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default Signup;
