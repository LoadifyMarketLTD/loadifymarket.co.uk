import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Search, MapPin, Phone, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import logo from "@/assets/loadify-logo.svg";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  // Personal
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  vatNumber: string;
  customerType: string;
  newsletter: boolean;
  // Business / Address
  companyName: string;
  mobile: string;
  website: string;
  country: string;
  postcode: string;
  streetAddress: string;
  city: string;
  hearAboutUs: string;
  areasOfInterest: string;
  // Account
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  // Compliance
  gdprAccepted: boolean;
}

interface FieldErrors {
  [key: string]: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CUSTOMER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
  { value: "reseller", label: "Reseller" },
  { value: "distributor", label: "Distributor" },
];

const HEAR_ABOUT_US = [
  { value: "google", label: "Google / Search Engine" },
  { value: "social_media", label: "Social Media" },
  { value: "word_of_mouth", label: "Word of Mouth" },
  { value: "trade_show", label: "Trade Show / Exhibition" },
  { value: "email", label: "Email Campaign" },
  { value: "advertisement", label: "Online Advertisement" },
  { value: "existing_customer", label: "Existing Customer" },
  { value: "other", label: "Other" },
];

const TRUST_POINTS = [
  { icon: "✔", text: "Shop Over 10,000 Product Lines" },
  { icon: "✔", text: "Join Over 500 Businesses" },
  { icon: "✔", text: "UK, Ireland & International" },
];

// ─── Password strength helper ─────────────────────────────────────────────────

