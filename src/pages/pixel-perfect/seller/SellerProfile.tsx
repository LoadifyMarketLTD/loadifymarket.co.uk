import { useState, useEffect } from "react";
import {
  Building2, MapPin, Mail, Star,
  ShieldCheck, Save, Package, Calendar, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store";
import { useToast } from "@/hooks/use-toast";

interface ProfileForm {
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  companyNumber: string;
  vatNumber: string;
  address: string;
  city: string;
  postcode: string;
  bio: string;
}

const defaultForm: ProfileForm = {
  businessName: "",
  contactName: "",
  email: "",
  phone: "",
  companyNumber: "",
  vatNumber: "",
  address: "",
  city: "",
  postcode: "",
  bio: "",
};

const SellerProfile = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [form, setForm] = useState<ProfileForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ rating: 0, totalSales: 0, memberSince: "" });
  const [storeSlug, setStoreSlug] = useState("");
  const [sellerStatus, setSellerStatus] = useState<string>("draft");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, storeRes] = await Promise.all([
        supabase
          .from("seller_profiles")
          .select("businessName, vatNumber, companyRegistrationNumber, businessAddress, contactPhone, rating, totalSales, createdAt, sellerStatus")
          .eq("userId", user.id)
          .maybeSingle(),
        supabase
          .from("seller_stores")
          .select("storeSlug, storeName, storeDescription")
          .eq("userId", user.id)
          .maybeSingle(),
      ]);

      const p = profileRes.data;
      const addr = (p?.businessAddress as { address?: string; city?: string; postcode?: string } | null) ?? {};

      setForm({
        businessName: p?.businessName ?? "",
        contactName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
        email: user.email ?? "",
        phone: p?.contactPhone ?? "",
        companyNumber: p?.companyRegistrationNumber ?? "",
        vatNumber: p?.vatNumber ?? "",
        address: addr.address ?? "",
        city: addr.city ?? "",
        postcode: addr.postcode ?? "",
        bio: storeRes.data?.storeDescription ?? "",
      });
      setStats({
        rating: p?.rating ?? 0,
        totalSales: p?.totalSales ?? 0,
        memberSince: p?.createdAt ? new Date(p.createdAt).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : "",
      });
      setStoreSlug(storeRes.data?.storeSlug ?? "");
      setSellerStatus(p?.sellerStatus ?? "draft");
    };
    load();
  }, [user]);

  const updateField = (field: keyof ProfileForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nameParts = form.contactName.trim().split(" ");
      const firstName = nameParts[0] ?? "";
      const lastName = nameParts.slice(1).join(" ");

      await Promise.all([
        supabase.from("users").update({ firstName, lastName }).eq("id", user.id),
        supabase.from("seller_profiles").update({
          businessName: form.businessName,
          vatNumber: form.vatNumber,
          companyRegistrationNumber: form.companyNumber,
          contactPhone: form.phone,
          businessAddress: { address: form.address, city: form.city, postcode: form.postcode },
        }).eq("userId", user.id),
        supabase.from("seller_stores").upsert(
          { userId: user.id, storeDescription: form.bio },
          { onConflict: "userId" }
        ),
      ]);
      toast({ title: "Profile saved", description: "Your seller profile has been updated." });

      // Re-evaluate activation using persisted DB data (no Stripe API call needed).
      // If stripeConnectStatus is already 'active' and the profile is now complete,
      // the seller will be promoted to 'active' automatically.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          const res = await fetch("/.netlify/functions/recheck-activation", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json() as { sellerStatus?: string };
            if (data.sellerStatus) {
              setSellerStatus(data.sellerStatus);
              if (data.sellerStatus === "active") {
                toast({
                  title: "Your store is now live! 🎉",
                  description: "Your seller account has been activated. Redirecting to your dashboard…",
                });
                setTimeout(() => window.location.replace("/pp/seller"), 1800);
              }
            }
          }
        }
      } catch {
        // Non-fatal — activation will be re-evaluated the next time the seller
        // visits their setup page or the seller dashboard.
      }
    } catch {
      toast({ title: "Failed to save profile", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Seller Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your public seller profile and business information.</p>
        </div>
        <Button className="bg-gradient-hero text-primary-foreground" onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-hero flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">
              {form.businessName
                ? form.businessName.slice(0, 2).toUpperCase()
                : form.contactName
                ? form.contactName.split(" ").filter((n: string) => n.length > 0).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                  : "??"}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{form.businessName || "Your Business"}</h2>
                {sellerStatus === "active" && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200" variant="outline">
                    <ShieldCheck className="h-3 w-3 mr-1" /> Active
                  </Badge>
                )}
                {sellerStatus === "submitted" && (
                  <Badge className="bg-amber-500/10 text-amber-700 border-amber-200" variant="outline">
                    Setup in progress
                  </Badge>
                )}
                {sellerStatus === "suspended" && (
                  <Badge className="bg-red-500/10 text-red-700 border-red-200" variant="outline">
                    Suspended
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" /> {stats.rating ? stats.rating.toFixed(1) : "—"}</span>
                <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {stats.totalSales} sales</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {stats.memberSince ? `Since ${stats.memberSince}` : ""}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {storeSlug && <Badge variant="secondary" className="text-xs">{storeSlug}</Badge>}
                {storeSlug && (
                  <a
                    href={`/seller/${storeSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> View Public Store
                  </a>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Business Information</CardTitle>
          <CardDescription>This information is displayed on your public seller page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Business Name</Label>
              <Input value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Contact Name</Label>
              <Input value={form.contactName} onChange={(e) => updateField("contactName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Company Number</Label>
              <Input value={form.companyNumber} onChange={(e) => updateField("companyNumber", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">VAT Number</Label>
              <Input value={form.vatNumber} onChange={(e) => updateField("vatNumber", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Business Description</Label>
            <Textarea value={form.bio} onChange={(e) => updateField("bio", e.target.value)} rows={4} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={form.email}
                readOnly
                className="mt-1 bg-muted/50 cursor-not-allowed text-muted-foreground"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Email cannot be changed here.</p>
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Business Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label className="text-xs">Street Address</Label>
              <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Postcode</Label>
              <Input value={form.postcode} onChange={(e) => updateField("postcode", e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerProfile;
