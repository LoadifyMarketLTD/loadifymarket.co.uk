import { useState, useEffect } from "react";
import {
  Bell, Shield, CreditCard, Truck,
  Eye, EyeOff, Save, ExternalLink, CheckCircle, AlertCircle, Loader2, Pause, Play, Trash2,
  XCircle, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { authorizedFetch } from "@/lib/authorizedFetch";
import { openExternalUrl } from "@/lib/capacitorUtils";
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";
import { safeLocalStorage } from "@/lib/safeStorage";

const SHIPPING_STORAGE_KEY = "loadify_seller_shipping_defaults";

const defaultNotifications = {
  orderAlerts: true,
  returnAlerts: true,
  marketingEmails: false,
};

const defaultShipping = {
  carrier: "royal_mail",
  dispatchTime: "2",
  originPostcode: "",
  freeShippingThreshold: "",
};

const normalizeCarrier = (carrier?: string) => {
  if (carrier === "evri" || carrier === "hermes") return "evri";
  return "royal_mail";
};

type FulfilmentAddress = {
  recipientOrBusinessName: string;
  line1: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
  country: string;
  countryCode: string;
};

const emptyFulfilmentAddress: FulfilmentAddress = {
  recipientOrBusinessName: "", line1: "", line2: "", city: "", county: "", postcode: "", country: "United Kingdom", countryCode: "GB",
};

const SellerSettings = () => {
  const { user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState<typeof defaultNotifications>(defaultNotifications);
  const [shipping, setShipping] = useState<typeof defaultShipping>(defaultShipping);
  const [shippingOriginAddress, setShippingOriginAddress] = useState<FulfilmentAddress>(emptyFulfilmentAddress);
  const [returnAddress, setReturnAddress] = useState<FulfilmentAddress>(emptyFulfilmentAddress);
  const [useShippingOriginAsReturn, setUseShippingOriginAsReturn] = useState(true);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Stripe Connect state
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<"active" | "pending" | "restricted" | null>(null);

  // Load notification prefs, shipping defaults, and Stripe status from DB on mount
  // Mapping: orderAlerts→orderConfirmation, returnAlerts→shippingUpdates, marketingEmails→promotionalEmails
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: notifData }, { data: profileData }, { data: fulfilmentData }] = await Promise.all([
        supabase
          .from("notification_settings")
          .select("orderConfirmation, shippingUpdates, promotionalEmails")
          .eq("userId", user.id)
          .maybeSingle(),
        supabase
          .from("seller_profiles")
          .select("shippingDefaults, stripeConnectStatus")
          .eq("userId", user.id)
          .maybeSingle(),
        supabase
          .from("seller_fulfilment_profiles")
          .select("shippingOriginAddress, returnAddress, useShippingOriginAsReturn")
          .eq("sellerId", user.id)
          .maybeSingle(),
      ]);
      if (notifData) {
        setNotifications((prev) => ({
          ...prev,
          orderAlerts: notifData.orderConfirmation ?? prev.orderAlerts,
          returnAlerts: notifData.shippingUpdates ?? prev.returnAlerts,
          marketingEmails: notifData.promotionalEmails ?? prev.marketingEmails,
        }));
      }
      // Load Stripe Connect status
      if (profileData?.stripeConnectStatus) {
        setStripeConnectStatus(
          profileData.stripeConnectStatus as "active" | "pending" | "restricted"
        );
      }
      // Load shipping defaults: prefer DB, fall back to localStorage
      const dbShipping = profileData?.shippingDefaults as Partial<typeof defaultShipping> | null;
      if (dbShipping && typeof dbShipping === "object") {
        setShipping({ ...defaultShipping, ...dbShipping, carrier: normalizeCarrier(dbShipping.carrier) });
      } else {
        const raw = safeLocalStorage.getItem(SHIPPING_STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<typeof defaultShipping>;
            setShipping({ ...defaultShipping, ...parsed, carrier: normalizeCarrier(parsed.carrier) });
          } catch { /* ignore malformed data */ }
        }
      }
      if (fulfilmentData) {
        if (fulfilmentData.shippingOriginAddress) setShippingOriginAddress({ ...emptyFulfilmentAddress, ...(fulfilmentData.shippingOriginAddress as Partial<FulfilmentAddress>) });
        if (fulfilmentData.returnAddress) setReturnAddress({ ...emptyFulfilmentAddress, ...(fulfilmentData.returnAddress as Partial<FulfilmentAddress>) });
        setUseShippingOriginAsReturn(fulfilmentData.useShippingOriginAsReturn ?? true);
      }
    };
    load();
  }, [user]);

  const toggleNotification = (key: keyof typeof defaultNotifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSaveSettings = async () => {
    if (!user) return;
    setSaveLoading(true);
    let passwordChanged = false;
    try {
      // Persist notification preferences to DB (notification_settings)
      // deliveryConfirmation mirrors orderAlerts — both are "order lifecycle" events
      await supabase.from("notification_settings").upsert(
        {
          userId: user.id,
          orderConfirmation: notifications.orderAlerts,
          shippingUpdates: notifications.returnAlerts,
          deliveryConfirmation: notifications.orderAlerts,
          promotionalEmails: notifications.marketingEmails,
        },
        { onConflict: "userId" }
      );

      // Persist shipping defaults to DB (seller_profiles.shippingDefaults) and localStorage as fallback.
      // Also set shippingSetupCompleted=true to mark the onboarding step done.
      const { error: shippingError } = await supabase
        .from("seller_profiles")
        .update({ shippingDefaults: shipping, shippingSetupCompleted: true })
        .eq("userId", user.id);
      if (shippingError) throw shippingError;
      safeLocalStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(shipping));

      const effectiveReturnAddress = useShippingOriginAsReturn ? shippingOriginAddress : returnAddress;
      const addressComplete = Boolean(
        effectiveReturnAddress.line1.trim() && effectiveReturnAddress.city.trim() && effectiveReturnAddress.postcode.trim() && effectiveReturnAddress.countryCode.trim()
      );
      if (!addressComplete) throw new Error("Please complete the seller return address before saving fulfilment settings.");
      const { error: fulfilmentError } = await supabase.from("seller_fulfilment_profiles").upsert({
        sellerId: user.id,
        shippingOriginAddress,
        returnAddress: useShippingOriginAsReturn ? null : returnAddress,
        useShippingOriginAsReturn,
        dispatchDeadlineHours: 48,
        trackingDeadlineHours: 48,
        updatedAt: new Date().toISOString(),
      }, { onConflict: "sellerId" });
      if (fulfilmentError) throw fulfilmentError;

      // Change password if the user has filled in the password fields
      if (newPassword || currentPassword) {
        if (!currentPassword) throw new Error("Please enter your current password.");
        if (!newPassword) throw new Error("Please enter a new password.");
        if (newPassword !== confirmPassword) throw new Error("New passwords do not match.");
        if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) throw new Error("Unable to verify your identity. Please log in again.");
        const { error: reAuthError } = await supabase.auth.signInWithPassword({
          email: session.user.email,
          password: currentPassword,
        });
        if (reAuthError) throw new Error("Current password is incorrect.");

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        passwordChanged = true;
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }

      toast({
        title: "Settings saved",
        description: passwordChanged
          ? "Notification preferences and password updated."
          : "Notification preferences and shipping defaults saved.",
      });
    } catch (err) {
      toast({
        title: "Failed to save settings",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleConnectStripe = async () => {
    setConnectError("");
    setConnectLoading(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/connect-onboard", {
        method: "POST",
      });
      let data: Record<string, unknown> = {};
      try { data = await response.json(); } catch { /* non-JSON response */ }
      if (!response.ok) throw new Error((data.error as string) || "Failed to start Stripe onboarding");
      await openExternalUrl(data.url as string);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to connect Stripe account");
      setConnectLoading(false);
    }
  };

  const handleViewStripeDashboard = async () => {
    setConnectError("");
    setDashboardLoading(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/connect-dashboard", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to open Stripe dashboard");
      window.open(data.url as string, "_blank", "noopener,noreferrer");
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to open Stripe dashboard");
    } finally {
      setDashboardLoading(false);
    }
  };

  const [pauseLoading, setPauseLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [deleteSellerLoading, setDeleteSellerLoading] = useState(false);
  const [deleteSellerConfirm, setDeleteSellerConfirm] = useState("");

  // Read paused state from DB on mount.
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("seller_profiles")
      .select("isPaused")
      .eq("userId", user.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Could not load account status", description: "Please refresh the page.", variant: "destructive" });
          return;
        }
        if (data) setIsPaused(data.isPaused ?? false);
      });
  }, [user?.id]);

  const handlePauseAccount = async () => {
    if (!user) return;
    setPauseLoading(true);
    try {
      const { error } = await supabase.from("seller_profiles").update({ isPaused: true }).eq("userId", user.id);
      if (error) throw error;
      setIsPaused(true);
      toast({ title: "Shop paused", description: "New checkout is disabled while your existing listing states remain unchanged." });
    } catch {
      toast({ title: "Failed to pause shop", description: "Please try again.", variant: "destructive" });
    } finally { setPauseLoading(false); }
  };

  const handleResumeAccount = async () => {
    if (!user) return;
    setPauseLoading(true);
    try {
      const { error } = await supabase.from("seller_profiles").update({ isPaused: false }).eq("userId", user.id);
      if (error) throw error;
      setIsPaused(false);
      toast({ title: "Shop resumed", description: "Checkout is enabled again. Individual listing states were preserved." });
    } catch {
      toast({ title: "Failed to resume shop", description: "Please try again.", variant: "destructive" });
    } finally { setPauseLoading(false); }
  };

  const handleDeleteSellerAccount = async () => {
    if (!user) return;
    if (deleteSellerConfirm.trim().toLowerCase() !== "delete") {
      toast({ title: "Confirmation required", description: "Type DELETE to confirm account deletion.", variant: "destructive" });
      return;
    }
    setDeleteSellerLoading(true);
    try {
      const response = await authorizedFetch("/.netlify/functions/delete-account", {
        method: "DELETE",
      });
      let payload: { error?: string; success?: boolean } = {};
      try { payload = await response.json(); } catch { /* non-JSON response */ }

      if (!response.ok || payload.success !== true) {
        throw new Error(payload.error || "Unable to delete your account.");
      }

      await supabase.auth.signOut();
      toast({
        title: "Account deleted",
        description: "Your Loadify account has been deleted. Limited transaction records may be retained where legally required.",
      });
    } catch (err) {
      toast({ title: "Deletion failed", description: err instanceof Error ? err.message : "Unable to delete your account. Please contact support.", variant: "destructive" });
    } finally {
      setDeleteSellerLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account preferences and security.</p>
        </div>
        <Button className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-black" onClick={handleSaveSettings} disabled={saveLoading}>
          {saveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</CardTitle>
          <CardDescription>Choose which notifications you'd like to receive.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "orderAlerts" as const, label: "New Order Alerts", desc: "Get notified when a buyer places an order" },
            { key: "returnAlerts" as const, label: "Return Requests", desc: "Alerts when a buyer requests a return" },
            { key: "marketingEmails" as const, label: "Marketing & Promotions", desc: "Tips, featured opportunities, and marketplace news" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={notifications[item.key]} onCheckedChange={() => toggleNotification(item.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Security</CardTitle>
          <CardDescription>Update your password and security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Current Password</Label>
              <div className="relative mt-1">
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div />
            <div>
              <Label className="text-xs">New Password</Label>
              <Input type="password" placeholder="••••••••" className="mt-1" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Confirm New Password</Label>
              <Input type="password" placeholder="••••••••" className="mt-1" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Shipping Defaults</CardTitle>
          <CardDescription>Set default shipping preferences for new listings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Default Carrier</Label>
              <Select value={shipping.carrier} onValueChange={(v) => setShipping((s) => ({ ...s, carrier: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="royal_mail">Royal Mail</SelectItem>
                  <SelectItem value="evri">Evri</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Default Dispatch Time</Label>
              <Select value={shipping.dispatchTime} onValueChange={(v) => setShipping((s) => ({ ...s, dispatchTime: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 business day</SelectItem>
                  <SelectItem value="2">2 business days</SelectItem>
                  <SelectItem value="3">3 business days</SelectItem>
                  <SelectItem value="5">5 business days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Shipping Origin Postcode</Label>
              <Input
                placeholder="e.g. M1 2AB"
                className="mt-1"
                value={shipping.originPostcode}
                onChange={(e) => setShipping((s) => ({ ...s, originPostcode: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Free Shipping Threshold</Label>
              <Input
                placeholder="e.g. 500"
                className="mt-1"
                value={shipping.freeShippingThreshold}
                onChange={(e) => setShipping((s) => ({ ...s, freeShippingThreshold: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping & Returns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Shipping & Returns</CardTitle>
          <CardDescription>Private fulfilment addresses used for dispatch and authorised returns. These are not shown on your public profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Shipping origin address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Business / recipient name" value={shippingOriginAddress.recipientOrBusinessName} onChange={(e)=>setShippingOriginAddress(a=>({...a,recipientOrBusinessName:e.target.value}))} />
              <Input placeholder="Address line 1" value={shippingOriginAddress.line1} onChange={(e)=>setShippingOriginAddress(a=>({...a,line1:e.target.value}))} />
              <Input placeholder="Address line 2 (optional)" value={shippingOriginAddress.line2} onChange={(e)=>setShippingOriginAddress(a=>({...a,line2:e.target.value}))} />
              <Input placeholder="City" value={shippingOriginAddress.city} onChange={(e)=>setShippingOriginAddress(a=>({...a,city:e.target.value}))} />
              <Input placeholder="County / region" value={shippingOriginAddress.county} onChange={(e)=>setShippingOriginAddress(a=>({...a,county:e.target.value}))} />
              <Input placeholder="Postcode" value={shippingOriginAddress.postcode} onChange={(e)=>setShippingOriginAddress(a=>({...a,postcode:e.target.value.toUpperCase()}))} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
            <div><p className="text-sm font-medium">Use shipping origin as return address</p><p className="text-xs text-muted-foreground">Recommended when returns should come back to the same location.</p></div>
            <Switch checked={useShippingOriginAsReturn} onCheckedChange={setUseShippingOriginAsReturn} />
          </div>
          {!useShippingOriginAsReturn && <div>
            <p className="text-sm font-semibold text-foreground mb-3">Return address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="Business / recipient name" value={returnAddress.recipientOrBusinessName} onChange={(e)=>setReturnAddress(a=>({...a,recipientOrBusinessName:e.target.value}))} />
              <Input placeholder="Address line 1" value={returnAddress.line1} onChange={(e)=>setReturnAddress(a=>({...a,line1:e.target.value}))} />
              <Input placeholder="Address line 2 (optional)" value={returnAddress.line2} onChange={(e)=>setReturnAddress(a=>({...a,line2:e.target.value}))} />
              <Input placeholder="City" value={returnAddress.city} onChange={(e)=>setReturnAddress(a=>({...a,city:e.target.value}))} />
              <Input placeholder="County / region" value={returnAddress.county} onChange={(e)=>setReturnAddress(a=>({...a,county:e.target.value}))} />
              <Input placeholder="Postcode" value={returnAddress.postcode} onChange={(e)=>setReturnAddress(a=>({...a,postcode:e.target.value.toUpperCase()}))} />
            </div>
          </div>}
          <p className="text-xs text-muted-foreground">Loadify fulfilment policy: dispatch/tracking deadline is capped at 48 hours. Return addresses are snapshotted when a return is approved.</p>
        </CardContent>
      </Card>

      {/* Payout Settings — Stripe Connect */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payout Settings</CardTitle>
          <CardDescription>Connect your Stripe account to receive payouts from sales.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connectError && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {connectError}
            </div>
          )}
          <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <CreditCard className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">Stripe Connect</p>
                  {stripeConnectStatus === "active" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
                      <CheckCircle className="h-3 w-3" /> Connected
                    </span>
                  )}
                  {stripeConnectStatus === "pending" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Clock className="h-3 w-3" /> Onboarding Incomplete
                    </span>
                  )}
                  {stripeConnectStatus === "restricted" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-danger/100/10 text-danger">
                      <XCircle className="h-3 w-3" /> Restricted
                    </span>
                  )}
                  {!stripeConnectStatus && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Payouts are sent automatically after order completion via Stripe Connect Express. Weekly payouts every Friday.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={connectLoading}
                onClick={handleConnectStripe}
                className={stripeConnectStatus === "active" ? "hidden" : "flex-1"}
              >
                {connectLoading ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Connecting…</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-1.5" /> Connect / Resume Onboarding</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={dashboardLoading}
                onClick={handleViewStripeDashboard}
                className="flex-1"
              >
                {dashboardLoading ? (
                  <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Opening…</>
                ) : (
                  <><ExternalLink className="h-4 w-4 mr-1.5" /> View Stripe Dashboard</>
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Bank details are managed securely inside Stripe. Loadify does not store your bank information.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for your seller account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{isPaused ? "Resume Seller Account" : "Pause Seller Account"}</p>
              <p className="text-xs text-muted-foreground">
                {isPaused
                  ? "Re-enable all your listings on the marketplace"
                  : "Temporarily hide all your listings from the marketplace"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={isPaused ? handleResumeAccount : handlePauseAccount}
              disabled={pauseLoading}
            >
              {pauseLoading
                ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                : isPaused
                  ? <Play className="h-3.5 w-3.5 mr-1" />
                  : <Pause className="h-3.5 w-3.5 mr-1" />
              }
              {isPaused ? "Resume" : "Pause"}
            </Button>
          </div>
          <Separator />
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Loadify Account</p>
              <p className="text-xs text-muted-foreground">
                This permanently deletes your Loadify account, including Buyer and Seller access. Profile, contact and storefront data is removed or anonymised; limited transaction records required for accounting, fraud prevention, disputes and payment reconciliation may be retained. This cannot be undone. Type <strong>DELETE</strong> to confirm.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type DELETE to confirm"
                value={deleteSellerConfirm}
                onChange={(e) => setDeleteSellerConfirm(e.target.value)}
                className="h-8 text-sm max-w-[200px]"
              />
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleDeleteSellerAccount}
                disabled={deleteSellerLoading || deleteSellerConfirm.trim().toLowerCase() !== "delete"}
              >
                {deleteSellerLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-stretch sm:justify-end">
        <Button className="w-full sm:w-auto bg-primary hover:bg-primary-hover text-black" onClick={handleSaveSettings} disabled={saveLoading}>
          {saveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default SellerSettings;