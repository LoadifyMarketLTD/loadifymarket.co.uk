import { ShieldCheck, AlertTriangle } from 'lucide-react';

interface VerificationBadgeProps {
  isVerified: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function VerificationBadge({
  isVerified,
  size = 'sm',
  showLabel = true,
}: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (isVerified) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-semibold ${sizeClasses[size]}`}
        title="Verified Seller"
        aria-label="Verified Seller"
      >
        <ShieldCheck className={iconSizes[size]} aria-hidden="true" />
        {showLabel && <span>Verified Seller</span>}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/40 text-primary font-semibold ${sizeClasses[size]}`}
      title="Unverified seller"
      aria-label="Unverified seller"
    >
      <AlertTriangle className={iconSizes[size]} aria-hidden="true" />
      {showLabel && <span>Unverified</span>}
    </div>
  );
}
