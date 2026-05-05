/**
 * ProductImagePlaceholder — generic SVG placeholder shown when a product image
 * fails to load or is not available.
 *
 * Props:
 *   theme - 'dark'  renders white-on-transparent (for dark card backgrounds)
 *           'light' renders black-on-transparent (for light card backgrounds)
 */

interface ProductImagePlaceholderProps {
  theme?: 'dark' | 'light';
  size?: number;
}

export default function ProductImagePlaceholder({ theme = 'light', size = 32 }: ProductImagePlaceholderProps) {
  const fill = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const stroke = theme === 'dark' ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.20)';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" fill={fill} />
      <path d="M3 16l5-5 4 4 3-3 6 6" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.5" fill={stroke} />
    </svg>
  );
}
