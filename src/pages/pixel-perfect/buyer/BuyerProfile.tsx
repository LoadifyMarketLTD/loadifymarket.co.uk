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
import {
  BUYER_ACCOUNT_TYPES,
  type BuyerAccountType,
  buyerAccountRequiresOrganisationName,
  isBusinessBuyerAccount,
  isBuyerProfileComplete,
  normalizeBuyerAccountType,
} from "@/lib/buyerProfileModel";
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

interface AccountForm {
  accountType: BuyerAccountType;
  companyName: string;
  vatNumber: string;
  isVatVerified: boolean;
}

const BuyerProfile = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [memberSince, setMemberSince] = useState("—");
  const [persistedVatNumber, setPersistedVatNumber] = useState("");
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
  const [accountForm, setAccountForm] = useState<AccountForm>({
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
          const vatNumber = p.vatNumber ?? "";
          setPersistedVatNumber(vatNumber);
          setAccountForm({
            accountType: normalizeBuyerAccountType(p.accountType),
            companyName: p.companyName ?? "",
            vatNumber,
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

  const updateAccountField = (field: "companyName" | "vatNumber", value: string) =>
    setAccountForm((prev) => ({ ...prev, [field]: value }));

  const handleAccountTypeChange = (value: string) => {
    const accountType = normalizeBuyerAccountType(value);
    setAccountForm((prev) => ({
      ...prev,
      accountType,
      ...(accountType === "individual"
        ? { companyName: "", vatNumber: "", isVatVerified: false }
        : {}),
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    const profileComplete = isBuyerProfileComplete({
      accountType: accountForm.accountType,
      firstName: form.firstName,
      lastName: form.lastName,
      shippingLine1: form.shippingLine1,
      shippingCity: form.shippingCity,
      shippingPostcode: form.shippingPostcode,
      shippingCountry: form.shippingCountry,
      companyName: accountForm.companyName,
    });

    if (!profileComplete) {
      const businessNameMissing =
        buyerAccountRequiresOrganisationName(accountForm.accountType) &&
        !accountForm.companyName.trim();
      toast({
        title: businessNameMissing ? "Organisation name required" : "Profile details required",
        description: businessNameMissing
          ? "Please enter the organisation or business name for this account type."
          : "Please complete your name and default address before saving the completed Buyer profile.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const businessAccount = isBusinessBuyerAccount(accountForm.accountType);
      const normalizedVatNumber = businessAccount ? accountForm.vatNumber.trim() : "";
      const vatUnchanged = normalizedVatNumber === persistedVatNumber.trim();
      const isVatVerified = businessAccount && vatUnchanged
        ? accountForm.isVatVerified
        : false;

      const [usersRes, profileRes] = await Promise.all([
        supabase
          .from("users")
          .update({
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
          })
          .eq("id", user.id),
        supabase
          .from("buyer_profiles")
          .upsert(
            {
              userId: user.id,
              accountType: accountForm.accountType,
              companyName: businessAccount
                ? accountForm.companyName.trim() || null
                : null,
              vatNumber: normalizedVatNumber || null,
              isVatVerified,
              shippingAddress: {
                line1: form.shippingLine1.trim(),
                line2: form.shippingLine2.trim(),
                city: form.shippingCity.trim(),
                postcode: form.shippingPostcode.trim(),
                country: form.shippingCountry.trim(),
                isDefault: true,
              },
            },
            { onConflict: "userId" }
          ),
      ]);
      if (usersRes.error) throw usersRes.error;
      if (profileRes.error) throw profileRes.error;

      setPersistedVatNumber(normalizedVatNumber);
      setAccountForm((prev) => ({ ...prev, isVatVerified }));
      toast({
        title: "Profile saved",
        description: accountForm.accountType === "individual"
          ? "Your Individual Buyer profile has been updated."
          : "Your Buyer profile and applicable business details have been updated.",
      });
    } catch (err) {
      console.error("Failed to save profile:", err);
      toast({ title: "Failed to save profile", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = `${form.firstName?.[0] ?? ""}${form.lastName?.[0] ?? ""}`.toUpperCase() || "?";
  const businessAccount = isBusinessBuyerAccount(accountForm.accountType);
  const organisationNameRequired = buyerAccountRequiresOrganisationName(accountForm.accountType);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your Buyer identity, contact details and account type.
          </p>
        </div>
        <Button size="sm" className="w-full sm:w-auto" onClick={handleSave} disabled={saving || loading}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shrink-0">
              {loading ? "…" : initials}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">
                  {loading ? "Loading…" : `${form.firstName} ${form.lastName}`.trim() || "—"}
                </h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  {businessAccount ? "Business / Trader Buyer" : "Individual Buyer"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Since {memberSince}</span>
                <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {totalOrders} orders</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-primary" /> Buyer</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Type */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {businessAccount
                  ? <Building2 className="h-4 w-4 text-primary" />
                  : <UserCircle className="h-4 w-4 text-primary" />}
                Profile Type
              </CardTitle>
              <CardDescription>
                Choose whether this Buyer account represents you personally or a business / trader.
              </CardDescription>
            </div>
            {businessAccount && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                Business / Trader
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm">
            <Label className="text-xs">Account Type</Label>
            <Select value={accountForm.accountType} onValueChange={handleAccountTypeChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {BUYER_ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {businessAccount ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">
                  Organisation / Trading Name
                  {organisationNameRequired && <span className="text-red-500"> *</span>}
                </Label>
                <Input
                  value={accountForm.companyName}
                  onChange={(e) => updateAccountField("companyName", e.target.value)}
                  placeholder={accountForm.accountType === "sole_trader" ? "Optional trading name" : "Business or organisation name"}
                  className="mt-1"
                />
                {accountForm.accountType === "sole_trader" && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Optional if you trade under your own personal name.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">VAT Number</Label>
                <Input
                  value={accountForm.vatNumber}
                  onChange={(e) => updateAccountField("vatNumber", e.target.value)}
                  placeholder="GB123456789"
                  className="mt-1"
                />
                {accountForm.isVatVerified && accountForm.vatNumber.trim() === persistedVatNumber.trim() ? (
                  <span className="flex items-center gap-1.5 text-xs text-success font-medium mt-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" /> VAT Verified
                  </span>
                ) : accountForm.vatNumber ? (
                  <span className="text-[11px] text-primary mt-1.5 block">
                    VAT details saved here remain subject to server-side verification and tax rules.
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Business and VAT details do not automatically change marketplace prices or tax treatment. Checkout and invoices continue to use the applicable server-side rules.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Individual Buyer profiles use your personal identity and delivery/contact information. Business name, company number and VAT number are not required.
            </p>
          )}
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
              <Label className="text-xs">First Name <span className="text-red-500">*</span></Label>
              <Input value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Last Name <span className="text-red-500">*</span></Label>
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
              <Label className="text-xs">Address Line 1 <span className="text-red-500">*</span></Label>
              <Input value={form.shippingLine1} onChange={(e) => updateField("shippingLine1", e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Address Line 2</Label>
              <Input value={form.shippingLine2} onChange={(e) => updateField("shippingLine2", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">City <span className="text-red-500">*</span></Label>
              <Input value={form.shippingCity} onChange={(e) => updateField("shippingCity", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Postcode <span className="text-red-500">*</span></Label>
              <Input value={form.shippingPostcode} onChange={(e) => updateField("shippingPostcode", e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Country <span className="text-red-500">*</span></Label>
              <Input value={form.shippingCountry} onChange={(e) => updateField("shippingCountry", e.target.value)} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-stretch sm:justify-end">
        <Button size="sm" className="w-full sm:w-auto" onClick={handleSave} disabled={saving || loading}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default BuyerProfile;
