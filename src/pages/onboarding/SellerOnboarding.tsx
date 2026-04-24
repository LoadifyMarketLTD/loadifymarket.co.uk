import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  CheckCircle2, Circle, ChevronRight, Loader2, ExternalLink,
  User, Building2, CreditCard, Store, Truck, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { hasAdminAccess } from "@/lib/roleUtils";
import { toast } from "@/hooks/use-toast";

/** Total number of onboarding steps for a seller. Used when marking completion. */
const ONBOARDING_TOTAL_STEPS = 5;
/** DB value written to onboardingStep when all steps are complete. */
const ONBOARDING_COMPLETE_STEP = 8;

/**
 * /onboarding
 *
 * Multi-step seller onboarding wizard. Shown to sellers whose
 * onboardingCompleted flag is false. Admins bypass automatically.
 *
 * Steps:
 *   1 – Account type (individual / business)
 *   2 – Profile details
 *   3 – Stripe Connect
 *   4 – Store + shipping
 *   5 – First product
 *
 * Completion logic: all step-flags must be true → onboardingCompleted=true.
 */

interface OnboardingState {
  accountType: string | null;
  profileCompleted: boolean;
  stripeConnectStatus: string | null;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  storeCreated: boolean;
  shippingSetupCompleted: boolean;
  firstProductCreated: boolean;
  onboardingCompleted: boolean;
}

const STEPS = [
  { id: 1, label: "Account type",   icon: User },
  { id: 2, label: "Profile details", icon: Building2 },
  { id: 3, label: "Stripe Connect",  icon: CreditCard },
  { id: 4, label: "Store & shipping",icon: Store },
  { id: 5, label: "First product",   icon: Package },
];

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{
          width: `${Math.round((current / total) * 100)}%`,
          background: "linear-gradient(90deg, #16A34A, #22C55E)",
        }}
      />
    </div>
  );
}

