import { Lock } from "lucide-react";

interface PaymentMethodBadgesProps {
  /** Show the "Accepted payment methods" label above the badges */
  showLabel?: boolean;
  /** Extra classes applied to the outer wrapper */
  className?: string;
  size?: "sm" | "md";
}

/**
 * Displays card-brand badges for the payment methods actually accepted by
 * this platform: Visa, Mastercard, and American Express — all processed
 * securely via Stripe.
 *
 * Do NOT add PayPal, Apple Pay, or Google Pay here — they are not enabled.
 */
const PaymentMethodBadges = ({
  showLabel = true,
  className = "",
  size = "md",
}: PaymentMethodBadgesProps) => {
  const badgeH = size === "sm" ? "h-6" : "h-8";
  const badgeW = size === "sm" ? "w-10" : "w-14";

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showLabel && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Accepted payment methods
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Visa */}
        <div
          className={`${badgeH} ${badgeW} rounded-md border border-border bg-white flex items-center justify-center shadow-sm`}
          title="Visa"
        >
          <svg viewBox="0 0 48 16" className="w-full h-full p-1.5" aria-label="Visa">
            <text
              x="4"
              y="13"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              fontSize="13"
              fill="#1A1F71"
              letterSpacing="0.5"
            >
              VISA
            </text>
          </svg>
        </div>

        {/* Mastercard */}
        <div
          className={`${badgeH} ${badgeW} rounded-md border border-border bg-white flex items-center justify-center shadow-sm`}
          title="Mastercard"
        >
          <svg viewBox="0 0 48 32" className="w-full h-full p-1.5" aria-label="Mastercard">
            {/* Left circle — red */}
            <circle cx="17" cy="16" r="10" fill="#EB001B" />
            {/* Right circle — orange/yellow */}
            <circle cx="31" cy="16" r="10" fill="#F79E1B" />
            {/* Overlap — blended to orange */}
            <path
              d="M24 8.27a10 10 0 010 15.46A10 10 0 0124 8.27z"
              fill="#FF5F00"
            />
          </svg>
        </div>

        {/* American Express */}
        <div
          className={`${badgeH} ${badgeW} rounded-md border border-border bg-[#016FD0] flex items-center justify-center shadow-sm`}
          title="American Express"
        >
          <svg viewBox="0 0 48 16" className="w-full h-full p-1" aria-label="American Express">
            <text
              x="3"
              y="12"
              fontFamily="Arial, sans-serif"
              fontWeight="bold"
              fontSize="10"
              fill="white"
              letterSpacing="0.3"
            >
              AMEX
            </text>
          </svg>
        </div>

        {/* Stripe trust badge */}
        <div
          className={`${badgeH} ${badgeW} rounded-md border border-border bg-[#635BFF] flex items-center justify-center shadow-sm gap-1 px-1.5`}
          title="Secured by Stripe"
        >
          {/* Stripe wordmark "S" mark */}
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
            <path
              fill="white"
              d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm.4 11.6c-1.4 0-2.2-.6-2.8-1.2l.8-.8c.4.5 1 .8 2 .8.9 0 1.4-.4 1.4-1 0-.5-.3-.8-1.4-1.1-1.4-.3-2.2-.9-2.2-2 0-1.1.9-1.9 2.2-1.9 1 0 1.7.4 2.3.9l-.8.8c-.4-.4-.9-.6-1.5-.6-.8 0-1.2.4-1.2.9 0 .5.3.8 1.4 1.1 1.4.3 2.2.9 2.2 2 0 1.2-.9 2.1-2.4 2.1z"
            />
          </svg>
          <span className="text-[9px] font-bold text-white leading-none">Stripe</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Lock className="h-3 w-3 shrink-0" />
        <span>256-bit SSL encrypted · Secure checkout</span>
      </div>
    </div>
  );
};

export default PaymentMethodBadges;
