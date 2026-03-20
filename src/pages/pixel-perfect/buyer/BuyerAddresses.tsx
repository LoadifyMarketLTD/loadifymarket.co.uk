import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Pencil, Trash2, Home, Building2 } from "lucide-react";

interface Address {
  id: number;
  label: string;
  type: "home" | "business";
  name: string;
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
  isDefault: boolean;
}

const initialAddresses: Address[] = [
  {
    id: 1, label: "Main Warehouse", type: "business",
    name: "Jane Buyer", line1: "Unit 12, Thames Industrial Estate",
    line2: "Dock Road", city: "London", postcode: "E16 2AA", country: "United Kingdom",
    isDefault: true,
  },
  {
    id: 2, label: "Home Office", type: "home",
    name: "Jane Buyer", line1: "42 Primrose Hill Road",
    city: "London", postcode: "NW3 4TG", country: "United Kingdom",
    isDefault: false,
  },
  {
    id: 3, label: "North Depot", type: "business",
    name: "Jane Buyer c/o Northern Logistics", line1: "Bay 7, Trafford Park",
    line2: "Manchester Distribution Centre", city: "Manchester", postcode: "M17 1SN", country: "United Kingdom",
    isDefault: false,
  },
];

const BuyerAddresses = () => {
  const [addresses, setAddresses] = useState(initialAddresses);

  const setDefault = (id: number) => {
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  };

  const remove = (id: number) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Saved Addresses</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your delivery addresses.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <MapPin className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No addresses saved</p>
            <p className="text-sm mt-1">Add a delivery address to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((addr) => (
            <Card key={addr.id} className={`relative ${addr.isDefault ? "ring-2 ring-primary/30" : ""}`}>
              {addr.isDefault && (
                <Badge className="absolute top-3 right-3 text-[10px]">Default</Badge>
              )}
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  {addr.type === "business" ? (
                    <Building2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Home className="h-4 w-4 text-primary" />
                  )}
                  <span className="text-sm font-semibold text-foreground">{addr.label}</span>
                </div>

                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground">{addr.name}</p>
                  <p>{addr.line1}</p>
                  {addr.line2 && <p>{addr.line2}</p>}
                  <p>{addr.city}, {addr.postcode}</p>
                  <p>{addr.country}</p>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                  {!addr.isDefault && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setDefault(addr.id)}>
                      Set as Default
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(addr.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BuyerAddresses;
