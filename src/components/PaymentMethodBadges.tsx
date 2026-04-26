import { Lock } from "lucide-react";

interface PaymentMethodBadgesProps {
  /** Show the "Accepted payment methods" label above the badges */
  showLabel?: boolean;
  /** Extra classes applied to the outer wrapper */
  className?: string;
  /**
   * Height of each badge.
   * "sm" → h-7 (28 px)  used near buy buttons on product pages
   * "md" → h-8 (32 px)  used in checkout / larger trust panels
   */
  size?: "sm" | "md";
}

/**
 * Accepted payment method badges — Visa, Mastercard, PayPal, Stripe.
 *
 * Sources: standalone SVG files in /public/payment-icons/ and /public/assets/apm/
 *   visa.svg               — serif italic wordmark, Visa Classic Blue #1A1F71 on white
 *   mastercard.svg         — two circles, geometrically-correct lens overlap, official brand colours
 *   assets/apm/paypal.svg  — PP monogram + PayPal wordmark, official brand colours on white
 *   stripe.svg             — Stripe Blurple #635BFF badge, white "stripe" wordmark
 *
 * AMEX removed: American Express is not a confirmed supported payment method at checkout.
 * Do NOT re-add AMEX until it is explicitly verified as active in the Stripe account.
 */
const PaymentMethodBadges = ({
  showLabel = true,
  className = "",
  size = "md",
}: PaymentMethodBadgesProps) => {
  const badgeH = size === "sm" ? "h-7" : "h-8";

  /* All four badges share identical height; width is set to auto so each
     SVG preserves its own 38×24 (≈1.583:1) aspect ratio without distortion. */
  const badgeClass = `${badgeH} w-auto rounded border border-border shadow-sm`;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showLabel && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Accepted payment methods
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <img
          src="/payment-icons/visa.svg"
          alt="Visa"
          className={badgeClass}
          width="60"
          height="38"
          loading="lazy"
          decoding="async"
        />
        <img
          src="/payment-icons/mastercard.svg"
          alt="Mastercard"
          className={badgeClass}
          width="60"
          height="38"
          loading="lazy"
          decoding="async"
        />
        <img
          src="/assets/apm/paypal.svg"
          alt="PayPal"
          className={badgeClass}
          width="60"
          height="38"
          loading="lazy"
          decoding="async"
        />
        <img
          src="/payment-icons/stripe.svg"
          alt="Stripe"
          className={badgeClass}
          width="60"
          height="38"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Lock className="h-3 w-3 shrink-0" />
        <span>Secure payments powered by Stripe · Sellers receive payments via Stripe Connect</span>
      </div>
    </div>
  );
};

export default PaymentMethodBadges;
