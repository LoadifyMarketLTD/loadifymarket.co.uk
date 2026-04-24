import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ChevronRight, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface ChecklistState {
  profileCompleted: boolean;
  stripeConnected: boolean;
  storeCreated: boolean;
  shippingSetupCompleted: boolean;
  firstProductCreated: boolean;
}

const ITEMS: {
  key: keyof ChecklistState;
  label: string;
  href: string;
  cta: string;
}[] = [
  { key: "profileCompleted",      label: "Complete your seller profile",     href: "/seller/profile",       cta: "Edit profile" },
  { key: "stripeConnected",       label: "Connect Stripe for payments",       href: "/onboarding",           cta: "Connect Stripe" },
  { key: "storeCreated",          label: "Set up your store",                 href: "/seller/settings",      cta: "Configure store" },
  { key: "shippingSetupCompleted",label: "Configure shipping methods",        href: "/seller/settings",      cta: "Set up shipping" },
  { key: "firstProductCreated",   label: "Add your first product",            href: "/seller/products/new",  cta: "Add product" },
];

/**
 * OnboardingChecklist
 *
 * Shown only to sellers who have not completed onboarding.
 * Renders a dismissible checklist card on the seller dashboard.
 */
export function OnboardingChecklist() {
  const { user } = useAuthStore();
  const [state, setState] = useState<ChecklistState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "seller") return;

    const load = async () => {
      const [spRes, prodRes] = await Promise.all([
        supabase
          .from("seller_profiles")
          .select([
            "profileCompleted",
            "stripeConnectStatus",
            "storeCreated",
            "shippingSetupCompleted",
            "firstProductCreated",
            // Legacy fallback fields
            "storeName", "businessName", "contactPhone", "businessAddress",
          ].join(", "))
          .eq("userId", user.id)
          .maybeSingle(),
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("sellerId", user.id),
      ]);

      const sp = spRes.data as Record<string, unknown> | null;
      const productCount = prodRes.count ?? 0;

      const profileCompleted =
        (sp?.profileCompleted as boolean | null) ??
        Boolean(
          ((sp?.storeName as string) ?? (sp?.businessName as string) ?? "").trim().length > 0 &&
          ((sp?.contactPhone as string) ?? "").trim().length > 0 &&
          ((sp?.businessAddress as { postcode?: string } | null)?.postcode ?? "").trim().length > 0
        );

      setState({
        profileCompleted,
        stripeConnected: (sp?.stripeConnectStatus as string) === "active",
        storeCreated: Boolean(sp?.storeCreated),
        shippingSetupCompleted: Boolean(sp?.shippingSetupCompleted),
        firstProductCreated: Boolean(sp?.firstProductCreated) || productCount > 0,
      });
      setLoading(false);
    };

    load().catch(() => setLoading(false));
  }, [user]);

  // Hide when all steps are complete, still loading, dismissed, or not a seller.
  if (!user || user.role !== "seller") return null;
  if (loading) return null;
  if (!state) return null;
  if (dismissed) return null;

  const allDone = Object.values(state).every(Boolean);
  if (allDone) return null;

  const completed = Object.values(state).filter(Boolean).length;
  const total = ITEMS.length;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 mb-6 relative">
      {/* Dismiss button */}
      <button
        type="button"
        aria-label="Dismiss checklist"
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 text-amber-400 hover:text-amber-600 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Header */}
      <div className="mb-4 pr-6">
        <h3 className="font-semibold text-amber-900 text-sm">Complete your seller setup</h3>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-amber-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round((completed / total) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-amber-700 shrink-0 font-medium">
            {completed}/{total}
          </span>
        </div>
      </div>

      {/* Items */}
      <ul className="space-y-2">
        {ITEMS.map(({ key, label, href, cta }) => {
          const done = state[key];
          return (
            <li key={key} className={`flex items-center gap-3 ${done ? "opacity-50" : ""}`}>
              {done ? (
                <CheckCircle2 className="h-4 w-4 text-amber-600 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-amber-300 shrink-0" />
              )}
              <span className={`text-sm flex-1 ${done ? "line-through text-amber-600" : "text-amber-900"}`}>
                {label}
              </span>
              {!done && (
                <Link
                  to={href}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 flex items-center gap-0.5 shrink-0"
                >
                  {cta} <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {/* Full wizard link */}
      <div className="mt-4 pt-3 border-t border-amber-200">
        <Link
          to="/onboarding"
          className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline"
        >
          Open setup wizard →
        </Link>
      </div>
    </div>
  );
}

export default OnboardingChecklist;
