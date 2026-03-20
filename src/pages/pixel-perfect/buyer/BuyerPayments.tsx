import { CreditCard, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BuyerPayments = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payment Methods</h1>
        <p className="text-muted-foreground text-sm mt-1">Your payment options for checkout.</p>
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Your payment details are secure</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            All card data is encrypted and processed via Stripe. We never store your full card number.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center gap-3">
          <CreditCard className="h-12 w-12 opacity-40" />
          <div>
            <p className="text-base font-medium text-foreground">Payment methods are managed securely by Stripe</p>
            <p className="text-sm mt-1 max-w-sm">
              They are available at checkout. No card data is stored on this platform.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuyerPayments;
