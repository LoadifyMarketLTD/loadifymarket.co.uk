import { useState, useEffect } from "react";
import { UserCircle, MapPin, Save, Calendar, ShoppingBag, Star, Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";

const ACCOUNT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "business",   label: "Business" },
  { value: "reseller",   label: "Reseller" },
  { value: "distributor",label: "Distributor" },
];

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  shippingLine1: string;
  shippingLine2: string;
  shippingCity: string;
  shippingPostcode: string;
  shippingCountry: string;
}

interface B2BForm {
  accountType: string;
  companyName: string;
  vatNumber: string;
  isVatVerified: boolean;
}

const BuyerProfile = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingB2B, setSavingB2B] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [memberSince, setMemberSince] = useState("—");
  const [form, setForm] = useState<FormState>({
    firstName: "",
    lastName: "",
    email: "",
    shippingLine1: "",
    shippingLine2: "",
    shippingCity: "",
    shippingPostcode: "",
    shippingCountry: "United Kingdom",
  });
  const [b2bForm, setB2BForm] = useState<B2BForm>({
    accountType: "individual",
    companyName: "",
    vatNumber: "",
    isVatVerified: false,
  });

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const [userRes, profileRes, ordersRes] = await Promise.all([
          supabase
            .from("users")
            .select("firstName, lastName, email, createdAt")
            .eq("id", user.id)
            .single(),
          supabase
            .from("buyer_profiles")
            .select("shippingAddress, billingAddress, accountType, companyName, vatNumber, isVatVerified")
            .eq("userId", user.id)
            .maybeSingle(),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("buyerId", user.id),
        ]);

        const u = userRes.data as { firstName?: string; lastName?: string; email?: string; createdAt?: string } | null;
        const p = profileRes.data as {
          shippingAddress?: Record<string, string>;
          accountType?: string;
          companyName?: string;
          vatNumber?: string;
          isVatVerified?: boolean;
        } | null;
        const ship = p?.shippingAddress || {};

        if (u) {
          if (u.createdAt) {
            setMemberSince(
              new Date(u.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
            );
          }
          setForm((prev) => ({
            ...prev,
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
            email: u.email ?? "",
          }));
        }
        if (ship) {
          setForm((prev) => ({
            ...prev,
            shippingLine1: ship.line1 ?? "",
            shippingLine2: ship.line2 ?? "",
            shippingCity: ship.city ?? "",
            shippingPostcode: ship.postcode ?? "",
            shippingCountry: ship.country ?? "United Kingdom",
          }));
        }
        if (p) {
          setB2BForm({
            accountType: p.accountType ?? "individual",
            companyName: p.companyName ?? "",
            vatNumber: p.vatNumber ?? "",
            isVatVerified: Boolean(p.isVatVerified),
          });
        }
        setTotalOrders(ordersRes.count ?? 0);
      } catch {
        toast({ title: "Failed to load profile", description: "Please refresh the page.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user, toast]);

  const updateField = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateB2B = (field: keyof B2BForm, value: string) =>
    setB2BForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const [usersRes, profileRes] = await Promise.all([
        supabase
          .from("users")
          .update({ firstName: form.firstName, lastName: form.lastName })
          .eq("id", user.id),
        supabase
          .from("buyer_profiles")
          .upsert(
            {
              userId: user.id,
              shippingAddress: {
                line1: form.shippingLine1,
                line2: form.shippingLine2,
                city: form.shippingCity,
                postcode: form.shippingPostcode,
                country: form.shippingCountry,
                isDefault: true,
              },
            },
            { onConflict: "userId" }
          ),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (profileRes.error) throw profileRes.error;
      toast({ title: "Profile saved", description: "Your profile has been updated." });
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast({ title: "Failed to save profile", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveB2B = async () => {
    if (!user) return;
    setSavingB2B(true);
    try {
      const { error } = await supabase
        .from("buyer_profiles")
        .upsert(
          {
            userId: user.id,
            accountType: b2bForm.accountType || "individual",
            companyName: b2bForm.companyName.trim() || null,
            vatNumber: b2bForm.vatNumber.trim() || null,
          },
          { onConflict: "userId" }
        );
      if (error) throw error;
      toast({ title: "Business account saved", description: "Your business details have been updated." });
    } catch (err) {
      console.error("Failed to save B2B profile:", err);
      toast({ title: "Failed to save", description: "Please try again.", variant: "destructive" });
    } finally {
      setSavingB2B(false);
    }
  };

  const initials = `${form.firstName?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal information.</p>
        </div>
        <Button size="sm" className="w-full sm:w-auto" onClick={handleSave} disabled={saving || loading}>
          <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">
              {loading ? "…" : initials}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {loading ? "Loading…" : `${form.firstName} ${form.lastName}`.trim() || "—"}
                </h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">Registered Buyer</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Since {memberSince}</span>
                <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {totalOrders} orders</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" /> Buyer</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserCircle className="h-4 w-4 text-primary" /> Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} disabled className="mt-1" />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Default Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Default Shipping Address</CardTitle>
          <CardDescription>Used as the default delivery address at checkout.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs">Address Line 1</Label>
              <Input value={form.shippingLine1} onChange={(e) => updateField("shippingLine1", e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Address Line 2</Label>
              <Input value={form.shippingLine2} onChange={(e) => updateField("shippingLine2", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.shippingCity} onChange={(e) => updateField("shippingCity", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Postcode</Label>
              <Input value={form.shippingPostcode} onChange={(e) => updateField("shippingPostcode", e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Country</Label>
              <Input value={form.shippingCountry} onChange={(e) => updateField("shippingCountry", e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Account (B2B) */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Business Account
              </CardTitle>
              <CardDescription>
                Add your company details to access B2B pricing and receive proper business invoices.
              </CardDescription>
            </div>
            {b2bForm.accountType !== "individual" && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                B2B Account
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Account Type</Label>
              <Select value={b2bForm.accountType} onValueChange={(v) => updateB2B("accountType", v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Company Name</Label>
              <Input
                value={b2bForm.companyName}
                onChange={(e) => updateB2B("companyName", e.target.value)}
                placeholder="Acme Ltd"
                className="mt-1"
                disabled={b2bForm.accountType === "individual"}
              />
            </div>
            <div>
              <Label className="text-xs">VAT Number</Label>
              <Input
                value={b2bForm.vatNumber}
                onChange={(e) => updateB2B("vatNumber", e.target.value)}
                placeholder="GB123456789"
                className="mt-1"
                disabled={b2bForm.accountType === "individual"}
              />
            </div>
            <div className="flex items-end pb-1">
              {b2bForm.isVatVerified ? (
                <span className="flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
                  <ShieldCheck className="h-4 w-4" /> VAT Verified
                </span>
              ) : b2bForm.vatNumber && b2bForm.accountType !== "individual" ? (
                <span className="text-xs text-amber-700">
                  VAT verification pending admin review
                </span>
              ) : null}
            </div>
          </div>
          {b2bForm.accountType !== "individual" && (
            <p className="text-xs text-muted-foreground">
              Once your VAT number is verified by our team, you will receive ex-VAT pricing and reverse-charge invoices automatically.
            </p>
          )}
          <div className="pt-2">
            <Button size="sm" onClick={handleSaveB2B} disabled={savingB2B || loading}>
              <Save className="mr-2 h-4 w-4" />{savingB2B ? "Saving…" : "Save Business Details"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-stretch sm:justify-end">
        <Button size="sm" className="w-full sm:w-auto" onClick={handleSave} disabled={saving || loading}>
          <Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default BuyerProfile;
