import { useState } from "react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  orderId: string;
  total: number;
  onPaid: (orderId: string) => void;
}

export default function SupplierPaymentPanel({ orderId, total, onPaid }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/buyer/orders` },
    });
    if (result.error) {
      setError(result.error.message || "Payment could not be completed.");
      setSubmitting(false);
      return;
    }
    if (result.paymentIntent?.status === "succeeded" || result.paymentIntent?.status === "processing") {
      onPaid(orderId);
      return;
    }
    setError("Payment is not complete yet. Please check the payment details and try again.");
    setSubmitting(false);
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <p className="text-sm font-semibold">Secure payment with Loadify Market</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your payment is processed by Stripe. Loadify Market remains your seller and merchant of record.
        </p>
      </div>
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="button" className="h-12 w-full font-bold" disabled={!stripe || !elements || submitting} onClick={pay}>
        {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />}
        Pay securely £{total.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Button>
    </div>
  );
}
