import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MainLayout from "@/layouts/MainLayout";

/* ─────────────────────────────────────────────────────────────────────────
   Reusable input / label / select primitives
───────────────────────────────────────────────────────────────────────── */
interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  colSpan?: 1 | 2 | 3;
  children: React.ReactNode;
}

const Field = ({ id, label, required = false, colSpan = 1, children }: FieldProps) => {
  const spanClass =
    colSpan === 2
      ? "sm:col-span-2"
      : colSpan === 3
      ? "sm:col-span-2 lg:col-span-3"
      : "";
  return (
    <div className={spanClass}>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
};

const inputCls =
  "w-full h-9 px-3 text-sm border border-gray-300 bg-white text-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30 focus:border-[#22C55E] transition-all placeholder:text-gray-400";

const selectCls =
  "w-full h-9 px-3 text-sm border border-gray-300 bg-white text-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-[#22C55E]/30 focus:border-[#22C55E] transition-all appearance-none";

/* ─────────────────────────────────────────────────────────────────────────
   Section card wrapper
───────────────────────────────────────────────────────────────────────── */
interface SectionCardProps {
  number: number;
  title: string;
  children: React.ReactNode;
}

const SectionCard = ({ number, title, children }: SectionCardProps) => (
  <div className="mb-5 shadow-sm">
    <div className="bg-[#0d2240] px-5 py-3 flex items-center gap-3">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#22C55E] flex items-center justify-center text-white text-xs font-bold leading-none">
        {number}
      </span>
      <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
    </div>
    <div className="bg-white border border-t-0 border-gray-200 p-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
        {children}
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────────────── */
const Signup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSeller = searchParams.get("type") === "seller";
  const role: "buyer" | "seller" = isSeller ? "seller" : "buyer";

  const [form, setForm] = useState({
    // Section 1 — Personal & Business Details
    title: "",
    firstName: "",
    lastName: "",
    jobTitle: "",
    companyName: "",
    businessType: "",
    vatNumber: "",
    companyRegNo: "",
    phone: "",
    mobile: "",
    website: "",
    // Section 2 — Business Address
    address1: "",
    address2: "",
    city: "",
    county: "",
    postcode: "",
    country: "United Kingdom",
    // Section 3 — Sign-in Credentials
    email: "",
    confirmEmail: "",
    password: "",
    confirmPassword: "",
  });

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!form.companyName.trim()) {
      setError("Company name is required.");
      return;
    }
    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (form.email !== form.confirmEmail) {
      setError("Email addresses do not match.");
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

    setLoading(true);
    try {
      const body: Record<string, string> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role,
      };
      if (form.companyName.trim()) body.storeName = form.companyName.trim();

      const res = await fetch("/.netlify/functions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(json.error || "Registration failed");

      toast({
        title: "Application submitted!",
        description:
          json.message ||
          "Your trade account application has been received. Sign in to complete your setup.",
      });
      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-[#f0f2f5] pt-28 pb-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Page header ──────────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
              <div>
                <h1
                  className="text-2xl font-bold text-[#0d2240]"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Create a Trade Account
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Complete all required fields below to apply for a wholesale trade account.
                  Fields marked <span className="text-red-500 font-semibold">*</span> are mandatory.
                </p>
              </div>
              <p className="text-sm text-gray-500 whitespace-nowrap">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-[#16A34A] font-semibold hover:underline"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Account type toggle */}
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Account Type:
              </span>
              <div className="flex rounded overflow-hidden border border-gray-300">
                <button
                  type="button"
                  onClick={() => {
                    const p = new URLSearchParams(searchParams);
                    p.delete("type");
                    setSearchParams(p);
                  }}
                  className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                    !isSeller
                      ? "bg-[#0d2240] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Buyer Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = new URLSearchParams(searchParams);
                    p.set("type", "seller");
                    setSearchParams(p);
                  }}
                  className={`px-4 py-1.5 text-xs font-semibold transition-colors border-l border-gray-300 ${
                    isSeller
                      ? "bg-[#0d2240] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Seller Account
                </button>
              </div>
            </div>
          </div>

          {/* ── Error banner ─────────────────────────────────────────── */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ═══ SECTION 1 — Personal & Business Details ══════════ */}
            <SectionCard number={1} title="Personal &amp; Business Details">

              <Field id="title" label="Title">
                <select id="title" name="title" value={form.title} onChange={set} className={selectCls}>
                  <option value="">— Select —</option>
                  <option>Mr</option>
                  <option>Mrs</option>
                  <option>Ms</option>
                  <option>Miss</option>
                  <option>Dr</option>
                  <option>Prof</option>
                </select>
              </Field>

              <Field id="firstName" label="First Name" required>
                <input
                  id="firstName" name="firstName" type="text" autoComplete="given-name"
                  required placeholder="John"
                  value={form.firstName} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="lastName" label="Last Name" required>
                <input
                  id="lastName" name="lastName" type="text" autoComplete="family-name"
                  required placeholder="Smith"
                  value={form.lastName} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="jobTitle" label="Job Title" required>
                <input
                  id="jobTitle" name="jobTitle" type="text"
                  required placeholder="Procurement Manager"
                  value={form.jobTitle} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="companyName" label="Company Name" required colSpan={2}>
                <input
                  id="companyName" name="companyName" type="text" autoComplete="organization"
                  required placeholder="Acme Wholesale Ltd"
                  value={form.companyName} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="businessType" label="Business Type" required>
                <select
                  id="businessType" name="businessType"
                  required value={form.businessType} onChange={set} className={selectCls}
                >
                  <option value="">— Select —</option>
                  <option>Sole Trader</option>
                  <option>Limited Company (Ltd)</option>
                  <option>Partnership</option>
                  <option>LLP</option>
                  <option>PLC</option>
                  <option>Charity / Non-Profit</option>
                  <option>Other</option>
                </select>
              </Field>

              <Field id="vatNumber" label="VAT Number">
                <input
                  id="vatNumber" name="vatNumber" type="text"
                  placeholder="GB123456789"
                  value={form.vatNumber} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="companyRegNo" label="Company Reg. No.">
                <input
                  id="companyRegNo" name="companyRegNo" type="text"
                  placeholder="12345678"
                  value={form.companyRegNo} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="phone" label="Main Telephone" required>
                <input
                  id="phone" name="phone" type="tel" autoComplete="tel"
                  required placeholder="+44 20 1234 5678"
                  value={form.phone} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="mobile" label="Mobile Number">
                <input
                  id="mobile" name="mobile" type="tel"
                  placeholder="+44 7700 900000"
                  value={form.mobile} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="website" label="Website">
                <input
                  id="website" name="website" type="url"
                  placeholder="https://www.yourcompany.co.uk"
                  value={form.website} onChange={set} className={inputCls}
                />
              </Field>

            </SectionCard>

            {/* ═══ SECTION 2 — Business Address ════════════════════ */}
            <SectionCard number={2} title="Business Address">

              <Field id="address1" label="Address Line 1" required colSpan={2}>
                <input
                  id="address1" name="address1" type="text" autoComplete="address-line1"
                  required placeholder="Unit 4, Trafalgar Industrial Estate"
                  value={form.address1} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="address2" label="Address Line 2">
                <input
                  id="address2" name="address2" type="text" autoComplete="address-line2"
                  placeholder="Pembroke Road"
                  value={form.address2} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="city" label="Town / City" required>
                <input
                  id="city" name="city" type="text" autoComplete="address-level2"
                  required placeholder="London"
                  value={form.city} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="county" label="County / Region">
                <input
                  id="county" name="county" type="text" autoComplete="address-level1"
                  placeholder="Greater London"
                  value={form.county} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="postcode" label="Postcode" required>
                <input
                  id="postcode" name="postcode" type="text" autoComplete="postal-code"
                  required placeholder="EC1A 1BB"
                  value={form.postcode} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="country" label="Country" required>
                <select
                  id="country" name="country"
                  required value={form.country} onChange={set} className={selectCls}
                >
                  <option>United Kingdom</option>
                  <option>Republic of Ireland</option>
                  <option>Channel Islands</option>
                  <option>Isle of Man</option>
                  <option>Other</option>
                </select>
              </Field>

            </SectionCard>

            {/* ═══ SECTION 3 — Sign-in Credentials ════════════════ */}
            <SectionCard number={3} title="Sign-in Information">

              <Field id="email" label="Email Address" required colSpan={2}>
                <input
                  id="email" name="email" type="email" autoComplete="email"
                  required placeholder="john.smith@company.co.uk"
                  value={form.email} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="confirmEmail" label="Confirm Email Address" required colSpan={2}>
                <input
                  id="confirmEmail" name="confirmEmail" type="email"
                  required placeholder="Re-enter your email address"
                  value={form.confirmEmail} onChange={set} className={inputCls}
                />
              </Field>

              <Field id="password" label="Password" required>
                <div className="relative">
                  <input
                    id="password" name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required placeholder="Minimum 8 characters"
                    value={form.password} onChange={set}
                    className={`${inputCls} pr-9`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>

              <Field id="confirmPassword" label="Confirm Password" required>
                <div className="relative">
                  <input
                    id="confirmPassword" name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required placeholder="Re-enter your password"
                    value={form.confirmPassword} onChange={set}
                    className={`${inputCls} pr-9`}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Field>

            </SectionCard>

            {/* ── Terms + Submit ────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                By creating an account you agree to our{" "}
                <Link to="/terms" className="text-[#16A34A] hover:underline font-medium">
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-[#16A34A] hover:underline font-medium">
                  Privacy Policy
                </Link>
                . All applications are subject to approval.{" "}
                <span className="text-red-500">*</span> Mandatory fields.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="shrink-0 h-10 px-8 rounded text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
                  boxShadow: "0 2px 8px rgba(34,197,94,0.35)",
                }}
              >
                {loading
                  ? "Submitting Application…"
                  : isSeller
                  ? "Submit Seller Application"
                  : "Create Buyer Account"}
              </button>
            </div>

          </form>
        </div>
      </div>
    </MainLayout>
  );
};

export default Signup;