function passwordStrength(pw: string): { label: string; width: string; color: string; score: number } {
  if (pw.length === 0) return { label: "", width: "0%", color: "", score: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", width: "25%", color: "bg-red-500", score };
  if (score === 2) return { label: "Fair", width: "50%", color: "bg-orange-400", score };
  if (score === 3) return { label: "Good", width: "75%", color: "bg-yellow-500", score };
  return { label: "Strong", width: "100%", color: "bg-green-500", score };
}

// ─── Field component helpers ──────────────────────────────────────────────────

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;

const SectionHeader = ({ label }: { label: string }) => (
  <div className="mb-4">
    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
    <div className="mt-1 h-px bg-gray-200" />
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function TradeAccount() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { categories } = useCategories();

  const [form, setForm] = useState<FormState>({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    vatNumber: "",
    customerType: "",
    newsletter: false,
    companyName: "",
    mobile: "",
    website: "",
    country: "United Kingdom",
    postcode: "",
    streetAddress: "",
    city: "",
    hearAboutUs: "",
    areasOfInterest: "",
    password: "",
    confirmPassword: "",
    showPassword: false,
    gdprAccepted: false,
  });

  const set = (field: keyof FormState) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleInput =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      set(field)(e.target.value);

  // ── Postcode lookup (stub) ──────────────────────────────────────────────────
  const handlePostcodeLookup = () => {
    if (!form.postcode.trim()) {
      setErrors((prev) => ({ ...prev, postcode: "Please enter a postcode first" }));
      return;
    }
    toast({ title: "Address lookup coming soon", description: "Manual entry is available in the fields below." });
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FieldErrors = {};

    if (!form.firstName.trim()) newErrors.firstName = "First name is required";
    if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!form.phone.trim()) newErrors.phone = "Phone number is required";
    if (!form.companyName.trim()) newErrors.companyName = "Company name is required";
    if (!form.mobile.trim()) newErrors.mobile = "Mobile number is required";
    if (!form.streetAddress.trim()) newErrors.streetAddress = "Street address is required";
    if (!form.city.trim()) newErrors.city = "City is required";
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!form.gdprAccepted) {
      newErrors.gdprAccepted = "You must accept the terms and privacy policy to continue";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      // Scroll to first error
      const firstErrorEl = document.querySelector("[data-error='true']");
      if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setLoading(true);
    try {
      const body = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "buyer" as const,
        // Extra B2B metadata passed as storeName / company for now
        storeName: form.companyName.trim() || undefined,
        // Additional fields stored in user_metadata for future use
        phone: form.phone.trim(),
        vatNumber: form.vatNumber.trim() || undefined,
        customerType: form.customerType || undefined,
        areasOfInterest: form.areasOfInterest || undefined,
      };

      const res = await fetch("/.netlify/functions/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Registration failed");

      toast({
        title: "Trade account created!",
        description: "You can now sign in and start browsing wholesale products.",
      });
      navigate("/login", { replace: true });
    } catch (err) {
      toast({
        title: "Registration failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(form.password);

  const headerHeight = "calc(7.625rem + env(safe-area-inset-top, 0px))";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="bg-transparent flex flex-col" style={{ minHeight: `calc(100vh - ${headerHeight})`, marginTop: headerHeight }}>

      {/* ── Page title ─────────────────────────────────────────────────────── */}
      <div className="bg-white/80 border-b border-gray-200/70 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1D3A]">Trade Account</h1>
          <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 inline-flex items-start gap-2 max-w-2xl">
            <span className="text-amber-500 mt-0.5 shrink-0">⚠️</span>
            <p className="text-sm text-amber-800">
              <strong>IMPORTANT:</strong> Please ensure all details are correct before submitting.
              Your business details will be used for account verification and order processing.
            </p>
          </div>
        </div>
      </div>

      {/* ── Main form area ─────────────────────────────────────────────────── */}
      <main className="flex-1 py-8 px-4 sm:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <form onSubmit={handleSubmit} noValidate>
            {/* 2-column grid on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

              {/* ════════════════════════════════════════════════════════════
                  LEFT — PERSONAL INFORMATION
              ════════════════════════════════════════════════════════════ */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <SectionHeader label="Personal Information" />

                {/* First / Middle / Last */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    className="space-y-1"
                    data-error={!!errors.firstName || undefined}
                  >
                    <Label htmlFor="firstName">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      value={form.firstName}
                      onChange={handleInput("firstName")}
                      placeholder="John"
                      className={errors.firstName ? "border-red-400 focus-visible:ring-red-400" : ""}
                    />
                    <FieldError msg={errors.firstName} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="middleName">Middle Name / Initial</Label>
                    <Input
                      id="middleName"
                      value={form.middleName}
                      onChange={handleInput("middleName")}
                      placeholder="M."
                    />
                  </div>
                  <div
                    className="space-y-1"
                    data-error={!!errors.lastName || undefined}
                  >
                    <Label htmlFor="lastName">
                      Last Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="lastName"
                      value={form.lastName}
                      onChange={handleInput("lastName")}
                      placeholder="Smith"
                      className={errors.lastName ? "border-red-400 focus-visible:ring-red-400" : ""}
                    />
                    <FieldError msg={errors.lastName} />
                  </div>
                </div>

                {/* Email */}
                <div
                  className="space-y-1"
                  data-error={!!errors.email || undefined}
                >
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={handleInput("email")}
                      placeholder="john@company.com"
                      className={`pl-10 ${errors.email ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                    />
                  </div>
                  <FieldError msg={errors.email} />
                </div>

                {/* Phone */}
                <div
                  className="space-y-1"
                  data-error={!!errors.phone || undefined}
                >
                  <Label htmlFor="phone">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleInput("phone")}
                      placeholder="+44 20 1234 5678"
                      className={`pl-10 ${errors.phone ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                    />
                  </div>
                  <FieldError msg={errors.phone} />
                </div>

                {/* VAT */}
                <div className="space-y-1">
                  <Label htmlFor="vatNumber">Tax / VAT Number</Label>
                  <Input
                    id="vatNumber"
                    value={form.vatNumber}
                    onChange={handleInput("vatNumber")}
                    placeholder="GB123456789"
                  />
                </div>

                {/* Customer type */}
                <div className="space-y-1">
                  <Label htmlFor="customerType">Customer Type</Label>
                  <Select value={form.customerType} onValueChange={set("customerType")}>
                    <SelectTrigger id="customerType">
                      <SelectValue placeholder="Select customer type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOMER_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Newsletter */}
                <div className="flex items-center gap-2 pt-1">
                  <Checkbox
                    id="newsletter"
                    checked={form.newsletter}
                    onCheckedChange={(v) => set("newsletter")(Boolean(v))}
                  />
                  <Label htmlFor="newsletter" className="cursor-pointer font-normal text-sm">
                    Sign up for our newsletter to receive exclusive deals and updates
                  </Label>
                </div>
              </div>

              {/* ════════════════════════════════════════════════════════════
                  RIGHT — ADDRESS / BUSINESS INFORMATION
              ════════════════════════════════════════════════════════════ */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <SectionHeader label="Business & Address Information" />

                {/* Company */}
                <div
                  className="space-y-1"
                  data-error={!!errors.companyName || undefined}
                >
                  <Label htmlFor="companyName">
                    Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="companyName"
                    value={form.companyName}
                    onChange={handleInput("companyName")}
                    placeholder="Acme Wholesale Ltd"
                    className={errors.companyName ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  <FieldError msg={errors.companyName} />
                </div>

                {/* Mobile */}
                <div
                  className="space-y-1"
                  data-error={!!errors.mobile || undefined}
                >
                  <Label htmlFor="mobile">
                    Mobile <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="mobile"
                      type="tel"
                      value={form.mobile}
                      onChange={handleInput("mobile")}
                      placeholder="+44 7700 900000"
                      className={`pl-10 ${errors.mobile ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                    />
                  </div>
                  <FieldError msg={errors.mobile} />
                </div>

                {/* Website */}
                <div className="space-y-1">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={form.website}
                    onChange={handleInput("website")}
                    placeholder="https://www.company.com"
                  />
                </div>

                {/* Country */}
                <div className="space-y-1">
                  <Label htmlFor="country">Country</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="country"
                      value={form.country}
                      onChange={handleInput("country")}
                      placeholder="United Kingdom"
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Postcode + Lookup */}
                <div className="space-y-1" data-error={!!errors.postcode || undefined}>
                  <Label htmlFor="postcode">Zip / Postcode</Label>
                  <div className="flex gap-2">
                    <Input
                      id="postcode"
                      value={form.postcode}
                      onChange={handleInput("postcode")}
                      placeholder="SW1A 1AA"
                      className={`flex-1 ${errors.postcode ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePostcodeLookup}
                      className="shrink-0 gap-1.5"
                    >
                      <Search className="h-4 w-4" />
                      Lookup
                    </Button>
                  </div>
                  <FieldError msg={errors.postcode} />
                </div>

                {/* Street Address */}
                <div
                  className="space-y-1"
                  data-error={!!errors.streetAddress || undefined}
                >
                  <Label htmlFor="streetAddress">
                    Street Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="streetAddress"
                    value={form.streetAddress}
                    onChange={handleInput("streetAddress")}
                    placeholder="123 High Street"
                    className={errors.streetAddress ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  <FieldError msg={errors.streetAddress} />
                </div>

                {/* City */}
                <div
                  className="space-y-1"
                  data-error={!!errors.city || undefined}
                >
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={handleInput("city")}
                    placeholder="London"
                    className={errors.city ? "border-red-400 focus-visible:ring-red-400" : ""}
                  />
                  <FieldError msg={errors.city} />
                </div>

                {/* How did you hear */}
                <div className="space-y-1">
                  <Label htmlFor="hearAboutUs">How did you hear about us?</Label>
                  <Select value={form.hearAboutUs} onValueChange={set("hearAboutUs")}>
                    <SelectTrigger id="hearAboutUs">
                      <SelectValue placeholder="Please select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {HEAR_ABOUT_US.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Areas of interest — dynamic from categories */}
                <div className="space-y-1">
                  <Label htmlFor="areasOfInterest">
                    What areas are you interested in buying?
                  </Label>
                  <Select value={form.areasOfInterest} onValueChange={set("areasOfInterest")}>
                    <SelectTrigger id="areasOfInterest">
                      <SelectValue placeholder="Select a category…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.slug} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Select your primary area of interest. You can browse all categories once registered.
                  </p>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                ACCOUNT CREATION — password (full width, 2-col inner on sm+)
            ════════════════════════════════════════════════════════════════ */}
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
              <SectionHeader label="Create Your Password" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Password */}
                <div
                  className="space-y-1"
                  data-error={!!errors.password || undefined}
                >
                  <Label htmlFor="password">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={form.showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleInput("password")}
                      placeholder="Min. 8 characters"
                      className={`pr-10 ${errors.password ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => set("showPassword")(!form.showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      aria-label={form.showPassword ? "Hide password" : "Show password"}
                    >
                      {form.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {form.password.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                          style={{ width: strength.width }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Password strength: <span className="font-medium">{strength.label}</span>
                      </p>
                    </div>
                  )}
                  <FieldError msg={errors.password} />
                </div>

                {/* Confirm Password */}
                <div
                  className="space-y-1"
                  data-error={!!errors.confirmPassword || undefined}
                >
                  <Label htmlFor="confirmPassword">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={form.showPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={handleInput("confirmPassword")}
                      placeholder="Re-enter password"
                      className={`pr-10 ${errors.confirmPassword ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                    />
                    {form.confirmPassword && form.password === form.confirmPassword && (
                      <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <FieldError msg={errors.confirmPassword} />
                </div>
              </div>

              {/* Show password toggle */}
              <div className="flex items-center gap-2 mt-4">
                <Checkbox
                  id="showPasswordToggle"
                  checked={form.showPassword}
                  onCheckedChange={(v) => set("showPassword")(Boolean(v))}
                />
                <Label htmlFor="showPasswordToggle" className="cursor-pointer font-normal text-sm">
                  Show password
                </Label>
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                SECURITY & COMPLIANCE
            ════════════════════════════════════════════════════════════════ */}
            <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <SectionHeader label="Security & Compliance" />

              {/* reCAPTCHA placeholder */}
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex items-center gap-4 bg-gray-50">
                <div className="h-7 w-7 rounded border-2 border-gray-300 bg-white flex items-center justify-center shrink-0">
                  <span className="text-gray-300 text-lg">☐</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">I'm not a robot</p>
                  <p className="text-xs text-gray-400">reCAPTCHA • Privacy • Terms</p>
                </div>
                <div className="ml-auto">
                  <svg viewBox="0 0 64 64" className="h-12 w-12 opacity-30" fill="none">
                    <circle cx="32" cy="32" r="30" stroke="#4A90E2" strokeWidth="4" />
                    <path d="M20 32l10 10 14-18" stroke="#4A90E2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-1">
                Full reCAPTCHA integration will be enabled before launch.
              </p>

              {/* GDPR checkbox */}
              <div
                data-error={!!errors.gdprAccepted || undefined}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="gdprAccepted"
                    checked={form.gdprAccepted}
                    onCheckedChange={(v) => {
                      set("gdprAccepted")(Boolean(v));
                      if (v) setErrors((prev) => { const e = { ...prev }; delete e.gdprAccepted; return e; });
                    }}
                    className={errors.gdprAccepted ? "border-red-400" : ""}
                  />
                  <Label htmlFor="gdprAccepted" className="cursor-pointer font-normal text-sm leading-relaxed">
                    I have read and accept the{" "}
                    <Link to="/terms" className="text-blue-600 hover:underline font-medium" target="_blank">
                      Terms and Conditions
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-blue-600 hover:underline font-medium" target="_blank">
                      Privacy Policy
                    </Link>
                    . I understand how my data will be used in accordance with GDPR. <span className="text-red-500">*</span>
                  </Label>
                </div>
                <FieldError msg={errors.gdprAccepted} />
              </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                CTA
            ════════════════════════════════════════════════════════════════ */}
            <div className="mt-6">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold bg-[#22C55E] hover:bg-[#16a34a] text-white rounded-xl shadow-md transition-colors"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating your account…
                  </span>
                ) : (
                  "Create an Account"
                )}
              </Button>
              <p className="text-center text-xs text-gray-500 mt-3">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-600 hover:underline font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </form>

          {/* ════════════════════════════════════════════════════════════════
              TRUST SECTION
          ════════════════════════════════════════════════════════════════ */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TRUST_POINTS.map((point) => (
              <div
                key={point.text}
                className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-3 shadow-sm"
              >
                <div className="h-8 w-8 rounded-full bg-[#22C55E] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-[#F59E0B]" />
                </div>
                <p className="font-medium text-gray-800 text-sm">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="mt-12 bg-white border-t border-gray-200 text-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Company info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <img src={logo} alt="Loadify Market" className="h-8 w-8" />
                <span className="flex flex-col leading-tight">
                  <span className="font-bold text-white">Loadify</span>
                  <span className="font-bold text-sm text-[#F59E0B]">Market</span>
                </span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                The UK's professional B2B wholesale marketplace connecting businesses with verified sellers.
              </p>
              <div className="space-y-1.5 text-sm text-white/60">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>United Kingdom</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>+44 (0) 20 0000 0000</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span>hello@loadifymarket.co.uk</span>
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="font-semibold text-white mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-white/60">
                {[
                  { to: "/about", label: "About Us" },
                  { to: "/faq", label: "FAQ" },
                  { to: "/contact", label: "Contact Us" },
                  { to: "/terms", label: "Terms & Conditions" },
                  { to: "/privacy", label: "Privacy Policy" },
                  { to: "/wholesale-info", label: "Wholesale Info" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Account */}
            <div>
              <h4 className="font-semibold text-white mb-3">Your Account</h4>
              <ul className="space-y-2 text-sm text-white/60">
                {[
                  { to: "/login", label: "Sign In" },
                  { to: "/signup", label: "Create Account" },
                  { to: "/trade-account", label: "Trade Account" },
                  { to: "/buyer/orders", label: "My Orders" },
                  { to: "/catalog", label: "Browse Products" },
                  { to: "/track-order", label: "Track Order" },
                ].map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Social + Payment */}
            <div>
              <h4 className="font-semibold text-white mb-3">Follow Us</h4>
              <div className="flex gap-3 mb-6">
                {[
                  {
                    label: "Facebook",
                    href: "https://facebook.com",
                    icon: (
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.932-1.956 1.887v2.254h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
                      </svg>
                    ),
                  },
                  {
                    label: "Instagram",
                    href: "https://instagram.com",
                    icon: (
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    ),
                  },
                  {
                    label: "LinkedIn",
                    href: "https://linkedin.com",
                    icon: (
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    ),
                  },
                  {
                    label: "TikTok",
                    href: "https://tiktok.com",
                    icon: (
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                      </svg>
                    ),
                  },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                  >
                    {social.icon}
                  </a>
                ))}
              </div>

              <h4 className="font-semibold text-white mb-3">Secure Payments</h4>
              <div className="flex flex-wrap gap-2">
                {["Visa", "Mastercard", "Apple Pay", "Google Pay"].map((pay) => (
                  <span
                    key={pay}
                    className="bg-white/10 rounded px-2.5 py-1 text-xs font-medium text-white/80"
                  >
                    {pay}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/40">
            <p>© {new Date().getFullYear()} Loadify Market Ltd. All rights reserved.</p>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
