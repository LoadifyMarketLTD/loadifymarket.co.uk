import { useState } from "react";
import {
  Settings, Bell, Shield, Globe, Database, Save, Key,
  Eye, EyeOff, Trash2, RefreshCw
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

const AdminSettings = () => {
  const [showKey, setShowKey] = useState(false);
  const [features, setFeatures] = useState({
    sellerRegistration: true,
    buyerRegistration: true,
    rfqSystem: true,
    reviewSystem: true,
    maintenanceMode: false,
    autoApproveProducts: false,
  });

  const toggleFeature = (key: keyof typeof features) =>
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure platform behaviour and integrations.</p>
        </div>
        <Button size="sm"><Save className="mr-2 h-4 w-4" /> Save Settings</Button>
      </div>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Feature Toggles</CardTitle>
          <CardDescription>Enable or disable platform features.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "sellerRegistration" as const, label: "Seller Registration", desc: "Allow new sellers to register on the platform" },
            { key: "buyerRegistration" as const, label: "Buyer Registration", desc: "Allow new buyers to create accounts" },
            { key: "rfqSystem" as const, label: "RFQ / Quote System", desc: "Enable buyers to request custom quotes from sellers" },
            { key: "reviewSystem" as const, label: "Reviews & Ratings", desc: "Allow buyers to leave reviews on sellers" },
            { key: "autoApproveProducts" as const, label: "Auto-Approve Products", desc: "Skip manual review for new product listings" },
            { key: "maintenanceMode" as const, label: "Maintenance Mode", desc: "Show maintenance page to all users (admins excluded)" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch checked={features[item.key]} onCheckedChange={() => toggleFeature(item.key)} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Platform Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Platform Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Platform Name</Label>
              <Input defaultValue="Loadify Market" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Support Email</Label>
              <Input defaultValue="loadifymarket.co.uk@gmail.com" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Default Currency</Label>
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
              <Label className="text-xs">Commission Rate</Label>
              <Input defaultValue="8%" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Max Upload Size (MB)</Label>
              <Input defaultValue="10" type="number" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Products per Page</Label>
              <Input defaultValue="24" type="number" className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> API Keys & Integrations</CardTitle>
          <CardDescription>Manage external service connections.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-xs">Stripe Secret Key</Label>
              <div className="relative mt-1">
                <Input type={showKey ? "text" : "password"} defaultValue="sk_live_••••••••••••••••••••" readOnly />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Supabase URL</Label>
              <Input defaultValue="https://••••••••.supabase.co" className="mt-1" readOnly />
            </div>
            <div>
              <Label className="text-xs">SendGrid API Key</Label>
              <Input type="password" defaultValue="SG.••••••••••••" className="mt-1" readOnly />
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 border border-border p-3">
            <p className="text-xs text-muted-foreground">API keys are stored securely as environment variables. Contact your DevOps team to update them.</p>
          </div>
        </CardContent>
      </Card>

      {/* Database */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Database & Cache</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Clear Application Cache</p>
              <p className="text-xs text-muted-foreground">Remove cached data to force fresh queries</p>
            </div>
            <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5 mr-1" /> Clear Cache</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Database Backup</p>
              <p className="text-xs text-muted-foreground">Last backup: 19 Mar 2026 at 03:00 UTC</p>
            </div>
            <Button variant="outline" size="sm">Run Backup</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>Critical platform operations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Reset All User Sessions</p>
              <p className="text-xs text-muted-foreground">Force all users to re-authenticate</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">Reset</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Purge All Data</p>
              <p className="text-xs text-muted-foreground">⚠️ This will permanently delete all marketplace data</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Purge
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
