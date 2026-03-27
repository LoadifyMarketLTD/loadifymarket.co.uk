import { useState, useEffect } from "react";
import {
  Bell, Shield, CreditCard, Truck,
  Eye, EyeOff, Save, Key, ExternalLink, CheckCircle, AlertCircle, Loader2
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
import { useAuthStore } from "@/store";
import { toast } from "@/hooks/use-toast";

const SHIPPING_STORAGE_KEY = "loadify_seller_shipping_defaults";

const defaultNotifications = {
  orderAlerts: true,
  returnAlerts: true,
  rfqAlerts: true,
  reviewAlerts: false,
  marketingEmails: false,
  weeklyReport: true,
};

const defaultShipping = {
  carrier: "royal_mail",
  dispatchTime: "2",
  originPostcode: "",
  freeShippingThreshold: "",
};

const SellerSettings = () => {
  const { user } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState<typeof defaultNotifications>(defaultNotifications);
  const [shipping, setShipping] = useState(() => {
    try {
      const raw = localStorage.getItem(SHIPPING_STORAGE_KEY);
      if (raw) return { ...defaultShipping, ...(JSON.parse(raw) as Partial<typeof defaultShipping>) };
    } catch { /* ignore */ }
    return defaultShipping;
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Stripe Connect state
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(false);

      // Load notification prefs from DB on mount
  // Mapping: orderAlerts→orderConfirmation, returnAlerts→shippingUpdates, marketingEmails→promotionalEmails
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("notification_settings")
        .select("orderConfirmation, shippingUpdates, promotionalEmails")
        .eq("userId", user.id)
        .maybeSingle();
      if (data) {
        setNotifications((prev) => ({
          ...prev,
          orderAlerts: data.orderConfirmation ?? prev.orderAlerts,
          returnAlerts: data.shippingUpdates ?? prev.returnAlerts,
          marketingEmails: data.promotionalEmails ?? prev.marketingEmails,
        }));
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
          deliveryConfirmation: notifications.orderAlerts,  // mirrors orderAlerts
          promotionalEmails: notifications.marketingEmails,
        },
        { onConflict: "userId" }
      );

      // Persist shipping defaults to localStorage (no DB column for these UI prefs)
      localStorage.setItem(SHIPPING_STORAGE_KEY, JSON.stringify(shipping));

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const response = await fetch("/.netlify/functions/connect-onboard", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      let data: Record<string, unknown> = {};
      try { data = await response.json(); } catch { /* non-JSON response */ }
      if (!response.ok) throw new Error((data.error as string) || "Failed to start Stripe onboarding");
      window.location.href = data.url as string;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to connect Stripe account");
      setConnectLoading(false);
    }
  };

  const handleViewStripeDashboard = async () => {
    setConnectError("");
    setDashboardLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const response = await fetch("/.netlify/functions/connect-dashboard", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
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

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account preferences and security.</p>
        </div>
        <Button className="bg-gradient-hero text-primary-foreground" onClick={handleSaveSettings} disabled={saveLoading}>
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
            { key: "rfqAlerts" as const, label: "Quote Requests (RFQ)", desc: "Notifications for new quote requests" },
            { key: "reviewAlerts" as const, label: "New Reviews", desc: "Get notified when a buyer leaves a review" },
            { key: "weeklyReport" as const, label: "Weekly Sales Report", desc: "Receive a weekly summary of your performance" },
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
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <Button variant="outline" size="sm"><Key className="mr-2 h-3.5 w-3.5" /> Enable 2FA</Button>
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
                  <SelectItem value="dpd">DPD</SelectItem>
                  <SelectItem value="hermes">Evri (Hermes)</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
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
                <p className="text-sm font-semibold text-foreground">Stripe Connect</p>
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
                className="flex-1"
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
              <p className="text-sm font-medium text-foreground">Pause Seller Account</p>
              <p className="text-xs text-muted-foreground">Temporarily hide all your listings from the marketplace</p>
            </div>
            <Button variant="outline" size="sm">Pause</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Seller Account</p>
              <p className="text-xs text-muted-foreground">Permanently remove your seller account and all listings</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerSettings;
