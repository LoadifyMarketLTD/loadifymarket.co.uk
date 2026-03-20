import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Cookie, ChevronDown, ChevronUp } from "lucide-react";

type CookiePreferences = {
  essential: boolean; // always true
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_CONSENT_KEY = "loadify_cookie_consent";

const getStoredConsent = (): CookiePreferences | null => {
  try {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const storeConsent = (prefs: CookiePreferences) => {
  localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
};

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = getStoredConsent();
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const prefs: CookiePreferences = { essential: true, analytics: true, marketing: true };
    storeConsent(prefs);
    setVisible(false);
  };

  const handleRejectNonEssential = () => {
    const prefs: CookiePreferences = { essential: true, analytics: false, marketing: false };
    storeConsent(prefs);
    setVisible(false);
  };

  const handleSavePreferences = () => {
    storeConsent({ ...preferences, essential: true });
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card border-t border-border shadow-elevated">
        <div className="container mx-auto px-4 py-4">
          {/* Main row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <Cookie className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground leading-relaxed">
                <span>We use cookies to enhance your browsing experience. Essential cookies are always active. You can choose to accept or reject non-essential cookies. </span>
                <button
                  onClick={() => setShowCustomize(!showCustomize)}
                  className="inline-flex items-center gap-0.5 text-primary font-medium hover:underline"
                >
                  Customise
                  {showCustomize ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectNonEssential}
                className="flex-1 sm:flex-none text-sm"
              >
                Reject All
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="flex-1 sm:flex-none bg-primary text-primary-foreground text-sm font-semibold"
              >
                Accept All
              </Button>
            </div>
          </div>

          {/* Customise panel */}
          {showCustomize && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {/* Essential */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Essential Cookies</p>
                  <p className="text-xs text-muted-foreground">Required for the website to function. Cannot be disabled.</p>
                </div>
                <Switch checked disabled className="opacity-60" />
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Analytics Cookies</p>
                  <p className="text-xs text-muted-foreground">Help us understand how visitors use our website.</p>
                </div>
                <Switch
                  checked={preferences.analytics}
                  onCheckedChange={(v) => setPreferences((p) => ({ ...p, analytics: v }))}
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Marketing Cookies</p>
                  <p className="text-xs text-muted-foreground">Used to deliver relevant advertisements and track campaigns.</p>
                </div>
                <Switch
                  checked={preferences.marketing}
                  onCheckedChange={(v) => setPreferences((p) => ({ ...p, marketing: v }))}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button size="sm" onClick={handleSavePreferences} className="text-sm font-semibold">
                  Save Preferences
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
