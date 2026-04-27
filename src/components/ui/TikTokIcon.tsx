import type { CSSProperties, AriaAttributes } from 'react';

/**
 * TikTok brand icon — inline SVG.
 * Lucide-react does not include TikTok; this component matches the same
 * prop surface as a Lucide icon so it can be passed as `Icon` to SocialCard.
 */
export default function TikTokIcon({
  className,
  style,
  'aria-hidden': ariaHidden,
}: {
  className?: string;
  style?: CSSProperties;
  'aria-hidden'?: boolean | string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden={ariaHidden as AriaAttributes['aria-hidden']}
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.31 6.31 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.24 8.24 0 0 0 4.83 1.55V6.79a4.85 4.85 0 0 1-1.06-.1z" />
    </svg>
  );
}
