import { useState } from "react";
import { CreditCard, Plus, Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PaymentMethod {
  id: number;
  type: "visa" | "mastercard" | "amex";
  last4: string;
  expiry: string;
  name: string;
  isDefault: boolean;
}

const initialMethods: PaymentMethod[] = [
  { id: 1, type: "visa", last4: "4821", expiry: "09/27", name: "Jane Buyer", isDefault: true },
  { id: 2, type: "mastercard", last4: "7193", expiry: "03/26", name: "Jane Buyer", isDefault: false },
  { id: 3, type: "amex", last4: "3042", expiry: "12/28", name: "J Buyer — Business", isDefault: false },
];

const cardBrands: Record<string, { label: string; gradient: string }> = {
  visa: { label: "Visa", gradient: "from-blue-600 to-blue-800" },
  mastercard: { label: "Mastercard", gradient: "from-red-500 to-amber-500" },
  amex: { label: "Amex", gradient: "from-slate-600 to-slate-800" },
};

const BuyerPayments = () => {
  const [methods, setMethods] = useState(initialMethods);

  const setDefault = (id: number) =>
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));

  const remove = (id: number) =>
    setMethods((prev) => prev.filter((m) => m.id !== id));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Methods</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your saved cards and payment options.</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Card</Button>
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Your payment details are secure</p>
          <p className="text-xs text-muted-foreground mt-0.5">All card data is encrypted and processed via Stripe. We never store your full card number.</p>
        </div>
      </div>

      {methods.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CreditCard className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No payment methods saved</p>
            <p className="text-sm mt-1">Add a card to speed up checkout.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((method) => {
            const brand = cardBrands[method.type];
            return (
              <Card key={method.id} className={`relative overflow-hidden ${method.isDefault ? "ring-2 ring-primary/30" : ""}`}>
                {method.isDefault && (
                  <Badge className="absolute top-3 right-3 text-[10px] z-10">Default</Badge>
                )}
                <CardContent className="p-5">
                  {/* Card visual */}
                  <div className={`rounded-xl bg-gradient-to-br ${brand.gradient} p-4 text-white mb-4 aspect-[1.6/1] flex flex-col justify-between`}>
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-6 rounded bg-white/20" />
                      <span className="text-xs font-semibold opacity-80">{brand.label}</span>
                    </div>
                    <div>
                      <p className="text-sm font-mono tracking-widest">•••• •••• •••• {method.last4}</p>
                      <div className="flex justify-between mt-2">
                        <span className="text-[10px] opacity-70">{method.name}</span>
                        <span className="text-[10px] opacity-70">Exp {method.expiry}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!method.isDefault && (
                      <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => setDefault(method.id)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Set Default
                      </Button>
                    )}
                    {method.isDefault && (
                      <span className="text-xs text-primary font-medium flex items-center gap-1 flex-1">
                        <CheckCircle2 className="h-3 w-3" /> Default card
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => remove(method.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BuyerPayments;
