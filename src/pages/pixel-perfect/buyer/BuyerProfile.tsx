import { useState } from "react";
import { UserCircle, Mail, Phone, MapPin, Camera, Save, Calendar, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const profileData = {
  firstName: "Jane",
  lastName: "Buyer",
  email: "jane@email.com",
  phone: "+44 7700 900456",
  company: "JB Retail Solutions Ltd",
  companyNumber: "98765432",
  vatNumber: "GB987654321",
  bio: "Independent retailer specialising in electronics and home goods. Sourcing wholesale and clearance stock for our high street shops and online marketplace channels.",
  address: "Unit 12, Thames Industrial Estate",
  city: "London",
  postcode: "E16 2AA",
  stats: {
    memberSince: "January 2024",
    totalOrders: 24,
    totalSpent: "£18,450",
    avgRating: 4.5,
  },
};

const BuyerProfile = () => {
  const [form, setForm] = useState(profileData);

  const updateField = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your personal and business information.</p>
        </div>
        <Button size="sm"><Save className="mr-2 h-4 w-4" /> Save Changes</Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-2xl font-bold">
                JB
              </div>
              <button className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </button>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{form.firstName} {form.lastName}</h2>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">Verified Buyer</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{form.company}</p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Since {form.stats.memberSince}</span>
                <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" /> {form.stats.totalOrders} orders</span>
                <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" /> {form.stats.avgRating} avg rating</span>
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
            <div>
              <Label className="text-xs">Email</Label>
              <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Bio / About</Label>
            <Textarea value={form.bio} onChange={(e) => updateField("bio", e.target.value)} rows={3} className="mt-1" />
          </div>
        </CardContent>
      </Card>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-primary" /> Business Details</CardTitle>
          <CardDescription>Optional — for business account features and invoicing.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Company Name</Label>
              <Input value={form.company} onChange={(e) => updateField("company", e.target.value)} className="mt-1" />
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
        </CardContent>
      </Card>

      {/* Default Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Default Address</CardTitle>
          <CardDescription>Used as the default delivery address at checkout.</CardDescription>
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

export default BuyerProfile;
