import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface ChecklistState {
  profileCompleted: boolean;
  addressAdded: boolean;
  payoutSetup: boolean;
  firstProductCreated: boolean;
  productShared: boolean;
}

const ITEMS: {
  key: keyof ChecklistState;
  label: string;
  href: string;
  cta: string;
}[] = [
  { key: "profileCompleted",    label: "Complete your seller profile",  href: "/seller/profile",       cta: "Edit profile" },
  { key: "addressAdded",        label: "Add your business address",     href: "/seller/profile",       cta: "Add address" },
  { key: "payoutSetup",         label: "Set up payout",                 href: "/onboarding",           cta: "Connect Stripe" },
  { key: "firstProductCreated", label: "List your first product",       href: "/seller/products/new",  cta: "Add product" },
  { key: "productShared",       label: "Share a product",               href: "/seller/products",      cta: "Share now" },
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

  useEffect(() => {
    if (!user || user.role !== "seller") return;

    const load = async () => {
      const [spRes, prodCountRes, sharedCountRes] = await Promise.all([
        supabase
          .from("seller_profiles")
          .select([
            "profileCompleted",
            "stripeConnectStatus",
            "hasServiceCapability",
            // Fallback fields used to derive completion from real persisted data
            "storeName", "businessName", "contactPhone", "businessAddress",
          ].join(", "))
          .eq("userId", user.id)
          .maybeSingle(),
        // Count-only: how many products has this seller listed?
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("sellerId", user.id),
        // Count-only: how many products have been shared at least once?
        supabase
          .from("products")
          .select("id", { count: "exact", head: true })
          .eq("sellerId", user.id)
          .gt("shareCount", 0),
      ]);

      const sp = spRes.data as Record<string, unknown> | null;
      const productCount = prodCountRes.count ?? 0;

      const profileCompleted =
        (sp?.profileCompleted as boolean | null) ??
        Boolean(
          ((sp?.storeName as string) ?? (sp?.businessName as string) ?? "").trim().length > 0 &&
          ((sp?.contactPhone as string) ?? "").trim().length > 0 &&
          ((sp?.businessAddress as { postcode?: string } | null)?.postcode ?? "").trim().length > 0
        );

      // addressAdded: businessAddress must have at least a postcode
      const bAddr = sp?.businessAddress as { postcode?: string; address?: string } | null;
      const addressAdded = Boolean(bAddr?.postcode?.trim() || bAddr?.address?.trim());

      // payoutSetup: Stripe Connect active
      const payoutSetup = (sp?.stripeConnectStatus as string) === "active";

      // firstProductCreated: has at least one product
      const firstProductCreated =
        Boolean(sp?.hasServiceCapability) || productCount > 0;

      // productShared: any product has been shared at least once (shareCount > 0)
      const productShared = (sharedCountRes.count ?? 0) > 0;

      setState({
        profileCompleted,
        addressAdded,
        payoutSetup,
        firstProductCreated,
        productShared,
      });
      setLoading(false);
    };

    load().catch(() => setLoading(false));
  }, [user]);

  // Hide when all steps are complete, still loading, or not a seller.
  if (!user || user.role !== "seller") return null;
  if (loading) return null;
  if (!state) return null;

  const allDone = Object.values(state).every(Boolean);
  if (allDone) return null;

  const completed = Object.values(state).filter(Boolean).length;
  const total = ITEMS.length;

  return (
    <Link
      to="/onboarding"
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 active:bg-primary/15 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <div
              className="rounded-full"
              style={{
                width: "10px", height: "10px",
                background: `conic-gradient(#FBBF24 ${Math.round((completed / total) * 360)}deg, transparent 0deg)`,
              }}
            />
          </div>
          <span className="text-[13px] font-semibold text-foreground">
            Complete setup ({completed}/{total})
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-primary shrink-0" />
    </Link>
  );
}

export default OnboardingChecklist;
