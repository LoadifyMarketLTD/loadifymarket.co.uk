import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Store, CheckCircle2, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { toast } from "@/hooks/use-toast";

/**
 * Legacy compatibility route.
 *
 * Buyer and Seller are no longer mutually exclusive account identities. A
 * normal account keeps Buyer access; choosing Seller starts the Marketplace
 * Seller activation relationship on the same Loadify identity.
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
        description: "Please sign in to continue.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
      return;
    }

    if (selected === "buyer") {
      navigate("/buyer", { replace: true });
      return;
    }

    if (user.role === "seller") {
      navigate(user.onboardingCompleted === false ? "/onboarding" : "/seller", { replace: true });
      return;
    }

    setLoading(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/start-seller-activation", {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        let message = "Please try again or contact support.";
        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Keep generic error for malformed payloads.
        }
        throw new Error(message);
      }

      toast({
        title: "Seller setup started",
        description: "Your Buyer access stays with this account while you complete Seller setup.",
      });
      navigate("/onboarding", { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again or contact support.";
      toast({ title: "Unable to start Seller setup", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main id="main-content" className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-surface p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign in to continue</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your Loadify account can be used for buying, and you can add Seller access to the same identity.
          </p>
          <Link to="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-bold text-black">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-9">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">One Loadify account</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Where do you want to go?</h1>
          <p className="mt-2 text-muted-foreground">
            Buying and selling can live under the same identity. Choosing a workspace does not erase the other.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-7">
          <button
            type="button"
            onClick={() => setSelected("buyer")}
            className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
              selected === "buyer" ? "border-primary bg-primary/10" : "border-white/10 bg-surface hover:border-primary/40"
            }`}
          >
            {selected === "buyer" && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
              <ShoppingBag className="h-6 w-6 text-secondary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Buyer Space</h2>
            <p className="mt-1 text-sm text-muted-foreground">Orders, tracking, returns, wishlist and account activity.</p>
          </button>

          <button
            type="button"
            onClick={() => setSelected("seller")}
            className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
              selected === "seller" ? "border-primary bg-primary/10" : "border-white/10 bg-surface hover:border-primary/40"
            }`}
          >
            {selected === "seller" && <CheckCircle2 className="absolute top-4 right-4 h-5 w-5 text-primary" />}
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Seller {user.role === "seller" ? "Workspace" : "Setup"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {user.role === "seller"
                ? "Continue managing your Marketplace Seller relationship."
                : "Add Marketplace Seller access without losing Buyer access."}
            </p>
          </button>
        </div>

        <button
          type="button"
          disabled={!selected || loading}
          onClick={handleContinue}
          className="w-full min-h-12 rounded-xl bg-primary hover:bg-primary-hover text-black text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Continue"}
        </button>
      </div>
    </main>
  );
};

export default RoleSelection;