function StepDot({ step, current, done }: { step: number; current: number; done: boolean }) {
  const Icon = STEPS[step - 1].icon;
  const isActive = step === current;
  return (
    <div className={`flex flex-col items-center gap-1 ${step > current && !done ? "opacity-40" : ""}`}>
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
          done
            ? "bg-[#22C55E] border-[#22C55E] text-white"
            : isActive
            ? "bg-white border-[#22C55E] text-[#22C55E]"
            : "bg-white border-gray-200 text-gray-400"
        }`}
      >
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
      </div>
      <span className={`text-[10px] font-medium hidden sm:block ${isActive ? "text-[#16A34A]" : "text-gray-400"}`}>
        {STEPS[step - 1].label}
      </span>
    </div>
  );
}

// ─── Step 1: Account Type ─────────────────────────────────────────────────────
function StepAccountType({
  value,
  onSelect,
  onNext,
  saving,
}: {
  value: string | null;
  onSelect: (v: "individual" | "business") => void;
  onNext: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">What type of seller are you?</h2>
        <p className="text-sm text-gray-500 mt-1">This helps us tailor your experience.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { v: "individual" as const, label: "Individual", desc: "Sole trader or private seller" },
          { v: "business"   as const, label: "Business",   desc: "Registered company or organisation" },
        ].map(({ v, label, desc }) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className={`rounded-xl border-2 p-5 text-left transition-all ${
              value === v
                ? "border-[#22C55E] bg-[#f0fdf4]"
                : "border-gray-200 bg-white hover:border-[#86efac]"
            }`}
          >
            <p className="font-semibold text-gray-900">{label}</p>
            <p className="text-sm text-gray-500 mt-0.5">{desc}</p>
          </button>
        ))}
      </div>
      <Button
        onClick={onNext}
        disabled={!value || saving}
        className="w-full bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Continue <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

// ─── Step 2: Profile Details ──────────────────────────────────────────────────
function StepProfile({
  done,
  onNext,
}: {
  done: boolean;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Complete your seller profile</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add your business name, contact phone, and address so buyers can trust you.
        </p>
      </div>
      {done ? (
        <div className="flex items-center gap-3 rounded-xl bg-[#f0fdf4] border border-[#86efac] p-4">
          <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
          <p className="text-sm text-[#16A34A] font-medium">Profile completed ✓</p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Head to your{" "}
          <a href="/seller/profile" className="text-[#16A34A] underline font-medium">
            Seller Profile
          </a>{" "}
          page and fill in the required fields.
        </p>
      )}
      <Button
        onClick={onNext}
        disabled={!done}
        className="w-full bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white disabled:opacity-40"
      >
        Continue <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
      {!done && (
        <Button asChild variant="outline" className="w-full">
          <a href="/seller/profile">Go to Profile →</a>
        </Button>
      )}
    </div>
  );
}

// ─── Step 3: Stripe Connect ───────────────────────────────────────────────────
function StepStripe({
  state,
  onConnect,
  onNext,
  connecting,
}: {
  state: OnboardingState;
  onConnect: () => void;
  onNext: () => void;
  connecting: boolean;
}) {
  const fullyActive =
    state.stripeConnectStatus === "active" &&
    state.stripeChargesEnabled &&
    state.stripePayoutsEnabled;

  const connected = !!state.stripeConnectStatus;
  const incomplete = connected && !fullyActive;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Connect Stripe to receive payments</h2>
        <p className="text-sm text-gray-500 mt-1">
          Stripe handles all identity verification and payouts. No manual KYC required.
        </p>
      </div>

      {fullyActive ? (
        <div className="flex items-center gap-3 rounded-xl bg-[#f0fdf4] border border-[#86efac] p-4">
          <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
          <p className="text-sm text-[#16A34A] font-medium">Stripe fully connected ✓</p>
        </div>
      ) : incomplete ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
          Your Stripe account is connected but not yet fully verified. Continue setup to enable
          charges and payouts.
        </div>
      ) : null}

      <div className="space-y-3">
        {!fullyActive && (
          <Button
            onClick={onConnect}
            disabled={connecting}
            className="w-full bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            {incomplete ? "Continue Stripe setup" : "Connect Stripe"}
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={!fullyActive}
          variant={fullyActive ? "default" : "outline"}
          className={`w-full ${fullyActive ? "bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white" : ""}`}
        >
          Continue <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Store & Shipping ─────────────────────────────────────────────────
function StepStore({
  storeCreated,
  shippingDone,
  onNext,
}: {
  storeCreated: boolean;
  shippingDone: boolean;
  onNext: () => void;
}) {
  const allDone = storeCreated && shippingDone;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Set up your store &amp; shipping</h2>
        <p className="text-sm text-gray-500 mt-1">Configure your store details and shipping options.</p>
      </div>

      <div className="space-y-3">
        <div className={`flex items-center gap-3 rounded-xl border p-4 ${storeCreated ? "bg-[#f0fdf4] border-[#86efac]" : "border-gray-200"}`}>
          {storeCreated ? (
            <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-gray-300 shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Store profile</p>
            <p className="text-xs text-gray-500">Name, logo, description</p>
          </div>
          {!storeCreated && (
            <a href="/seller/settings" className="text-xs text-[#16A34A] underline shrink-0">
              Configure →
            </a>
          )}
        </div>

        <div className={`flex items-center gap-3 rounded-xl border p-4 ${shippingDone ? "bg-[#f0fdf4] border-[#86efac]" : "border-gray-200"}`}>
          {shippingDone ? (
            <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
          ) : (
            <Truck className="h-5 w-5 text-gray-300 shrink-0" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Shipping methods</p>
            <p className="text-xs text-gray-500">Rates, delivery zones</p>
          </div>
          {!shippingDone && (
            <a href="/seller/settings" className="text-xs text-[#16A34A] underline shrink-0">
              Configure →
            </a>
          )}
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!allDone}
        className="w-full bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white disabled:opacity-40"
      >
        Continue <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

// ─── Step 5: First Product ────────────────────────────────────────────────────
function StepProduct({
  done,
  onFinish,
  finishing,
}: {
  done: boolean;
  onFinish: () => void;
  finishing: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Add your first product</h2>
        <p className="text-sm text-gray-500 mt-1">
          List your first item to make your store live for buyers.
        </p>
      </div>

      {done ? (
        <div className="flex items-center gap-3 rounded-xl bg-[#f0fdf4] border border-[#86efac] p-4">
          <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
          <p className="text-sm text-[#16A34A] font-medium">First product listed ✓</p>
        </div>
      ) : (
        <Button asChild variant="outline" className="w-full">
          <a href="/seller/products/new">Add a Product →</a>
        </Button>
      )}

      <Button
        onClick={onFinish}
        disabled={!done || finishing}
        className="w-full bg-gradient-to-r from-[#16A34A] to-[#22C55E] text-white disabled:opacity-40"
      >
        {finishing ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        Complete Setup 🎉
      </Button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const SellerOnboarding = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    accountType: null,
    profileCompleted: false,
    stripeConnectStatus: null,
    stripeChargesEnabled: false,
    stripePayoutsEnabled: false,
    stripeDetailsSubmitted: false,
    storeCreated: false,
    shippingSetupCompleted: false,
    firstProductCreated: false,
    onboardingCompleted: false,
  });

  // Admins bypass onboarding entirely.
  if (user && hasAdminAccess(user)) return <Navigate to="/admin" replace />;
  // Buyers have no onboarding wizard.
  if (user && user.role === "buyer") return <Navigate to="/buyer" replace />;

  // Load current onboarding state.
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Fetch seller profile flags + user onboarding flag.
      const [spRes, uRes] = await Promise.all([
        supabase
          .from("seller_profiles")
          .select([
            "accountType",
            "profileCompleted",
            "stripeConnectStatus",
            "stripeChargesEnabled",
            "stripePayoutsEnabled",
            "stripeDetailsSubmitted",
            "storeCreated",
            "shippingSetupCompleted",
            "firstProductCreated",
            // Also derive profileCompleted from existing fields if new col is null
            "storeName", "businessName", "contactPhone", "businessAddress",
          ].join(", "))
          .eq("userId", user.id)
          .maybeSingle(),
        supabase
          .from("users")
          .select("onboardingCompleted, onboardingStep")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      const sp = spRes.data as Record<string, unknown> | null;
      const u = uRes.data as Record<string, unknown> | null;

      if (u?.onboardingCompleted === true) {
        // Already completed — go to seller dashboard.
        navigate("/seller", { replace: true });
        return;
      }

      // Derive profileCompleted if the DB column is not yet populated.
      const profileCompleted =
        (sp?.profileCompleted as boolean | null) ??
        Boolean(
          ((sp?.storeName as string) ?? (sp?.businessName as string) ?? "").trim().length > 0 &&
          ((sp?.contactPhone as string) ?? "").trim().length > 0 &&
          ((sp?.businessAddress as { postcode?: string } | null)?.postcode ?? "").trim().length > 0
        );

      // Derive firstProductCreated from products table if flag not set.
      let firstProductCreated = Boolean(sp?.firstProductCreated);
      if (!firstProductCreated) {
        const { count } = await supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("sellerId", user.id);
        firstProductCreated = (count ?? 0) > 0;
      }

      const newState: OnboardingState = {
        accountType: (sp?.accountType as string | null) ?? null,
        profileCompleted,
        stripeConnectStatus: (sp?.stripeConnectStatus as string | null) ?? null,
        stripeChargesEnabled: Boolean(sp?.stripeChargesEnabled),
        stripePayoutsEnabled: Boolean(sp?.stripePayoutsEnabled),
        stripeDetailsSubmitted: Boolean(sp?.stripeDetailsSubmitted),
        storeCreated: Boolean(sp?.storeCreated),
        shippingSetupCompleted: Boolean(sp?.shippingSetupCompleted),
        firstProductCreated,
        onboardingCompleted: Boolean(u?.onboardingCompleted),
      };

      setState(newState);

      // Determine the current step based on what's already done.
      const inferredStep = inferStep(newState);
      setStep(inferredStep);
      setLoading(false);
    };

    load().catch((err) => {
      console.error("Onboarding load error:", err);
      setLoading(false);
    });
  }, [user, navigate]);

  function inferStep(s: OnboardingState): number {
    if (!s.accountType) return 1;
    if (!s.profileCompleted) return 2;
    if (s.stripeConnectStatus !== "active" || !s.stripeChargesEnabled || !s.stripePayoutsEnabled) return 3;
    if (!s.storeCreated || !s.shippingSetupCompleted) return 4;
    if (!s.firstProductCreated) return 5;
    return 5;
  }

  // ── Step handlers ─────────────────────────────────────────────────────────

  const saveAccountType = async (type: "individual" | "business") => {
    setState((prev) => ({ ...prev, accountType: type }));
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from("seller_profiles")
        .update({ accountType: type })
        .eq("userId", user.id);
    } finally {
      setSaving(false);
    }
  };

  const advanceStep = () => setStep((s) => Math.min(s + 1, ONBOARDING_TOTAL_STEPS));

  const handleStripeConnect = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/.netlify/functions/connect-onboard", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start Stripe setup");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      toast({
        title: "Stripe Connect error",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleFinish = async () => {
    if (!user) return;
    setFinishing(true);
    try {
      await supabase
        .from("users")
        .update({ onboardingCompleted: true, onboardingStep: ONBOARDING_COMPLETE_STEP })
        .eq("id", user.id);
      toast({ title: "Setup complete! 🎉", description: "Your seller account is now live." });
      navigate("/seller", { replace: true });
    } catch (err) {
      console.error("Finish onboarding error:", err);
      toast({ title: "Error", description: "Please try again.", variant: "destructive" });
    } finally {
      setFinishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#22C55E]" />
      </div>
    );
  }

  const completedSteps = [
    Boolean(state.accountType),
    state.profileCompleted,
    state.stripeConnectStatus === "active" && state.stripeChargesEnabled && state.stripePayoutsEnabled,
    state.storeCreated && state.shippingSetupCompleted,
    state.firstProductCreated,
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Seller Setup</h1>
          <p className="text-sm text-gray-500 mt-1">
            Step {step} of {STEPS.length}
          </p>
        </div>

        {/* Progress bar */}
        <ProgressBar current={completedSteps.filter(Boolean).length} total={STEPS.length} />

        {/* Step dots */}
        <div className="flex items-start justify-between px-2">
          {STEPS.map((s) => (
            <StepDot key={s.id} step={s.id} current={step} done={completedSteps[s.id - 1]} />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === 1 && (
            <StepAccountType
              value={state.accountType}
              onSelect={saveAccountType}
              onNext={advanceStep}
              saving={saving}
            />
          )}
          {step === 2 && (
            <StepProfile done={state.profileCompleted} onNext={advanceStep} />
          )}
          {step === 3 && (
            <StepStripe
              state={state}
              onConnect={handleStripeConnect}
              onNext={advanceStep}
              connecting={connecting}
            />
          )}
          {step === 4 && (
            <StepStore
              storeCreated={state.storeCreated}
              shippingDone={state.shippingSetupCompleted}
              onNext={advanceStep}
            />
          )}
          {step === 5 && (
            <StepProduct
              done={state.firstProductCreated}
              onFinish={handleFinish}
              finishing={finishing}
            />
          )}
        </div>

        {/* Skip to dashboard (incomplete sellers allowed into dashboard with warning) */}
        {step < 5 && (
          <p className="text-center text-xs text-gray-400">
            <button
              type="button"
              className="underline hover:text-gray-600"
              onClick={() => navigate("/seller", { replace: true })}
            >
              Skip for now — go to dashboard
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default SellerOnboarding;
