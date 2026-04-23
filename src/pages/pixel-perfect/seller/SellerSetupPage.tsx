import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { CheckCircle2, XCircle, ArrowRight, RefreshCw, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { hasAdminAccess } from "@/lib/roleUtils";

interface SetupStatus {
  sellerStatus: string;
  profileComplete: boolean;
  stripeConnectStatus: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
}

const statusColors: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  submitted: "bg-amber-500/15 text-amber-700 border-amber-200",
  draft:     "bg-muted text-muted-foreground border-border",
  suspended: "bg-red-500/15 text-red-700 border-red-200",
};

const statusLabels: Record<string, string> = {
  active:    "Seller account active",
  submitted: "Setup in progress",
  draft:     "Setup required",
  suspended: "Seller account suspended",
};

function CheckRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      {done ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
      )}
      <span className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

/**
 * SellerSetupPage — shown to sellers whose account is not yet active.
 *
 * Displays the current activation checklist and clear next-step actions.
 * Accessible via RequireAuth only (not RequireSeller) so incomplete sellers
 * can reach this page.
 */
const SellerSetupPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      // Fetch seller profile fields
      const { data: profile } = await supabase
        .from("seller_profiles")
        .select("sellerStatus, storeName, businessName, contactPhone, businessAddress, stripeAccountId, stripeConnectStatus")
        .eq("userId", user.id)
        .single<{
          sellerStatus: string;
          storeName?: string | null;
          businessName?: string | null;
          contactPhone?: string | null;
          businessAddress?: { postcode?: string } | null;
          stripeAccountId?: string | null;
          stripeConnectStatus?: string | null;
        }>();

      if (!profile) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const profileComplete =
        ((profile.storeName ?? profile.businessName) ?? "").trim().length > 0 &&
        (profile.contactPhone ?? "").trim().length > 0 &&
        ((profile.businessAddress as { postcode?: string } | null)?.postcode ?? "").trim().length > 0;

      // If Stripe is connected, fetch live status from connect-status function.
      // Exception: when stripeConnectStatus is already 'active' in the DB, we
      // skip the Stripe API round-trip and call recheck-activation directly —
      // it uses the persisted DB value, which is sufficient to trigger activation
      // if the profile is now complete. This is the fix for sellers who completed
      // their profile after Stripe was already active (legacy stuck state).
      let chargesEnabled = false;
      let payoutsEnabled = false;
      let stripeConnectStatus: string | null = profile.stripeConnectStatus ?? null;

      if (profile.stripeConnectStatus === "active" || profile.stripeAccountId) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (token) {
          if (profile.stripeConnectStatus === "active") {
            // DB confirms Stripe is fully active — set charges/payouts from the
            // persisted DB value BEFORE attempting the backend call. This way the
            // checklist stays correct even if the function call fails or returns
            // a non-ok status (cold start, 404, network blip, etc.).
            chargesEnabled = true;
            payoutsEnabled = true;
            // Re-evaluate sellerStatus server-side in case the profile was just
            // completed while Stripe was already active (legacy stuck state).
            try {
              const res = await fetch("/.netlify/functions/recheck-activation", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.sellerStatus) {
                  profile.sellerStatus = data.sellerStatus;
                }
              }
            } catch {
              // Non-fatal — sellerStatus falls back to the cached DB value
            }
          } else {
            // Stripe status not yet confirmed active: fetch live state from Stripe
            // via connect-status so we can show accurate charges/payouts flags and
            // potentially transition stripeConnectStatus to 'active'.
            try {
              const res = await fetch("/.netlify/functions/connect-status", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                stripeConnectStatus = data.stripeConnectStatus ?? stripeConnectStatus;
                chargesEnabled = data.chargesEnabled ?? false;
                payoutsEnabled = data.payoutsEnabled ?? false;
                // Use server-computed sellerStatus if returned
                if (data.sellerStatus) {
                  profile.sellerStatus = data.sellerStatus;
                }
              }
            } catch {
              // Non-fatal — use cached values
            }
          }
        }
      }

      setStatus({
        sellerStatus: profile.sellerStatus,
        profileComplete,
        stripeConnectStatus,
        chargesEnabled,
        payoutsEnabled,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh once if returning from Stripe Connect (?connect=success|refresh)
    const connectParam = searchParams.get("connect");
    if (connectParam === "success" || connectParam === "refresh") {
      const timer = setTimeout(() => fetchStatus(), 2000);
      return () => clearTimeout(timer);
    }
  }, [fetchStatus, searchParams]);

  // Redirect active sellers to the seller dashboard
  useEffect(() => {
    if (status?.sellerStatus === "active") {
      const timer = setTimeout(() => navigate("/seller", { replace: true }), 1500);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  // Redirect non-sellers to their own dashboard.
  // RequireAuth is intentionally used at the route level (not RequireSeller) so that
  // draft/submitted sellers can complete onboarding, but buyers and admins must not land here.
  if (user && hasAdminAccess(user)) return <Navigate to="/admin" replace />;
  if (user && user.role !== 'seller') return <Navigate to="/buyer" replace />;

  const handleConnectStripe = async () => {
    if (!user) return;
    setStripeLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");
      const res = await fetch("/.netlify/functions/connect-onboard", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start Stripe setup");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error("Stripe Connect error:", err);
    } finally {
      setStripeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-10">
            <p className="text-muted-foreground">Unable to load seller status. Please refresh the page.</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stripeConnected = !!status.stripeConnectStatus;
  const stripeReady = status.stripeConnectStatus === "active";
  const stripeIncomplete = stripeConnected && !stripeReady;

  return (
    <div className="min-h-screen bg-white py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Seller Setup</h1>
          <p className="text-muted-foreground text-sm">
            Complete these steps to activate your seller account.
          </p>
        </div>

        {/* Status badge */}
        <div className="flex justify-center">
          <Badge
            variant="outline"
            className={`text-sm px-4 py-1.5 ${statusColors[status.sellerStatus] ?? statusColors.draft}`}
          >
            {statusLabels[status.sellerStatus] ?? status.sellerStatus}
          </Badge>
        </div>

        {/* Active state — brief confirmation before redirect */}
        {status.sellerStatus === "active" && (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-6 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <p className="font-semibold text-emerald-700">Your seller account is active!</p>
              <p className="text-sm text-emerald-600">Redirecting you to your seller dashboard…</p>
              <Button asChild className="bg-gradient-hero text-primary-foreground">
                <Link to="/seller">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Suspended state */}
        {status.sellerStatus === "suspended" && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center space-y-3">
              <p className="font-semibold text-red-700">Your seller account has been suspended.</p>
              <p className="text-sm text-red-600">
                Please contact our support team if you believe this is an error.
              </p>
              <Button asChild variant="outline">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Activation checklist */}
        {status.sellerStatus !== "suspended" && status.sellerStatus !== "active" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activation Checklist</CardTitle>
              <CardDescription>
                Your account will be activated automatically once all steps are complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border px-6 pb-6">
              <CheckRow label="Seller account created" done={true} />
              <CheckRow label="Business profile complete (name, phone, address)" done={status.profileComplete} />
              <CheckRow label="Stripe account connected" done={stripeConnected} />
              <CheckRow label="Stripe charges enabled" done={status.chargesEnabled} />
              <CheckRow label="Stripe payouts enabled" done={status.payoutsEnabled} />
            </CardContent>
          </Card>
        )}

        {/* Action cards */}
        {status.sellerStatus !== "suspended" && status.sellerStatus !== "active" && (
          <div className="space-y-3">
            {/* Step 1: Complete profile */}
            {!status.profileComplete && (
              <Card className="border-amber-200">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-sm font-bold text-amber-700">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Complete your seller profile</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Add your business name, contact phone number, and business address.
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link to="/seller/profile">
                      Edit Profile <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Connect Stripe */}
            {status.profileComplete && !stripeReady && (
              <Card className="border-amber-200">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-sm font-bold text-amber-700">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">
                      {stripeIncomplete ? "Complete your Stripe setup" : "Connect your Stripe account"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stripeIncomplete
                        ? "Your Stripe account is connected but still requires additional information."
                        : "Connect a Stripe account to receive payments for your sales."}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleConnectStripe}
                    disabled={stripeLoading}
                    className="bg-gradient-hero text-primary-foreground"
                  >
                    {stripeLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {stripeIncomplete ? "Continue Setup" : "Connect Stripe"}
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Refresh + nav */}
        {status.sellerStatus !== "active" && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              disabled={refreshing}
              className="text-muted-foreground"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check status
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
              <Link to="/">Back to site</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerSetupPage;
