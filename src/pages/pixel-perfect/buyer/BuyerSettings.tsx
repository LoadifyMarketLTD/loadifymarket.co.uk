import { useState } from "react";
import {
  Settings, Bell, Shield, Globe, Eye, EyeOff, Save, Key, Trash2
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

const BuyerSettings = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    deliveryAlerts: true,
    priceDrops: true,
    newListings: false,
    sellerReplies: true,
    newsletter: false,
  });

  const toggleNotification = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Account Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your preferences, notifications, and security.</p>
        </div>
        <Button size="sm"><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
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
                <Input type={showPassword ? "text" : "password"} placeholder="••••••••" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div />
            <div>
              <Label className="text-xs">New Password</Label>
              <Input type="password" placeholder="••••••••" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Confirm New Password</Label>
              <Input type="password" placeholder="••••••••" className="mt-1" />
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

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Currency</Label>
              <Select defaultValue="gbp">
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
              <Select defaultValue="en">
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
              <Select defaultValue="newest">
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
