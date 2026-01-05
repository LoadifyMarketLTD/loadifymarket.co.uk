import { ShieldCheck, AlertCircle } from 'lucide-react';

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
        className={`inline-flex items-center gap-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold font-semibold ${sizeClasses[size]}`}
        title="Verified Seller"
      >
        <ShieldCheck className={iconSizes[size]} />
        {showLabel && <span>Verified</span>}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/20 text-white/60 font-semibold ${sizeClasses[size]}`}
      title="Pending Verification"
    >
      <AlertCircle className={iconSizes[size]} />
      {showLabel && <span>Unverified</span>}
    </div>
  );
}
