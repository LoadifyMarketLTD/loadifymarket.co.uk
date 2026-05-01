import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Home, Building2, Save, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";

// Free UK postcode lookup — no API key required (api.postcodes.io)
interface PostcodesIoResult {
  postcode: string;
  admin_district: string | null;
  country: string | null;
}

async function lookupPostcode(raw: string): Promise<PostcodesIoResult | null> {
  const postcode = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (!postcode) return null;
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 200 || !json.result) return null;
    return {
      postcode: json.result.postcode as string,
      admin_district: json.result.admin_district as string | null,
      country: json.result.country as string | null,
    };
  } catch {
    return null;
  }
}

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

const AddressCard = ({ label, type, data, onSave }: AddressFormProps) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AddressData>(data);
  const [saving, setSaving] = useState(false);
  const [postcodeStatus, setPostcodeStatus] = useState<"idle" | "loading" | "invalid">("idle");

  useEffect(() => { setForm(data); }, [data]);

  const updateField = (field: keyof AddressData, value: string) => {
    if (field === "postcode") setPostcodeStatus("idle");
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePostcodeBlur = async () => {
    const raw = form.postcode?.trim() ?? "";
    if (!raw) return;
    setPostcodeStatus("loading");
    const result = await lookupPostcode(raw);
    if (result) {
      setForm((prev) => ({
        ...prev,
        postcode: result.postcode,
        city: prev.city || result.admin_district || "",
        country: prev.country || result.country || "",
      }));
      setPostcodeStatus("idle");
    } else {
      setPostcodeStatus("invalid");
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
            <div>
              <Label className="text-xs">Address Line 1</Label>
              <Input value={form.line1 ?? ""} onChange={(e) => updateField("line1", e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Address Line 2</Label>
              <Input value={form.line2 ?? ""} onChange={(e) => updateField("line2", e.target.value)} className="mt-1 h-8 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city ?? ""} onChange={(e) => updateField("city", e.target.value)} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">
                  Postcode
                  {postcodeStatus === "loading" && (
                    <Loader2 className="inline ml-1 h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </Label>
                <Input
                  value={form.postcode ?? ""}
                  onChange={(e) => updateField("postcode", e.target.value)}
                  onBlur={handlePostcodeBlur}
                  className={`mt-1 h-8 text-sm${postcodeStatus === "invalid" ? " border-destructive focus-visible:ring-destructive" : ""}`}
                  placeholder="e.g. SW1A 2AA"
                />
                {postcodeStatus === "invalid" && (
                  <p className="text-[10px] text-destructive mt-0.5">Invalid postcode</p>
                )}
              </div>
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
