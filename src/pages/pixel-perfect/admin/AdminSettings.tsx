import { useState, useEffect } from "react";
import {
  Settings, Globe, Database, Save, Key,
  Eye, EyeOff, RefreshCw, Loader2, CheckCircle2, Share2, Copy, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { authorizedFetch } from "@/lib/authorizedFetch";

type FeatureKey = "sellerRegistration" | "buyerRegistration" | "rfqSystem" | "reviewSystem" | "maintenanceMode";
type Features = Record<FeatureKey, boolean>;

interface PlatformConfig {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  commissionRate: number;
  maxUploadSizeMb: number;
  productsPerPage: number;
}

// Supabase persists auth tokens in localStorage with keys prefixed 'sb-'.
// We intentionally preserve these keys during cache clearing so the admin
// session is not terminated by the Clear Cache action.
const SUPABASE_STORAGE_PREFIX = 'sb-';

const DEFAULT_FEATURES: Features = {
  sellerRegistration: true,
  buyerRegistration: true,
  rfqSystem: false,
  reviewSystem: true,
  maintenanceMode: false,
};

const DEFAULT_CONFIG: PlatformConfig = {
  platformName: "Loadify Market",
  supportEmail: "contact@loadifymarket.co.uk",
  defaultCurrency: "gbp",
  commissionRate: 8,
  maxUploadSizeMb: 10,
  productsPerPage: 24,
};

const AdminSettings = () => {
  const [showKey, setShowKey] = useState(false);
  const [feedCopied, setFeedCopied] = useState(false);
  const [features, setFeatures] = useState<Features>(DEFAULT_FEATURES);
  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_CONFIG);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<{ configured: boolean; message: string } | null>(null);
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cacheCleared, setCacheCleared] = useState(false);

  const handleClearCache = () => {
    try {
      sessionStorage.clear();
    } catch {
      // Ignore — session storage may not be available
    }
    try {
      // Also clear app-level localStorage entries (cart, search history, etc.)
      // without removing Supabase auth tokens so the admin stays logged in.
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith(SUPABASE_STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore — localStorage may not be available
    }
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  const handleCheckStripeConnect = async () => {
    setCheckingStripe(true);
    setStripeConnectStatus(null);
    try {
      const res = await authorizedFetch("/.netlify/functions/connect-platform-check", {
        method: "POST",
      });
      const json: unknown = await res.json();
      const isObj = json !== null && typeof json === "object";
      const error = isObj ? (json as Record<string, unknown>).error : undefined;
      if (!res.ok) throw new Error(typeof error === "string" ? error : "Check failed");
      // Function returns { platformConfigured: boolean, keyPrefix?, platformAccountId? }
      const configured = isObj ? Boolean((json as Record<string, unknown>).platformConfigured) : false;
      const keyPrefix = isObj && typeof (json as Record<string, unknown>).keyPrefix === "string"
        ? String((json as Record<string, unknown>).keyPrefix)
        : "";
      const message = configured
        ? `Connected${keyPrefix ? ` (key: ${keyPrefix})` : ""}`
        : "Not configured";
      setStripeConnectStatus({ configured, message });
    } catch (err) {
      setStripeConnectStatus({ configured: false, message: err instanceof Error ? err.message : "Check failed" });
    } finally {
      setCheckingStripe(false);
    }
  };

  const FEED_URL = 'https://loadifymarket.co.uk/product-feed.xml';

  const handleCopyFeedUrl = () => {
    navigator.clipboard.writeText(FEED_URL).then(() => {
      setFeedCopied(true);
      setTimeout(() => setFeedCopied(false), 2000);
    }).catch(() => {
      toast({ title: "Copy failed", description: "Please copy the URL manually.", variant: "destructive" });
    });
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

      // Route the save through a Netlify function that uses the service-role key
      // to bypass RLS on platform_settings (avoids RLS INSERT check failures).
      // authorizedFetch handles proactive JWT refresh automatically.
      const res = await authorizedFetch("/.netlify/functions/save-admin-settings", {
        method: "POST",
        body: JSON.stringify({
          settings: [
            { key: "feature_flags", value: flagsWithoutMaintenance },
            { key: "maintenance_mode", value: maintenanceMode },
            { key: "platform_config", value: config },
          ],
        }),
      });
      let resBody: { error?: string } = {};
      try { resBody = await res.json(); } catch { /* non-JSON */ }
      if (!res.ok) throw new Error(resBody.error || `Request failed (${res.status})`);

      setSaveMsg({ text: "Settings saved successfully.", ok: true });
    } catch (err: unknown) {
      setSaveMsg({ text: (err as Error).message || "Failed to save settings.", ok: false });
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]" style={{ background: "transparent", minHeight: "100%" }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.85)" }}>Configure platform behaviour and integrations.</p>
        </div>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <p className={`text-xs ${saveMsg.ok ? "text-success" : "text-danger"}`}>{saveMsg.text}</p>
          )}
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleSave}
            disabled={saveLoading || settingsLoading}
            style={{ background: "rgba(212,175,55,1)", color: "rgba(255,255,255,1)", border: "none" }}
          >
            {saveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {settingsLoading ? "Loading…" : "Save Settings"}
          </Button>
        </div>
      </div>

      {/* Feature Toggles */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="h-4 w-4" style={{ color: "rgba(212,175,55,1)" }} /> Feature Toggles
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.85)" }}>Enable or disable platform features.</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          {[
            { key: "sellerRegistration" as const, label: "Seller Registration", desc: "Allow new sellers to register on the platform" },
            { key: "buyerRegistration" as const, label: "Buyer Registration", desc: "Allow new buyers to create accounts" },
            { key: "rfqSystem" as const, label: "RFQ / Quote System", desc: "Optional custom quotes flow. Keep disabled for fixed-price marketplace launch." },
            { key: "reviewSystem" as const, label: "Reviews & Ratings", desc: "Allow buyers to leave reviews on sellers" },
            { key: "maintenanceMode" as const, label: "Maintenance Mode", desc: "Show maintenance page to all users (admins excluded)" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>{item.desc}</p>
              </div>
              <Switch checked={features[item.key]} onCheckedChange={() => toggleFeature(item.key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Platform Config */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Globe className="h-4 w-4" style={{ color: "rgba(212,175,55,1)" }} /> Platform Configuration
          </h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Platform Name</Label>
              <Input
                className="mt-1 text-white"
                style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}
                value={config.platformName}
                onChange={(e) => setConfig((c) => ({ ...c, platformName: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Support Email</Label>
              <Input
                className="mt-1 text-white"
                style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}
                value={config.supportEmail}
                onChange={(e) => setConfig((c) => ({ ...c, supportEmail: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Default Currency</Label>
              <Select value={config.defaultCurrency} onValueChange={(v) => setConfig((c) => ({ ...c, defaultCurrency: v }))}>
                <SelectTrigger className="mt-1 text-white" style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gbp">GBP (£)</SelectItem>
                  <SelectItem value="eur">EUR (€)</SelectItem>
                  <SelectItem value="usd">USD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Commission Rate (%)</Label>
              <Input
                className="mt-1 text-white"
                style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={config.commissionRate}
                onChange={(e) => setConfig((c) => ({ ...c, commissionRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Max Upload Size (MB)</Label>
              <Input
                className="mt-1 text-white"
                style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}
                type="number"
                min="1"
                value={config.maxUploadSizeMb}
                onChange={(e) => setConfig((c) => ({ ...c, maxUploadSizeMb: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Products per Page</Label>
              <Input
                className="mt-1 text-white"
                style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}
                type="number"
                min="1"
                value={config.productsPerPage}
                onChange={(e) => setConfig((c) => ({ ...c, productsPerPage: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* API Keys */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Key className="h-4 w-4" style={{ color: "rgba(212,175,55,1)" }} /> API Keys & Integrations
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.85)" }}>Manage external service connections.</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Stripe Secret Key</Label>
              <div className="relative mt-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value="Configured via environment variable"
                  readOnly
                  className="text-white"
                  style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.85)" }}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-white transition-colors" style={{ color: "rgba(148,163,184,0.85)" }} onClick={() => setShowKey(!showKey)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Supabase URL</Label>
              <Input
                value="Configured via environment variable"
                className="mt-1"
                style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.85)" }}
                readOnly
              />
            </div>
            <div>
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>SendGrid API Key</Label>
              <Input
                type="password"
                value="Configured via environment variable"
                className="mt-1"
                style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.85)" }}
                readOnly
              />
            </div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>API keys are stored securely as environment variables. Contact your DevOps team to update them.</p>
          </div>
          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Stripe Connect Platform</p>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-slate-500 hover:text-white"
                onClick={handleCheckStripeConnect}
                disabled={checkingStripe}
              >
                {checkingStripe ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                Check status
              </Button>
            </div>
            {stripeConnectStatus && (
              <div className={`flex items-center gap-2 text-xs ${stripeConnectStatus.configured ? "text-success" : "text-danger"}`}>
                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${stripeConnectStatus.configured ? "text-success" : "text-danger"}`} />
                {stripeConnectStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Social Commerce Feed */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Share2 className="h-4 w-4" style={{ color: "rgba(212,175,55,1)" }} /> Social Commerce Feed
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.85)" }}>
            Submit this URL to Facebook/Instagram Commerce Manager, TikTok for Business, or Google Merchant Center to sync your product catalog automatically.
          </p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <Label className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>Product Feed URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={FEED_URL}
                readOnly
                className="text-white flex-1"
                style={{ background: "rgba(148,163,184,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(148,163,184,0.85)" }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 h-9 px-3 text-xs bg-slate-400/15 border border-white/10 text-white hover:bg-slate-400/25"
                onClick={handleCopyFeedUrl}
              >
                {feedCopied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>Setup instructions</p>
            <ul className="text-xs space-y-1.5 list-disc list-inside" style={{ color: "rgba(148,163,184,0.85)" }}>
              <li><span className="text-white font-medium">Facebook &amp; Instagram:</span> Business Manager → Commerce Manager → Catalog → Data Sources → Scheduled Feed → paste URL above.</li>
              <li><span className="text-white font-medium">TikTok:</span> TikTok for Business → Catalog → Add Products → URL Feed → paste URL above.</li>
              <li><span className="text-white font-medium">Google Merchant Center:</span> Products → Feeds → Add Feed → Google Sheets or Scheduled Fetch → paste URL above.</li>
              <li>For large catalogs use pagination: <code className="text-primary">/product-feed.xml?page=2</code>, <code className="text-primary">?page=3</code>, etc. (500 products per page).</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Database */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.05)", boxShadow: "0 10px 40px rgba(0,0,0,0.6)" }}
      >
        <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Database className="h-4 w-4" style={{ color: "rgba(212,175,55,1)" }} /> Database & Cache
          </h2>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Clear Application Cache</p>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.85)" }}>Remove cached data to force fresh queries</p>
            </div>
            <Button
              size="sm"
              onClick={handleClearCache}
              disabled={cacheCleared}
              className="bg-slate-400/30 border border-white/10 text-white hover:bg-slate-400/40"
            >
              {cacheCleared
                ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1 text-success" /> Cleared</>
                : <><RefreshCw className="h-3.5 w-3.5 mr-1" /> Clear Cache</>
              }
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-stretch sm:justify-end">
        <Button
          size="sm"
          className="w-full sm:w-auto"
          onClick={handleSave}
          disabled={saveLoading || settingsLoading}
          style={{ background: "rgba(212,175,55,1)", color: "rgba(255,255,255,1)", border: "none" }}
        >
          {saveLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {settingsLoading ? "Loading…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
};

export default AdminSettings;
