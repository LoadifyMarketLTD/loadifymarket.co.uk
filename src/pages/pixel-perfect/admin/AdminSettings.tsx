import { useState, useEffect } from "react";
import {
  Settings, Globe, Database, Save, Key,
  Eye, EyeOff, RefreshCw, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

type FeatureKey = "sellerRegistration" | "buyerRegistration" | "rfqSystem" | "reviewSystem" | "maintenanceMode" | "autoApproveProducts";
type Features = Record<FeatureKey, boolean>;

const DEFAULT_FEATURES: Features = {
  sellerRegistration: true,
  buyerRegistration: true,
  rfqSystem: true,
  reviewSystem: true,
  maintenanceMode: false,
  autoApproveProducts: false,
};

const AdminSettings = () => {
  const [showKey, setShowKey] = useState(false);
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
    } catch {
      // Ignore — session storage may not be available
    }
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  // Load persisted settings from platform_settings on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key, value")
        .in("key", ["feature_flags", "maintenance_mode"]);
      if (!data) return;
      const featureFlagsRow = data.find((r) => r.key === "feature_flags");
      const maintenanceRow = data.find((r) => r.key === "maintenance_mode");
      setFeatures((prev) => {
        let next = { ...prev };
        if (featureFlagsRow?.value && typeof featureFlagsRow.value === "object") {
          next = { ...next, ...(featureFlagsRow.value as Partial<Features>) };
        }
        if (maintenanceRow?.value !== undefined) {
          next = { ...next, maintenanceMode: maintenanceRow.value === true || maintenanceRow.value === "true" };
        }
        return next;
      });
    };
    load();
  }, []);

  const toggleFeature = (key: FeatureKey) =>
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaveLoading(true);
    setSaveMsg(null);
    try {
      const { maintenanceMode, ...flagsWithoutMaintenance } = features;
      const ops = [
        supabase.from("platform_settings").upsert(
          { key: "feature_flags", value: flagsWithoutMaintenance },
          { onConflict: "key" }
        ),
        supabase.from("platform_settings").upsert(
          { key: "maintenance_mode", value: maintenanceMode },
          { onConflict: "key" }
        ),
      ];
      const results = await Promise.all(ops);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
      setSaveMsg({ text: "Settings saved successfully.", ok: true });
    } catch (err: unknown) {
      setSaveMsg({ text: (err as Error).message || "Failed to save settings.", ok: false });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure platform behaviour and integrations.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <p className={`text-xs ${saveMsg.ok ? "text-emerald-600" : "text-destructive"}`}>{saveMsg.text}</p>
          )}
          <Button size="sm" onClick={handleSave} disabled={saveLoading}>
            {saveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Settings
          </Button>
        </div>
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
            <Button variant="outline" size="sm" onClick={handleClearCache} disabled={cacheCleared}>
              {cacheCleared
                ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Cleared</>
                : <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Clear Cache</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
