import { useState, useEffect } from "react";
import { UserCircle, MapPin, Save, Calendar, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";

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

const BuyerProfile = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
            .select("shippingAddress, billingAddress")
            .eq("userId", user.id)
            .maybeSingle(),
          supabase
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("buyerId", user.id),
        ]);

        const u = userRes.data;
        const p = profileRes.data;
        const ship = p?.shippingAddress || {};

        if (u) {
          setMemberSince(
            new Date(u.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
          );
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

  const initials = `${form.firstName?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() || "?";

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal information.</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || loading}>
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
    </div>
  );
};

export default BuyerProfile;
