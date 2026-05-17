type PaymentVariant = 'visa' | 'mastercard' | 'stripe';
type PaymentSize = 'default' | 'hero' | 'footer';

interface PaymentCardProps {
  variant: PaymentVariant;
  size?: PaymentSize;
}

const sizeTokens: Record<PaymentSize, { card: string; mc: string }> = {
  default: { card: 'h-[46px] min-w-[108px] px-[18px] rounded-[14px]', mc: 'min-w-[138px]' },
  hero:    { card: 'h-[40px] min-w-[88px] px-[14px] rounded-[12px]', mc: 'min-w-[110px]' },
  footer:  { card: 'h-[38px] min-w-[86px] px-[14px] rounded-[12px]', mc: 'min-w-[122px]' },
};

const bgTokens: Record<PaymentSize, string> = {
  default: 'bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(2,6,23,0.98))]',
  hero:    'bg-[linear-gradient(145deg,rgba(17,24,39,0.78),rgba(2,6,23,0.78))] backdrop-blur-[10px]',
  footer:  'bg-[linear-gradient(145deg,rgba(17,24,39,0.98),rgba(2,6,23,0.98))]',
};

/**
 * Premium dark/gold payment card badge.
 * Shared by HeroSection (size="hero") and anywhere else (size="default" or "footer").
 * The shine sweep ::after effect is driven by the `.payment-card` CSS class in index.css.
 */
export default function PaymentCard({ variant, size = 'default' }: PaymentCardProps) {
  const { card: sizeClass, mc: mcClass } = sizeTokens[size];
  const bgClass = bgTokens[size];

  const base =
    `payment-card group inline-flex items-center justify-center gap-2 ` +
    `border border-white/[0.07] ` +
    `shadow-[0_10px_24px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] ` +
    `transition-all duration-[280ms] ease-out ` +
    `hover:-translate-y-1 ` +
    `hover:border-primary/40/[0.35] ` +
    `hover:shadow-[0_0_26px_rgba(212,175,55,0.16),0_16px_36px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.07)]`;

  if (variant === 'visa') {
    return (
      <div className={`${base} ${sizeClass} ${bgClass}`} role="img" aria-label="Visa accepted">
        <span className="relative z-10 text-base font-extrabold tracking-[0.10em] text-white group-hover:text-primary transition-colors leading-none select-none">
          VISA
        </span>
      </div>
    );
  }

  if (variant === 'stripe') {
    return (
      <div className={`${base} ${sizeClass} ${bgClass}`} role="img" aria-label="Stripe accepted">
        <span className="relative z-10 text-[17px] font-extrabold lowercase text-white group-hover:text-primary transition-colors leading-none select-none">
          stripe
        </span>
      </div>
    );
  }

  // Mastercard — two overlapping gold/amber circles + wordmark
  return (
    <div className={`${base} ${sizeClass} ${bgClass} ${mcClass}`} role="img" aria-label="Mastercard accepted">
      {/* Overlapping circles */}
      <div className="relative z-10 w-7 h-[18px] shrink-0" aria-hidden="true">
        <span className="absolute left-0 w-[18px] h-[18px] rounded-full bg-[rgba(212,175,55,0.95)]" />
        <span className="absolute left-[10px] w-[18px] h-[18px] rounded-full bg-[rgba(217,119,6,0.95)]" />
      </div>
      <span className="relative z-10 text-[13px] font-bold text-foreground group-hover:text-primary transition-colors leading-none select-none">
        Mastercard
      </span>
    </div>
  );
}
