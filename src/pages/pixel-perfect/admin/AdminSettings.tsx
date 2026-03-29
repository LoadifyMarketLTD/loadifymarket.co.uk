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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

type FeatureKey = "sellerRegistration" | "buyerRegistration" | "rfqSystem" | "reviewSystem" | "maintenanceMode" | "autoApproveProducts";
type Features = Record<FeatureKey, boolean>;

interface PlatformConfig {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  commissionRate: number;
  maxUploadSizeMb: number;
  productsPerPage: number;
}

const DEFAULT_FEATURES: Features = {
  sellerRegistration: true,
  buyerRegistration: true,
  rfqSystem: true,
  reviewSystem: true,
  maintenanceMode: false,
  autoApproveProducts: false,
};

const DEFAULT_CONFIG: PlatformConfig = {
  platformName: "Loadify Market",
  supportEmail: "loadifymarket.co.uk@gmail.com",
  defaultCurrency: "gbp",
  commissionRate: 8,
  maxUploadSizeMb: 10,
  productsPerPage: 24,
};

const AdminSettings = () => {
  const [showKey, setShowKey] = useState(false);
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_CONFIG);
  const [settingsLoading, setSettingsLoading] = useState(true);
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
      try {
        const { data } = await supabase
          .from("platform_settings")
          .select("key, value")
          .in("key", ["feature_flags", "maintenance_mode", "platform_config"]);
        if (!data) return;
        const featureFlagsRow = data.find((r) => r.key === "feature_flags");
        const maintenanceRow = data.find((r) => r.key === "maintenance_mode");
        const configRow = data.find((r) => r.key === "platform_config");
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
        if (configRow?.value && typeof configRow.value === "object") {
          const stored = configRow.value as Partial<Record<string, unknown>>;
          setConfig((prev) => ({
            ...prev,
            platformName: typeof stored.platformName === "string" ? stored.platformName : prev.platformName,
            supportEmail: typeof stored.supportEmail === "string" ? stored.supportEmail : prev.supportEmail,
            defaultCurrency: typeof stored.defaultCurrency === "string" ? stored.defaultCurrency : prev.defaultCurrency,
            commissionRate: typeof stored.commissionRate === "number" ? stored.commissionRate : prev.commissionRate,
            maxUploadSizeMb: typeof stored.maxUploadSizeMb === "number" ? stored.maxUploadSizeMb : prev.maxUploadSizeMb,
            productsPerPage: typeof stored.productsPerPage === "number" ? stored.productsPerPage : prev.productsPerPage,
          }));
        }
      } catch (err) {
        console.error("Failed to load platform settings:", err);
        toast({ title: "Could not load settings", description: "Using defaults. Please try refreshing.", variant: "destructive" });
      } finally {
        setSettingsLoading(false);
      }
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
        supabase.from("platform_settings").upsert(
          { key: "platform_config", value: config },
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
          <Button size="sm" onClick={handleSave} disabled={saveLoading || settingsLoading}>
            {saveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {settingsLoading ? "Loading…" : "Save Settings"}
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
              <Input
                className="mt-1"
                value={config.platformName}
                onChange={(e) => setConfig((c) => ({ ...c, platformName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Support Email</Label>
              <Input
                className="mt-1"
                value={config.supportEmail}
                onChange={(e) => setConfig((c) => ({ ...c, supportEmail: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Default Currency</Label>
              <Select value={config.defaultCurrency} onValueChange={(v) => setConfig((c) => ({ ...c, defaultCurrency: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="usd">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Commission Rate (%)</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={config.commissionRate}
                onChange={(e) => setConfig((c) => ({ ...c, commissionRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label className="text-xs">Max Upload Size (MB)</Label>
              <Input
                className="mt-1"
                type="number"
                min="1"
                value={config.maxUploadSizeMb}
                onChange={(e) => setConfig((c) => ({ ...c, maxUploadSizeMb: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
            <div>
              <Label className="text-xs">Products per Page</Label>
              <Input
                className="mt-1"
                type="number"
                min="1"
                value={config.productsPerPage}
                onChange={(e) => setConfig((c) => ({ ...c, productsPerPage: parseInt(e.target.value, 10) || 1 }))}
              />
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
                <Input type={showKey ? "text" : "password"} value="Configured via environment variable" readOnly className="text-muted-foreground" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Supabase URL</Label>
              <Input value="Configured via environment variable" className="mt-1 text-muted-foreground" readOnly />
            </div>
            <div>
              <Label className="text-xs">SendGrid API Key</Label>
              <Input type="password" value="Configured via environment variable" className="mt-1 text-muted-foreground" readOnly />
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
