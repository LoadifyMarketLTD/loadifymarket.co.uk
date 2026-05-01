import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Home, Building2, Save, X, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";

interface AddressData {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  postcode?: string;
  country?: string;
}

interface AddressFormProps {
  label: string;
  type: "shipping" | "billing";
  data: AddressData;
  onSave: (type: "shipping" | "billing", data: AddressData) => Promise<void>;
}

const emptyAddress = (): AddressData => ({
  name: "", line1: "", line2: "", city: "", postcode: "", country: "United Kingdom",
});

/** Shape of a successful postcodes.io single-lookup response. */
interface PostcodesIoResponse {
  status: number;
  result?: {
    postcode?: string;
    admin_district?: string;
    post_town?: string;
    admin_county?: string;
    country?: string;
  };
}

const AddressCard = ({ label, type, data, onSave }: AddressFormProps) => {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AddressData>(data);
  const [saving, setSaving] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => { setForm(data); }, [data]);

  const updateField = (field: keyof AddressData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /** Validates and autofills city/county/country from postcodes.io (free, no key required). */
  const handleFindAddress = async () => {
    const pc = (form.postcode ?? "").trim().replace(/\s+/g, "").toUpperCase();
    if (pc.length < 5) {
      toast({ title: "Enter a postcode first", description: "Type a UK postcode in the Postcode field, then use the Find button.", variant: "destructive" });
      return;
    }
    setLookingUp(true);
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
      const json = await res.json() as PostcodesIoResponse;
      if (json.status === 200 && json.result) {
        const r = json.result;
        setForm((prev) => ({
          ...prev,
          postcode: r.postcode ?? prev.postcode,
          city: r.admin_district || r.post_town || prev.city || "",
          country: "United Kingdom",
        }));
        toast({ title: "Postcode found", description: "Town and country have been filled in. Please complete the street address." });
      } else {
        toast({ title: "Postcode not found", description: "Check the postcode and try again.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Lookup failed", description: "Unable to connect to the postcode service. Please fill the address manually.", variant: "destructive" });
    } finally {
      setLookingUp(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(type, form);
      setEditing(false);
    } catch {
      // Error toast is shown by the parent handler; keep edit mode open so the user can retry.
    } finally {
      setSaving(false);
    }
  };

  const hasData = data.name || data.line1 || data.city || data.postcode;

  return (
    <Card className={hasData ? "ring-2 ring-primary/20" : ""}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {type === "shipping" ? (
              <Building2 className="h-4 w-4 text-primary" />
            ) : (
              <Home className="h-4 w-4 text-primary" />
            )}
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
          {hasData && !editing && (
            <Badge className="text-[10px]">Saved</Badge>
          )}
        </div>

        {editing ? (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Full Name</Label>
                <Input value={form.name ?? ""} onChange={(e) => updateField("name", e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              {/* Postcode lookup row */}
              <div>
                <Label className="text-xs">Postcode</Label>
                <div className="flex gap-1.5 mt-1">
                  <Input
                    value={form.postcode ?? ""}
                    onChange={(e) => updateField("postcode", e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleFindAddress(); } }}
                    className="h-8 text-sm uppercase"
                    placeholder="e.g. SW1A 2AA"
                    maxLength={8}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleFindAddress}
                    disabled={lookingUp}
                    className="text-xs shrink-0 h-8 px-2"
                    title="Look up postcode to fill town & country"
                  >
                    {lookingUp ? (
                      <span className="animate-spin text-base leading-none">⟳</span>
                    ) : (
                      <><Search className="h-3 w-3 mr-1" />Find</>
                    )}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Use the <strong>Find</strong> button to auto-fill town &amp; country from postcode.</p>
              </div>
              <div>
                <Label className="text-xs">Address Line 1 (house/flat number &amp; street)</Label>
                <Input value={form.line1 ?? ""} onChange={(e) => updateField("line1", e.target.value)} className="mt-1 h-8 text-sm" placeholder="e.g. 12 High Street" />
              </div>
              <div>
                <Label className="text-xs">Address Line 2</Label>
                <Input value={form.line2 ?? ""} onChange={(e) => updateField("line2", e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Town / City</Label>
                <Input value={form.city ?? ""} onChange={(e) => updateField("city", e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Country</Label>
                <Input value={form.country ?? ""} onChange={(e) => updateField("country", e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" className="text-xs" onClick={handleSave} disabled={saving}>
                  <Save className="h-3 w-3 mr-1" />{saving ? "Saving…" : "Save"}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setEditing(false); setForm(data); }}>
                  <X className="h-3 w-3 mr-1" />Cancel
                </Button>
              </div>
            </div>
        ) : hasData ? (
          <>
            <div className="text-sm text-muted-foreground space-y-0.5">
              {data.name && <p className="font-medium text-foreground">{data.name}</p>}
              {data.line1 && <p>{data.line1}</p>}
              {data.line2 && <p>{data.line2}</p>}
              {(data.city || data.postcode) && <p>{[data.city, data.postcode].filter(Boolean).join(", ")}</p>}
              {data.country && <p>{data.country}</p>}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">No address saved yet.</p>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setEditing(true)}>
              Add Address
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BuyerAddresses = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [shippingAddress, setShippingAddress] = useState<AddressData>(emptyAddress());
  const [billingAddress, setBillingAddress] = useState<AddressData>(emptyAddress());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("buyer_profiles")
          .select("shippingAddress, billingAddress")
          .eq("userId", user.id)
          .single();

        if (error && error.code !== "PGRST116") throw error;
        if (data) {
          setShippingAddress(data.shippingAddress || emptyAddress());
          setBillingAddress(data.billingAddress || emptyAddress());
        }
      } catch (err) {
        console.error("Error fetching addresses:", err);
        toast({ title: "Failed to load addresses", description: "Please refresh the page.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, toast]);

  const handleSave = async (type: "shipping" | "billing", data: AddressData) => {
    if (!user) return;
    const field = type === "shipping" ? "shippingAddress" : "billingAddress";
    try {
      const { error } = await supabase
        .from("buyer_profiles")
        .upsert({ userId: user.id, [field]: data }, { onConflict: "userId" });
      if (error) throw error;
      if (type === "shipping") setShippingAddress(data);
      else setBillingAddress(data);
      toast({ title: "Address saved" });
    } catch (err) {
      console.error("Error saving address:", err);
      toast({ title: "Failed to save address", description: "Please try again.", variant: "destructive" });
      throw err;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Saved Addresses</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your delivery and billing addresses.</p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MapPin className="h-12 w-12 mb-4 opacity-40" />
            <p>Loading addresses…</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AddressCard label="Shipping Address" type="shipping" data={shippingAddress} onSave={handleSave} />
          <AddressCard label="Billing Address" type="billing" data={billingAddress} onSave={handleSave} />
        </div>
      )}
    </div>
  );
};

export default BuyerAddresses;
