import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, Store, CheckCircle2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { toast } from "@/hooks/use-toast";

/**
 * /onboarding/role-selection
 *
 * Post-signup step where the user selects Buyer or Seller.
 * - Buyer  → sets role=buyer, onboardingCompleted=true, redirects /buyer
 * - Seller → sets role=seller, onboardingCompleted=false, redirects /onboarding
 *
 * Role updates are performed server-side and allowed only for the
 * authenticated session user.
 */
const RoleSelection = () => {
  const [selected, setSelected] = useState<"buyer" | "seller" | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleContinue = async () => {
    if (!selected || !user?.id) {
      toast({
        title: "Sign-in required",
        description: "Please sign in to continue onboarding.",
        variant: "destructive",
      });
      navigate("/auth", { replace: true });
      return;
    }
    setLoading(true);

    try {
      const response = await authorizedFetch("/.netlify/functions/set-account-role", {
        method: "POST",
        body: JSON.stringify({ role: selected }),
      });
      if (!response.ok) {
        let message = "Please try again or contact support.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload?.error) message = payload.error;
        } catch {
          // ignore malformed response payloads
        }
        throw new Error(message);
      }

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
      const message = err instanceof Error ? err.message : "Please try again or contact support.";
      toast({
        title: "Something went wrong",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground mb-2">How will you use Loadify Market?</h1>
          <p className="text-muted-foreground text-base">Choose your account type to get started.</p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Buyer */}
          <button
            type="button"
            onClick={() => setSelected("buyer")}
            className={`relative rounded-2xl border-2 p-7 text-left transition-all focus:outline-none ${
              selected === "buyer"
                ? "border-success bg-success/10 shadow-lg shadow-success/20"
                : "border-white/10 bg-surface hover:border-success/40 hover:shadow-md"
            }`}
          >
            {selected === "buyer" && (
              <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-success" />
            )}
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
              <ShoppingBag className="h-6 w-6 text-secondary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">I'm a Buyer</h2>
            <p className="text-sm text-muted-foreground leading-snug">
              Browse products, place orders, and manage your purchases.
            </p>
          </button>

          {/* Seller */}
          <button
            type="button"
            onClick={() => setSelected("seller")}
            className={`relative rounded-2xl border-2 p-7 text-left transition-all focus:outline-none ${
              selected === "seller"
                ? "border-success bg-success/10 shadow-lg shadow-success/20"
                : "border-white/10 bg-surface hover:border-success/40 hover:shadow-md"
            }`}
          >
            {selected === "seller" && (
              <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-success" />
            )}
            <div className="w-12 h-12 rounded-xl bg-primary-soft flex items-center justify-center mb-4">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">I'm a Seller</h2>
            <p className="text-sm text-muted-foreground leading-snug">
              List products, manage your store, and receive payments via Stripe.
            </p>
          </button>
        </div>

        {/* Continue button */}
        <button
          type="button"
          disabled={!selected || loading}
          onClick={handleContinue}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary-hover text-black text-[15px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Continue →"
          )}
        </button>

        {/* Note */}
        <p className="text-center text-xs text-muted-foreground mt-4">
          You can update your account type later in Settings.
        </p>
      </div>
    </div>
  );
};

export default RoleSelection;
