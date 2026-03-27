import { useState, useEffect } from "react";
import {
  Bell, Shield, Globe, Eye, EyeOff, Save, Key, Trash2, Loader2
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";

interface BuyerPrefs {
  orderUpdates?: boolean;
  deliveryAlerts?: boolean;
  priceDrops?: boolean;
  newListings?: boolean;
  sellerReplies?: boolean;
  newsletter?: boolean;
  currency?: string;
  language?: string;
  orderDisplay?: string;
}

const BuyerSettings = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    deliveryAlerts: true,
    priceDrops: true,
    newListings: false,
    sellerReplies: true,
    newsletter: false,
  });
  const [prefs, setPrefs] = useState({
    currency: "gbp",
    language: "en",
    orderDisplay: "newest",
  });

  // Load saved notification prefs + preferences on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, notifRes] = await Promise.all([
        supabase.from("buyer_profiles").select("preferences").eq("userId", user.id).maybeSingle(),
        supabase.from("notification_settings").select("orderConfirmation, shippingUpdates, promotionalEmails").eq("userId", user.id).maybeSingle(),
      ]);
      const stored = profileRes.data?.preferences as BuyerPrefs | null;
      if (stored) {
        setNotifications((prev) => ({
          orderUpdates: stored.orderUpdates ?? prev.orderUpdates,
          deliveryAlerts: stored.deliveryAlerts ?? prev.deliveryAlerts,
          priceDrops: stored.priceDrops ?? prev.priceDrops,
          newListings: stored.newListings ?? prev.newListings,
          sellerReplies: stored.sellerReplies ?? prev.sellerReplies,
          newsletter: stored.newsletter ?? prev.newsletter,
        }));
        setPrefs((prev) => ({
          currency: stored.currency ?? prev.currency,
          language: stored.language ?? prev.language,
          orderDisplay: stored.orderDisplay ?? prev.orderDisplay,
        }));
      } else if (notifRes.data) {
        // Fall back to notification_settings for partial data
        setNotifications((prev) => ({
          ...prev,
          orderUpdates: notifRes.data?.orderConfirmation ?? prev.orderUpdates,
          deliveryAlerts: notifRes.data?.shippingUpdates ?? prev.deliveryAlerts,
          newsletter: notifRes.data?.promotionalEmails ?? prev.newsletter,
        }));
      }
    };
    load();
  }, [user]);

  const toggleNotification = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSaveSettings = async () => {
    if (!user) return;
    setSavingSettings(true);
    try {
      // Persist all notification prefs + UI preferences to buyer_profiles.preferences JSONB
      await supabase.from("buyer_profiles").upsert(
        { userId: user.id, preferences: { ...notifications, ...prefs } },
        { onConflict: "userId" }
      );
      // Also sync the relevant flags to notification_settings for email engine
      await supabase.from("notification_settings").upsert(
        {
          userId: user.id,
          orderConfirmation: notifications.orderUpdates,
          shippingUpdates: notifications.deliveryAlerts,
          deliveryConfirmation: notifications.deliveryAlerts,
          promotionalEmails: notifications.newsletter,
        },
        { onConflict: "userId" }
      );
      toast({ title: "Settings saved", description: "Your preferences have been updated." });
    } catch (err) {
      toast({ title: "Failed to save settings", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "New password and confirmation must be identical.", variant: "destructive" });
      return;
    }
    if (!currentPassword) {
      toast({ title: "Current password required", description: "Enter your current password to confirm this change.", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      // Re-authenticate with current password before updating
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (signInError) {
        toast({ title: "Incorrect current password", description: "Please check your current password and try again.", variant: "destructive" });
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) {
      toast({ title: "Failed to update password", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your preferences, notifications, and security.</p>
        </div>
        <Button size="sm" onClick={handleSaveSettings} disabled={savingSettings}>
          {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Settings
        </Button>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4 text-primary" /> Notifications</CardTitle>
          <CardDescription>Choose what you'd like to be notified about.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "orderUpdates" as const, label: "Order Updates", desc: "Status changes, shipping confirmations, delivery alerts" },
            { key: "deliveryAlerts" as const, label: "Delivery Alerts", desc: "Real-time tracking updates for your shipments" },
            { key: "priceDrops" as const, label: "Price Drop Alerts", desc: "Get notified when wishlist items go on sale" },
            { key: "newListings" as const, label: "New Listings", desc: "Alerts for new products in your favourite categories" },
            { key: "sellerReplies" as const, label: "Seller Replies", desc: "When a seller responds to your review or message" },
            { key: "newsletter" as const, label: "Newsletter & Promotions", desc: "Weekly deals, marketplace news, and tips" },
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
          <CardDescription>Update your password and security preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Current Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div />
            <div>
              <Label className="text-xs">New Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="mt-1"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Confirm New Password</Label>
              <Input
                type="password"
                placeholder="••••••••"
                className="mt-1"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleChangePassword}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          >
            {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
            Update Password
          </Button>
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

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Currency</Label>
              <Select value={prefs.currency} onValueChange={(v) => setPrefs((p) => ({ ...p, currency: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="usd">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Language</Label>
              <Select value={prefs.language} onValueChange={(v) => setPrefs((p) => ({ ...p, language: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Default Delivery Address</Label>
              <Select defaultValue="warehouse">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">Main Warehouse — E16 2AA</SelectItem>
                  <SelectItem value="home">Home Office — NW3 4TG</SelectItem>
                  <SelectItem value="north">North Depot — M17 1SN</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Order Display</Label>
              <Select value={prefs.orderDisplay} onValueChange={(v) => setPrefs((p) => ({ ...p, orderDisplay: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="value">Highest Value</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Download My Data</p>
              <p className="text-xs text-muted-foreground">Export all your account data as a CSV file</p>
            </div>
            <Button variant="outline" size="sm">Export</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Account</p>
              <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerSettings;
