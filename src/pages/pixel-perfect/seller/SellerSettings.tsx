import { useState } from "react";
import {
  Settings, Bell, Shield, CreditCard, Truck, Mail,
  Globe, Eye, EyeOff, Save, Key
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

const SellerSettings = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    orderAlerts: true,
    returnAlerts: true,
    rfqAlerts: true,
    reviewAlerts: false,
    marketingEmails: false,
    weeklyReport: true,
  });

  const toggleNotification = (key: keyof typeof notifications) =>
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account preferences and security.</p>
        </div>
        <Button className="bg-gradient-hero text-primary-foreground">
          <Save className="mr-2 h-4 w-4" /> Save Settings
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
              <Select defaultValue="royal_mail">
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
              <Select defaultValue="2">
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
              <Input defaultValue="M1 2AB" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Free Shipping Threshold</Label>
              <Input defaultValue="£500" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" /> Payout Settings</CardTitle>
          <CardDescription>Manage how and when you receive payments.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Payout Method</Label>
              <Select defaultValue="bank">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Transfer (BACS)</SelectItem>
                  <SelectItem value="stripe">Stripe Connect</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Payout Frequency</Label>
              <Select defaultValue="weekly">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Account Name</Label>
              <Input defaultValue="TechWholesale UK Ltd" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Sort Code / Account No.</Label>
              <Input defaultValue="••-••-•• / ••••••••" className="mt-1" readOnly />
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <p className="text-xs text-muted-foreground">
              Payout details are managed securely. To update your bank details, please contact support.
            </p>
          </div>
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
