import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingBag, Store, CheckCircle2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

/** First step in the seller onboarding wizard. */
const SELLER_INITIAL_STEP = 1;
/** Buyers complete onboarding immediately — no wizard steps. */
const BUYER_ONBOARDING_STEP = 0;

/**
 * /onboarding/role-selection
 *
 * Post-signup step where the user selects Buyer or Seller.
 * - Buyer  → sets role=buyer, onboardingCompleted=true, redirects /buyer
 * - Seller → sets role=seller, onboardingCompleted=false, redirects /onboarding
 *
 * The userId is passed as ?uid= from the signup flow so that the role can be
 * persisted even before the user has an active session (email confirmation pending).
 * If the user already has a session in the auth store, their id takes precedence.
 */
const RoleSelection = () => {
  const [selected, setSelected] = useState<"buyer" | "seller" | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  // Resolve user ID — prefer live session, fall back to ?uid= param from signup.
  const uid = user?.id ?? searchParams.get("uid");

  const handleContinue = async () => {
    if (!selected || !uid) return;
    setLoading(true);

    try {
      // Update role and onboarding state in the users table.
      const { error } = await supabase
        .from("users")
        .update({
          role: selected,
          onboardingCompleted: selected === "buyer",
          onboardingStep: selected === "seller" ? SELLER_INITIAL_STEP : BUYER_ONBOARDING_STEP,
        })
        .eq("id", uid);

      if (error) throw error;

      toast({
        title: selected === "buyer" ? "Welcome to Loadify Market!" : "Let's set up your seller account",
        description:
          selected === "buyer"
            ? "Your buyer account is ready."
            : "Complete the setup steps to start selling.",
      });

      if (selected === "buyer") {
        navigate("/buyer", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    } catch (err) {
      console.error("Role selection error:", err);
      toast({
        title: "Something went wrong",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">How will you use Loadify Market?</h1>
          <p className="text-gray-500 text-base">Choose your account type to get started.</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Buyer */}
          <button
            type="button"
            onClick={() => setSelected("buyer")}
            className={`relative rounded-2xl border-2 p-7 text-left transition-all focus:outline-none ${
              selected === "buyer"
                ? "border-[#22C55E] bg-[#f0fdf4] shadow-lg shadow-green-100"
                : "border-gray-200 bg-white hover:border-[#86efac] hover:shadow-md"
            }`}
          >
            {selected === "buyer" && (
              <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-[#22C55E]" />
            )}
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">I'm a Buyer</h2>
            <p className="text-sm text-gray-500 leading-snug">
              Browse products, place orders, and manage your purchases.
            </p>
          </button>

          {/* Seller */}
          <button
            type="button"
            onClick={() => setSelected("seller")}
            className={`relative rounded-2xl border-2 p-7 text-left transition-all focus:outline-none ${
              selected === "seller"
                ? "border-[#22C55E] bg-[#f0fdf4] shadow-lg shadow-green-100"
                : "border-gray-200 bg-white hover:border-[#86efac] hover:shadow-md"
            }`}
          >
            {selected === "seller" && (
              <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-[#22C55E]" />
            )}
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <Store className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">I'm a Seller</h2>
            <p className="text-sm text-gray-500 leading-snug">
              List products, manage your store, and receive payments via Stripe.
            </p>
          </button>
        </div>

        {/* Continue button */}
        <button
          type="button"
          disabled={!selected || loading}
          onClick={handleContinue}
          className="w-full h-12 rounded-xl text-white text-[15px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #16A34A 0%, #22C55E 100%)",
            boxShadow: selected ? "0 4px 16px rgba(34,197,94,0.4)" : "none",
          }}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Continue →"
          )}
        </button>

        {/* Note */}
        <p className="text-center text-xs text-gray-400 mt-4">
          You can update your account type later in Settings.
        </p>
      </div>
    </div>
  );
};

export default RoleSelection;
