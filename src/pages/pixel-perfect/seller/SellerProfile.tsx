import { useState } from "react";
import {
  UserCircle, Building2, MapPin, Mail, Phone, Globe, Star,
  ShieldCheck, Camera, Save, Package, Users, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const profileData = {
  businessName: "TechWholesale UK",
  contactName: "John Doe",
  email: "john@techwholesale.co.uk",
  phone: "+44 7700 900123",
  website: "www.techwholesale.co.uk",
  companyNumber: "12345678",
  vatNumber: "GB123456789",
  address: "Unit 4, Industrial Estate",
  city: "Manchester",
  postcode: "M1 2AB",
  country: "United Kingdom",
  bio: "Leading UK wholesaler specialising in electronics, mixed pallets, and clearance stock. Over 5 years of experience supplying to retailers, market traders, and online sellers across the UK.",
  categories: ["Electronics", "Mixed Pallets", "Returns", "Clearance"],
  stats: {
    rating: 4.8,
    totalReviews: 72,
    totalSales: 486,
    totalCustomers: 186,
    memberSince: "March 2021",
  },
};

const SellerProfile = () => {
  const [form, setForm] = useState(profileData);

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Seller Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your public seller profile and business information.</p>
        </div>
        <Button className="bg-gradient-hero text-primary-foreground">
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-hero flex items-center justify-center text-primary-foreground text-2xl font-bold">
                TW
              </div>
              <button className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{form.businessName}</h2>
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200" variant="outline">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Verified
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" /> {form.stats.rating} ({form.stats.totalReviews} reviews)</span>
                <span className="flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {form.stats.totalSales} sales</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {form.stats.totalCustomers} customers</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Since {form.stats.memberSince}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs">{cat}</Badge>
                ))}
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

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="mt-1" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Website</Label>
              <Input value={form.website} onChange={(e) => updateField("website", e.target.value)} className="mt-1" />
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
